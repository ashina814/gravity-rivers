import type { State } from '@/core/state';
import type { Graphics } from 'pixi.js';
import { defineQuery } from 'bitecs';
import { world } from '@/ecs/world';
import { Position, Enemy, Collider } from '@/ecs/components';

const enemyQuery = defineQuery([Position, Enemy, Collider]);

export function drawEnemies(g: Graphics, state: State) {
  const enemies = enemyQuery(world);
  for (let i = 0; i < enemies.length; i++) {
    const eid = enemies[i];
    const x = Position.x[eid];
    const y = Position.y[eid];
    const r = Collider.radius[eid];
    const type = Enemy.type[eid];

    let color = 0x888888;
    if (type === 1) color = 0xcc4444; // skull
    if (type === 2) color = 0xffffff; // boss

    if (type === 0) { // gear
      const angleOffset = state.tick * 0.03;
      const spikes = 6;
      for (let j = 0; j < spikes * 2; j++) {
        const angle = angleOffset + (j * Math.PI) / spikes;
        const radius = j % 2 === 0 ? r : r * 0.65;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (j === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.6 });
      g.stroke({ width: 2, color });
    } else if (type === 1) { // skull
      g.moveTo(x, y - r);
      g.lineTo(x + r, y);
      g.lineTo(x, y + r);
      g.lineTo(x - r, y);
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.6 });
      g.stroke({ width: 2, color });
      
      g.circle(x, y, 3);
      g.fill({ color });
    } else { // boss
      for (let j = 0; j < 6; j++) {
        const angle = (j * Math.PI * 2) / 6 - Math.PI / 6;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (j === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.6 });
      g.stroke({ width: 2, color });
      
      g.circle(x, y, r + 6);
      g.stroke({ width: 3, color: 0xffffff, alpha: 0.3 });
    }
  }
}
