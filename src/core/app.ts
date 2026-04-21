import { makeClock, type Clock } from './time';
import type { State } from './state';
import type { AudioEngine } from '@/audio/audio';
import type { BgmHandle } from '@/audio/bgm';
import { sfxBloom, sfxSpawn } from '@/audio/sfx';
import { tickSpawner } from '@/sim/spawn';
import { stepPhysics } from '@/sim/physics';
import { updateFx } from '@/render/fx';
import { harvestOrbs } from '@/sim/balls';
import { decaySegmentTraffic } from '@/sim/lines';
import { LEVELS } from './levels';
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
  if (state.began && state.stateMachine === 'playing') tickSpawner(state, stepMs);

  // physics
  stepPhysics(state, stepMs);
  harvestOrbs(state);

  const levelDef = LEVELS[state.currentLevelIdx] || LEVELS[0];
  if (state.stateMachine === 'playing' && state.score >= levelDef.goal.required) {
    state.stateMachine = 'cleared';
    state.clearTimer = 4000;
    fireLevelClear(state, hooks);
  }

  if (state.stateMachine === 'cleared') {
    state.clearTimer -= stepMs;
    if (state.clearTimer <= 0) {
      state.currentLevelIdx = (state.currentLevelIdx + 1) % LEVELS.length;
      state.score = 0;
      state.inkUsed = 0;
      state.lines = [];
      state.orbs = [];
      state.particles = [];
      state.stateMachine = 'playing';
      hooks.hud.showBanner(`LEVEL ${state.currentLevelIdx + 1} START`, state.palette.accent, 2000);
    }
  }

  // line upkeep
  let totalInk = 0;
  if (state.settings.lineLife > 0) {
    const fadeMs = Math.max(1, state.settings.lineLife * 16000);
    for (const L of state.lines) {
      L.ageMs += stepMs;
      L.life = Math.max(0, 1 - L.ageMs / fadeMs);
      if (L.life > 0) {
        for (let i = 1; i < L.points.length; i++) {
          totalInk += Math.hypot(L.points[i].x - L.points[i-1].x, L.points[i].y - L.points[i-1].y);
        }
      }
    }
    state.lines = state.lines.filter((L) => L.life > 0);
  } else {
    for (const L of state.lines) {
      L.life = 1;
      for (let i = 1; i < L.points.length; i++) {
        totalInk += Math.hypot(L.points[i].x - L.points[i-1].x, L.points[i].y - L.points[i-1].y);
      }
    }
  }

  // Include active drawing ink
  if (state.drawing.active && !state.drawing.erasing) {
    const pts = state.drawing.points;
    for (let i = 1; i < pts.length; i++) {
      totalInk += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    }
  }
  state.inkUsed = totalInk;

  decaySegmentTraffic(state, 0.012);
}

function fireLevelClear(state: State, hooks: AppHooks) {
  state.screenFlash = 1.0;
  state.shakeMag = Math.max(state.shakeMag, 5);
  state.shakeMs = Math.max(state.shakeMs, 400);

  const color = '#00ffaa';

  hooks.hud.showBanner(`STAGE CLEAR!`, color, 3000);
  sfxBloom(hooks.audio, 4); // Big sound

  // big shockrings
  state.shocks.push({
    x: state.stage.w / 2,
    y: state.stage.h * 0.45,
    r: 0,
    targetR: Math.max(state.stage.w, state.stage.h),
    life: 0,
    color,
    thickness: 4.0,
    dashed: false,
  });

  // particles radiating
  const n = 150;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 4 + Math.random() * 8;
    state.particles.push({
      x: state.stage.w / 2,
      y: state.stage.h * 0.45,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 1.0 + Math.random() * 1.0,
      size: 3 + Math.random() * 4,
      color: state.palette.colors[i % state.palette.colors.length],
      shimmer: true,
      kind: i % 5 === 0 ? 'star' : 'dot',
    });
  }
}

/** Externally-triggered spawn sfx hook (used when new orbs appear). */
export function announceOrbSpawn(state: State, hooks: AppHooks, count: number): void {
  for (let i = 0; i < count; i++) {
    sfxSpawn(hooks.audio, Math.random());
  }
}
