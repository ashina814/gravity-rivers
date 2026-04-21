import type { Settings } from '@/config/settings';
import type { Palette } from '@/config/palette';
import type { Orb } from '@/sim/balls';
import type { Line } from '@/sim/lines';
import type { Particle, Popup, Flash, ShockRing } from '@/render/particles';

export type Tool = 'draw' | 'erase';

export interface Stage {
  w: number;
  h: number;
  cssW: number;
  cssH: number;
  dpr: number;
}

export interface Flow {
  /** Smoothed flow rate 0..1. Rises when orbs move, falls otherwise. */
  value: number;
  /** Target derived from current ticks. */
  target: number;
  /** Integrated "satisfaction" — drives bloom thresholds. */
  charge: number;
  /** Chain count — consecutive bloom windows without stagnation. */
  chain: number;
  /** Countdown before chain resets (ms). */
  chainTimer: number;
}

export interface Bloom {
  /** Number of total bloom events this session. */
  count: number;
  /** 0..1 intensity used by post-fx. */
  pulse: number;
  /** Timestamp of last bloom so we can throttle. */
  lastAt: number;
}

export interface Drawing {
  active: boolean;
  points: { x: number; y: number; t: number }[];
  pointerId: number | null;
  startedAt: number;
  lastAddedAt: number;
  erasing: boolean;
}

export interface State {
  stage: Stage;
  settings: Settings;
  palette: Palette;
  running: boolean;
  paused: boolean;
  began: boolean;
  tool: Tool;
  tick: number;
  timeMs: number;
  lastFrameMs: number;

  orbs: Orb[];
  lines: Line[];
  drawing: Drawing;

  flow: Flow;
  bloom: Bloom;

  particles: Particle[];
  popups: Popup[];
  flashes: Flash[];
  shocks: ShockRing[];
  screenFlash: number;      // 0..1 white flash intensity
  slowMo: number;           // frames of slow-mo remaining (unused for toy, but kept for polish)

  spawnAcc: number;
  spawnSeq: number;         // increments with each orb spawn
  colorCursor: number;      // cycles through palette for spawn color order

  // Transient banner text for BLOOM events
  banner: { text: string; color: string; at: number } | null;

  // --- rendering fx state ---
  shakeMs: number;
  shakeMag: number;
}

export function makeState(settings: Settings, palette: Palette): State {
  return {
    stage: { w: 0, h: 0, cssW: 0, cssH: 0, dpr: 1 },
    settings,
    palette,
    running: true,
    paused: false,
    began: false,
    tool: 'draw',
    tick: 0,
    timeMs: 0,
    lastFrameMs: 0,
    orbs: [],
    lines: [],
    drawing: {
      active: false,
      points: [],
      pointerId: null,
      startedAt: 0,
      lastAddedAt: 0,
      erasing: false,
    },
    flow: { value: 0, target: 0, charge: 0, chain: 0, chainTimer: 0 },
    bloom: { count: 0, pulse: 0, lastAt: 0 },
    particles: [],
    popups: [],
    flashes: [],
    shocks: [],
    screenFlash: 0,
    slowMo: 0,
    spawnAcc: 0,
    spawnSeq: 0,
    colorCursor: 0,
    banner: null,
    shakeMs: 0,
    shakeMag: 0,
  };
}
