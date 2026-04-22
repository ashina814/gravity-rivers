import type { State, Enemy } from '@/core/state';
import { drawFx } from './fx';

export function renderScene(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h, dpr } = state.stage;
  
  // Crisp dark background
  ctx.fillStyle = '#0f0f11';
  ctx.fillRect(0, 0, w, h);
  
  // Crisp Grid
  ctx.save();
  ctx.strokeStyle = '#1a1a1f';
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

  // Hard White Flash
  if (state.screenFlash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${state.screenFlash})`;
    ctx.fillRect(0, 0, w, h);
    state.screenFlash = Math.max(0, state.screenFlash - 0.1);
    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: State) {
  const p = state.player;
  
  ctx.save();
  
  // Charge Indicator Radius
  if (p.state === 'charging') {
    const attackRadius = 40 + p.charge * 60;
    ctx.strokeStyle = p.charge > 0.9 ? '#ff0055' : '#444';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, attackRadius, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Attack Arc / Hitbox
  if (p.state === 'attacking') {
    const attackRadius = 40 + p.charge * 60;
    ctx.fillStyle = p.charge > 0.9 ? '#ff0055' : '#fcee0a';
    ctx.globalAlpha = (p.attackTimer / 15);
    ctx.beginPath();
    ctx.arc(p.x, p.y, attackRadius, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Core Solid Shape
  ctx.fillStyle = p.state === 'charging' && p.charge > 0.9 ? '#ff0055' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 12);
  ctx.lineTo(p.x + 10, p.y + 10);
  ctx.lineTo(p.x - 10, p.y + 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: State) {
  for (const e of state.enemies) {
    const r = e.r;
    ctx.save();
    ctx.translate(e.x, e.y);
    
    // Whiff Recovery color = Blue (Vulnerable!)
    // Telegraph color = Red
    // Normal = Yellow/Orange
    
    let color = '#ffb300';
    if (e.state === 'telegraph') color = '#ff0055';
    if (e.state === 'recovering') color = '#00f0ff';
    
    ctx.fillStyle = '#0f0f11';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3; // Crisp, thick lines

    // Telegraph indicator
    if (e.state === 'telegraph') {
      ctx.beginPath();
      ctx.arc(0, 0, r + (e.stateTimer / 45) * 20, 0, Math.PI*2);
      ctx.stroke();
    }

    if (e.type === 'gear') {
      ctx.rotate(state.tick * 0.05);
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const radius = i % 2 === 0 ? r : r * 0.6;
        if (i === 0) ctx.moveTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
        else ctx.lineTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Skull
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
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(-r*0.3, -r*0.1, r*0.2, 0, Math.PI*2);
      ctx.arc(r*0.3, -r*0.1, r*0.2, 0, Math.PI*2);
      ctx.fill();
    }
    
    // HP Bar if damaged
    if (e.hp < 100) {
       ctx.fillStyle = '#444';
       ctx.fillRect(-15, -r - 15, 30, 4);
       ctx.fillStyle = color;
       ctx.fillRect(-15, -r - 15, 30 * Math.max(0, e.hp / 100), 4);
    }
    
    ctx.restore();
  }
}
