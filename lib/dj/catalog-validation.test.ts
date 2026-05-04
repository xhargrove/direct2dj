import { describe, expect, it } from "vitest";

import {
  FEEDBACK_MAX_LEN,
  validateFeedbackBody,
  validateRatingComment,
  validateRatingScore,
} from "./catalog-validation";

describe("validateRatingScore", () => {
  it("accepts integers 1–5", () => {
    expect(validateRatingScore(3)).toEqual({ ok: true, value: 3 });
    expect(validateRatingScore("4")).toEqual({ ok: true, value: 4 });
  });
  it("rejects out of range", () => {
    expect(validateRatingScore(0).ok).toBe(false);
    expect(validateRatingScore(6).ok).toBe(false);
    expect(validateRatingScore(NaN).ok).toBe(false);
  });
});

describe("validateRatingComment", () => {
  it("allows null when empty", () => {
    expect(validateRatingComment(null)).toEqual({ ok: true, value: null });
    expect(validateRatingComment("")).toEqual({ ok: true, value: null });
  });
  it("rejects when too long", () => {
    const long = "x".repeat(4001);
    const r = validateRatingComment(long);
    expect(r.ok).toBe(false);
  });
});

describe("validateFeedbackBody", () => {
  it("rejects short trimmed body", () => {
    expect(validateFeedbackBody("ab").ok).toBe(false);
  });
  it("accepts minimal length", () => {
    expect(validateFeedbackBody("abc")).toEqual({ ok: true, value: "abc" });
  });
  it("rejects over max", () => {
    const r = validateFeedbackBody("x".repeat(FEEDBACK_MAX_LEN + 1));
    expect(r.ok).toBe(false);
  });
});
