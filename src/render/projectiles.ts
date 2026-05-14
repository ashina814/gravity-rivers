import type { State } from '@/core/state';
import type { Graphics } from 'pixi.js';

export function drawProjectiles(g: Graphics, state: State) {
  for (const proj of state.projectiles) {
    if (proj.dead) continue;
    
    g.circle(proj.x, proj.y, 5);
    g.fill({ color: 0xff0055 });
    
    g.circle(proj.x, proj.y, 2);
    g.fill({ color: 0xffffff });
  }
}
