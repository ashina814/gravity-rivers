import { makeClock, type Clock } from './time';
import type { State } from './state';
import type { AudioEngine } from '@/audio/audio';
import type { BgmHandle } from '@/audio/bgm';
import { sfxBloom, sfxSpawn } from '@/audio/sfx';
import { tickSpawner } from '@/sim/spawn';
import { stepPhysics } from '@/sim/physics';
import { tickFlow, shouldBloom, applyBloomReset, bloomName } from '@/sim/flow';
import { updateFx } from '@/render/fx';
import { harvestOrbs } from '@/sim/balls';
import { decaySegmentTraffic } from '@/sim/lines';
import type { HudRuntime } from '@/ui/hud';

/**
 * The application shell. Knows how to step the sim at a fixed rate,
 * update FX, and call the renderer. Frame count, spawn throttle,
 * flow integration, bloom triggers all live here.
 */
export interface App {
  clock: Clock;
  start(): void;
  stop(): void;
  setPaused(p: boolean): void;
}

export interface AppHooks {
  render(state: State): void;
  hud: HudRuntime;
  bgm: BgmHandle;
  audio: AudioEngine;
  onBloom?(state: State): void;
}

export function makeApp(state: State, hooks: AppHooks): App {
  const clock = makeClock({ stepMs: 1000 / 120, maxSubsteps: 6 });

  let lastNow = 0;
  function frame(now: number): void {
    const dt = now - lastNow;
    state.lastFrameMs = dt || 16;
    lastNow = now;

    clock.advance(now, (stepMs) => simStep(state, stepMs, hooks));
    state.timeMs += state.lastFrameMs; // wall time, used for shaders

    // HUD lives in screen space — update each frame.
    hooks.hud.update(state);

    // Update BGM intensity continuously to follow flow value.
    hooks.bgm.setIntensity(state.flow.value * 0.9 + state.flow.charge * 0.25);
    hooks.bgm.setMuted(!state.settings.bgm);

    // Update FX outside of sim to preserve RAF cadence for visuals.
    updateFx(state, state.lastFrameMs);

    hooks.render(state);
    rafToken = requestAnimationFrame(frame);
  }

  let rafToken = 0;
  function start() {
    lastNow = performance.now();
    clock.reset(lastNow);
    rafToken = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(rafToken);
  }
  function setPaused(p: boolean) {
    state.paused = p;
    clock.setRunning(!p && state.began);
  }

  return { clock, start, stop, setPaused };
}

/**
 * One fixed simulation step.
 */
function simStep(state: State, stepMs: number, hooks: AppHooks) {
  state.tick++;

  // spawn new orbs
  if (state.began) tickSpawner(state, stepMs);

  // physics
  stepPhysics(state, stepMs);
  harvestOrbs(state);

  // flow + bloom
  tickFlow(state, stepMs);
  if (shouldBloom(state)) fireBloom(state, hooks);

  // line upkeep
  if (state.settings.lineLife > 0) {
    // Line life slider is normalized 0..1 with 1.0 ≈ 16 sec fade.
    const fadeMs = Math.max(1, state.settings.lineLife * 16000);
    for (const L of state.lines) {
      L.ageMs += stepMs;
      L.life = Math.max(0, 1 - L.ageMs / fadeMs);
    }
    state.lines = state.lines.filter((L) => L.life > 0);
  } else {
    for (const L of state.lines) { L.life = 1; }
  }

  // cool down line segment traffic over time (for visuals)
  decaySegmentTraffic(state, 0.012);
}

function fireBloom(state: State, hooks: AppHooks) {
  applyBloomReset(state);
  state.bloom.count += 1;
  state.bloom.pulse = 1.0;
  state.bloom.lastAt = state.timeMs;
  state.screenFlash = Math.min(1, 0.35 + state.flow.chain * 0.04);

  // shake scales with chain
  const shakeMag = 2 + state.flow.chain * 1.5;
  state.shakeMag = Math.max(state.shakeMag, shakeMag);
  state.shakeMs = Math.max(state.shakeMs, 220 + state.flow.chain * 40);

  const name = bloomName(state.flow.chain);
  const palette = state.palette;
  const color = palette.colors[state.flow.chain % palette.colors.length];

  hooks.hud.showBanner(`${name} ×${state.flow.chain}`, color, 1300 + state.flow.chain * 80);

  sfxBloom(hooks.audio, state.flow.chain);

  // big shockring centered on screen
  state.shocks.push({
    x: state.stage.w / 2,
    y: state.stage.h * 0.45,
    r: 0,
    targetR: Math.max(state.stage.w, state.stage.h) * 0.45,
    life: 0,
    color,
    thickness: 2.4,
    dashed: false,
  });
  state.shocks.push({
    x: state.stage.w / 2,
    y: state.stage.h * 0.45,
    r: 0,
    targetR: Math.max(state.stage.w, state.stage.h) * 0.7,
    life: 0,
    color: '#ffffff',
    thickness: 1.2,
    dashed: true,
  });

  // particles radiating
  const n = 90 + state.flow.chain * 14;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 3 + Math.random() * 5 + state.flow.chain * 0.4;
    state.particles.push({
      x: state.stage.w / 2,
      y: state.stage.h * 0.45,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 0.7 + Math.random() * 0.5,
      size: 2 + Math.random() * 3,
      color: palette.colors[(i + state.flow.chain) % palette.colors.length],
      shimmer: state.flow.chain >= 3,
      kind: i % 7 === 0 ? 'star' : 'dot',
    });
  }

  // popup text floating up
  state.popups.push({
    x: state.stage.w / 2,
    y: state.stage.h * 0.42,
    vy: -1.1,
    life: 1,
    color,
    text: name,
    size: 22 + Math.min(28, state.flow.chain * 2),
  });
  if (state.flow.chain >= 3) {
    state.popups.push({
      x: state.stage.w / 2,
      y: state.stage.h * 0.42 + 28,
      vy: -0.7,
      life: 1.1,
      color: '#ffffff',
      text: `CHAIN ×${state.flow.chain}`,
      size: 14,
    });
  }

  // bless a handful of active orbs so the visual celebration carries
  let blessed = 0;
  for (const o of state.orbs) {
    if (blessed >= 6) break;
    if (o.energy > 0.35 && !o.blessed) {
      o.blessed = true;
      o.energy = Math.min(1, o.energy + 0.35);
      blessed++;
    }
  }

  hooks.onBloom?.(state);
}

/** Externally-triggered spawn sfx hook (used when new orbs appear). */
export function announceOrbSpawn(state: State, hooks: AppHooks, count: number): void {
  for (let i = 0; i < count; i++) {
    sfxSpawn(hooks.audio, Math.random());
  }
}
