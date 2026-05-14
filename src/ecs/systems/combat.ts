import { defineQuery, removeEntity } from 'bitecs';
import { Position, Velocity, Collider, PlayerTag, PlayerState, Enemy, Projectile } from '../components';
import type { State } from '@/core/state';
import { createParticle } from '../prefabs';
import { sfxExplode, sfxPlayerHit } from '@/audio/sfx';
import type { AudioEngine } from '@/audio/audio';

const playerQuery = defineQuery([Position, PlayerTag, PlayerState]);
const enemyQuery = defineQuery([Position, Velocity, Collider, Enemy]);
const projQuery = defineQuery([Position, Collider, Projectile]);

function damagePlayer(state: State, eid: number, audio?: AudioEngine) {
  if (PlayerState.invulnTimer[eid] > 0) return;
  state.player.lives--;
  state.combo = 0;
  if (audio) sfxPlayerHit(audio);
  state.shakeMag = 80;
  state.shakeMs = 600;
  state.screenFlash = 1.0;
  state.bgmMuffled = 60;
  PlayerState.invulnTimer[eid] = 60; // 1 second invuln
  
  if (state.player.lives <= 0) {
     state.stateMachine = 'gameover';
     state.slowMo = 0; 
     state.monochromeFrames = 60; 
  }
}

export function combatSystem(world: any, state: State, dt: number, audio?: AudioEngine) {
  const players = playerQuery(world);
  if (players.length === 0) return;
  const pEid = players[0];
  
  const px = Position.x[pEid];
  const py = Position.y[pEid];
  const pState = PlayerState.state[pEid];
  const charge = PlayerState.charge[pEid];
  const attackTimer = PlayerState.attackTimer[pEid];

  const enemies = enemyQuery(world);
  const projectiles = projQuery(world);

  let killedThisFrame = 0;

  // --- Attack Resolution (Player dealing damage) ---
  if (pState === 2 && attackTimer > 8 && attackTimer <= 15) {
    const attackRadius = 60 + charge * 80;
    
    // Check Projectiles
    for (let i = 0; i < projectiles.length; i++) {
      const eid = projectiles[i];
      if (Projectile.dead[eid]) continue;
      const dist = Math.hypot(Position.x[eid] - px, Position.y[eid] - py);
      if (dist < attackRadius + 5) {
        Projectile.dead[eid] = 1;
        state.combo++;
        killedThisFrame++;
        createParticle(Position.x[eid], Position.y[eid], 0, 0, 1.0, 20, 1, 0);
      }
    }

    // Check Enemies
    for (let i = 0; i < enemies.length; i++) {
      const eid = enemies[i];
      if (Enemy.hp[eid] <= 0) continue;
      
      const ex = Position.x[eid];
      const ey = Position.y[eid];
      const dist = Math.hypot(ex - px, ey - py);
      
      if (dist < attackRadius + Collider.radius[eid]) {
        // Boss Shield Logic
        if (Enemy.type[eid] === 2 && charge < 1.0) {
           PlayerState.attackTimer[pEid] = 0; 
           state.combo = 0; 
           PlayerState.charge[pEid] = 0;
           PlayerState.chainReady[pEid] = 0;
           state.shakeMag = 20; state.shakeMs = 200;
           // Bounce player
           if(dist > 0) { 
             Position.x[pEid] += ((px - ex)/dist)*30; 
             Position.y[pEid] += ((py - ey)/dist)*30; 
           }
           continue;
        }
        
        Enemy.hp[eid] -= (50 + charge * 150);
        if (Enemy.hp[eid] <= 0 || Enemy.type[eid] !== 2) {
          Enemy.hp[eid] = 0; // marks for death
          if (audio) sfxExplode(audio, charge);

          state.killSplashes.push({
             x: ex, y: ey, timer: 1.0, color: charge > 0.8 ? '#ff0055' : '#ffffff'
          });
          
          state.combo++;
          state.maxCombo = Math.max(state.maxCombo, state.combo);
          state.score += 100 * state.combo;
          killedThisFrame++;
          
          if ([5, 10, 20, 35, 50, 70].includes(state.combo)) {
             state.rankPulse = 1.0;
          }
        } else {
          Velocity.x[eid] = ((ex - px) / dist) * 10;
          Velocity.y[eid] = ((ey - py) / dist) * 10;
        }

        state.shakeMag = Math.max(state.shakeMag, 10 + charge * 20);
        state.shakeMs = 150;
        state.screenFlash = Math.max(state.screenFlash, charge > 0.8 ? 0.6 : 0.2);
      }
    }
  }

  // --- Combo Effects ---
  if (killedThisFrame > 0) {
    PlayerState.chainReady[pEid] = 1;
  }
  if (killedThisFrame >= 2) {
    state.slashLines.push({
       x1: state.player.dashStartX || px, y1: state.player.dashStartY || py,
       x2: px, y2: py,
       life: 1.0, maxLife: 1.0, color: charge > 0.8 ? '#ff0055' : '#00f0ff'
    });
  }
  if (killedThisFrame >= 3) {
    state.freezeFrames = 4;
    state.monochromeFrames = 10;
    state.bgmMuffled = 20;
    state.shakeMag = 50; state.shakeMs = 200;
  }

  // --- Player taking damage (Not attacking) ---
  if (pState !== 2) {
    for (let i = 0; i < enemies.length; i++) {
      const eid = enemies[i];
      if (Enemy.hp[eid] <= 0) continue;
      const dist = Math.hypot(px - Position.x[eid], py - Position.y[eid]);
      if (dist < Collider.radius[eid] + Collider.radius[pEid]) {
        damagePlayer(state, pEid, audio);
      }
    }
    for (let i = 0; i < projectiles.length; i++) {
      const eid = projectiles[i];
      if (Projectile.dead[eid]) continue;
      const dist = Math.hypot(px - Position.x[eid], py - Position.y[eid]);
      if (dist < Collider.radius[eid] + Collider.radius[pEid]) {
        Projectile.dead[eid] = 1;
        damagePlayer(state, pEid, audio);
      }
    }
  }

  // Cleanup projectiles (out of bounds or dead)
  for (let i = 0; i < projectiles.length; i++) {
    const eid = projectiles[i];
    if (Projectile.dead[eid] || Position.x[eid] < -100 || Position.x[eid] > state.stage.w + 100 || Position.y[eid] < -100 || Position.y[eid] > state.stage.h + 100) {
      removeEntity(world, eid);
    }
  }
}
