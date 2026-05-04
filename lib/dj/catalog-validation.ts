/** Pure validators for DJ catalog mutations (unit-testable; no Supabase). */

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
