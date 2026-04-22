import type { State, Enemy } from '@/core/state';

export function stepPhysics(state: State, stepMs: number) {
  const p = state.player;
  const dt = state.slowMo > 0 ? stepMs * 0.1 : stepMs;
  if (state.slowMo > 0) state.slowMo--;

  // Overdrive logic
  if (state.combo >= 50 && state.overdriveTimer <= 0) {
    state.overdriveTimer = 625; // ~10 seconds at 60fps
    state.screenFlash = 1.0;
    state.shakeMag = 30;
    state.shakeMs = 500;
  }
  
  if (state.overdriveTimer > 0) {
    state.overdriveTimer -= (dt / 16);
    if (state.overdriveTimer <= 0) {
      state.combo = 0; // Reset after overdrive finishes
    }
  }

  // Player Movement (Damping towards target)
  if (p.state === 'moving' || p.state === 'charging') {
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    
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
      // Overdrive instant charge
      if (state.overdriveTimer > 0) p.charge = 1.0;
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
          state.screenFlash = Math.max(state.screenFlash, p.charge > 0.8 ? 0.6 : 0.2);
          
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
      const speed = e.type === 'gear' ? 1.0 : 3.0; // Skulls fast, gears slow
      if (distToPlayer > 0) {
        e.vx += ((dx / distToPlayer) * speed - e.vx) * 0.1;
        e.vy += ((dy / distToPlayer) * speed - e.vy) * 0.1;
      }
      
      // Skulls (Rushers): start telegraph close. Gears (Snipers): start far.
      const triggerDist = e.type === 'gear' ? 300 : 120;
      
      if (distToPlayer < triggerDist) {
        e.state = 'telegraph';
        e.stateTimer = e.type === 'gear' ? 60 : 25; // Gears aim longer
        e.vx = 0; e.vy = 0;
        e.justDodged = false;
      }
    } 
    else if (e.state === 'telegraph') {
      e.stateTimer -= (dt / 16);
      
      // Gears loosely track player during windup
      if (e.type === 'gear' && distToPlayer > 0) {
         e.lungeVx = (dx / distToPlayer);
         e.lungeVy = (dy / distToPlayer);
      } else if (distToPlayer > 0) {
         e.lungeVx = (dx / distToPlayer);
         e.lungeVy = (dy / distToPlayer);
      }

      if (e.stateTimer <= 0) {
        e.state = 'lunging';
        e.stateTimer = e.type === 'gear' ? 30 : 15; // Gears lunge further
      }
    }
    else if (e.state === 'lunging') {
      e.stateTimer -= (dt / 16);
      
      const lungeSpeed = e.type === 'gear' ? 18 : 12;
      e.vx = e.lungeVx * lungeSpeed;
      e.vy = e.lungeVy * lungeSpeed;

      // Hurt player if hit
      if (distToPlayer < e.r + 10 && p.state !== 'attacking') {
        p.hp -= 10;
        state.combo = 0;
        state.shakeMag = 20;
        state.shakeMs = 100;
        e.state = 'recovering';
        e.stateTimer = 60;
      } 
      // JUST DODGE logic
      else if (distToPlayer < e.r + 40 && p.state !== 'attacking' && !e.justDodged) {
        // Player is very close, but didn't get hit!
        e.justDodged = true;
        p.charge = 1.0;
        state.slowMo = 10;
        state.screenFlash = 0.5;
        
        // Spawn cyan dodge particles
        for(let i=0; i<8; i++) {
           state.particles.push({
             x: p.x, y: p.y,
             vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
             life: 1.0, color: '#00f0ff', 
             size: 6, kind: 'star', shimmer: false
           });
        }
      }

      if (e.stateTimer <= 0) {
        e.state = 'recovering';
        e.stateTimer = e.type === 'gear' ? 80 : 40; // Gears have huge recovery
      }
    }
    else if (e.state === 'recovering') {
      e.vx *= 0.85; // Friction
      e.vy *= 0.85;
      e.stateTimer -= (dt / 16);
      if (e.stateTimer <= 0) {
        e.state = 'chasing';
      }
    }
    
    e.x += e.vx * (dt / 16);
    e.y += e.vy * (dt / 16);
  }

  state.enemies = state.enemies.filter(e => !e.dead);
}
