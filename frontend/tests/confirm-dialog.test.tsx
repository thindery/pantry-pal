import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm } from "@/contexts/confirm-provider";

function TestConsumer({
  title = "Delete Item",
  message = "Are you sure you want to delete this?",
  danger = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onResult,
}: {
  title?: string;
  message?: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onResult?: (result: boolean) => void;
}) {
  const confirm = useConfirm();

  const handleClick = async () => {
    const res = await confirm({
      title,
      message,
      danger,
      confirmLabel,
      cancelLabel,
    });
    onResult?.(res);
  };

  return (
    <button type="button" onClick={handleClick}>
      Trigger Confirm
    </button>
  );
}

describe("ConfirmDialog & useConfirm", () => {
  it("renders with accessible role, title, message, and resolves true when confirm clicked", async () => {
    let result: boolean | null = null;

    render(
      <ConfirmProvider>
        <TestConsumer
          title="Clear Shopping List"
          message="Are you sure you want to clear the entire shopping list?"
          confirmLabel="Clear list"
          cancelLabel="Cancel"
          danger={true}
          onResult={(r) => {
            result = r;
          }}
        />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger Confirm" }));

    const dialog = screen.getByRole("alertdialog", { name: "Clear Shopping List" });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to clear the entire shopping list?")
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Clear list" });
    expect(confirmBtn).toHaveClass("bg-rose-600");

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(result).toBe(true);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("resolves false when cancel button is clicked", async () => {
    let result: boolean | null = null;

    render(
      <ConfirmProvider>
        <TestConsumer
          title="Delete Recipe"
          message="Are you sure you want to delete this recipe?"
          onResult={(r) => {
            result = r;
          }}
        />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger Confirm" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(result).toBe(false);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("resolves false when close (X) button is clicked", async () => {
    let result: boolean | null = null;

    render(
      <ConfirmProvider>
        <TestConsumer
          onResult={(r) => {
            result = r;
          }}
        />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger Confirm" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(result).toBe(false);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("resolves false when Escape key is pressed", async () => {
    let result: boolean | null = null;

    render(
      <ConfirmProvider>
        <TestConsumer
          onResult={(r) => {
            result = r;
          }}
        />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger Confirm" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(result).toBe(false);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("resolves false when backdrop is clicked", async () => {
    let result: boolean | null = null;

    render(
      <ConfirmProvider>
        <TestConsumer
          onResult={(r) => {
            result = r;
          }}
        />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger Confirm" }));
    const dialog = screen.getByRole("alertdialog");
    const overlay = dialog.parentElement;
    expect(overlay).toBeInTheDocument();

    if (overlay) {
      fireEvent.click(overlay);
    }

    await waitFor(() => {
      expect(result).toBe(false);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("applies primary style when danger is false", async () => {
    render(
      <ConfirmProvider>
        <TestConsumer danger={false} confirmLabel="Proceed" />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger Confirm" }));

    const confirmBtn = screen.getByRole("button", { name: "Proceed" });
    expect(confirmBtn).not.toHaveClass("bg-rose-600");
    expect(confirmBtn).toHaveClass("bg-[var(--primary)]");
  });

  it("resolves previous confirm with false when a new confirm is opened (one at a time)", async () => {
    const results: boolean[] = [];

    function MultiConsumer() {
      const confirm = useConfirm();
      return (
        <div>
          <button
            type="button"
            onClick={async () => {
              const res = await confirm({ title: "First", message: "First message" });
              results.push(res);
            }}
          >
            Trigger First
          </button>
          <button
            type="button"
            onClick={async () => {
              const res = await confirm({ title: "Second", message: "Second message" });
              results.push(res);
            }}
          >
            Trigger Second
          </button>
        </div>
      );
    }

    render(
      <ConfirmProvider>
        <MultiConsumer />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Trigger First" }));
    expect(screen.getByRole("alertdialog", { name: "First" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Trigger Second" }));
    await waitFor(() => {
      expect(results).toEqual([false]);
      expect(screen.getByRole("alertdialog", { name: "Second" })).toBeInTheDocument();
    });
  });

  it("traps Tab focus inside the dialog and restores focus on close", async () => {
    render(
      <ConfirmProvider>
        <TestConsumer danger={true} />
      </ConfirmProvider>
    );

    const triggerBtn = screen.getByRole("button", { name: "Trigger Confirm" });
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    fireEvent.click(triggerBtn);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    // With danger=true, Cancel button receives initial focus
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    const closeBtn = screen.getByRole("button", { name: "Close" });

    await waitFor(() => {
      expect(document.activeElement).toBe(cancelBtn);
    });

    // Tab forwards: from cancelBtn to confirmBtn (last element)
    fireEvent.keyDown(dialog, { key: "Tab" });
    confirmBtn.focus(); // simulate natural tab
    expect(document.activeElement).toBe(confirmBtn);

    // Tab from last element wraps to first element (closeBtn)
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from first element wraps to last element (confirmBtn)
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);

    // Close and verify focus restored to trigger
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(document.activeElement).toBe(triggerBtn);
    });
  });
});
