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

  // Draw Screen Slash Lines
  for (const sl of state.slashLines) {
    ctx.save();
    ctx.beginPath();
    const dx = sl.x2 - sl.x1;
    const dy = sl.y2 - sl.y1;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const ex1 = sl.x1 - nx * 2000;
      const ey1 = sl.y1 - ny * 2000;
      const ex2 = sl.x2 + nx * 2000;
      const ey2 = sl.y2 + ny * 2000;
      
      ctx.moveTo(ex1, ey1);
      ctx.lineTo(ex2, ey2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10 * sl.life;
      ctx.shadowColor = sl.color;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = sl.life;
      ctx.stroke();

      // inner core
      ctx.beginPath();
      ctx.moveTo(ex1, ey1);
      ctx.lineTo(ex2, ey2);
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 30 * (sl.life ** 2);
      ctx.globalCompositeOperation = 'screen';
      ctx.stroke();
    }
    ctx.restore();
  }

  if (state.stateMachine !== 'gameover') {
    // Laser Sight for Cyber-Iai
    if (state.player.state === 'charging') {
      const p = state.player;
      ctx.save();
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const angle = Math.atan2(dy, dx);
      
      const dashDist = (30 + p.charge * 80) * 5; 
      
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dashDist, 0);
      ctx.strokeStyle = `rgba(255, 0, 85, ${0.3 + p.charge * 0.7})`;
      ctx.lineWidth = 2 + p.charge * 4;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -(state.tick % 100) * 0.5;
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }
    
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

  // Draw Style Rank (DMC Style)
  drawStyleRank(ctx, state);
}

function getStyleRank(combo: number) {
  if (combo < 5) return null;
  if (combo < 10) return { rank: 'C', word: 'CRAZY!', color: '#00f0ff' };
  if (combo < 20) return { rank: 'B', word: 'BADASS!!', color: '#ff9a30' };
  if (combo < 35) return { rank: 'A', word: 'APOCALYPTIC!!', color: '#ff0055' };
  if (combo < 50) return { rank: 'S', word: 'SAVAGE!!!', color: '#fcee0a' };
  if (combo < 70) return { rank: 'SS', word: 'SICK SKILLS!!!', color: '#fcee0a' };
  return { rank: 'SSS', word: 'SMOKIN SEXY STYLE!!!', color: '#fcee0a' };
}

function drawStyleRank(ctx: CanvasRenderingContext2D, state: State) {
  const rankObj = getStyleRank(state.combo);
  if (!rankObj) return;

  const { w, h } = state.stage;
  ctx.save();
  ctx.translate(w - 150, 150); // Top right corner
  
  // Pulse animation on threshold cross
  const pulse = state.rankPulse > 0 ? state.rankPulse : 0;
  const scale = 1 + pulse * 0.5;
  ctx.scale(scale, scale);
  ctx.rotate(-0.1); // Slightly tilted
  
  // Draw Rank Letter
  ctx.font = 'italic 900 120px var(--font, monospace)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // shadow/glow
  ctx.shadowColor = rankObj.color;
  ctx.shadowBlur = 20 + pulse * 20;
  
  ctx.fillStyle = rankObj.color;
  ctx.fillText(rankObj.rank, 0, 0);
  
  // Draw inner white
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.fillText(rankObj.rank, 0, 0);
  
  // Draw Rank Word
  ctx.font = 'italic 900 24px var(--font, monospace)';
  ctx.fillStyle = rankObj.color;
  ctx.fillText(rankObj.word, 0, 70);
  
  ctx.restore();
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
