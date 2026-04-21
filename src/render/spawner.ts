import type { State } from '@/core/state';
import { rgba } from '@/utils/color';
import { LEVELS } from '@/core/levels';

/**
 * Visualize the top fountain so it's obvious where orbs come from.
 * A pulsing ring + descending feather.
 */
export function drawSpawner(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h } = state.stage;
  const levelDef = LEVELS[state.currentLevelIdx] || LEVELS[0];
  const base = state.palette.accent;
  const pulse = 0.75 + Math.sin(state.timeMs * 0.004) * 0.25;

  for (const spawner of levelDef.spawners) {
    const cx = spawner.rx * w;
    const cy = spawner.ry * h;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    g.addColorStop(0, rgba(base, 0.55 * pulse));
    g.addColorStop(0.4, rgba(base, 0.18 * pulse));
    g.addColorStop(1, rgba(base, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - 100, cy - 60, 200, 120);
    ctx.restore();

    // horizontal bar under the arc
    ctx.save();
    const bar = ctx.createLinearGradient(cx - 50, cy, cx + 50, cy);
    bar.addColorStop(0, 'rgba(255,255,255,0)');
    bar.addColorStop(0.5, rgba('#ffffff', 0.8 * pulse));
    bar.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bar;
    ctx.fillRect(cx - 50, cy + 2, 100, 2);
    ctx.restore();
  }
}
