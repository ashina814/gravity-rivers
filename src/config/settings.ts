import type { PaletteName } from './palette';

/**
 * User-facing tunables. Kept in one flat shape so that settings
 * can be round-tripped to localStorage trivially.
 */
export interface Settings {
  spawnRate: number;     // 0..1   → base rate 0..8 orbs/sec
  gravity: number;       // 0..1   → 0.08..0.55 px/frame²
  lineLife: number;      // 0..1   → 0 (infinite) .. 16sec fade
  trailGlow: number;     // 0..1   → multiplier on trail alpha
  volume: number;        // 0..1
  bgm: boolean;
  palette: PaletteName;
  crt: boolean;          // CRT scanline overlay + chromatic aberration
  bloom: boolean;        // Additive bloom pass
}

export const DEFAULT_SETTINGS: Settings = {
  spawnRate: 0.40,
  gravity:   0.45,
  lineLife:  0.0,        // persistent by default
  trailGlow: 0.70,
  volume:    0.55,
  bgm:       true,
  palette:   'neon',
  crt:       true,
  bloom:     true,
};

export const STORAGE_KEY = 'gravity-rivers:settings:v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // Defensive merge: drop unknown/invalid keys, fill missing with defaults.
    return { ...DEFAULT_SETTINGS, ...sanitize(parsed) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* quota / disabled — silently ignore */ }
}

function sanitize(v: unknown): Partial<Settings> {
  if (!v || typeof v !== 'object') return {};
  const src = v as Record<string, unknown>;
  const out: Partial<Settings> = {};
  const num = (k: keyof Settings) => {
    const x = src[k as string];
    if (typeof x === 'number' && Number.isFinite(x)) (out as any)[k] = Math.max(0, Math.min(1, x));
  };
  const bool = (k: keyof Settings) => {
    const x = src[k as string];
    if (typeof x === 'boolean') (out as any)[k] = x;
  };
  num('spawnRate'); num('gravity'); num('lineLife'); num('trailGlow'); num('volume');
  bool('bgm'); bool('crt'); bool('bloom');
  if (typeof src.palette === 'string' &&
      ['neon', 'candy', 'lava', 'ocean', 'mono'].includes(src.palette)) {
    out.palette = src.palette as PaletteName;
  }
  return out;
}
