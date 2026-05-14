import type { State } from '@/core/state';
import type { AudioEngine } from '@/audio/audio';
import { damagePlayer } from './player';

export function updateProjectiles(state: State, dt: number, audio?: AudioEngine) {
  const p = state.player;

  // Projectile movement
  for (const proj of state.projectiles) {
    proj.x += proj.vx * (dt / 16);
    proj.y += proj.vy * (dt / 16);
    
    // Check hit player
    const distToPlayer = Math.hypot(p.x - proj.x, p.y - proj.y);
    if (distToPlayer < 10 && p.state !== 'attacking') {
      proj.dead = true;
      damagePlayer(state, audio);
    }
  }
  
  state.projectiles = state.projectiles.filter(proj => !proj.dead && proj.x > -100 && proj.x < state.stage.w+100 && proj.y > -100 && proj.y < state.stage.h+100);
}
