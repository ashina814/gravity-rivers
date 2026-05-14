import type { State } from '@/core/state';
import type { AudioEngine } from '@/audio/audio';
import { world } from '@/ecs/world';
import { playerLogicSystem } from '@/ecs/systems/playerLogic';
import { enemyAISystem } from '@/ecs/systems/enemyAI';
import { movementSystem } from '@/ecs/systems/movement';
import { combatSystem } from '@/ecs/systems/combat';
import { particleSystem } from '@/ecs/systems/particles';
import { spawnerSystem } from '@/ecs/systems/spawner';

export function stepPhysics(state: State, stepMs: number, audio?: AudioEngine) {
  if (state.stateMachine === 'gameover') {
     particleSystem(world, stepMs * 0.1 / 16);
     movementSystem(world, stepMs * 0.1 / 16);
     return;
  }

  // Time Slow Ramp（ゆっくり戻る）
  let dt = stepMs;
  if (state.slowMo > 0) {
    const slowFactor = Math.max(0.1, state.slowMo / 10); // 0.1x → 1.0x にランプアップ
    dt = stepMs * slowFactor;
    state.slowMo--;
  }

  for (const sl of state.slashLines) {
     sl.life -= (stepMs / 1000) * 3.0;
  }
  state.slashLines = state.slashLines.filter(sl => sl.life > 0);

  if (state.freezeFrames > 0) {
    state.freezeFrames -= (stepMs / 16);
    return;
  }

  if (state.combo >= 50 && state.overdriveTimer <= 0) {
    state.overdriveTimer = 625;
    state.screenFlash = 1.0;
    state.shakeMag = 30;
    state.shakeMs = 500;
    state.popups.push({
      x: state.stage.w / 2, y: state.stage.h / 2 - 50,
      vy: -1, life: 2.0, color: '#fcee0a', text: '⚡ OVERDRIVE ⚡', size: 48
    });
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
  spawnerSystem(state);
  playerLogicSystem(world, state, stepMs, dtFrames);
  enemyAISystem(world, dtFrames);
  movementSystem(world, dtFrames);
  combatSystem(world, state, dtFrames, audio);
  particleSystem(world, dtFrames);
}
