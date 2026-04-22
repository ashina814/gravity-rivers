import type { State } from '@/core/state';

/**
 * Post-processing pass: CRT scanlines, chromatic fringe near corners,
 * bloom glow, vignette darken at edges, screen flash.
 */
export function drawPostFx(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h } = state.stage;

  // Screen flash first — multiplies in highlights
  if (state.screenFlash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${state.screenFlash * 0.5})`;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }



  // Vignette darken (blend: multiply)
  ctx.save();
  const vg = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.32,
    w / 2, h / 2, Math.hypot(w, h) * 0.55,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.48)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  if (state.settings.crt) {
    drawScanlines(ctx, state);
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h, dpr } = state.stage;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  // Step is in CSS units; tighten at high DPR so scanlines still read on retina.
  const step = Math.max(1, Math.round(2 / dpr));
  for (let y = 0; y < h; y += step * 2) {
    ctx.fillRect(0, y, w, step);
  }
  ctx.restore();

  // subtle rolling highlight bar (CRT refresh) — moves slowly downward
  const barY = ((state.timeMs * 0.06) % (h + 80)) - 80;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bg = ctx.createLinearGradient(0, barY - 30, 0, barY + 30);
  bg.addColorStop(0, 'rgba(255,255,255,0)');
  bg.addColorStop(0.5, 'rgba(255,255,255,0.035)');
  bg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, barY - 30, w, 60);
  ctx.restore();
}
