import type { State } from '@/core/state';
import type { AudioEngine } from '@/audio/audio';
import { damagePlayer } from './player';

export function updateEnemies(state: State, dt: number, audio?: AudioEngine) {
  const p = state.player;

  // Enemy movement & Footsies logic
  for (const e of state.enemies) {
    if (e.dead) continue;
    
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const distToPlayer = Math.hypot(dx, dy);

    if (e.type === 'gear') {
      // Swarm: slowly move towards player
      const speed = 1.5;
      if (distToPlayer > 0) {
        e.vx += ((dx / distToPlayer) * speed - e.vx) * 0.1;
        e.vy += ((dy / distToPlayer) * speed - e.vy) * 0.1;
      }
      if (distToPlayer < e.r + 10 && p.state !== 'attacking') {
        damagePlayer(state, audio);
      }
    } 
    else if (e.type === 'skull') {
      // Sniper: keep distance and shoot
      const speed = 2.0;
      const desiredDist = 300;
      if (distToPlayer > 0) {
        const dirX = dx / distToPlayer;
        const dirY = dy / distToPlayer;
        let moveX = dirX, moveY = dirY;
        if (distToPlayer < desiredDist) { moveX = -dirX; moveY = -dirY; } // run away
        else if (distToPlayer < desiredDist + 50) { moveX = 0; moveY = 0; } // stop
        
        e.vx += (moveX * speed - e.vx) * 0.1;
        e.vy += (moveY * speed - e.vy) * 0.1;
      }
      
      e.stateTimer -= (dt / 16);
      if (e.stateTimer <= 0) {
         // Shoot!
         if (distToPlayer > 0) {
           const bVx = (dx / distToPlayer) * 12;
           const bVy = (dy / distToPlayer) * 12;
           state.projectiles.push({ id: Math.random(), x: e.x, y: e.y, vx: bVx, vy: bVy, dead: false });
           e.stateTimer = 120; // 2 seconds between shots
           
           // Shoot particles
           state.particles.push({
             x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, color: '#ff0055', size: 10, kind: 'spark', shimmer: false
           });
         }
      }
      
      if (distToPlayer < e.r + 10 && p.state !== 'attacking') {
        damagePlayer(state, audio);
      }
    } 
    else if (e.type === 'boss') {
      // Elite: Swarm but faster, and shielded
      const speed = 3.5;
      if (distToPlayer > 0) {
        e.vx += ((dx / distToPlayer) * speed - e.vx) * 0.1;
        e.vy += ((dy / distToPlayer) * speed - e.vy) * 0.1;
      }
      if (distToPlayer < e.r + 10 && p.state !== 'attacking') {
        damagePlayer(state, audio);
      }
    }
    
    e.x += e.vx * (dt / 16);
    e.y += e.vy * (dt / 16);
  }

  state.enemies = state.enemies.filter(e => !e.dead);
}
