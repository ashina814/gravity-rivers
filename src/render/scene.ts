import type { State } from '@/core/state';
import { drawBackground } from './background';
import { drawSpawner } from './spawner';
import { drawLines } from './lines';
import { drawTrails } from './trails';
import { drawOrbs } from './balls';
import { drawFx } from './fx';
import { drawPostFx } from './postfx';

/**
 * Main render orchestrator. Called once per RAF frame after the
 * fixed-timestep sim has updated state.
 *
 *   background → spawner aura → trails → lines → orbs → fx → post
 *
 * Kept as a plain sequence of passes so perf is predictable and
 * individual layers can be toggled/inspected during dev.
 */
export function renderScene(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h, shakeMag } = shakeContext(state);
  // Save for shake translate
  ctx.save();
  if (shakeMag > 0) {
    const ox = (Math.random() - 0.5) * shakeMag;
    const oy = (Math.random() - 0.5) * shakeMag;
    ctx.translate(ox, oy);
  }

  drawBackground(ctx, state);
  drawSpawner(ctx, state);
  drawTrails(ctx, state);
  drawLines(ctx, state);
  drawOrbs(ctx, state);
  drawFx(ctx, state);

  ctx.restore();

  // Post-fx is drawn in screen space (no shake)
  drawPostFx(ctx, state);

  // light silent variable access so the bundler doesn't complain about unused
  void w; void h;
}

function shakeContext(state: State) {
  return {
    w: state.stage.w,
    h: state.stage.h,
    shakeMag: state.shakeMs > 0 ? state.shakeMag : 0,
  };
}
