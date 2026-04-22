import type { State, Enemy } from '@/core/state';
import { drawFx } from './fx';

export function renderScene(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h, dpr } = state.stage;
  
  // Background
  ctx.fillStyle = '#050205';
  ctx.fillRect(0, 0, w, h);
  
  // Grid
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gridR = 40;
  for(let x=0; x<w; x+=gridR) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for(let y=0; y<h; y+=gridR) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.restore();

  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawFx(ctx, state);

  // Screen Flash
  if (state.screenFlash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${state.screenFlash})`;
    ctx.fillRect(0, 0, w, h);
    state.screenFlash = Math.max(0, state.screenFlash - 0.05);
    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: State) {
  const p = state.player;
  const dpr = state.stage.dpr;

  // Aiming laser
  if (p.state === 'aiming' && p.aimTarget) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -state.tick;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.aimTarget.x, p.aimTarget.y);
    ctx.stroke();
    ctx.restore();
  }

  // Dash trail (we cheat by drawing a line backwards based on velocity)
  if (p.state === 'dashing') {
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15 * dpr;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // Draw the trail backwards from current pos based on velocity
    ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); 
    ctx.stroke();
    ctx.restore();
  }

  // Core
  ctx.save();
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = (10 + p.combo * 5) * dpr;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 8, 0, Math.PI*2);
  ctx.fill();

  // Outer rings
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 14 + Math.sin(state.tick * 0.1) * 2, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: State) {
  const dpr = state.stage.dpr;
  
  for (const e of state.enemies) {
    const r = e.r;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(state.tick * 0.02 * (e.id % 2 === 0 ? 1 : -1));
    
    if (e.type === 'gear') {
      ctx.shadowColor = '#ffb300';
      ctx.shadowBlur = 10 * dpr;
      ctx.fillStyle = '#110000';
      ctx.strokeStyle = '#ffb300';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const radius = i % 2 === 0 ? r : r * 0.6;
        const hx = Math.cos(angle) * radius;
        const hy = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Skull-ish
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10 * dpr;
      ctx.fillStyle = '#110000';
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, -r*0.5);
      ctx.lineTo(r*0.8, r);
      ctx.lineTo(-r*0.8, r);
      ctx.lineTo(-r, -r*0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(-r*0.3, -r*0.1, r*0.2, 0, Math.PI*2);
      ctx.arc(r*0.3, -r*0.1, r*0.2, 0, Math.PI*2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}
