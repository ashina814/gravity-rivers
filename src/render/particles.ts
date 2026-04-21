/**
 * Particle / FX primitive types rendered by the scene.
 * Kept thin so the sim can push transient visuals without
 * depending on renderer internals.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // 0..1 (fades out)
  size: number;
  color: string;
  shimmer: boolean;
  kind: 'dot' | 'star' | 'trail';
}

export interface Popup {
  x: number;
  y: number;
  vy: number;
  life: number;
  color: string;
  text: string;
  size: number;
}

export interface Flash {
  x: number;
  y: number;
  r: number;
  targetR: number;
  life: number;
  color: string;
}

export interface ShockRing {
  x: number;
  y: number;
  r: number;
  targetR: number;
  life: number;
  color: string;
  thickness: number;
  dashed: boolean;
}
