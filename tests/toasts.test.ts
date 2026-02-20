import { describe, it, expect } from "vitest";
import {
  isToast,
  isSuccess,
  isWarning,
  isError,
  ToastError,
} from "../toasts";
import { successOk, successCreated } from "../toasts/success";
import { errorInternalServerError } from "../toasts/errors";
import { warningBadRequest, warningNotFound } from "../toasts/warnings";

describe("isToast", () => {
  it("returns true for a valid Toast object", () => {
    expect(isToast({ code: 200, message: "ok" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isToast(null)).toBe(false);
  });

  it("returns false when code is missing", () => {
    expect(isToast({ message: "oops" })).toBe(false);
  });

  it("returns false when message is not a string", () => {
    expect(isToast({ code: 200, message: 42 })).toBe(false);
  });

  it("returns false for a plain string", () => {
    expect(isToast("error")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isToast(404)).toBe(false);
  });
});

describe("isSuccess / isWarning / isError", () => {
  it("isSuccess is true for 2xx codes", () => {
    expect(isSuccess({ code: 200, message: "" })).toBe(true);
    expect(isSuccess({ code: 201, message: "" })).toBe(true);
    expect(isSuccess({ code: 299, message: "" })).toBe(true);
  });

  it("isSuccess is false for non-2xx codes", () => {
    expect(isSuccess({ code: 400, message: "" })).toBe(false);
    expect(isSuccess({ code: 500, message: "" })).toBe(false);
  });

  it("isWarning is true for 4xx codes", () => {
    expect(isWarning({ code: 400, message: "" })).toBe(true);
    expect(isWarning({ code: 404, message: "" })).toBe(true);
    expect(isWarning({ code: 499, message: "" })).toBe(true);
  });

  it("isWarning is false for non-4xx codes", () => {
    expect(isWarning({ code: 200, message: "" })).toBe(false);
    expect(isWarning({ code: 500, message: "" })).toBe(false);
  });

  it("isError is true for 5xx codes", () => {
    expect(isError({ code: 500, message: "" })).toBe(true);
    expect(isError({ code: 503, message: "" })).toBe(true);
  });

  it("isError is false for non-5xx codes", () => {
    expect(isError({ code: 200, message: "" })).toBe(false);
    expect(isError({ code: 400, message: "" })).toBe(false);
  });
});

describe("toast creators", () => {
  it("successOk returns code 200", () => {
    const t = successOk("done");
    expect(t).toEqual({ code: 200, message: "done" });
  });

  it("successCreated returns code 201", () => {
    const t = successCreated("created");
    expect(t).toEqual({ code: 201, message: "created" });
  });

  it("errorInternalServerError returns code 500", () => {
    const t = errorInternalServerError("boom");
    expect(t).toEqual({ code: 500, message: "boom" });
  });

  it("warningBadRequest returns code 400", () => {
    const t = warningBadRequest("bad");
    expect(t).toEqual({ code: 400, message: "bad" });
  });

  it("warningNotFound returns code 404", () => {
    const t = warningNotFound("missing");
    expect(t).toEqual({ code: 404, message: "missing" });
  });
});

describe("ToastError", () => {
  it("wraps a Toast and exposes it via getError()", () => {
    const toast = errorInternalServerError("server error");
    const err = new ToastError(toast);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("server error");
    expect(err.getError()).toEqual(toast);
  });
});
