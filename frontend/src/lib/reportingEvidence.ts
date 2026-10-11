/** Display rules for the existing public feed. No invented operational data. */
export function recordedCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function validPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
export function snapshotAge(iso: string, now = Date.now()): { label: string; fresh: boolean } {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp) || timestamp > now + 300000) return { label: 'Snapshot date unavailable', fresh: false };
  const days = Math.max(0, (now - timestamp) / 86400000);
  return { label: days < 1 ? 'Report assembled today' : days < 8 ? `Report assembled ${Math.floor(days)}d ago` : `Report snapshot ${Math.floor(days)}d old`, fresh: days < 8 };
}
export function rankingCoverage(positions: unknown[]): { available: number; top10: number; label: string } {
  const available = positions.filter(validPosition);
  const top10 = available.filter(p => p <= 10).length;
  return { available: available.length, top10, label: available.length === 0 ? 'Ranking data unavailable' : `${top10} top-10 · ${available.length}/${positions.length} positions available` };
}
