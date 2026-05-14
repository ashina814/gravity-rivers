import { defineQuery } from 'bitecs';
import { Position, Velocity, PlayerTag, PlayerState } from '../components';
import { createParticle } from '../prefabs';
import type { State } from '@/core/state';

const playerQuery = defineQuery([Position, Velocity, PlayerTag, PlayerState]);

export function playerLogicSystem(world: any, state: State, stepMs: number, dt: number) {
  const players = playerQuery(world);
  if (players.length === 0) return;
  const eid = players[0];

  // Synchronize input from drawing.ts into ECS
  if (state.player.state === 'charging' && PlayerState.state[eid] !== 1) {
    PlayerState.state[eid] = 1;
    PlayerState.charge[eid] = 0;
  } else if (state.player.state === 'attacking' && PlayerState.state[eid] !== 2) {
    PlayerState.state[eid] = 2;
    // チャージ量に応じて攻撃タイプを決定
    const c = PlayerState.charge[eid];
    if (c >= 0.8) {
      PlayerState.attackType[eid] = 2; // 居合・貫通突き
      PlayerState.attackTimer[eid] = 20; // 長めの突進時間
    } else if (c >= 0.3) {
      PlayerState.attackType[eid] = 1; // 回転斬り
      PlayerState.attackTimer[eid] = 18;
    } else {
      PlayerState.attackType[eid] = 0; // 素早い一閃
      PlayerState.attackTimer[eid] = 10; // 短い
    }
  }

  const pState = PlayerState.state[eid];
  let charge = PlayerState.charge[eid];
  let invulnTimer = PlayerState.invulnTimer[eid];
  let attackTimer = PlayerState.attackTimer[eid];
  let chainReady = PlayerState.chainReady[eid];
  const attackType = PlayerState.attackType[eid];

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
      // MAX ポップアップ
      state.popups.push({ x: Position.x[eid], y: Position.y[eid] - 30, vy: -1.5, life: 1.0, color: '#ffffff', text: 'MAX', size: 24 });
      // チャージMAXスパーク（10個）
      for (let i = 0; i < 10; i++) {
        createParticle(
          Position.x[eid], Position.y[eid],
          (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20,
          1.0, 4, 1, 0
        );
      }
      state.bgmMuffled = Math.max(state.bgmMuffled, 2);
    }
  }

  // Player Movement (Damping towards target)
  if (pState === 0) { // 0: moving
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
    // 攻撃開始フレームの初期化（attackTimerが最大値のときだけ）
    const maxTimer = attackType === 0 ? 10 : attackType === 1 ? 18 : 20;
    if (attackTimer >= maxTimer - 0.5) {
      state.player.dashStartX = Position.x[eid];
      state.player.dashStartY = Position.y[eid];
      chainReady = 0;
    }
    
    attackTimer -= (dt / 16);

    // 攻撃タイプ別の移動処理
    if (attackType === 0) {
      // === 素早い一閃 (Quick Slash) ===
      if (attackTimer > 5) {
        const dx = state.player.target.x - Position.x[eid];
        const dy = state.player.target.y - Position.y[eid];
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const dashSpeed = 20 + charge * 40;
          Position.x[eid] += (dx / dist) * dashSpeed;
          Position.y[eid] += (dy / dist) * dashSpeed;
        }
      }
    } else if (attackType === 1) {
      // === 回転斬り (Spin Slash) ===
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
    } else if (attackType === 2) {
      // === 居合・貫通突き (Pierce Thrust) ===
      if (attackTimer > 8) {
        const dx = state.player.target.x - Position.x[eid];
        const dy = state.player.target.y - Position.y[eid];
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const dashSpeed = 40 + charge * 120;
          Position.x[eid] += (dx / dist) * dashSpeed;
          Position.y[eid] += (dy / dist) * dashSpeed;
        }
      }
    }

    // Chain Strike Cancel (Skip recovery)
    if (attackTimer <= 5 && chainReady === 1) {
       attackTimer = 0;
    }

    if (attackTimer <= 0) {
      PlayerState.state[eid] = 0; // back to moving
      PlayerState.attackType[eid] = 0;
      charge = 0;
      attackTimer = 0;
    }
  }

  // Write back to components
  PlayerState.charge[eid] = charge;
  PlayerState.invulnTimer[eid] = invulnTimer;
  PlayerState.attackTimer[eid] = attackTimer;
  PlayerState.chainReady[eid] = chainReady;
  
  // Sync core state — 必ず「現在の」ECS stateを読む（ローカル変数pStateは古い可能性がある）
  const currentState = PlayerState.state[eid];
  state.player.x = Position.x[eid];
  state.player.y = Position.y[eid];
  state.player.state = currentState === 0 ? 'moving' : currentState === 1 ? 'charging' : 'attacking';
  state.player.charge = charge;
  state.player.invulnTimer = invulnTimer;
  state.player.attackTimer = attackTimer;

  // ゴーストデータ（リプレイ）の記録
  if (state.tick % 3 === 0) {
    state.ghostRecord.push({
      x: Position.x[eid],
      y: Position.y[eid],
      s: currentState,
      c: charge
    });
  }
}
