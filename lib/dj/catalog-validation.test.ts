import { describe, expect, it } from "vitest";

import {
  FEEDBACK_MAX_LEN,
  feedbackQualifiesForDownload,
  validateFeedbackBody,
  validateOptionalCrowdReaction,
  validateRatingComment,
  validateRatingScore,
  validateYesNoAnswer,
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

describe("validateYesNoAnswer", () => {
  it("accepts true or false", () => {
    expect(validateYesNoAnswer(true, "club ready")).toEqual({ ok: true, value: true });
    expect(validateYesNoAnswer(false, "radio ready")).toEqual({ ok: true, value: false });
  });
  it("rejects unset", () => {
    expect(validateYesNoAnswer(null, "club ready").ok).toBe(false);
  });
});

describe("validateOptionalCrowdReaction", () => {
  it("allows empty", () => {
    expect(validateOptionalCrowdReaction("")).toEqual({ ok: true, value: null });
    expect(validateOptionalCrowdReaction(null)).toEqual({ ok: true, value: null });
  });
  it("accepts valid reactions", () => {
    expect(validateOptionalCrowdReaction("warm")).toEqual({ ok: true, value: "warm" });
  });
  it("rejects invalid", () => {
    expect(validateOptionalCrowdReaction("lukewarm").ok).toBe(false);
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

describe("feedbackQualifiesForDownload", () => {
  it("is false until minimum length is met", () => {
    expect(feedbackQualifiesForDownload(null)).toBe(false);
    expect(feedbackQualifiesForDownload("")).toBe(false);
    expect(feedbackQualifiesForDownload("ab")).toBe(false);
    expect(feedbackQualifiesForDownload("abc")).toBe(true);
  });
});
