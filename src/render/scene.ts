import type { State, Enemy } from '@/core/state';
import { drawFx } from './fx';

export function renderScene(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h } = state.stage;
  
  // Dark industrial background
  ctx.fillStyle = '#0a0508';
  ctx.fillRect(0, 0, w, h);
  
  // DMC Typography Background Text
  if (state.bgText && state.bgText.timer > 0) {
    state.bgText.timer -= state.lastFrameMs / 16;
    const progress = 1 - Math.max(0, state.bgText.timer / state.bgText.maxTimer);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1 + progress * 0.3, 1 + progress * 0.3);
    ctx.fillStyle = `rgba(255, 0, 85, ${0.15 * (1 - progress)})`;
    ctx.font = 'italic 900 160px var(--font, monospace)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.bgText.text, 0, 0);
    ctx.restore();
  }
  
  // Dynamic Camera Zoom (Streaming Appeal)
  // Zooms in slightly during slow-mo/heavy hits
  ctx.save();
  const scale = state.slowMo > 0 ? 1.02 : 1.0;
  const cx = w / 2;
  const cy = h / 2;
  
  // Screen shake
  let ox = 0, oy = 0;
  if (state.overdriveTimer > 0) {
    ox = (Math.random() - 0.5) * 2;
    oy = (Math.random() - 0.5) * 2;
  }

  ctx.translate(cx + ox, cy + oy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  drawGrid(ctx, w, h);
  
  if (state.stateMachine !== 'gameover') {
    drawPlayer(ctx, state);
  }
  drawEnemies(ctx, state);
  drawFx(ctx, state);
  
  ctx.restore();

  // Screen Flash
  if (state.screenFlash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${state.screenFlash})`;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(0, 0, w, h);
    state.screenFlash = Math.max(0, state.screenFlash - 0.1);
    ctx.restore();
  }

  // Monochrome Flash
  if (state.monochromeFrames > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    state.monochromeFrames -= state.lastFrameMs / 16;
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = '#140810';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const gridR = 60;
  for(let x=0; x<w; x+=gridR) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for(let y=0; y<h; y+=gridR) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: State) {
  const p = state.player;
  ctx.save();
  
  // Colorful neon colors instead of glitch
  const isMaxCharge = p.charge > 0.9;
  const primaryColor = isMaxCharge ? '#ff0055' : '#00f0ff';
  
  if (state.overdriveTimer > 0) {
    ctx.shadowColor = '#fcee0a';
    ctx.shadowBlur = 20;
  }

  // Charge Indicator Radius
  if (p.state === 'charging') {
    const attackRadius = 40 + p.charge * 60;
    ctx.strokeStyle = primaryColor;
    ctx.setLineDash(isMaxCharge ? [] : [5, 5]);
    ctx.lineWidth = isMaxCharge ? 4 : 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, attackRadius, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Attack Hitbox Flash
  if (p.state === 'attacking') {
    const attackRadius = 40 + p.charge * 60;
    ctx.fillStyle = primaryColor;
    ctx.globalAlpha = (p.attackTimer / 15) * 0.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, attackRadius, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Core Solid Shape
  ctx.fillStyle = primaryColor;
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
    
    // Colorful enemy states
    let color = e.type === 'gear' ? '#ff9a30' : '#b24bff'; // Orange for gear, purple for skull
    if (e.state === 'telegraph') color = '#ff0055'; // Red warning
    if (e.state === 'recovering') color = '#00f0ff'; // Cyan vulnerable
    
    ctx.fillStyle = '#0a0508';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    // Telegraph indicator
    if (e.state === 'telegraph') {
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, r + (e.stateTimer / 45) * 20, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
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
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, -r*0.5);
      ctx.lineTo(r*0.8, r);
      ctx.lineTo(-r*0.8, r);
      ctx.lineTo(-r, -r*0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(-r*0.3, -r*0.1, r*0.2, 0, Math.PI*2);
      ctx.arc(r*0.3, -r*0.1, r*0.2, 0, Math.PI*2);
      ctx.fill();
    }
    
    if (e.hp < 100) {
       ctx.fillStyle = '#333';
       ctx.fillRect(-15, -r - 15, 30, 4);
       ctx.fillStyle = color;
       ctx.fillRect(-15, -r - 15, 30 * Math.max(0, e.hp / 100), 4);
    }
    
    ctx.restore();
  }
}
