import type { State } from '@/core/state';
import { rgba } from '@/utils/color';

/**
 * Render transient particles, shockrings, flashes, popups.
 * These live in state.particles / state.flashes / state.shocks / state.popups.
 */
export function drawFx(ctx: CanvasRenderingContext2D, state: State): void {
  const dpr = state.stage.dpr;

  // shockwaves
  for (const sw of state.shocks) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - sw.life);
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = sw.thickness;
    if (sw.dashed) {
      ctx.setLineDash([12, 8]);
    }
    ctx.shadowColor = sw.color;
    ctx.shadowBlur = 16 * dpr;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // flashes
  for (const f of state.flashes) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 26 * dpr;
    ctx.fillStyle = rgba(f.color, 0.55);
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // particles
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    let c = p.color;
    if (p.shimmer) {
      const h = (state.tick * 10 + p.x + p.y) % 360;
      c = `hsl(${h}, 90%, 60%)`;
    }
    ctx.fillStyle = c;
    ctx.shadowColor = c;
    ctx.shadowBlur = 10 * dpr;
    if (p.kind === 'star') {
      drawStar(ctx, p.x, p.y, p.size);
    } else {
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
    }
    ctx.restore();
  }

  // popups
  for (const pp of state.popups) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pp.life);
    const sz = pp.size || 14;
    ctx.font = `900 ${sz}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = pp.color;
    ctx.shadowBlur = 12 * dpr;
    ctx.fillStyle = pp.color;
    ctx.fillText(pp.text, pp.x, pp.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeText(pp.text, pp.x, pp.y);
    ctx.restore();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const spikes = 5;
  const outer = r;
  const inner = r * 0.42;
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Advance FX state each tick. Particles drift, shocks expand, flashes decay.
 */
export function updateFx(state: State, dtMs: number): void {
  const dt = dtMs / 16.6667;

  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.05 * dt; // gravity
    p.vx *= Math.pow(0.98, dt);
    p.life -= 0.012 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  for (const pp of state.popups) {
    pp.y += pp.vy * dt;
    pp.vy *= Math.pow(0.96, dt);
    pp.life -= 0.008 * dt;
  }
  state.popups = state.popups.filter((pp) => pp.life > 0);

  for (const f of state.flashes) {
    f.r += (f.targetR - f.r) * 0.22 * dt;
    f.life -= 0.035 * dt;
  }
  state.flashes = state.flashes.filter((f) => f.life > 0);

  for (const sw of state.shocks) {
    sw.r += (sw.targetR - sw.r) * 0.12 * dt;
    sw.life += 0.02 * dt;
  }
  state.shocks = state.shocks.filter((sw) => sw.life < 1);

  if (state.screenFlash > 0) state.screenFlash = Math.max(0, state.screenFlash - 0.04 * dt);
  if (state.shakeMs > 0) {
    state.shakeMs -= dtMs;
    if (state.shakeMs <= 0) {
      state.shakeMag = 0;
    }
  }
  if (state.bloom.pulse > 0) {
    state.bloom.pulse = Math.max(0, state.bloom.pulse - 0.018 * dt);
  }
}
