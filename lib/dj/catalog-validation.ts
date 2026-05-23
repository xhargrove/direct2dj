/** Pure validators for DJ catalog mutations (unit-testable; no Supabase). */

import type { CrowdReaction } from "@/lib/types/database";

export const FEEDBACK_MIN_LEN = 3;
export const FEEDBACK_MAX_LEN = 8000;
export const RATING_COMMENT_MAX_LEN = 4000;

export type ValidationErr = { ok: false; error: string };
export type ValidationOk<T> = { ok: true; value: T };
export type ValidationResult<T> = ValidationOk<T> | ValidationErr;

export function validateRatingScore(raw: unknown): ValidationResult<number> {
  const s = Math.round(Number(raw));
  if (!Number.isFinite(s) || s < 1 || s > 5) {
    return { ok: false, error: "Rating must be between 1 and 5." };
  }
  return { ok: true, value: s };
}

export function validateRatingComment(trimmed: string | null): ValidationResult<string | null> {
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > RATING_COMMENT_MAX_LEN) {
    return { ok: false, error: `Rating note must be ${RATING_COMMENT_MAX_LEN} characters or less.` };
  }
  return { ok: true, value: trimmed };
}

const CROWD_REACTIONS: CrowdReaction[] = ["cold", "warm", "strong", "hit_potential"];

export function validateYesNoAnswer(
  value: boolean | null,
  fieldLabel: string,
): ValidationResult<boolean> {
  if (value !== true && value !== false) {
    return { ok: false, error: `Select ${fieldLabel} (yes or no) before saving.` };
  }
  return { ok: true, value };
}

export function validateOptionalCrowdReaction(raw: unknown): ValidationResult<CrowdReaction | null> {
  if (raw == null || raw === "") return { ok: true, value: null };
  if (typeof raw === "string" && CROWD_REACTIONS.includes(raw as CrowdReaction)) {
    return { ok: true, value: raw as CrowdReaction };
  }
  return { ok: false, error: "Invalid crowd reaction." };
}

/** Returns trimmed body or error (min/max length). */
export function validateFeedbackBody(raw: string): ValidationResult<string> {
  const text = raw.trim();
  if (text.length < FEEDBACK_MIN_LEN) {
    return { ok: false, error: "Feedback must be at least a few characters." };
  }
  if (text.length > FEEDBACK_MAX_LEN) {
    return { ok: false, error: `Feedback must be ${FEEDBACK_MAX_LEN} characters or less.` };
  }
  return { ok: true, value: text };
}

/** Saved feedback row qualifies for pack download (same rules as `validateFeedbackBody`). */
export function feedbackQualifiesForDownload(body: string | null | undefined): boolean {
  if (body == null || typeof body !== "string") return false;
  return validateFeedbackBody(body).ok;
}
