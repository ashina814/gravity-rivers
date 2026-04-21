/**
 * Color palettes for orbs and accents.
 * Keep each palette at 5–6 saturated colors so the FX tint system
 * (particles, trails, bloom flashes) works consistently.
 */
export type PaletteName = 'neon' | 'candy' | 'lava' | 'ocean' | 'mono';

export interface Palette {
  name: PaletteName;
  label: string;
  colors: string[];
  accent: string;
  highlight: string;
}

export const PALETTES: Record<PaletteName, Palette> = {
  neon: {
    name: 'neon',
    label: 'NEON',
    colors: ['#00f0ff', '#ff2d96', '#fff04f', '#3fff88', '#b24bff', '#ff9a30'],
    accent: '#00f0ff',
    highlight: '#ffffff',
  },
  candy: {
    name: 'candy',
    label: 'CANDY',
    colors: ['#ff8fb2', '#88e1ff', '#ffd86f', '#c89aff', '#9fffd8', '#ffaa6f'],
    accent: '#ff8fb2',
    highlight: '#ffffff',
  },
  lava: {
    name: 'lava',
    label: 'LAVA',
    colors: ['#ff3838', '#ff7a00', '#ffd23f', '#ff4fa0', '#ffffff', '#ff9a9a'],
    accent: '#ffd23f',
    highlight: '#ffffff',
  },
  ocean: {
    name: 'ocean',
    label: 'OCEAN',
    colors: ['#38d8ff', '#6d66ff', '#7affea', '#8a9bff', '#e0fbff', '#2aa5ff'],
    accent: '#7affea',
    highlight: '#ffffff',
  },
  mono: {
    name: 'mono',
    label: 'MONO',
    colors: ['#ffffff', '#dddddd', '#bbbbbb', '#999999', '#777777', '#cccccc'],
    accent: '#ffffff',
    highlight: '#ffffff',
  },
};

export function getPalette(name: PaletteName): Palette {
  return PALETTES[name] ?? PALETTES.neon;
}

/**
 * Pick a color index weighted evenly across palette.
 */
export function pickPaletteIndex(palette: Palette, rng: () => number): number {
  return Math.floor(rng() * palette.colors.length);
}
