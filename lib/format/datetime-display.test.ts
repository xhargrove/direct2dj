import { describe, expect, it } from "vitest";
import { formatDateDisplay, formatDateTimeDisplay } from "./datetime-display";

describe("formatDateTimeDisplay", () => {
  it("uses a fixed timezone so Node and browser output can match", () => {
    const iso = "2026-01-15T18:30:00.000Z";
    expect(formatDateTimeDisplay(iso)).toBe("01/15/2026, 01:30:00 PM");
  });

  it("formatDateDisplay uses the same timezone", () => {
    const iso = "2026-01-15T18:30:00.000Z";
    expect(formatDateDisplay(iso)).toBe("01/15/2026");
  });
});
