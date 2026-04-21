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
    ctx.fillStyle = rgba(col, 0.15 + o.energy * 0.2);
    ctx.beginPath();
    // Hexagon aura
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + o.id;
      const hx = o.x + Math.cos(angle) * r * (1.8 + o.energy * 0.5);
      const hy = o.y + Math.sin(angle) * r * (1.8 + o.energy * 0.5);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // core
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 10 * dpr;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(o.x, o.y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // wireframe rim (hexagon)
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 5 * dpr;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + tick * 0.05 * (o.id % 2 === 0 ? 1 : -1);
      const hx = o.x + Math.cos(angle) * r;
      const hy = o.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
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
