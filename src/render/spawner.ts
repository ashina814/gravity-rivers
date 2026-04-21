import type { State } from '@/core/state';
import { rgba } from '@/utils/color';

/**
 * Visualize the top fountain so it's obvious where orbs come from.
 * A pulsing ring + descending feather.
 */
export function drawSpawner(ctx: CanvasRenderingContext2D, state: State): void {
  const { w } = state.stage;
  const cx = w * 0.5;
  const cy = 8;
  const base = state.palette.accent;
  const pulse = 0.75 + Math.sin(state.timeMs * 0.004) * 0.25;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
  g.addColorStop(0, rgba(base, 0.55 * pulse));
  g.addColorStop(0.4, rgba(base, 0.18 * pulse));
  g.addColorStop(1, rgba(base, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - 100, 0, 200, 120);
  ctx.restore();

  // horizontal bar under the arc
  ctx.save();
  const bar = ctx.createLinearGradient(cx - 50, 0, cx + 50, 0);
  bar.addColorStop(0, 'rgba(255,255,255,0)');
  bar.addColorStop(0.5, rgba('#ffffff', 0.8 * pulse));
  bar.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bar;
  ctx.fillRect(cx - 50, cy + 2, 100, 2);
  ctx.restore();
}
