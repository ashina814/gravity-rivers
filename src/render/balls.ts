import type { State } from '@/core/state';
import { hsl, rgba, shade } from '@/utils/color';

/**
 * Render each orb with layered passes for glow + body + highlight.
 * Blessed orbs get rainbow halos.
 */
export function drawOrbs(ctx: CanvasRenderingContext2D, state: State): void {
  const dpr = state.stage.dpr;
  const tick = state.tick;

  for (const o of state.orbs) {
    if (o.dead) continue;
    const spawnA = o.spawnAnim / 18;
    const grow = spawnA > 0 ? 1 + spawnA * 0.6 : 1;
    // Orb radius is stored in CSS-pixel space; the DPR transform scales
    // everything to physical pixels for retina. shadowBlur stays DPR-aware
    // because it is specified in coordinate-space units.
    const r = o.r * grow;

    const baseColor = o.color;
    const col = o.blessed
      ? hsl((tick * 4 + o.id * 30) % 360, 0.9, 0.6)
      : baseColor;

    // aura
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = (14 + o.energy * 20) * dpr;
    ctx.fillStyle = rgba(col, 0.22 + o.energy * 0.2);
    ctx.beginPath();
    ctx.arc(o.x, o.y, r * (1.6 + o.energy * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // body
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 8 * dpr;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // rim
    ctx.save();
    ctx.strokeStyle = rgba(shade(baseColor, -30), 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // highlight
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(o.x - r * 0.35, o.y - r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // spawn pop ring
    if (spawnA > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${spawnA * 0.85})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * (1.3 + (1 - spawnA) * 1.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // blessed sparkles
    if (o.blessed) {
      const n = 3;
      const orbR = r * 1.6;
      for (let k = 0; k < n; k++) {
        const ang = tick * 0.05 + (k * Math.PI * 2) / n + o.id;
        const ox = o.x + Math.cos(ang) * orbR;
        const oy = o.y + Math.sin(ang) * orbR;
        ctx.save();
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8 * dpr;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ox, oy, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
