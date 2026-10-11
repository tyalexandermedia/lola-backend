import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordedCount, rankingCoverage, snapshotAge } from '../src/lib/reportingEvidence.ts';
test('a recorded zero differs from an absent or invalid measurement', () => {
  assert.equal(recordedCount(0), 0);
  for (const value of [undefined, null, NaN, -1, '37', Infinity]) assert.equal(recordedCount(value), null);
});
test('unavailable rank positions never become a not-ranking claim', () => {
  assert.equal(rankingCoverage([null, undefined, NaN, 0, -1]).label, 'Ranking data unavailable');
  assert.deepEqual(rankingCoverage([1, 10, 11, null]), { available: 3, top10: 2, label: '2 top-10 · 3/4 positions available' });
});
test('report generation date is not represented as feed freshness', () => {
  const now = Date.parse('2026-10-11T12:00:00Z');
  assert.equal(snapshotAge('invalid', now).fresh, false);
  assert.equal(snapshotAge('2026-12-11T12:00:00Z', now).label, 'Snapshot date unavailable');
  assert.equal(snapshotAge('2026-10-11T10:00:00Z', now).label, 'Report assembled today');
  assert.equal(snapshotAge('2026-10-01T12:00:00Z', now).fresh, false);
});
