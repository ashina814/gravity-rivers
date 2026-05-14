import { defineQuery, removeEntity } from 'bitecs';
import { Position, Velocity, Collider, Enemy, PlayerTag } from '../components';
import { createProjectile, createParticle } from '../prefabs';

const enemyQuery = defineQuery([Position, Velocity, Collider, Enemy]);
const playerQuery = defineQuery([Position, PlayerTag]);

export function enemyAISystem(world: any, dt: number) {
  const enemies = enemyQuery(world);
  const players = playerQuery(world);
  
  if (players.length === 0) return;
  const pEid = players[0];
  const px = Position.x[pEid];
  const py = Position.y[pEid];

  for (let i = 0; i < enemies.length; i++) {
    const eid = enemies[i];
    if (Enemy.hp[eid] <= 0) {
      removeEntity(world, eid);
      continue;
    }

    const ex = Position.x[eid];
    const ey = Position.y[eid];
    const dx = px - ex;
    const dy = py - ey;
    const dist = Math.hypot(dx, dy);
    
    const type = Enemy.type[eid];

    if (type === 0) { // Gear (Swarm)
      const speed = 1.5;
      if (dist > 0) {
        Velocity.x[eid] += ((dx / dist) * speed - Velocity.x[eid]) * 0.1;
        Velocity.y[eid] += ((dy / dist) * speed - Velocity.y[eid]) * 0.1;
      }
    } 
    else if (type === 1) { // Skull (Sniper)
      const speed = 2.0;
      const desiredDist = 300;
      if (dist > 0) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        let moveX = dirX, moveY = dirY;
        if (dist < desiredDist) { moveX = -dirX; moveY = -dirY; }
        else if (dist < desiredDist + 50) { moveX = 0; moveY = 0; }
        
        Velocity.x[eid] += (moveX * speed - Velocity.x[eid]) * 0.1;
        Velocity.y[eid] += (moveY * speed - Velocity.y[eid]) * 0.1;
      }

      Enemy.stateTimer[eid] -= dt;
      if (Enemy.stateTimer[eid] <= 0 && dist > 0) {
         const bVx = (dx / dist) * 12;
         const bVy = (dy / dist) * 12;
         createProjectile(ex, ey, bVx, bVy);
         Enemy.stateTimer[eid] = 120;
         // 射撃フラッシュパーティクル
         createParticle(ex, ey, 0, 0, 0.5, 10, 1, 3); // red spark
      }
    }
    else if (type === 2) { // Boss (Elite)
      const speed = 3.5;
      if (dist > 0) {
        Velocity.x[eid] += ((dx / dist) * speed - Velocity.x[eid]) * 0.1;
        Velocity.y[eid] += ((dy / dist) * speed - Velocity.y[eid]) * 0.1;
      }
    }
  }
}
