import type { State } from '@/core/state';
import type { Graphics } from 'pixi.js';

export function drawFx(g: Graphics, state: State): void {
  for (const sw of state.shocks) {
    const color = sw.color === '#ff0055' ? 0xff0055 : 0x00f0ff;
    g.circle(sw.x, sw.y, sw.r);
    g.stroke({ width: sw.thickness, color: color, alpha: Math.max(0, 1 - sw.life) });
  }

  for (const f of state.flashes) {
    const color = f.color === '#ff0055' ? 0xff0055 : 0xffffff;
    g.circle(f.x, f.y, f.r);
    g.fill({ color: color, alpha: Math.max(0, f.life) * 0.55 });
  }

  for (const ks of state.killSplashes) {
    const color = ks.color === '#ff0055' ? 0xff0055 : 0xffffff;
    const scale = 1 + (1 - ks.timer) * 1.5;
    
    const points: number[] = [];
    for(let i=0; i<8; i++) {
       const angle = (i/8) * Math.PI * 2;
       const rnd = Math.abs(Math.sin(ks.x * 12.34 + ks.y * 56.78 + i * 90.12));
       const r = (20 + rnd * 40 * ks.timer) * scale;
       points.push(ks.x + Math.cos(angle)*r, ks.y + Math.sin(angle)*r);
    }
    g.poly(points);
    g.fill({ color: color, alpha: Math.max(0, ks.timer) });
  }

  for (const p of state.particles) {
    let color = 0xffffff;
    if (p.color === '#ff0055') color = 0xff0055;
    else if (p.color === '#fcee0a') color = 0xfcee0a;
    else if (p.color === '#00f0ff') color = 0x00f0ff;

    const alpha = Math.max(0, p.life);

    if (p.kind === 'spark') {
      const speed = Math.hypot(p.vx, p.vy);
      const angle = Math.atan2(p.vy, p.vx);
      const len = p.size + speed * 1.5;
      
      const hw = len/2;
      const hh = p.size/4;
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const pts = [
        p.x + (-hw)*cos - (-hh)*sin, p.y + (-hw)*sin + (-hh)*cos,
        p.x + (hw)*cos - (-hh)*sin, p.y + (hw)*sin + (-hh)*cos,
        p.x + (hw)*cos - (hh)*sin, p.y + (hw)*sin + (hh)*cos,
        p.x + (-hw)*cos - (hh)*sin, p.y + (-hw)*sin + (hh)*cos,
      ];
      g.poly(pts);
      g.fill({ color, alpha });
    } else {
      g.rect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      g.fill({ color, alpha });
    }
  }
}

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

  for (const ks of state.killSplashes) {
    ks.timer -= 0.03 * dt;
  }
  state.killSplashes = state.killSplashes.filter((ks) => ks.timer > 0);

  if (state.screenFlash > 0) state.screenFlash = Math.max(0, state.screenFlash - 0.04 * dt);
  if (state.shakeMs > 0) {
    state.shakeMs -= dtMs;
    if (state.shakeMs <= 0) {
      state.shakeMag = 0;
    }
  }
}
