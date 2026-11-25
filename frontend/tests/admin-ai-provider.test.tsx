import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { AiProviderPanel } from "@/components/admin/AiProviderPanel";
import * as adminService from "@/services/adminService";
import type { AiProviderSettings } from "@/services/adminService";

const base: AiProviderSettings = {
  provider: "ollama",
  options: ["ollama", "gemini"],
  enabled: true,
  ollamaConfigured: true,
  geminiConfigured: true,
};

describe("AiProviderPanel (PP-186)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Ollama selected before anything loads (default)", () => {
    vi.spyOn(adminService, "getAiProviderSettings").mockReturnValue(new Promise(() => {}));
    render(<AiProviderPanel />);
    expect(screen.getByRole("radio", { name: "Ollama" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Gemini" })).toHaveAttribute("aria-checked", "false");
  });

  it("stays on Ollama when the server has nothing stored", async () => {
    vi.spyOn(adminService, "getAiProviderSettings").mockResolvedValue(base);
    render(<AiProviderPanel />);
    await waitFor(() => expect(screen.getByText(/Keys on server/)).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: "Ollama" })).toHaveAttribute("aria-checked", "true");
  });

  it("falls back to showing Ollama if the setting cannot be loaded", async () => {
    vi.spyOn(adminService, "getAiProviderSettings").mockRejectedValue(new Error("down"));
    render(<AiProviderPanel />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: "Ollama" })).toHaveAttribute("aria-checked", "true");
  });

  it("shows a stored Gemini choice", async () => {
    vi.spyOn(adminService, "getAiProviderSettings").mockResolvedValue({ ...base, provider: "gemini" });
    render(<AiProviderPanel />);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Gemini" })).toHaveAttribute("aria-checked", "true"));
  });

  it("saves a change to the server and reflects it", async () => {
    vi.spyOn(adminService, "getAiProviderSettings").mockResolvedValue(base);
    const save = vi.spyOn(adminService, "setAiProvider").mockResolvedValue({ ...base, provider: "gemini" });
    render(<AiProviderPanel />);
    await waitFor(() => expect(screen.getByText(/Keys on server/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("radio", { name: "Gemini" }));
    expect(save).toHaveBeenCalledWith("gemini");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Gemini" })).toHaveAttribute("aria-checked", "true"));
  });

  it("reverts the toggle and says so when saving fails", async () => {
    vi.spyOn(adminService, "getAiProviderSettings").mockResolvedValue(base);
    vi.spyOn(adminService, "setAiProvider").mockRejectedValue(new Error("500"));
    render(<AiProviderPanel />);
    await waitFor(() => expect(screen.getByText(/Keys on server/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("radio", { name: "Gemini" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Nothing changed"));
    expect(screen.getByRole("radio", { name: "Ollama" })).toHaveAttribute("aria-checked", "true");
  });

  it("warns when the server feature flag is off and never shows key values", async () => {
    vi.spyOn(adminService, "getAiProviderSettings").mockResolvedValue({ ...base, enabled: false });
    render(<AiProviderPanel />);
    await waitFor(() => expect(screen.getByTestId("ai-provider-flag-off")).toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(/sk-|AIza/);
  });
});
