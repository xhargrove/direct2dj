import { describe, expect, it } from "vitest";
import { resolveAccountAccessState } from "@/lib/auth/account-access-state";

const profile = {
  id: "user-1",
  role: "dj" as const,
  full_name: "Test DJ",
  email: "dj@example.com",
};

const artistProfile = {
  id: "user-2",
  role: "artist" as const,
  full_name: "Test Artist",
  email: "artist@example.com",
};

const dj = { id: "dj-1", vetting_status: "pending" as const };
const application = { id: "app-1", dj_id: "dj-1" };

describe("resolveAccountAccessState", () => {
  it("returns SIGNED_OUT when there is no session", () => {
    const result = resolveAccountAccessState({
      userId: null,
      profile: null,
      dj: null,
      djApplication: null,
      artist: null,
      workspace: "dj",
    });
    expect(result.state).toBe("SIGNED_OUT");
  });

  it("returns NO_PROFILE for signed-in user without profile", () => {
    const result = resolveAccountAccessState({
      userId: "user-1",
      profile: null,
      dj: null,
      djApplication: null,
      artist: null,
      workspace: "dj",
    });
    expect(result.state).toBe("NO_PROFILE");
  });

  it("returns ARTIST_ACCOUNT for artist role", () => {
    const result = resolveAccountAccessState({
      userId: "user-2",
      profile: artistProfile,
      dj: null,
      djApplication: null,
      artist: { id: "artist-1" },
      workspace: "dj",
    });
    expect(result.state).toBe("ARTIST_ACCOUNT");
  });

  it("returns DJ_APPLICATION_NOT_STARTED when DJ has no application row", () => {
    const result = resolveAccountAccessState({
      userId: "user-1",
      profile,
      dj,
      djApplication: null,
      artist: null,
      workspace: "dj",
    });
    expect(result.state).toBe("DJ_APPLICATION_NOT_STARTED");
  });

  it("returns DJ_APPLICATION_PENDING when pending with submitted application", () => {
    const result = resolveAccountAccessState({
      userId: "user-1",
      profile,
      dj,
      djApplication: application,
      artist: null,
      workspace: "dj",
    });
    expect(result.state).toBe("DJ_APPLICATION_PENDING");
  });

  it("returns DJ_APPLICATION_REJECTED for rejected vetting", () => {
    const result = resolveAccountAccessState({
      userId: "user-1",
      profile,
      dj: { id: "dj-1", vetting_status: "rejected" },
      djApplication: application,
      artist: null,
      workspace: "dj",
    });
    expect(result.state).toBe("DJ_APPLICATION_REJECTED");
  });

  it("returns DJ_APPROVED for approved vetting", () => {
    const result = resolveAccountAccessState({
      userId: "user-1",
      profile,
      dj: { id: "dj-1", vetting_status: "approved" },
      djApplication: application,
      artist: null,
      workspace: "dj",
    });
    expect(result.state).toBe("DJ_APPROVED");
  });

  it("returns UNKNOWN_ERROR on query error", () => {
    const result = resolveAccountAccessState({
      userId: "user-1",
      profile,
      dj,
      djApplication: null,
      artist: null,
      workspace: "dj",
      queryError: "timeout",
    });
    expect(result.state).toBe("UNKNOWN_ERROR");
  });
});
