import type { State } from '@/core/state';
import type { Graphics } from 'pixi.js';
import { defineQuery } from 'bitecs';
import { world } from '@/ecs/world';
import { Position, Projectile } from '@/ecs/components';

const projQuery = defineQuery([Position, Projectile]);

export function drawProjectiles(g: Graphics, state: State) {
  const projectiles = projQuery(world);
  for (let i = 0; i < projectiles.length; i++) {
    const eid = projectiles[i];
    if (Projectile.dead[eid]) continue;
    
    const x = Position.x[eid];
    const y = Position.y[eid];

    g.circle(x, y, 5);
    g.fill({ color: 0xff0055 });
    
    g.circle(x, y, 2);
    g.fill({ color: 0xffffff });
  }
}
