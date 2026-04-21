import type { State } from '@/core/state';
import { LEVELS } from '@/core/levels';

export function drawLevel(ctx: CanvasRenderingContext2D, state: State): void {
  const level = LEVELS[state.currentLevelIdx] || LEVELS[0];
  const { w, h } = state.stage;
  const minDim = Math.min(w, h);

  // Draw Goal
  const gx = level.goal.rx * w;
  const gy = level.goal.ry * h;
  const gr = level.goal.rr * minDim;
  
  ctx.save();
  ctx.beginPath();
  ctx.arc(gx, gy, gr, 0, Math.PI * 2);
  
  // Pulse effect based on score and time
  const pulse = Math.sin(state.timeMs * 0.005) * 0.5 + 0.5;
  const progress = Math.min(1, state.score / level.goal.required);
  
  const colorStr = progress >= 1 ? '#fcee0a' : state.palette.accent;
  ctx.strokeStyle = colorStr;
  ctx.lineWidth = 4 + pulse * 2;
  ctx.shadowColor = colorStr;
  ctx.shadowBlur = 20 + pulse * 20;
  
  // Cyberpunk goal node
  ctx.strokeRect(gx - gr, gy - gr, gr * 2, gr * 2);
  
  ctx.beginPath();
  ctx.moveTo(gx, gy - gr*1.2);
  ctx.lineTo(gx + gr*1.2, gy);
  ctx.lineTo(gx, gy + gr*1.2);
  ctx.lineTo(gx - gr*1.2, gy);
  ctx.closePath();
  ctx.stroke();
  
  // Goal fill based on progress
  ctx.fillRect(gx - gr, gy + gr - (gr * 2 * progress), gr * 2, gr * 2 * progress);
  
  // Progress text
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 5;
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (state.stateMachine === 'cleared') {
    ctx.fillText('CLEAR!', gx, gy);
  } else {
    ctx.fillText(`${state.score}/${level.goal.required}`, gx, gy);
  }
  ctx.restore();

  // Draw Obstacles
  ctx.save();
  ctx.fillStyle = '#1a0505';
  ctx.strokeStyle = '#ff2255';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff2255';
  ctx.shadowBlur = 15;
  
  for (const obs of level.obstacles) {
    const ox = obs.rx * w;
    const oy = obs.ry * h;
    const ow = obs.rw * w;
    const oh = obs.rh * h;
    
    ctx.fillRect(ox, oy, ow, oh);
    ctx.strokeRect(ox, oy, ow, oh);
    
    // Hazard stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, ow, oh);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 34, 85, 0.3)';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 0;
    const offset = (state.timeMs * 0.05) % 40;
    for (let i = -oh - 40; i < ow + oh; i += 40) {
      ctx.beginPath();
      ctx.moveTo(ox + i + offset, oy);
      ctx.lineTo(ox + i + offset + oh, oy + oh);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
