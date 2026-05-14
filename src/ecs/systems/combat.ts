import { defineQuery, removeEntity } from 'bitecs';
import { Position, Velocity, Collider, PlayerTag, PlayerState, Enemy, Projectile } from '../components';
import type { State } from '@/core/state';
import { createParticle } from '../prefabs';
import { sfxExplode, sfxPlayerHit } from '@/audio/sfx';
import type { AudioEngine } from '@/audio/audio';
import { rgbFilter } from '@/render/engine';

const playerQuery = defineQuery([Position, PlayerTag, PlayerState]);
const enemyQuery = defineQuery([Position, Velocity, Collider, Enemy]);
const projQuery = defineQuery([Position, Collider, Projectile]);

/** RGB Split を一瞬だけかける（ヒット演出用） */
function flashRGB(intensity: number) {
  if (!rgbFilter) return;
  rgbFilter.red = { x: -intensity, y: 0 };
  rgbFilter.blue = { x: intensity, y: 0 };
  rgbFilter.green = { x: 0, y: intensity * 0.5 };
  setTimeout(() => {
    if (!rgbFilter) return;
    rgbFilter.red = { x: 0, y: 0 };
    rgbFilter.blue = { x: 0, y: 0 };
    rgbFilter.green = { x: 0, y: 0 };
  }, 80);
}

function damagePlayer(state: State, eid: number, audio?: AudioEngine) {
  if (PlayerState.invulnTimer[eid] > 0) return;
  state.player.lives--;
  state.combo = 0;
  if (audio) sfxPlayerHit(audio);
  state.shakeMag = 80;
  state.shakeMs = 600;
  state.screenFlash = 1.0;
  state.bgmMuffled = 60;
  PlayerState.invulnTimer[eid] = 60;
  flashRGB(5);
  
  if (state.player.lives <= 0) {
     state.stateMachine = 'gameover';
     state.slowMo = 0; 
     state.monochromeFrames = 60;
     // 死亡パーティクル（40個の大赤スパーク）
     for (let i = 0; i < 40; i++) {
       createParticle(
         Position.x[eid], Position.y[eid],
         (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40,
         3.0, 10, 1, 3 // kind=spark, colorIndex=3(red)
       );
     }
  } else {
     // 被弾パーティクル（20個の赤スパーク）
     for (let i = 0; i < 20; i++) {
       createParticle(
         Position.x[eid], Position.y[eid],
         (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20,
         1.5, 6, 1, 3
       );
     }
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
  const attackType = PlayerState.attackType[pEid];

  const enemies = enemyQuery(world);
  const projectiles = projQuery(world);

  let killedThisFrame = 0;

  // --- Attack Resolution (Player dealing damage) ---
  if (pState === 2 && attackTimer > 3) {
    
    // Helper: ヒット時の共通処理
    const onHitEnemy = (eid: number, ex: number, ey: number, dist: number) => {
      // Boss Shield Logic
      if (Enemy.type[eid] === 2 && charge < 1.0) {
         PlayerState.attackTimer[pEid] = 0; 
         state.combo = 0; 
         PlayerState.charge[pEid] = 0;
         PlayerState.chainReady[pEid] = 0;
         state.shakeMag = 20; state.shakeMs = 200;
         // SHIELDED! ポップアップ
         state.popups.push({ x: px, y: py - 40, vy: -1, life: 1.0, color: '#ff9a30', text: 'SHIELDED!', size: 32 });
         if(dist > 0) { 
           Position.x[pEid] += ((px - ex)/dist)*30; 
           Position.y[pEid] += ((py - ey)/dist)*30; 
         }
         return false;
      }
      
      // ダメージ計算（攻撃タイプによるボーナス）
      let dmgMult = 1.0;
      if (attackType === 0) dmgMult = 0.7;
      if (attackType === 1) dmgMult = 1.2;
      if (attackType === 2) dmgMult = 2.0;

      Enemy.hp[eid] -= (50 + charge * 150) * dmgMult;
      if (Enemy.hp[eid] <= 0 || Enemy.type[eid] !== 2) {
        Enemy.hp[eid] = 0;
        if (audio) sfxExplode(audio, charge);

        state.killSplashes.push({
           x: ex, y: ey, timer: 1.0, color: charge > 0.8 ? '#ff0055' : '#ffffff'
        });
        
        state.combo++;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        
        const pts = 100 * state.combo * (attackType === 2 ? 2 : 1);
        state.score += pts;
        killedThisFrame++;

        const popColor = charge > 0.8 ? '#ff0055' : attackType === 1 ? '#ffff00' : '#ffffff';
        state.popups.push({
           x: ex, y: ey - 20, vy: -3, text: String(pts),
           life: 1.0, color: popColor, size: 24
        });
        
        // 撃破パーティクル（10〜20個のネオンスパーク）
        const sparkCount = Math.floor(10 + charge * 10);
        const sparkColor = charge > 0.8 ? 3 : 1; // 3=red, 1=cyan
        for (let s = 0; s < sparkCount; s++) {
          createParticle(
            ex, ey,
            (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20,
            1.5, charge > 0.8 ? 6 : 3, 1, sparkColor
          );
        }
        
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
      flashRGB(3);
      return true;
    };

    // === 攻撃タイプ別のヒット判定 ===

    if (attackType === 0) {
      // --- Quick Slash: 前方の小さい範囲 ---
      const attackRadius = 50 + charge * 40;
      for (let i = 0; i < projectiles.length; i++) {
        const eid = projectiles[i];
        if (Projectile.dead[eid]) continue;
        const dist = Math.hypot(Position.x[eid] - px, Position.y[eid] - py);
        if (dist < attackRadius + 5) {
          Projectile.dead[eid] = 1;
          state.combo++;
          killedThisFrame++;
          createParticle(Position.x[eid], Position.y[eid], 0, 0, 1.0, 20, 1, 0);
          state.popups.push({ x: Position.x[eid], y: Position.y[eid] - 20, vy: -1, life: 1.0, color: '#00f0ff', text: 'PARRY!', size: 24 });
        }
      }
      for (let i = 0; i < enemies.length; i++) {
        const eid = enemies[i];
        if (Enemy.hp[eid] <= 0) continue;
        const ex = Position.x[eid]; const ey = Position.y[eid];
        const dist = Math.hypot(ex - px, ey - py);
        if (dist < attackRadius + Collider.radius[eid]) {
          onHitEnemy(eid, ex, ey, dist);
        }
      }

    } else if (attackType === 1) {
      // --- Spin Slash: 広範囲AoE（プレイヤー中心に大きな円） ---
      const spinRadius = 120 + charge * 100;
      for (let i = 0; i < projectiles.length; i++) {
        const eid = projectiles[i];
        if (Projectile.dead[eid]) continue;
        const dist = Math.hypot(Position.x[eid] - px, Position.y[eid] - py);
        if (dist < spinRadius) {
          Projectile.dead[eid] = 1;
          state.combo++;
          killedThisFrame++;
          createParticle(Position.x[eid], Position.y[eid], 0, 0, 1.0, 20, 1, 0);
        }
      }
      for (let i = 0; i < enemies.length; i++) {
        const eid = enemies[i];
        if (Enemy.hp[eid] <= 0) continue;
        const ex = Position.x[eid]; const ey = Position.y[eid];
        const dist = Math.hypot(ex - px, ey - py);
        if (dist < spinRadius + Collider.radius[eid]) {
          onHitEnemy(eid, ex, ey, dist);
        }
      }

    } else if (attackType === 2) {
      // --- Pierce Thrust: ダッシュ始点からプレイヤー位置まで線分で判定 ---
      const sx = state.player.dashStartX || px;
      const sy = state.player.dashStartY || py;
      const pierceWidth = 40;

      for (let i = 0; i < projectiles.length; i++) {
        const eid = projectiles[i];
        if (Projectile.dead[eid]) continue;
        if (distToSegment(Position.x[eid], Position.y[eid], sx, sy, px, py) < pierceWidth) {
          Projectile.dead[eid] = 1;
          state.combo++;
          killedThisFrame++;
          createParticle(Position.x[eid], Position.y[eid], 0, 0, 1.0, 20, 1, 0);
        }
      }
      for (let i = 0; i < enemies.length; i++) {
        const eid = enemies[i];
        if (Enemy.hp[eid] <= 0) continue;
        const ex = Position.x[eid]; const ey = Position.y[eid];
        const dist = Math.hypot(ex - px, ey - py);
        if (distToSegment(ex, ey, sx, sy, px, py) < pierceWidth + Collider.radius[eid]) {
          onHitEnemy(eid, ex, ey, dist);
        }
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
    // SHATTER!! 演出
    state.popups.push({
      x: px, y: py - 60,
      vy: -1, life: 1.5, color: '#ff9a30', text: 'SHATTER!!', size: 48
    });
    for (let i = 0; i < 20; i++) {
      createParticle(
        px, py,
        (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40,
        2.5, 8, 1, 2 // yellow sparks
      );
    }
    flashRGB(6);
  } else if (killedThisFrame >= 2) {
    // MULTIKILL! 演出
    state.popups.push({
      x: px, y: py - 40,
      vy: -1, life: 1.5, color: '#ff9a30', text: 'MULTIKILL!', size: 24
    });
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

/** Point-to-line-segment distance (for pierce thrust hit detection) */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
