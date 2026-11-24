import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  rankGroupSuggestions,
  SUGGESTION_STOPWORDS,
  VARIANT_MODIFIERS,
  type GroupSuggestion,
} from "@/lib/item-group-match";
import { GroupWithModal } from "@/components/dashboard/GroupWithModal";
import type { ItemGroup, PantryItem } from "@/types";

function createItem(
  id: string,
  name: string,
  overrides?: Partial<PantryItem>
): PantryItem {
  return {
    id,
    name,
    quantity: 1,
    unit: "can",
    category: "canned goods",
    lastUpdated: "2026-11-23T12:00:00Z",
    ...overrides,
  };
}

function createGroup(
  id: string,
  name: string,
  itemIds: string[],
  overrides?: Partial<ItemGroup>
): ItemGroup {
  return {
    id,
    name,
    itemIds,
    targetQuantity: 2,
    ...overrides,
  };
}

describe("rankGroupSuggestions pure ranking helper", () => {
  it("exports SUGGESTION_STOPWORDS and VARIANT_MODIFIERS lists", () => {
    expect(SUGGESTION_STOPWORDS).toContain("of");
    expect(SUGGESTION_STOPWORDS).toContain("the");
    expect(SUGGESTION_STOPWORDS).toContain("100");
    expect(SUGGESTION_STOPWORDS).toContain("pure");
    expect(VARIANT_MODIFIERS).toContain("low");
    expect(VARIANT_MODIFIERS).toContain("sodium");
    expect(VARIANT_MODIFIERS).toContain("reduced");
    expect(VARIANT_MODIFIERS).toContain("fat");
  });

  it("Source 'Tomato Sauce': first two are tier 1 at top; 'Soy Sauce' ranks below them; pumpkin and crackers are absent", () => {
    const source = createItem("src", "Tomato Sauce");
    const inventory = [
      createItem("i1", "Hunt's Tomato Sauce 15 oz"),
      createItem("i2", "Great Value Tomato Sauce"),
      createItem("i3", "Soy Sauce"),
      createItem("i4", "100% Pure Pumpkin"),
      createItem("i5", "6 Cracker Assortment"),
    ];

    const results = rankGroupSuggestions(source, inventory, []);
    expect(results.length).toBe(3);

    // First two are tier 1
    expect(results[0].tier).toBe(1);
    expect(results[1].tier).toBe(1);
    const topTwoNames = [
      results[0].kind === "item" ? results[0].item.name : "",
      results[1].kind === "item" ? results[1].item.name : "",
    ];
    expect(topTwoNames).toContain("Hunt's Tomato Sauce 15 oz");
    expect(topTwoNames).toContain("Great Value Tomato Sauce");

    // Soy Sauce ranks below them
    expect(results[2].tier).toBe(3);
    if (results[2].kind === "item") {
      expect(results[2].item.name).toBe("Soy Sauce");
    }

    // Pumpkin and crackers are absent
    const allNames = results.map((r: GroupSuggestion) =>
      r.kind === "item" ? r.item.name : r.group.name
    );
    expect(allNames).not.toContain("100% Pure Pumpkin");
    expect(allNames).not.toContain("6 Cracker Assortment");
  });

  it("Source 'Campbell's Cream of Chicken 10.5 oz': Great Value Cream of Chicken is first; Cream of Mushroom is not first", () => {
    const source = createItem("src", "Campbell's Cream of Chicken 10.5 oz");
    const inventory = [
      createItem("i1", "Cream of Mushroom"),
      createItem("i2", "Great Value Cream of Chicken"),
    ];

    const results = rankGroupSuggestions(source, inventory, []);
    expect(results.length).toBe(2);

    expect(results[0].tier).toBe(1);
    if (results[0].kind === "item") {
      expect(results[0].item.name).toBe("Great Value Cream of Chicken");
    }

    expect(results[1].tier).toBe(3);
    if (results[1].kind === "item") {
      expect(results[1].item.name).toBe("Cream of Mushroom");
    }
  });

  it("Source 'Cream of Chicken' with only 'Cream of Mushroom' available: tier 3 (never tier 1/2)", () => {
    const source = createItem("src", "Cream of Chicken");
    const inventory = [createItem("i1", "Cream of Mushroom")];

    const results = rankGroupSuggestions(source, inventory, []);
    expect(results.length).toBe(1);
    expect(results[0].tier).toBe(3);
    expect(results[0].score).toBeCloseTo(1 / 3, 2);
  });

  it("'Chicken Broth' vs 'Low Sodium Chicken Broth': tier 3; a plain 'Swanson Chicken Broth' ranks above it", () => {
    const source = createItem("src", "Chicken Broth");
    const inventory = [
      createItem("i1", "Low Sodium Chicken Broth"),
      createItem("i2", "Swanson Chicken Broth"),
    ];

    const results = rankGroupSuggestions(source, inventory, []);
    expect(results.length).toBe(2);

    // Swanson Chicken Broth is tier 1 at top
    expect(results[0].tier).toBe(1);
    if (results[0].kind === "item") {
      expect(results[0].item.name).toBe("Swanson Chicken Broth");
    }

    // Low Sodium Chicken Broth contains variant modifiers, so tier 3 below tier 1
    expect(results[1].tier).toBe(3);
    if (results[1].kind === "item") {
      expect(results[1].item.name).toBe("Low Sodium Chicken Broth");
    }
  });

  it("Group 'Pasta Sauce' with member 'Hunt's Tomato Sauce' matches source 'Tomato Sauce' at tier 1 via member name", () => {
    const source = createItem("src", "Tomato Sauce");
    const member = createItem("m1", "Hunt's Tomato Sauce 15 oz", {
      groupId: "grp-pasta",
    });
    const group = createGroup("grp-pasta", "Pasta Sauce", ["m1"]);

    const results = rankGroupSuggestions(source, [member], [group]);
    expect(results.length).toBe(1);
    expect(results[0].kind).toBe("group");
    if (results[0].kind === "group") {
      expect(results[0].group.name).toBe("Pasta Sauce");
      expect(results[0].tier).toBe(1);
      expect(results[0].score).toBe(1);
    }
  });

  it("excludes source item and its own group, ungrouped-only for items, respects limit 5, empty when nothing shares tokens", () => {
    const sourceGroup = createGroup("grp-own", "Source Group", ["src"]);
    const source = createItem("src", "Tomato Sauce", { groupId: "grp-own" });

    const groupedItem = createItem("other-grouped", "Organic Tomato Sauce", {
      groupId: "grp-other",
    });
    const otherGroup = createGroup("grp-other", "Organic Sauces", [
      "other-grouped",
    ]);

    const ungrouped1 = createItem("u1", "Tomato Sauce A");
    const ungrouped2 = createItem("u2", "Tomato Sauce B");
    const ungrouped3 = createItem("u3", "Tomato Sauce C");
    const ungrouped4 = createItem("u4", "Tomato Sauce D");
    const ungrouped5 = createItem("u5", "Tomato Sauce E");
    const ungrouped6 = createItem("u6", "Tomato Sauce F");

    const inventory = [
      source,
      groupedItem,
      ungrouped1,
      ungrouped2,
      ungrouped3,
      ungrouped4,
      ungrouped5,
      ungrouped6,
    ];

    const results = rankGroupSuggestions(
      source,
      inventory,
      [sourceGroup, otherGroup],
      5
    );

    // Source's own group must not appear
    expect(
      results.some((r: GroupSuggestion) => r.kind === "group" && r.group.id === "grp-own")
    ).toBe(false);

    // Source item itself must not appear
    expect(
      results.some((r: GroupSuggestion) => r.kind === "item" && r.item.id === "src")
    ).toBe(false);

    // Grouped item must not appear as an item candidate
    expect(
      results.some((r: GroupSuggestion) => r.kind === "item" && r.item.id === "other-grouped")
    ).toBe(false);

    // Limit 5 respected
    expect(results.length).toBe(5);

    // Empty result when nothing shares a significant token
    const emptyResults = rankGroupSuggestions(
      source,
      [createItem("unrelated", "Peanut Butter")],
      []
    );
    expect(emptyResults).toEqual([]);
  });

  it("supports compatible subset Tier 2 when no variant modifiers are present", () => {
    const source = createItem("src", "Pumpkin");
    const candidate = createItem("c1", "Pumpkin Puree");

    const results = rankGroupSuggestions(source, [candidate], []);
    expect(results.length).toBe(1);
    expect(results[0].tier).toBe(2);
    expect(results[0].score).toBe(0.5);
  });
});

describe("GroupWithModal UI Suggested section", () => {
  const sourceItem = createItem("src-1", "Tomato Sauce");
  const matchItem1 = createItem("i1", "Hunt's Tomato Sauce 15 oz");
  const matchItem2 = createItem("i2", "Great Value Tomato Sauce");
  const group1 = createGroup("grp-1", "Pasta Sauce", ["m1"]);
  const groupMember = createItem("m1", "Hunt's Tomato Sauce", {
    groupId: "grp-1",
  });
  const unrelatedItem = createItem("i3", "Peanut Butter");

  it("renders SUGGESTED section above Existing Groups and Ungrouped Items", () => {
    render(
      React.createElement(GroupWithModal, {
        item: sourceItem,
        isOpen: true,
        onClose: vi.fn(),
        inventory: [sourceItem, matchItem1, matchItem2, groupMember, unrelatedItem],
        itemGroups: [group1],
        onAddToGroup: vi.fn(),
        onCreateGroup: vi.fn(),
      })
    );

    const suggestedHeading = screen.getByText("Suggested");
    const groupsHeading = screen.getByText("Existing Groups");
    const ungroupedHeading = screen.getByText("Ungrouped Items");

    expect(suggestedHeading).toBeInTheDocument();
    expect(groupsHeading).toBeInTheDocument();
    expect(ungroupedHeading).toBeInTheDocument();

    // Verify ordering in document: Suggested comes before Existing Groups and Ungrouped Items
    expect(
      suggestedHeading.compareDocumentPosition(groupsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      suggestedHeading.compareDocumentPosition(ungroupedHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("hides SUGGESTED section when no items score", () => {
    render(
      React.createElement(GroupWithModal, {
        item: sourceItem,
        isOpen: true,
        onClose: vi.fn(),
        inventory: [sourceItem, unrelatedItem],
        itemGroups: [],
        onAddToGroup: vi.fn(),
        onCreateGroup: vi.fn(),
      })
    );

    expect(screen.queryByText("Suggested")).toBeNull();
    expect(screen.getByText("Ungrouped Items")).toBeInTheDocument();
  });

  it("filters suggestions with search query and hides when query does not match", () => {
    render(
      React.createElement(GroupWithModal, {
        item: sourceItem,
        isOpen: true,
        onClose: vi.fn(),
        inventory: [sourceItem, matchItem1, matchItem2],
        itemGroups: [],
        onAddToGroup: vi.fn(),
        onCreateGroup: vi.fn(),
      })
    );

    expect(screen.getByText("Suggested")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      "Search groups or pantry items…"
    );
    fireEvent.change(searchInput, { target: { value: "Hunt" } });

    // "Hunt's Tomato Sauce 15 oz" still matches query
    expect(screen.getByText("Suggested")).toBeInTheDocument();

    // When query doesn't match any suggestion
    fireEvent.change(searchInput, { target: { value: "Nonexistent" } });
    expect(screen.queryByText("Suggested")).toBeNull();
  });

  it("tapping a suggestion group calls onAddToGroup", () => {
    const onAddToGroup = vi.fn().mockResolvedValue(null);
    const onClose = vi.fn();

    render(
      React.createElement(GroupWithModal, {
        item: sourceItem,
        isOpen: true,
        onClose: onClose,
        inventory: [sourceItem, groupMember],
        itemGroups: [group1],
        onAddToGroup: onAddToGroup,
        onCreateGroup: vi.fn(),
      })
    );

    // Group1 is in Suggested because of member Hunt's Tomato Sauce
    const suggestedSection = screen.getByText("Suggested").parentElement;
    expect(suggestedSection).toBeInTheDocument();

    const addToGroupBtn = screen.getAllByRole("button", {
      name: /Pasta Sauce/i,
    })[0];
    fireEvent.click(addToGroupBtn);

    expect(onAddToGroup).toHaveBeenCalledWith(group1.id, sourceItem.id);
  });

  it("tapping a suggestion item selects item for group creation", () => {
    render(
      React.createElement(GroupWithModal, {
        item: sourceItem,
        isOpen: true,
        onClose: vi.fn(),
        inventory: [sourceItem, matchItem1],
        itemGroups: [],
        onAddToGroup: vi.fn(),
        onCreateGroup: vi.fn(),
      })
    );

    const itemBtn = screen.getAllByRole("button", {
      name: /Hunt's Tomato Sauce 15 oz/i,
    })[0];
    fireEvent.click(itemBtn);

    expect(screen.getByText("Create Item Group")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Tomato Sauce")
    ).toBeInTheDocument();
  });
});
