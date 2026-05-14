import { defineQuery } from 'bitecs';
import { Position, Velocity, PlayerTag, PlayerState } from '../components';
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
    if (attackTimer === PlayerState.attackTimer[eid] || (attackType === 0 && attackTimer === 10) || (attackType === 1 && attackTimer === 18) || (attackType === 2 && attackTimer === 20)) {
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
      // その場に留まり、回転エフェクト用にタイマーだけ消費
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
    } else if (attackType === 2) {
      // === 居合・貫通突き (Pierce Thrust) ===
      if (attackTimer > 8) {
        const dx = state.player.target.x - Position.x[eid];
        const dy = state.player.target.y - Position.y[eid];
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const dashSpeed = 40 + charge * 120; // 超高速
          Position.x[eid] += (dx / dist) * dashSpeed;
          Position.y[eid] += (dy / dist) * dashSpeed;
        }
      }
    }

    // Chain Strike Cancel (Skip recovery)
    if (attackTimer <= 10 && chainReady === 1) {
       attackTimer = 0;
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

  // ゴーストデータ（リプレイ）の記録：メモリ節約のため3フレームに1回（20fps相当）記録
  if (state.tick % 3 === 0) {
    state.ghostRecord.push({
      x: Position.x[eid],
      y: Position.y[eid],
      s: pState,
      c: charge
    });
  }
}
