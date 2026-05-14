import type { State } from '@/core/state';
import type { AudioEngine } from '@/audio/audio';
import { world } from '@/ecs/world';
import { playerLogicSystem } from '@/ecs/systems/playerLogic';
import { enemyAISystem } from '@/ecs/systems/enemyAI';
import { movementSystem } from '@/ecs/systems/movement';
import { combatSystem } from '@/ecs/systems/combat';
import { particleSystem } from '@/ecs/systems/particles';

export function stepPhysics(state: State, stepMs: number, audio?: AudioEngine) {
  if (state.stateMachine === 'gameover') {
     particleSystem(world, stepMs * 0.1 / 16);
     movementSystem(world, stepMs * 0.1 / 16);
     return;
  }

  let dt = state.slowMo > 0 ? stepMs * 0.1 : stepMs;
  if (state.slowMo > 0) state.slowMo--;

  for (const sl of state.slashLines) {
     sl.life -= (stepMs / 1000) * 3.0; // Fades out in ~0.33s
  }
  state.slashLines = state.slashLines.filter(sl => sl.life > 0);

  if (state.freezeFrames > 0) {
    state.freezeFrames -= (stepMs / 16);
    return; // Freeze physics during heavy hitstop
  }

  if (state.combo >= 50 && state.overdriveTimer <= 0) {
    state.overdriveTimer = 625; // ~10 seconds
    state.screenFlash = 1.0;
    state.shakeMag = 30;
    state.shakeMs = 500;
    // We should spawn a popup here, but we can rely on state for now
  }
  
  if (state.overdriveTimer > 0) {
    state.overdriveTimer -= (dt / 16);
    if (state.overdriveTimer <= 0) {
      state.combo = 0; 
    }
  }

  if (state.rankPulse > 0) {
    state.rankPulse -= (stepMs / 16) * 0.05;
  }

  const dtFrames = dt / 16.6667;

  // Run bitECS systems
  playerLogicSystem(world, state, stepMs, dtFrames);
  enemyAISystem(world, dtFrames);
  movementSystem(world, dtFrames);
  combatSystem(world, state, dtFrames, audio);
  particleSystem(world, dtFrames);
}
