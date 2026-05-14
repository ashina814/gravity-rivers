import { createEnemy } from '../prefabs';
import type { State } from '@/core/state';
import { defineQuery } from 'bitecs';
import { Enemy, Position } from '../components';
import { world } from '../world';

const enemyQuery = defineQuery([Enemy, Position]);

// デバイス判定による最適化
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// スマホなら同時出現数を制限して処理落ちを防ぐ
const MAX_ENEMIES = isMobile ? 60 : 300;

export function spawnerSystem(state: State) {
   if (state.stateMachine !== 'playing' || !state.began) return;

   const enemies = enemyQuery(world);
   const seconds = state.tick / 60; // プレイ時間（秒）
   
   // 経過時間に応じてスポーン間隔を短くする（2.0秒 -> 最小0.2秒）
   const spawnInterval = Math.max(0.2, 2.0 - (seconds / 60)); 
   
   if (state.tick % Math.floor(spawnInterval * 60) === 0) {
      if (enemies.length < MAX_ENEMIES) {
          // カメラの外縁（画面外）からスポーンさせる
          const w = state.stage.w;
          const h = state.stage.h;
          
          const edge = Math.floor(Math.random() * 4);
          let x = 0, y = 0;
          if (edge === 0) { x = Math.random() * w; y = -50; }
          if (edge === 1) { x = Math.random() * w; y = h + 50; }
          if (edge === 2) { x = -50; y = Math.random() * h; }
          if (edge === 3) { x = w + 50; y = Math.random() * h; }
          
          // 敵の種類の決定（時間経過で強い敵が混ざる）
          let type = 0;
          let r = 14;
          let hp = 50 + seconds * 2; // 時間と共にHP増加
          
          const rnd = Math.random();
          // 30秒以降、5%の確率でボス級（Boss）
          if (seconds > 30 && rnd < 0.05) { 
             type = 2; r = 24; hp = 400 + seconds * 10; 
          }
          // 10秒以降、20%の確率でスナイパー（Skull）
          else if (seconds > 10 && rnd < 0.25) { 
             type = 1; r = 12; hp = 40 + seconds; 
          }
          
          createEnemy(x, y, type, r, hp);
      }
   }
}
