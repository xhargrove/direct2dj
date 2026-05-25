import { describe, expect, it } from "vitest";
import {
  serializeFeedbackCsv,
  serializeFeedbackText,
  type TrackFeedbackExportBundle,
} from "./track-feedback-export";

const sampleBundle: TrackFeedbackExportBundle = {
  trackId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  trackTitle: "Test Song",
  creditArtistName: "Artist One",
  exportedAt: "2026-01-15T18:30:00.000Z",
  basename: "test-song-aaaaaaaa-feedback",
  rows: [
    {
      djId: "11111111-2222-3333-4444-555555555555",
      djDisplayName: "DJ Alpha",
      djTier: "Club DJ",
      djLocation: "Atlanta, GA",
      ratingScore: 4,
      clubReady: true,
      radioReady: false,
      crowdReaction: "warm",
      ratingComment: 'Great "hook"',
      ratingAt: "2026-01-10T12:00:00.000Z",
      feedbackBody: "Line one\nLine two",
      feedbackStatus: "approved",
      feedbackAt: "2026-01-11T12:00:00.000Z",
    },
  ],
};

describe("serializeFeedbackCsv", () => {
  it("includes UTF-8 BOM and escapes quoted fields", () => {
    const csv = serializeFeedbackCsv(sampleBundle);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('Great ""hook""');
    expect(csv).toContain("Line one\nLine two");
    expect(csv).toContain("DJ Alpha");
  });

  it("exports headers when there are no rows", () => {
    const csv = serializeFeedbackCsv({ ...sampleBundle, rows: [] });
    expect(csv).toContain("dj_name,dj_tier");
  });
});

describe("serializeFeedbackText", () => {
  it("includes track metadata and DJ sections", () => {
    const text = serializeFeedbackText(sampleBundle);
    expect(text).toContain("Track: Test Song");
    expect(text).toContain("Credit: Artist One");
    expect(text).toContain("DJ 1: DJ Alpha");
    expect(text).toContain("Line one");
    expect(text).toContain("Status: approved");
  });

  it("notes when there is no feedback", () => {
    const text = serializeFeedbackText({ ...sampleBundle, rows: [] });
    expect(text).toContain("No ratings or feedback");
  });
});
