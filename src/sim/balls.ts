import type { State } from '@/core/state';

/**
 * A single orb. Physics is Semi-implicit Euler integrated
 * against gravity + line tangent projection.
 */
export interface Orb {
  id: number;
  x: number; y: number;
  px: number; py: number;
  vx: number; vy: number;
  r: number;
  colorIdx: number;           // index into current palette
  color: string;
  mass: number;
  age: number;                // frames
  lifeMs: number;             // total ms alive
  flowMs: number;             // consecutive ms in steady flow (not stuck)
  lastContactMs: number;      // ms since last line contact
  streak: number;             // streak of no-stall frames
  spawnAnim: number;          // countdown frames for spawn flash
  energy: number;             // integrated flow energy (drives glow/particle rate)
  trail: TrailPoint[];
  bornAtTick: number;
  dead: boolean;
  /** Rainbow flag set once energy threshold exceeded. */
  blessed: boolean;
}

export interface TrailPoint {
  x: number;
  y: number;
  t: number;     // tick stamp
  color: string; // trail color (may shift with energy)
  size: number;
}

let ID = 1;
export function nextOrbId(): number { return ID++; }

export interface SpawnOptions {
  x: number;
  y: number;
  colorIdx: number;
  color: string;
  r?: number;
  vx?: number;
  vy?: number;
}

export function makeOrb(opts: SpawnOptions): Orb {
  const r = opts.r ?? 7;
  return {
    id: nextOrbId(),
    x: opts.x, y: opts.y,
    px: opts.x, py: opts.y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0.3,
    r,
    mass: r * r,
    colorIdx: opts.colorIdx,
    color: opts.color,
    age: 0,
    lifeMs: 0,
    flowMs: 0,
    lastContactMs: 9999,
    streak: 0,
    spawnAnim: 18,
    energy: 0,
    trail: [],
    bornAtTick: 0,
    dead: false,
    blessed: false,
  };
}

/** Max orbs alive at once — prevents runaway frame cost. */
export const MAX_ORBS = 220;

/** Max trail points per orb. Scales with energy. */
export const BASE_TRAIL_CAP = 18;
export const BLESSED_TRAIL_CAP = 42;

/** Remove orbs that fell off the bottom or have been marked dead. */
export function harvestOrbs(state: State): number {
  let removed = 0;
  const keep: Orb[] = [];
  for (const o of state.orbs) {
    if (o.dead) { removed++; continue; }
    // Orbs that pass the bottom edge gracefully "release" and recycle.
    if (o.y > state.stage.h + o.r * 4) { removed++; continue; }
    keep.push(o);
  }
  state.orbs = keep;
  return removed;
}
