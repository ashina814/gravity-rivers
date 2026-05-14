import type { State } from '@/core/state';
import { drawFx } from './fx';
import { drawPlayer } from './player';
import { drawEnemies } from './enemies';
import { drawProjectiles } from './projectiles';
import { drawStyleRank, drawLives } from './ui';

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
