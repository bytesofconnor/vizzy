/** Rec ids that left the latest snapshot. Human state for those ids is cleared on publish. */
export function recsDropped(previousIds: string[], nextIds: string[]): string[] {
  const next = new Set(nextIds);
  return previousIds.filter((id) => !next.has(id));
}
