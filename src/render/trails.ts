import type { State } from '@/core/state';
import type { Orb } from '@/sim/balls';
import { hsl, rgba } from '@/utils/color';

/**
 * Paint the per-orb trail. High-energy orbs get rainbow shimmer.
 * We stroke the trail as a polyline with a gradient along length
 * (newer points brighter).
 */
export function drawTrails(ctx: CanvasRenderingContext2D, state: State): void {
  const glow = state.settings.trailGlow;
  if (glow <= 0) return;
  const dpr = state.stage.dpr;
  const tick = state.tick;

  for (const o of state.orbs) {
    if (o.trail.length < 2) continue;
    drawOneTrail(ctx, o, dpr, glow, tick);
  }
}

function drawOneTrail(
  ctx: CanvasRenderingContext2D,
  o: Orb,
  dpr: number,
  glow: number,
  tick: number,
) {
  const pts = o.trail;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Render multiple passes for additive glow
  const passes = o.blessed ? 3 : 2;
  for (let pass = 0; pass < passes; pass++) {
    const outer = pass === 0;
    const thickness = outer ? 6 : 2;
    const alphaScale = outer ? 0.08 : 0.35;
    const N = pts.length;
    for (let i = 1; i < N; i++) {
      const a = pts[i - 1], b = pts[i];
      const t = i / N;
      const fade = t; // older → 0, newer → 1
      const color = o.blessed
        ? hsl((tick * 3 + i * 25 + o.id * 40) % 360, 0.95, 0.62)
        : a.color;
      ctx.strokeStyle = rgba(color, alphaScale * fade * glow);
      ctx.lineWidth = thickness * (0.3 + fade * 0.7);
      if (pass === 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 14 * dpr * glow;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}
