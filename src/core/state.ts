import type { Settings } from '@/config/settings';
import type { Palette } from '@/config/palette';
import type { Particle, Popup, Flash, ShockRing } from '@/render/particles';

export interface Stage {
  w: number;
  h: number;
  cssW: number;
  cssH: number;
  dpr: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'idle' | 'aiming' | 'dashing';
  aimTarget: { x: number; y: number } | null;
  dashTimer: number;
  energy: number; // For overdrive
  combo: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  r: number;
  dead: boolean;
  spawnAnim: number;
  type: 'gear' | 'skull';
}

export interface State {
  stage: Stage;
  settings: Settings;
  palette: Palette;
  running: boolean;
  paused: boolean;
  began: boolean;
  
  tick: number;
  timeMs: number;
  lastFrameMs: number;

  player: Player;
  enemies: Enemy[];

  score: number;
  fever: number;

  particles: Particle[];
  popups: Popup[];
  flashes: Flash[];
  shocks: ShockRing[];
  screenFlash: number;      // 0..1 white flash intensity
  slowMo: number;           // frames of slow-mo remaining
  
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
    
    tick: 0,
    timeMs: 0,
    lastFrameMs: 0,

    player: {
      x: 0, y: 0, // Will be centered on first frame
      vx: 0, vy: 0,
      state: 'idle',
      aimTarget: null,
      dashTimer: 0,
      energy: 0,
      combo: 0
    },
    enemies: [],

    score: 0,
    fever: 0,

    particles: [],
    popups: [],
    flashes: [],
    shocks: [],
    screenFlash: 0,
    slowMo: 0,
    
    shakeMs: 0,
    shakeMag: 0,
  };
}
