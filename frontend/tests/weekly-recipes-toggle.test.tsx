import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getEmailPreferences = vi.fn();
const updateEmailPreferences = vi.fn();
vi.mock("@/services/email-preferences", () => ({
  getEmailPreferences: () => getEmailPreferences(),
  updateEmailPreferences: (u: unknown) => updateEmailPreferences(u),
}));

import { WeeklyRecipesToggle } from "@/components/WeeklyRecipesToggle";

afterEach(() => {
  cleanup();
  getEmailPreferences.mockReset();
  updateEmailPreferences.mockReset();
});

describe("WeeklyRecipesToggle (PP-235)", () => {
  it("renders nothing until marketing email is live", async () => {
    getEmailPreferences.mockResolvedValue({ available: false, lowStockDigest: false, weeklyRecipesAvailable: false, weeklyRecipes: false });
    const { container } = render(<WeeklyRecipesToggle />);
    await waitFor(() => expect(getEmailPreferences).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an older server that does not know about it", async () => {
    getEmailPreferences.mockResolvedValue({ available: true, lowStockDigest: false });
    const { container } = render(<WeeklyRecipesToggle />);
    await waitFor(() => expect(getEmailPreferences).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("is off by default and opting in sends only the weekly switch", async () => {
    getEmailPreferences.mockResolvedValue({ available: false, lowStockDigest: false, weeklyRecipesAvailable: true, weeklyRecipes: false });
    updateEmailPreferences.mockResolvedValue({ available: false, lowStockDigest: false, weeklyRecipesAvailable: true, weeklyRecipes: true });
    render(<WeeklyRecipesToggle />);
    const sw = await screen.findByRole("switch", { name: "Weekly recipe email" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(updateEmailPreferences).not.toHaveBeenCalled();
    fireEvent.click(sw);
    await waitFor(() => expect(sw).toHaveAttribute("aria-checked", "true"));
    expect(updateEmailPreferences).toHaveBeenCalledWith({ weeklyRecipes: true });
  });

  it("opting out sends false, and a failed save shows an error and keeps the old state", async () => {
    getEmailPreferences.mockResolvedValue({ available: false, lowStockDigest: false, weeklyRecipesAvailable: true, weeklyRecipes: true });
    updateEmailPreferences.mockRejectedValueOnce(new Error("nope"));
    render(<WeeklyRecipesToggle />);
    const sw = await screen.findByRole("switch");
    fireEvent.click(sw);
    expect(await screen.findByText("Couldn't save. Please try again.")).toBeInTheDocument();
    expect(sw).toHaveAttribute("aria-checked", "true");
    updateEmailPreferences.mockResolvedValueOnce({ available: false, lowStockDigest: false, weeklyRecipesAvailable: true, weeklyRecipes: false });
    fireEvent.click(sw);
    await waitFor(() => expect(sw).toHaveAttribute("aria-checked", "false"));
    expect(updateEmailPreferences).toHaveBeenLastCalledWith({ weeklyRecipes: false });
  });
});
