/**
 * Small math helpers used across physics and rendering.
 */
export const TAU = Math.PI * 2;

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function invLerp(a: number, b: number, v: number): number {
  if (a === b) return 0;
  return (v - a) / (b - a);
}

export function remap(v: number, a0: number, b0: number, a1: number, b1: number): number {
  return lerp(a1, b1, invLerp(a0, b0, v));
}

export function smoothstep(a: number, b: number, v: number): number {
  const t = clamp(invLerp(a, b, v), 0, 1);
  return t * t * (3 - 2 * t);
}

export function length2(x: number, y: number): number {
  return x * x + y * y;
}

export function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Project point P onto segment AB, clamped, returning { cx, cy, t }.
 */
export function projectOnSegment(
  ax: number, ay: number,
  bx: number, by: number,
  px: number, py: number,
): { cx: number; cy: number; t: number; len2: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return { cx: ax, cy: ay, t: 0, len2 };
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return {
    cx: ax + t * dx,
    cy: ay + t * dy,
    t,
    len2,
  };
}

export function approach(current: number, target: number, rate: number): number {
  if (current < target) return Math.min(target, current + rate);
  if (current > target) return Math.max(target, current - rate);
  return current;
}

export function wrap(v: number, n: number): number {
  return ((v % n) + n) % n;
}
