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
  state: 'moving' | 'charging' | 'attacking';
  charge: number;       // 0..1
  attackTimer: number;  // frames for attack recovery
  target: { x: number; y: number }; // Pointer position
  hp: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lungeVx: number;
  lungeVy: number;
  hp: number;
  r: number;
  dead: boolean;
  state: 'chasing' | 'telegraph' | 'lunging' | 'recovering';
  stateTimer: number;
  justDodged: boolean;
  type: 'gear' | 'skull' | 'boss';
}

export interface SlashLine {
  x1: number; y1: number;
  x2: number; y2: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface State {
  stage: Stage;
  settings: Settings;
  palette: Palette;
  running: boolean;
  paused: boolean;
  began: boolean;
  
  stateMachine: 'playing' | 'gameover';
  
  tick: number;
  timeMs: number;
  lastFrameMs: number;

  player: Player & { chainReady?: boolean, dashStartX?: number, dashStartY?: number };
  enemies: Enemy[];

  score: number;
  combo: number;
  maxCombo: number; // For sharing
  overdriveTimer: number;
  rankPulse: number;

  slashLines: SlashLine[];
  particles: Particle[];
  popups: Popup[];
  flashes: Flash[];
  shocks: ShockRing[];
  screenFlash: number;      
  slowMo: number;           
  
  shakeMs: number;
  shakeMag: number;

  freezeFrames: number;
  monochromeFrames: number;
  bgmMuffled: number;
  bgText: { text: string; timer: number; maxTimer: number };
}

export function makeState(settings: Settings, palette: Palette): State {
  return {
    stage: { w: 0, h: 0, cssW: 0, cssH: 0, dpr: 1 },
    settings,
    palette,
    running: true,
    paused: false,
    began: false,
    
    stateMachine: 'playing',
    
    tick: 0,
    timeMs: 0,
    lastFrameMs: 0,

    player: {
      x: 0, y: 0,
      vx: 0, vy: 0,
      state: 'moving',
      charge: 0,
      attackTimer: 0,
      target: { x: 0, y: 0 },
      hp: 100,
      chainReady: false,
    },
    enemies: [],

    score: 0,
    combo: 0,
    maxCombo: 0,
    overdriveTimer: 0,
    rankPulse: 0,

    slashLines: [],
    particles: [],
    popups: [],
    flashes: [],
    shocks: [],
    screenFlash: 0,
    slowMo: 0,
    
    shakeMs: 0,
    shakeMag: 0,

    freezeFrames: 0,
    monochromeFrames: 0,
    bgmMuffled: 0,
    bgText: { text: '', timer: 0, maxTimer: 1 },
  };
}
