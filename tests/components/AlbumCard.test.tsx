import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AlbumCard from "../../app/components/AlbumCard";
import type { AlbumResponse } from "../../types/albums";

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
  deleteV1: vi.fn(),
}));

import { deleteV1 } from "../../http/client";
import { toast } from "sonner";
import { successOk } from "../../toasts/success";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const album: AlbumResponse = {
  id: 1,
  name: "Лято 2024",
  createdAt: "2024-07-01T00:00:00.000Z",
  imageCount: 12,
  coverKey: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AlbumCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the album name", () => {
    render(<AlbumCard album={album} />);
    expect(screen.getByText("Лято 2024")).toBeInTheDocument();
  });

  it("renders the image count", () => {
    render(<AlbumCard album={album} />);
    expect(screen.getByText(/12 снимки/)).toBeInTheDocument();
  });

  it("renders singular count correctly", () => {
    render(<AlbumCard album={{ ...album, imageCount: 1 }} />);
    expect(screen.getByText(/1 снимка/)).toBeInTheDocument();
  });

  it("links to the album detail page", () => {
    render(<AlbumCard album={album} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/albums/1");
  });

  it("has a delete button", () => {
    render(<AlbumCard album={album} />);
    expect(screen.getByTitle("Изтрий албума")).toBeInTheDocument();
  });

  it("opens a confirmation dialog when delete is clicked", async () => {
    render(<AlbumCard album={album} />);
    fireEvent.click(screen.getByTitle("Изтрий албума"));
    expect(await screen.findByRole("heading", { name: "Изтрий албума" })).toBeInTheDocument();
    expect(screen.getByText(/безвъзвратно/)).toBeInTheDocument();
  });

  it("calls deleteV1 and onDelete on confirmation", async () => {
    vi.mocked(deleteV1).mockResolvedValue(successOk("Изтрит"));
    const onDelete = vi.fn();

    render(<AlbumCard album={album} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle("Изтрий албума"));

    const confirmBtn = await screen.findByRole("button", { name: "Изтрий" });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
    expect(deleteV1).toHaveBeenCalledWith("/albums/1");
    expect(toast.success).toHaveBeenCalledWith("Албумът е изтрит");
  });

  it("shows an error toast when deleteV1 returns an error", async () => {
    vi.mocked(deleteV1).mockResolvedValue({ code: 500, message: "Грешка" });

    render(<AlbumCard album={album} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Изтрий албума"));

    const confirmBtn = await screen.findByRole("button", { name: "Изтрий" });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Грешка"));
  });
});
