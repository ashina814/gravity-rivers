import type { State } from '@/core/state';

/**
 * Scrolling neon grid + subtle radial gradient. Draws directly onto
 * the main canvas before any game elements.
 */
export function drawBackground(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h } = state.stage;

  // Base fill
  ctx.fillStyle = '#040110';
  ctx.fillRect(0, 0, w, h);

  // Radial wash based on flow value — pulses with activity.
  const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  const intensity = 0.06 + state.flow.value * 0.08;
  g.addColorStop(0, `rgba(120, 60, 230, ${intensity})`);
  g.addColorStop(1, 'rgba(10, 5, 30, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Top spawn halo
  const sp = { x: w * 0.5, y: -8 };
  const haloR = 160;
  const hg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, haloR);
  hg.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  hg.addColorStop(0.3, 'rgba(120, 150, 255, 0.12)');
  hg.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, haloR);

  // Horizon line near bottom hinting at where orbs exit
  const horizonY = h - 24;
  const lg = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY);
  lg.addColorStop(0, 'rgba(255, 45, 150, 0)');
  lg.addColorStop(1, 'rgba(255, 45, 150, 0.09)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, horizonY - 40, w, 40);
}
