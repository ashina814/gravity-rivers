import type { State, Enemy } from '@/core/state';

export function stepPhysics(state: State, stepMs: number) {
  const p = state.player;
  const dt = state.slowMo > 0 ? stepMs * 0.1 : stepMs;
  if (state.slowMo > 0) state.slowMo--;

  // Player Movement (Damping towards target)
  if (p.state === 'moving' || p.state === 'charging') {
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    
    // Slow down massively if charging
    const speedMultiplier = p.state === 'charging' ? 0.05 : 0.2;
    
    p.vx = dx * speedMultiplier;
    p.vy = dy * speedMultiplier;
    
    // Cap max speed
    const maxSpeed = p.state === 'charging' ? 1.5 : 8;
    const velMag = Math.hypot(p.vx, p.vy);
    if (velMag > maxSpeed) {
      p.vx = (p.vx / velMag) * maxSpeed;
      p.vy = (p.vy / velMag) * maxSpeed;
    }

    p.x += p.vx * (dt / 16);
    p.y += p.vy * (dt / 16);

    if (p.state === 'charging') {
      p.charge = Math.min(1, p.charge + 0.02 * (dt / 16));
    }
  }

  // Attack Resolution
  if (p.state === 'attacking') {
    p.attackTimer -= (dt / 16);
    
    // Dash slightly forward on attack frame 1
    if (p.attackTimer > 14) {
       const dx = p.target.x - p.x;
       const dy = p.target.y - p.y;
       const dist = Math.hypot(dx, dy);
       if (dist > 0) {
          const dashSpeed = 15 + p.charge * 20;
          p.x += (dx / dist) * dashSpeed;
          p.y += (dy / dist) * dashSpeed;
       }
    }

    // Hitbox logic (Active on frame 12-15)
    if (p.attackTimer > 11 && p.attackTimer <= 15) {
      const attackRadius = 40 + p.charge * 60;
      
      for (const e of state.enemies) {
        if (e.dead) continue;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        
        if (dist < attackRadius + e.r) {
          e.hp -= (50 + p.charge * 150);
          if (e.hp <= 0) {
            e.dead = true;
            state.combo++;
            state.score += 100 * state.combo;
          } else {
            // Knockback
            e.vx = ((e.x - p.x) / dist) * 10;
            e.vy = ((e.y - p.y) / dist) * 10;
          }

          // Hit stop & effects
          state.slowMo = 5 + Math.floor(p.charge * 10); 
          state.shakeMag = Math.max(state.shakeMag, 10 + p.charge * 20);
          state.shakeMs = 150;
          state.screenFlash = p.charge > 0.8 ? 0.6 : 0.2;
          
          for(let i=0; i<10 + p.charge*10; i++) {
             state.particles.push({
               x: e.x, y: e.y,
               vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
               life: 1.5, color: p.charge > 0.8 ? '#ff0055' : '#fcee0a', 
               size: p.charge > 0.8 ? 8 : 4, kind: 'star', shimmer: true
             });
          }
        }
      }
    }

    if (p.attackTimer <= 0) {
      p.state = 'moving';
      p.charge = 0;
    }
  }

  // Enemy movement & Footsies logic
  for (const e of state.enemies) {
    if (e.dead) continue;
    
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const distToPlayer = Math.hypot(dx, dy);

    if (e.state === 'chasing') {
      const speed = e.type === 'gear' ? 1.5 : 2.5;
      if (distToPlayer > 0) {
        e.vx += ((dx / distToPlayer) * speed - e.vx) * 0.1;
        e.vy += ((dy / distToPlayer) * speed - e.vy) * 0.1;
      }
      
      // If close enough, start telegraphing
      if (distToPlayer < 100) {
        e.state = 'telegraph';
        e.stateTimer = 45; // 45 frames windup
        e.vx = 0; e.vy = 0;
      }
    } 
    else if (e.state === 'telegraph') {
      e.stateTimer -= (dt / 16);
      if (e.stateTimer <= 0) {
        e.state = 'lunging';
        e.stateTimer = 15; // 15 frames lunge
        // Lunge fast towards where player IS
        if (distToPlayer > 0) {
          const lungeSpeed = 12;
          e.vx = (dx / distToPlayer) * lungeSpeed;
          e.vy = (dy / distToPlayer) * lungeSpeed;
        }
      }
    }
    else if (e.state === 'lunging') {
      e.stateTimer -= (dt / 16);
      
      // Hurt player if hit
      if (distToPlayer < e.r + 10 && p.state !== 'attacking') {
        p.hp -= 10;
        state.combo = 0;
        state.shakeMag = 20;
        state.shakeMs = 100;
        e.state = 'recovering';
        e.stateTimer = 60;
      }

      if (e.stateTimer <= 0) {
        e.state = 'recovering';
        e.stateTimer = 60; // Huge 60 frame recovery (The whiff punish window!)
      }
    }
    else if (e.state === 'recovering') {
      e.vx *= 0.9; // Friction
      e.vy *= 0.9;
      e.stateTimer -= (dt / 16);
      if (e.stateTimer <= 0) {
        e.state = 'chasing';
      }
    }
    
    e.x += e.vx * (dt / 16);
    e.y += e.vy * (dt / 16);
  }

  // Harvest dead enemies
  state.enemies = state.enemies.filter(e => !e.dead);
}
