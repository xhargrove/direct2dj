/**
 * Admin UI: distinguish release credit (track metadata) from the owning artist profile (workspace).
 */

export function primaryReleaseArtistLabel(
  creditArtistName: string | null | undefined,
  ownerDisplayName: string | null | undefined,
): string {
  const credit = creditArtistName?.trim() ?? "";
  const owner = ownerDisplayName?.trim() ?? "";
  if (credit.length > 0) return credit;
  return owner.length > 0 ? owner : "—";
}

/** When non-null, show as secondary line — workspace differs from release credit. */
export function workspaceArtistNote(
  creditArtistName: string | null | undefined,
  ownerDisplayName: string | null | undefined,
): string | null {
  const credit = creditArtistName?.trim() ?? "";
  const owner = ownerDisplayName?.trim() ?? "";
  if (!credit || !owner || credit === owner) return null;
  return owner;
}
