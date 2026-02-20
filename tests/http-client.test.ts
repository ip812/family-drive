import { describe, it, expect, vi, beforeEach } from "vitest";
import { getV1, postV1, deleteV1 } from "../http/client";
import { isToast } from "../toasts";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getV1", () => {
  it("calls the correct URL and returns parsed JSON", async () => {
    mockFetch.mockReturnValue(jsonResponse({ id: 1, name: "Test" }));
    const result = await getV1("/albums");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/albums",
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual({ id: 1, name: "Test" });
  });

  it("returns an error Toast when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const result = await getV1("/albums");
    expect(isToast(result)).toBe(true);
  });
});

describe("postV1", () => {
  it("sends JSON body and returns parsed response", async () => {
    mockFetch.mockReturnValue(jsonResponse({ id: 5, name: "New" }, 201));
    const result = await postV1("/albums", { name: "New" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/albums",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "New" }),
      })
    );
    expect(result).toEqual({ id: 5, name: "New" });
  });

  it("returns the response body as-is (including error Toasts from server)", async () => {
    const errorToast = { code: 400, message: "Bad request" };
    mockFetch.mockReturnValue(jsonResponse(errorToast, 400));
    const result = await postV1("/albums", { name: "" });
    expect(isToast(result)).toBe(true);
  });
});

describe("deleteV1", () => {
  it("sends DELETE request to the correct URL", async () => {
    mockFetch.mockReturnValue(jsonResponse({ code: 200, message: "deleted" }));
    await deleteV1("/albums/1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/albums/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("returns an error Toast when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const result = await deleteV1("/albums/1");
    expect(isToast(result)).toBe(true);
  });
});
