import type { State } from '@/core/state';
import { dist, dist2 } from '@/utils/math';

/**
 * A player-drawn line is represented as a poly-line of smoothed points.
 * Each segment carries a "traffic" scalar that the renderer uses to
 * make well-used channels glow brighter.
 */
export interface LinePoint {
  x: number;
  y: number;
}

export interface LineSegmentMeta {
  /** Decaying 0..1 energy that accumulates as orbs slide along it. */
  traffic: number;
  /** Tick of last orb contact. */
  lastHit: number;
}

export interface Line {
  id: number;
  points: LinePoint[];
  seg: LineSegmentMeta[];    // aligned to (points.length - 1)
  ageMs: number;
  life: number;              // 0..1, may tick down if settings.lineLife > 0
  createdAtTick: number;
  totalLen: number;
  /** Avg color sampled along the line — helps accent visuals subtly. */
  hint: string | null;
  /** True while the pointer is still drawing the line (it grows). */
  live: boolean;
}

let ID = 1;
export function nextLineId(): number { return ID++; }

/** Minimum distance (px) between stored smoothed points. */
export const MIN_POINT_DIST = 6;
/** Max length of a single stroke (px) before we soft-cap. */
export const MAX_LINE_LENGTH = 6000;

/** How aggressively the Chaikin smoothing pass rounds corners. */
export const SMOOTH_PASSES = 1;

/**
 * Smooth an array of points using one Chaikin pass:
 * each segment AB becomes two points (1/4, 3/4) along it.
 * Keeps the first and last endpoint anchored for stability.
 */
export function chaikin(points: LinePoint[], passes = 1): LinePoint[] {
  let pts = points;
  for (let pass = 0; pass < passes; pass++) {
    if (pts.length < 3) return pts;
    const out: LinePoint[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      out.push({
        x: a.x * 0.75 + b.x * 0.25,
        y: a.y * 0.75 + b.y * 0.25,
      });
      out.push({
        x: a.x * 0.25 + b.x * 0.75,
        y: a.y * 0.25 + b.y * 0.75,
      });
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

/**
 * Resample the poly-line so adjacent points are no closer than `minStep`
 * and no farther than `maxStep`. This avoids spiky segments from jittery
 * pointer input while also filling gaps from fast flicks.
 */
export function resample(points: LinePoint[], minStep = 6, maxStep = 22): LinePoint[] {
  if (points.length < 2) return points.slice();
  const out: LinePoint[] = [points[0]];
  let accX = points[0].x;
  let accY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const d = dist(accX, accY, p.x, p.y);
    if (d < minStep) continue;
    if (d > maxStep) {
      const steps = Math.ceil(d / maxStep);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        out.push({
          x: accX + (p.x - accX) * t,
          y: accY + (p.y - accY) * t,
        });
      }
    } else {
      out.push(p);
    }
    accX = p.x; accY = p.y;
  }
  return out;
}

export function computeLineLength(points: LinePoint[]): number {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
  return n;
}

export function buildLine(points: LinePoint[], tick: number, live = false): Line {
  const smoothed = chaikin(resample(points, MIN_POINT_DIST, 20), SMOOTH_PASSES);
  const seg: LineSegmentMeta[] = new Array(Math.max(0, smoothed.length - 1));
  for (let i = 0; i < seg.length; i++) seg[i] = { traffic: 0, lastHit: -1 };
  return {
    id: nextLineId(),
    points: smoothed,
    seg,
    ageMs: 0,
    life: 1,
    createdAtTick: tick,
    totalLen: computeLineLength(smoothed),
    hint: null,
    live,
  };
}

/**
 * Merge two polylines at their closest endpoints. Used when the user
 * finishes a stroke near the end of an existing line — keeps the
 * rendered silhouette continuous.
 */
export function tryWeldLines(a: Line, b: Line, tick: number, threshold = 14): Line | null {
  if (!a.points.length || !b.points.length) return null;
  const a0 = a.points[0], aN = a.points[a.points.length - 1];
  const b0 = b.points[0], bN = b.points[b.points.length - 1];
  type Case = { d: number; which: 'aN-b0' | 'aN-bN' | 'a0-b0' | 'a0-bN' };
  const cases: Case[] = [
    { d: dist2(aN.x, aN.y, b0.x, b0.y), which: 'aN-b0' },
    { d: dist2(aN.x, aN.y, bN.x, bN.y), which: 'aN-bN' },
    { d: dist2(a0.x, a0.y, b0.x, b0.y), which: 'a0-b0' },
    { d: dist2(a0.x, a0.y, bN.x, bN.y), which: 'a0-bN' },
  ];
  cases.sort((x, y) => x.d - y.d);
  if (cases[0].d > threshold * threshold) return null;
  let pts: LinePoint[];
  switch (cases[0].which) {
    case 'aN-b0': pts = a.points.concat(b.points); break;
    case 'aN-bN': pts = a.points.concat(b.points.slice().reverse()); break;
    case 'a0-b0': pts = a.points.slice().reverse().concat(b.points); break;
    case 'a0-bN': pts = a.points.slice().reverse().concat(b.points.slice().reverse()); break;
  }
  return buildLine(pts, tick, false);
}

/** Find the nearest line segment to (px,py). Returns {line, segIdx, cx, cy, d}. */
export function nearestSegment(state: State, px: number, py: number, maxD: number) {
  let best: {
    line: Line; segIdx: number; cx: number; cy: number; d: number;
  } | null = null;
  for (const L of state.lines) {
    for (let i = 0; i < L.points.length - 1; i++) {
      const a = L.points[i], b = L.points[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-3) continue;
      let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      const cx = a.x + t * dx;
      const cy = a.y + t * dy;
      const d = dist(cx, cy, px, py);
      if (d < maxD && (!best || d < best.d)) {
        best = { line: L, segIdx: i, cx, cy, d };
      }
    }
  }
  return best;
}

/** Decay segment traffic over time so unused lines visually cool down. */
export function decaySegmentTraffic(state: State, decay = 0.012): void {
  for (const L of state.lines) {
    for (const s of L.seg) {
      if (s.traffic > 0) {
        s.traffic -= decay;
        if (s.traffic < 0) s.traffic = 0;
      }
    }
  }
}

/**
 * Erase the provided line entirely.
 */
export function removeLine(state: State, line: Line): void {
  state.lines = state.lines.filter((L) => L !== line);
}

/**
 * Erase points near (px,py) within radius R. Splits a line into multiple
 * pieces if the erased region is in the middle.
 */
export function eraseAt(state: State, px: number, py: number, radius: number, tick: number): number {
  let erased = 0;
  const next: Line[] = [];
  for (const L of state.lines) {
    const parts: LinePoint[][] = [];
    let cur: LinePoint[] = [];
    for (const p of L.points) {
      const d = dist(p.x, p.y, px, py);
      if (d > radius) {
        cur.push(p);
      } else {
        erased++;
        if (cur.length >= 2) parts.push(cur);
        cur = [];
      }
    }
    if (cur.length >= 2) parts.push(cur);
    if (parts.length === 0) continue; // fully erased
    for (const p of parts) {
      next.push(buildLine(p, tick, false));
    }
  }
  state.lines = next;
  return erased;
}
