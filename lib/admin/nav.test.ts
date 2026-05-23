import { describe, expect, it } from "vitest";
import { activeAdminNavHref, coAdminNav, fullAdminNav } from "./nav";

describe("activeAdminNavHref", () => {
  it("highlights New DJ pack on /admin/tracks/new", () => {
    expect(activeAdminNavHref("/admin/tracks/new", fullAdminNav)).toBe("/admin/tracks/new");
  });

  it("highlights Tracks on track detail", () => {
    expect(activeAdminNavHref("/admin/tracks/abc-123", fullAdminNav)).toBe("/admin/tracks");
  });

  it("highlights Dashboard exactly", () => {
    expect(activeAdminNavHref("/admin/dashboard", coAdminNav)).toBe("/admin/dashboard");
  });
});
