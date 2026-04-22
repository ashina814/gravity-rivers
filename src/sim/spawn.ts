import type { State } from '@/core/state';

let NEXT_ID = 1;

export function tickSpawner(state: State, dtMs: number): void {
  // Spawn rate increases slowly
  const spawnRate = 0.01 + (state.score * 0.000005);
  
  if (Math.random() < spawnRate && state.enemies.length < 30) {
    const W = state.stage.w;
    const H = state.stage.h;
    
    // Spawn along edges
    const edge = Math.floor(Math.random() * 4);
    let ex = 0, ey = 0;
    
    if (edge === 0) { ex = Math.random() * W; ey = -20; }
    else if (edge === 1) { ex = W + 20; ey = Math.random() * H; }
    else if (edge === 2) { ex = Math.random() * W; ey = H + 20; }
    else { ex = -20; ey = Math.random() * H; }

    state.enemies.push({
      id: NEXT_ID++,
      x: ex,
      y: ey,
      vx: 0,
      vy: 0,
      lungeVx: 0,
      lungeVy: 0,
      hp: 100,
      r: Math.random() < 0.3 ? 18 : 14,
      dead: false,
      state: 'chasing',
      stateTimer: 0,
      justDodged: false,
      type: Math.random() < 0.3 ? 'skull' : 'gear'
    });
  }
}
