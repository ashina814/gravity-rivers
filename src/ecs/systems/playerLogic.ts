import { defineQuery } from 'bitecs';
import { Position, Velocity, PlayerTag, PlayerState } from '../components';
import type { State } from '@/core/state';

const playerQuery = defineQuery([Position, Velocity, PlayerTag, PlayerState]);

export function playerLogicSystem(world: any, state: State, stepMs: number, dt: number) {
  const players = playerQuery(world);
  if (players.length === 0) return;
  const eid = players[0];

  const pState = PlayerState.state[eid];
  let charge = PlayerState.charge[eid];
  let invulnTimer = PlayerState.invulnTimer[eid];
  let attackTimer = PlayerState.attackTimer[eid];
  let chainReady = PlayerState.chainReady[eid];

  if (invulnTimer > 0) {
    invulnTimer -= (stepMs / 16);
  }

  // Time Dilation (charging)
  if (pState === 1) { // 1: charging
    const wasMax = charge >= 1.0;
    charge = Math.min(1, charge + 0.05 * (stepMs / 16)); 
    if (state.overdriveTimer > 0) charge = 1.0;
    
    if (!wasMax && charge >= 1.0) {
      state.screenFlash = 0.5;
      // We can spawn some particles here using ECS later
      state.bgmMuffled = Math.max(state.bgmMuffled, 2);
    }
  }

  // Player Movement (Damping towards target)
  if (pState === 0) { // 0: moving
    // Target is still managed in State for now (mouse input)
    const dx = state.player.target.x - Position.x[eid];
    const dy = state.player.target.y - Position.y[eid];
    
    Velocity.x[eid] = dx * 0.2;
    Velocity.y[eid] = dy * 0.2;
    
    const maxSpeed = 8;
    const velMag = Math.hypot(Velocity.x[eid], Velocity.y[eid]);
    if (velMag > maxSpeed) {
      Velocity.x[eid] = (Velocity.x[eid] / velMag) * maxSpeed;
      Velocity.y[eid] = (Velocity.y[eid] / velMag) * maxSpeed;
    }
  } else if (pState === 1) {
    // Stand perfectly still to aim
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
  }

  // Attack Resolution
  if (pState === 2) { // 2: attacking
    if (attackTimer === 15) {
      state.player.dashStartX = Position.x[eid];
      state.player.dashStartY = Position.y[eid];
      chainReady = 0;
    }
    
    attackTimer -= (dt / 16);
    
    // Dashing phase
    if (attackTimer > 10) {
       const dx = state.player.target.x - Position.x[eid];
       const dy = state.player.target.y - Position.y[eid];
       const dist = Math.hypot(dx, dy);
       if (dist > 0) {
          const dashSpeed = 30 + charge * 80;
          Position.x[eid] += (dx / dist) * dashSpeed;
          Position.y[eid] += (dy / dist) * dashSpeed;
       }
    }

    // Chain Strike Cancel (Skip recovery)
    if (attackTimer <= 10 && chainReady === 1) {
       attackTimer = 0; // Instant cancel!
    }

    if (attackTimer <= 0) {
      PlayerState.state[eid] = 0; // back to moving
      charge = 0;
    }
  }

  // Write back to components
  PlayerState.charge[eid] = charge;
  PlayerState.invulnTimer[eid] = invulnTimer;
  PlayerState.attackTimer[eid] = attackTimer;
  PlayerState.chainReady[eid] = chainReady;
  
  // Sync core state representation (so UI/Camera can easily find player)
  state.player.x = Position.x[eid];
  state.player.y = Position.y[eid];
  state.player.state = pState === 0 ? 'moving' : pState === 1 ? 'charging' : 'attacking';
  state.player.charge = charge;
  state.player.invulnTimer = invulnTimer;
  state.player.attackTimer = attackTimer;
}
