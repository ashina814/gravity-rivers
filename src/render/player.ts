import type { State } from '@/core/state';

export function drawPlayer(ctx: CanvasRenderingContext2D, state: State) {
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
