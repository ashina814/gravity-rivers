import type { State, Enemy } from '@/core/state';
import { drawFx } from './fx';

export function renderScene(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h } = state.stage;
  
  // Dark industrial background
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, w, h);
  
  // DMC Typography Background Text
  if (state.bgText && state.bgText.timer > 0) {
    state.bgText.timer -= state.lastFrameMs / 16;
    const progress = 1 - Math.max(0, state.bgText.timer / state.bgText.maxTimer);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1 + progress * 0.3, 1 + progress * 0.3);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.06 * (1 - progress)})`;
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
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + p.charge * 0.35})`;
      ctx.lineWidth = 1 + p.charge * 2;
      ctx.setLineDash([8, 12]);
      ctx.lineDashOffset = -(state.tick % 100) * 0.5;
      ctx.stroke();
      ctx.restore();
    }
    
    drawPlayer(ctx, state);
  }
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawFx(ctx, state);
  
  ctx.restore(); // Restore camera transform

  drawLives(ctx, state);

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
  if (combo < 10) return { rank: 'C', word: 'CRAZY', color: 'rgba(255,255,255,0.6)' };
  if (combo < 20) return { rank: 'B', word: 'BADASS', color: 'rgba(255,255,255,0.7)' };
  if (combo < 35) return { rank: 'A', word: 'APOCALYPTIC', color: 'rgba(255,255,255,0.8)' };
  if (combo < 50) return { rank: 'S', word: 'SAVAGE', color: '#ffffff' };
  if (combo < 70) return { rank: 'SS', word: 'SICK SKILLS', color: '#ffffff' };
  return { rank: 'SSS', word: 'SMOKIN SEXY STYLE', color: '#ffffff' };
}

function drawStyleRank(ctx: CanvasRenderingContext2D, state: State) {
  const rankObj = getStyleRank(state.combo);
  if (!rankObj) return;

  const { w } = state.stage;
  ctx.save();
  ctx.translate(w - 120, 140);
  
  const pulse = state.rankPulse > 0 ? state.rankPulse : 0;
  const scale = 1 + pulse * 0.3;
  ctx.scale(scale, scale);
  
  // Rank letter — big, white, clean
  ctx.font = '900 100px var(--font, monospace)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rankObj.color;
  ctx.globalAlpha = 0.9;
  ctx.fillText(rankObj.rank, 0, 0);
  
  // Rank word — small, understated
  ctx.font = '900 14px var(--font, monospace)';
  ctx.globalAlpha = 0.5;
  ctx.letterSpacing = '4px';
  ctx.fillStyle = '#fff';
  ctx.fillText(rankObj.word, 0, 60);
  ctx.globalAlpha = 1.0;
  
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gridR = 80;
  for(let x=0; x<w; x+=gridR) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for(let y=0; y<h; y+=gridR) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: State) {
  const p = state.player;
  if (p.invulnTimer > 0 && Math.floor(state.timeMs / 80) % 2 === 0) return;

  ctx.save();
  
  const isMaxCharge = p.charge > 0.9;
  const primaryColor = '#ffffff';
  const accentColor = isMaxCharge ? '#ff0055' : 'rgba(255,255,255,0.5)';
  
  // Charge ring
  if (p.state === 'charging') {
    const attackRadius = 40 + p.charge * 60;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = isMaxCharge ? 2 : 1;
    ctx.globalAlpha = 0.4 + p.charge * 0.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, attackRadius, 0, Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Attack flash
  if (p.state === 'attacking') {
    const attackRadius = 40 + p.charge * 60;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = (p.attackTimer / 15) * 0.15;
    ctx.beginPath();
    ctx.arc(p.x, p.y, attackRadius, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Player triangle
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 14);
  ctx.lineTo(p.x + 11, p.y + 11);
  ctx.lineTo(p.x - 11, p.y + 11);
  ctx.closePath();
  ctx.fill();

  // Overdrive glow
  if (state.overdriveTimer > 0) {
    ctx.strokeStyle = '#fcee0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI*2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: State) {
  for (const e of state.enemies) {
    const r = e.r;
    ctx.save();
    ctx.translate(e.x, e.y);
    
    // Clean color coding by type
    let color = '#888'; // gear: neutral grey
    if (e.type === 'skull') color = '#cc4444'; // sniper: muted red
    if (e.type === 'boss') color = '#ffffff'; // elite: white
    
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    if (e.type === 'gear') {
      ctx.rotate(state.tick * 0.03);
      ctx.beginPath();
      const spikes = 6;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const radius = i % 2 === 0 ? r : r * 0.65;
        if (i === 0) ctx.moveTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
        else ctx.lineTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.type === 'skull') {
      // Sniper: diamond
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Crosshair dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI*2);
      ctx.fill();
    } else {
      // Boss: hexagon with shield ring
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 6;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Shield ring
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, state: State) {
  for (const proj of state.projectiles) {
    if (proj.dead) continue;
    ctx.save();
    ctx.translate(proj.x, proj.y);
    
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0055';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    ctx.restore();
  }
}

function drawLives(ctx: CanvasRenderingContext2D, state: State) {
  if (state.stateMachine === 'gameover') return;
  const lives = state.player.lives;
  ctx.save();
  ctx.translate(30, 30);
  
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    // Small triangles for lives
    const ox = i * 28;
    ctx.moveTo(ox, -7);
    ctx.lineTo(ox + 7, 7);
    ctx.lineTo(ox - 7, 7);
    ctx.closePath();
    ctx.fillStyle = i < lives ? '#ffffff' : 'rgba(255,255,255,0.15)';
    ctx.fill();
  }
  ctx.restore();
}
