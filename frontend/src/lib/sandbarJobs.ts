/**
 * Sandbar Soft Wash — real-job before/after photo manifest.
 *
 * Drop compressed job photos into frontend/public/images/sandbar/ and list
 * them here. The case-study "Real jobs" section renders one slider per entry
 * and auto-hides entirely while this list is empty (no-fabricated-proof rule:
 * only real, owned job photos — never stock, never event photography, and
 * nothing carrying a third-party watermark).
 *
 * Keep each image ≤ ~150KB (match the repo's image-compression precedent) and
 * shoot pairs from the same angle so the slider reads as one scene.
 */
export type SandbarJob = {
  /** e.g. '/images/sandbar/roof-1-before.jpg' */
  before: string;
  after: string;
  /** Short, factual label — service + surface, e.g. 'Tile roof soft wash · Palm Harbor' */
  label: string;
  /** Accessible description of the scene, e.g. 'Tile roof, front of single-story home' */
  alt: string;
};

export const SANDBAR_JOBS: SandbarJob[] = [
  // e.g.
  // {
  //   before: '/images/sandbar/roof-1-before.jpg',
  //   after: '/images/sandbar/roof-1-after.jpg',
  //   label: 'Tile roof soft wash · Palm Harbor',
  //   alt: 'Tile roof on a single-story Palm Harbor home',
  // },
];
