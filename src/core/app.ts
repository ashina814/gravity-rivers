import { makeClock, type Clock } from './time';
import type { State } from './state';
import type { AudioEngine } from '@/audio/audio';
import type { BgmHandle } from '@/audio/bgm';
import { sfxBloom, sfxSpawn } from '@/audio/sfx';
import { tickSpawner } from '@/sim/spawn';
import { stepPhysics } from '@/sim/physics';
import { updateFx } from '@/render/fx';
import type { HudRuntime } from '@/ui/hud';

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
}

export function makeApp(state: State, hooks: AppHooks): App {
  const clock = makeClock({ stepMs: 1000 / 120, maxSubsteps: 6 });

  let lastNow = 0;
  function frame(now: number): void {
    const dt = now - lastNow;
    state.lastFrameMs = dt || 16;
    lastNow = now;

    clock.advance(now, (stepMs) => simStep(state, stepMs, hooks));
    state.timeMs += state.lastFrameMs; 

    hooks.hud.update(state);
    
    // BGM intensity up during fever
    hooks.bgm.setIntensity(state.fever * 0.01);
    hooks.bgm.setMuted(!state.settings.bgm);

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

function simStep(state: State, stepMs: number, hooks: AppHooks) {
  state.tick++;

  // Initialize player pos
  if (state.tick === 1) {
     state.player.x = state.stage.w / 2;
     state.player.y = state.stage.h / 2;
  }

  if (state.began) {
     tickSpawner(state, stepMs);
  }

  stepPhysics(state, stepMs);
}
