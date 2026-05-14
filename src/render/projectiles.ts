import type { State } from '@/core/state';

export function drawProjectiles(ctx: CanvasRenderingContext2D, state: State) {
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
