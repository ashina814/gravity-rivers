import type { State } from '@/core/state';
import type { Graphics } from 'pixi.js';

export function drawEnemies(g: Graphics, state: State) {
  for (const e of state.enemies) {
    const r = e.r;
    
    let color = 0x888888;
    if (e.type === 'skull') color = 0xcc4444;
    if (e.type === 'boss') color = 0xffffff;

    if (e.type === 'gear') {
      const angleOffset = state.tick * 0.03;
      const spikes = 6;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = angleOffset + (i * Math.PI) / spikes;
        const radius = i % 2 === 0 ? r : r * 0.65;
        const px = e.x + Math.cos(angle) * radius;
        const py = e.y + Math.sin(angle) * radius;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.6 });
      g.stroke({ width: 2, color });
    } else if (e.type === 'skull') {
      g.moveTo(e.x, e.y - r);
      g.lineTo(e.x + r, e.y);
      g.lineTo(e.x, e.y + r);
      g.lineTo(e.x - r, e.y);
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.6 });
      g.stroke({ width: 2, color });
      
      g.circle(e.x, e.y, 3);
      g.fill({ color });
    } else {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 6;
        const px = e.x + Math.cos(angle) * r;
        const py = e.y + Math.sin(angle) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.6 });
      g.stroke({ width: 2, color });
      
      g.circle(e.x, e.y, r + 6);
      g.stroke({ width: 3, color: 0xffffff, alpha: 0.3 });
    }
  }
}
