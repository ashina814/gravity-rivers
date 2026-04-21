import type { State } from '@/core/state';
import { makeOrb, MAX_ORBS } from './balls';
import { lerp } from '@/utils/math';

/**
 * Where orbs come from. We support a single primary fountain near the
 * top centre with subtle horizontal drift, plus an occasional "burst"
 * of paired orbs to keep the river alive when the player has built
 * sustained channels.
 */
export interface Spawner {
  x: number;
  y: number;
  /** Half-width of the horizontal jitter band. */
  spread: number;
}

/**
 * Recompute the spawner location to follow stage resizes.
 */
export function spawnerForStage(state: State): Spawner {
  return {
    x: state.stage.w * 0.5,
    y: -10,
    spread: Math.min(80, state.stage.w * 0.18),
  };
}

/**
 * Convert the user spawn-rate (0..1) into orbs/second.
 * Curve is biased so most of the slider sits in the comfortable range.
 */
export function spawnRatePerSec(rate01: number): number {
  const t = Math.max(0, Math.min(1, rate01));
  // gentle quadratic ramp 0 → 9 orbs/sec
  return lerp(0.4, 9, t * t);
}

/**
 * Spawn a single orb at the current fountain position with subtle
 * randomness. Returns the new orb (or null if the cap was reached).
 */
export function spawnOrbNow(state: State, sp: Spawner) {
  if (state.orbs.length >= MAX_ORBS) return null;
  const colors = state.palette.colors;
  // Cycle through palette in order, with small chance of skipping ahead
  // to break monotony without going random (which feels jittery).
  state.colorCursor = (state.colorCursor + (Math.random() < 0.12 ? 2 : 1)) % colors.length;
  const colorIdx = state.colorCursor;
  const color = colors[colorIdx];
  const jx = (Math.random() - 0.5) * sp.spread;
  const x = sp.x + jx;
  const y = sp.y;
  const orb = makeOrb({
    x, y,
    colorIdx,
    color,
    r: 6 + Math.random() * 3,
    vx: jx * 0.01,
    vy: 0.4 + Math.random() * 0.4,
  });
  orb.bornAtTick = state.tick;
  state.orbs.push(orb);
  state.spawnSeq++;
  return orb;
}

/**
 * Drive the spawn loop. Called from sim step with dtMs.
 */
export function tickSpawner(state: State, dtMs: number): void {
  const rate = spawnRatePerSec(state.settings.spawnRate);
  if (rate <= 0) return;
  state.spawnAcc += dtMs * 0.001 * rate;
  const sp = spawnerForStage(state);
  while (state.spawnAcc >= 1) {
    state.spawnAcc -= 1;
    spawnOrbNow(state, sp);
  }
}
