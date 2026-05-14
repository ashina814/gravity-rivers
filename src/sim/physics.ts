import type { State } from '@/core/state';
import type { AudioEngine } from '@/audio/audio';
import { updatePlayer } from './player';
import { updateEnemies } from './enemies';
import { updateProjectiles } from './projectiles';

export function stepPhysics(state: State, stepMs: number, audio?: AudioEngine) {
  if (state.stateMachine === 'gameover') {
     // Freeze physics when dead, but maybe let particles fly
     for (const p of state.particles) {
       p.x += p.vx * 0.1;
       p.y += p.vy * 0.1;
       p.life -= 0.01;
     }
     state.particles = state.particles.filter(p => p.life > 0);
     return;
  }

  let dt = state.slowMo > 0 ? stepMs * 0.1 : stepMs;
  if (state.slowMo > 0) state.slowMo--;

  // Update Slash Lines
  for (const sl of state.slashLines) {
     sl.life -= (stepMs / 1000) * 3.0; // Fades out in ~0.33s
  }
  state.slashLines = state.slashLines.filter(sl => sl.life > 0);

  if (state.freezeFrames > 0) {
    state.freezeFrames -= (stepMs / 16);
    return; // Freeze physics during heavy hitstop
  }

  // Overdrive logic
  if (state.combo >= 50 && state.overdriveTimer <= 0) {
    state.overdriveTimer = 625; // ~10 seconds
    state.screenFlash = 1.0;
    state.shakeMag = 30;
    state.shakeMs = 500;
    state.popups.push({
      x: state.stage.w / 2, y: state.stage.h / 2,
      vy: -2, life: 2.0, color: '#fcee0a', text: 'OVERDRIVE!!', size: 64
    });
  }
  
  if (state.overdriveTimer > 0) {
    state.overdriveTimer -= (dt / 16);
    if (state.overdriveTimer <= 0) {
      state.combo = 0; 
    }
  }

  // Rank Pulse
  if (state.rankPulse > 0) {
    state.rankPulse -= (stepMs / 16) * 0.05;
  }

  updatePlayer(state, stepMs, dt, audio);
  updateProjectiles(state, dt, audio);
  updateEnemies(state, dt, audio);
}
