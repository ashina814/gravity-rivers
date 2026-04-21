import type { State } from '@/core/state';
import { clamp, lerp } from '@/utils/math';

/**
 * Flow / Bloom system — the dopamine layer.
 *
 * Conceptually:
 *  • flow.target rises with how many orbs are in steady streams (not stagnant).
 *  • flow.value smoothly chases target so the meter feels organic.
 *  • flow.charge integrates value over time, draining gradually.
 *  • when charge crosses 1.0, a BLOOM fires:
 *       - chain += 1
 *       - bloom.count += 1
 *       - banner shown
 *       - audio chord played
 *       - particle burst + screen flash
 *       - charge reset to 0
 *  • chain decays after a quiet window.
 *
 * The whole loop has no win/lose state; it's a satisfaction generator
 * that responds to the world's complexity and keeps escalating
 * if the player keeps drawing.
 */

const FLOW_FOLLOW = 0.06;
const CHARGE_GAIN = 0.0018;       // per ms of value (so ~1.8/sec at value=1)
const CHARGE_DRAIN = 0.00045;     // per ms baseline
const CHAIN_TIMEOUT_MS = 4500;
const MAX_CHAIN = 12;

/** Compute the moment-target from current orb states. */
export function computeFlowTarget(state: State): number {
  if (state.orbs.length === 0) return 0;
  let active = 0;
  let speedSum = 0;
  let blessed = 0;
  for (const o of state.orbs) {
    if (o.dead) continue;
    const sp = Math.hypot(o.vx, o.vy);
    if (sp > 0.5 && o.lastContactMs < 350) {
      active++;
      speedSum += sp;
    }
    if (o.blessed) blessed++;
  }
  if (active === 0) return 0;

  // Scale target with both number-active and average speed
  // — but cap to 1 so meter feels achievable without extreme chaos.
  const avgSpeed = speedSum / active;
  // target = activity rate × fluidity
  const activityFactor = clamp(active / 16, 0, 1);
  const fluidityFactor = clamp(avgSpeed / 5.5, 0, 1.4);
  const blessedBonus = clamp(blessed / 6, 0, 0.4);
  return clamp(activityFactor * 0.85 + fluidityFactor * 0.4 + blessedBonus, 0, 1.05);
}

export function tickFlow(state: State, dtMs: number): void {
  const target = computeFlowTarget(state);
  state.flow.target = target;
  state.flow.value = lerp(state.flow.value, target, FLOW_FOLLOW);

  // charge accumulates with current flow value, drains baseline
  state.flow.charge += state.flow.value * CHARGE_GAIN * dtMs;
  state.flow.charge -= CHARGE_DRAIN * dtMs;
  if (state.flow.charge < 0) state.flow.charge = 0;

  if (state.flow.chainTimer > 0) {
    state.flow.chainTimer -= dtMs;
    if (state.flow.chainTimer <= 0) state.flow.chain = 0;
  }
}

/** Returns true if a bloom should fire this tick. */
export function shouldBloom(state: State): boolean {
  // Higher chains require slightly more charge — keeps things from spamming.
  const required = 1.0 + state.flow.chain * 0.18;
  return state.flow.charge >= required;
}

/** Reset charge and bump chain after a bloom fires. */
export function applyBloomReset(state: State): void {
  state.flow.charge = 0;
  state.flow.chain = Math.min(MAX_CHAIN, state.flow.chain + 1);
  state.flow.chainTimer = CHAIN_TIMEOUT_MS;
}

/** Friendly bloom labels for the banner — escalate with chain. */
export const BLOOM_NAMES = [
  'BLOOM',
  'CASCADE',
  'STREAM',
  'SURGE',
  'TORRENT',
  'NOVA FLOW',
  'PRISM RIVER',
  'AURORA',
  'EUREKA',
  'GALAXY',
  'OCEANIC',
  'INFINITE',
  'TRANSCENDENT',
];

export function bloomName(chain: number): string {
  const idx = Math.min(BLOOM_NAMES.length - 1, Math.max(0, chain - 1));
  return BLOOM_NAMES[idx];
}
