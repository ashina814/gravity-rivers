import type { State } from '@/core/state';

export function drawEnemies(ctx: CanvasRenderingContext2D, state: State) {
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
