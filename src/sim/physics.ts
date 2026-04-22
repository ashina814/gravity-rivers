import type { State, Enemy } from '@/core/state';

export function stepPhysics(state: State, stepMs: number) {
  const p = state.player;
  const W = state.stage.w;
  const H = state.stage.h;

  // Time manipulation
  const dt = state.slowMo > 0 ? stepMs * 0.1 : stepMs;
  if (state.slowMo > 0) state.slowMo--;

  // Player Dash Movement
  if (p.state === 'dashing') {
    const startX = p.x;
    const startY = p.y;
    
    p.x += p.vx * (dt / 16);
    p.y += p.vy * (dt / 16);
    p.dashTimer -= (dt / 16);

    if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.dashTimer <= 0) {
      p.x = Math.max(0, Math.min(W, p.x));
      p.y = Math.max(0, Math.min(H, p.y));
      p.state = 'idle';
      if (p.combo === 0) p.energy = 0; // reset energy if no combo
      p.combo = 0;
    }

    // Line segment (startX, startY) to (p.x, p.y) vs Enemy circles
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (lineIntersectsCircle(startX, startY, p.x, p.y, e.x, e.y, e.r + 10)) {
        e.dead = true;
        p.combo++;
        p.energy += 10;
        state.score += 100 * p.combo;
        
        // Reset Dash (can fly again!)
        p.dashTimer = 0;
        p.state = 'idle'; 

        // Hit stop & effects
        state.slowMo = 3; 
        state.shakeMag = Math.max(state.shakeMag, 5 + p.combo);
        state.shakeMs = 100;
        state.screenFlash = 0.3;
        
        for(let i=0; i<8; i++) {
           state.particles.push({
             x: e.x, y: e.y,
             vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15,
             life: 1.5, color: '#fcee0a', size: 4, kind: 'star', shimmer: true
           });
        }
      }
    }
  }

  // Enemy movement (slowly towards player)
  for (const e of state.enemies) {
    if (e.dead) continue;
    e.spawnAnim = Math.max(0, e.spawnAnim - 1);
    
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0) {
      const speed = e.type === 'gear' ? 0.5 : 1.2;
      e.vx = (dx / dist) * speed;
      e.vy = (dy / dist) * speed;
    }
    
    e.x += e.vx * (dt / 16);
    e.y += e.vy * (dt / 16);
  }

  // Harvest dead enemies
  state.enemies = state.enemies.filter(e => !e.dead);
}

// Distance from point to line segment
function lineIntersectsCircle(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(cx - x1, cy - y1) <= r;
  
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  
  return Math.hypot(cx - projX, cy - projY) <= r;
}
