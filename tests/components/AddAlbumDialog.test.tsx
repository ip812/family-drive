import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddAlbumDialog from "../../app/components/AddAlbumDialog";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../http/client", () => ({
  postV1: vi.fn(),
}));

import { postV1 } from "../../http/client";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

const openDialog = () => {
  fireEvent.click(screen.getByRole("button", { name: /нов албум/i }));
};

const submitForm = (name: string) => {
  fireEvent.change(screen.getByLabelText(/Име на албума/i), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", { name: /създай$/i }));
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AddAlbumDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the trigger button", () => {
    render(<AddAlbumDialog />);
    expect(screen.getByRole("button", { name: /нов албум/i })).toBeInTheDocument();
  });

  it("opens the dialog on button click", async () => {
    render(<AddAlbumDialog />);
    openDialog();
    expect(await screen.findByText("Създай нов албум")).toBeInTheDocument();
  });

  it("shows a validation error when submitting an empty name", async () => {
    render(<AddAlbumDialog />);
    openDialog();
    await screen.findByText("Създай нов албум");

    fireEvent.click(screen.getByRole("button", { name: /създай$/i }));
    expect(await screen.findByText(/Моля въведете/i)).toBeInTheDocument();
    expect(postV1).not.toHaveBeenCalled();
  });

  it("calls postV1 with the trimmed name", async () => {
    vi.mocked(postV1).mockResolvedValue({
      id: 7,
      name: "Зима 2024",
      createdAt: "2024-01-01",
      imageCount: 0,
      coverKey: null,
    });

    render(<AddAlbumDialog />);
    openDialog();
    await screen.findByText("Създай нов албум");

    submitForm("  Зима 2024  ");

    await waitFor(() =>
      expect(postV1).toHaveBeenCalledWith("/albums", { name: "Зима 2024" })
    );
  });

  it("shows success toast and closes dialog on success", async () => {
    vi.mocked(postV1).mockResolvedValue({
      id: 7,
      name: "Зима 2024",
      createdAt: "2024-01-01",
      imageCount: 0,
      coverKey: null,
    });

    render(<AddAlbumDialog />);
    openDialog();
    await screen.findByText("Създай нов албум");
    submitForm("Зима 2024");

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Албумът „Зима 2024" е създаден')
    );
    // Dialog should close
    await waitFor(() =>
      expect(screen.queryByText("Създай нов албум")).not.toBeInTheDocument()
    );
  });

  it("shows an error toast when the API returns an error", async () => {
    vi.mocked(postV1).mockResolvedValue({ code: 500, message: "Грешка" });

    render(<AddAlbumDialog />);
    openDialog();
    await screen.findByText("Създай нов албум");
    submitForm("Тест");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Грешка"));
    // Dialog stays open
    expect(screen.getByText("Създай нов албум")).toBeInTheDocument();
  });
});
