import type { State, Enemy } from '@/core/state';

export function stepPhysics(state: State, stepMs: number) {
  if (state.stateMachine === 'gameover') {
     // Freeze physics when dead, but maybe let particles fly
     for (const p of state.particles) {
       p.x += p.vx * 0.1;
       p.y += p.vy * 0.1;
       p.life -= 0.01;
     }
     state.particles = state.particles.filter(p => p.life > 0);
     return;
  }

  const p = state.player;
  const dt = state.slowMo > 0 ? stepMs * 0.1 : stepMs;
  if (state.slowMo > 0) state.slowMo--;

  if (state.freezeFrames > 0) {
    state.freezeFrames -= (stepMs / 16);
    return; // Freeze physics during heavy hitstop
  }

  // Overdrive logic
  if (state.combo >= 50 && state.overdriveTimer <= 0) {
    state.overdriveTimer = 625; // ~10 seconds
    state.screenFlash = 1.0;
    state.shakeMag = 30;
    state.shakeMs = 500;
    state.popups.push({
      x: state.stage.w / 2, y: state.stage.h / 2,
      vy: -2, life: 2.0, color: '#fcee0a', text: 'OVERDRIVE!!', size: 64
    });
  }
  
  if (state.overdriveTimer > 0) {
    state.overdriveTimer -= (dt / 16);
    if (state.overdriveTimer <= 0) {
      state.combo = 0; 
    }
  }

  // Player Movement (Damping towards target)
  if (p.state === 'moving' || p.state === 'charging') {
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    
    const speedMultiplier = p.state === 'charging' ? 0.05 : 0.2;
    p.vx = dx * speedMultiplier;
    p.vy = dy * speedMultiplier;
    
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
      if (state.overdriveTimer > 0) p.charge = 1.0;
    }
  }

  // Attack Resolution
  if (p.state === 'attacking') {
    p.attackTimer -= (dt / 16);
    
    // Dashing phase
    if (p.attackTimer > 10) {
       const dx = p.target.x - p.x;
       const dy = p.target.y - p.y;
       const dist = Math.hypot(dx, dy);
       if (dist > 0) {
          const dashSpeed = 30 + p.charge * 80;
          p.x += (dx / dist) * dashSpeed;
          p.y += (dy / dist) * dashSpeed;
       }
    }

    // Damage phase
    if (p.attackTimer > 8 && p.attackTimer <= 15) {
      const attackRadius = 60 + p.charge * 80;
      let killedThisFrame = 0;
      
      for (const e of state.enemies) {
        if (e.dead) continue;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        
        if (dist < attackRadius + e.r) {
          e.hp -= (50 + p.charge * 150);
          if (e.hp <= 0) {
            e.dead = true;
            state.combo++;
            state.maxCombo = Math.max(state.maxCombo, state.combo);
            state.score += 100 * state.combo;
            killedThisFrame++;
          } else {
            e.vx = ((e.x - p.x) / dist) * 10;
            e.vy = ((e.y - p.y) / dist) * 10;
          }

          state.shakeMag = Math.max(state.shakeMag, 10 + p.charge * 20);
          state.shakeMs = 150;
          state.screenFlash = Math.max(state.screenFlash, p.charge > 0.8 ? 0.6 : 0.2);
          
          for(let i=0; i<10 + p.charge*10; i++) {
             state.particles.push({
               x: e.x, y: e.y,
               vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
               life: 1.5, color: p.charge > 0.8 ? '#ff0055' : '#00f0ff', 
               size: p.charge > 0.8 ? 8 : 4, kind: 'star', shimmer: true
             });
          }
        }
      }

      if (killedThisFrame >= 3) {
        state.freezeFrames = 4; // ultra sharp freeze
        state.monochromeFrames = 10; // ultra sharp monochrome
        state.bgmMuffled = 20;
        state.shakeMag = 50;
        state.shakeMs = 200;
        state.popups.push({
          x: p.x, y: p.y - 60,
          vy: -1, life: 1.5, color: '#ff9a30', text: 'SHATTER!!', size: 48
        });
        for(let i=0; i<20; i++) {
           state.particles.push({
             x: p.x, y: p.y,
             vx: (Math.random()-0.5)*40, vy: (Math.random()-0.5)*40,
             life: 2.5, color: '#ffffff', size: 12, kind: 'star', shimmer: true
           });
        }
      } else if (killedThisFrame > 1) {
        state.popups.push({
          x: p.x, y: p.y - 40,
          vy: -1, life: 1.5, color: '#ff9a30', text: 'MULTIKILL!', size: 24
        });
      }

      if (state.combo === 10) state.bgText = { text: 'SICK!!', timer: 60, maxTimer: 60 };
      if (state.combo === 30) state.bgText = { text: 'CRAZY!!', timer: 60, maxTimer: 60 };
      if (state.combo === 50) state.bgText = { text: 'SMOKIN!!', timer: 80, maxTimer: 80 };
      if (state.combo > 50 && state.combo % 20 === 0) state.bgText = { text: 'STYLISH!!', timer: 80, maxTimer: 80 };
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
      const speed = e.type === 'gear' ? 1.0 : 3.0; 
      if (distToPlayer > 0) {
        e.vx += ((dx / distToPlayer) * speed - e.vx) * 0.1;
        e.vy += ((dy / distToPlayer) * speed - e.vy) * 0.1;
      }
      
      const triggerDist = e.type === 'gear' ? 300 : 120;
      if (distToPlayer < triggerDist) {
        e.state = 'telegraph';
        e.stateTimer = e.type === 'gear' ? 60 : 25; 
        e.vx = 0; e.vy = 0;
        e.justDodged = false;
      }
    } 
    else if (e.state === 'telegraph') {
      e.stateTimer -= (dt / 16);
      if (distToPlayer > 0) {
         e.lungeVx = (dx / distToPlayer);
         e.lungeVy = (dy / distToPlayer);
      }
      if (e.stateTimer <= 0) {
        e.state = 'lunging';
        e.stateTimer = e.type === 'gear' ? 30 : 15; 
      }
    }
    else if (e.state === 'lunging') {
      e.stateTimer -= (dt / 16);
      const lungeSpeed = e.type === 'gear' ? 18 : 12;
      e.vx = e.lungeVx * lungeSpeed;
      e.vy = e.lungeVy * lungeSpeed;

      // Hurt player if hit
      if (distToPlayer < e.r + 10 && p.state !== 'attacking') {
        p.hp -= 20; // Increased damage for danger
        state.combo = 0;
        state.shakeMag = 40;
        state.shakeMs = 300;
        state.screenFlash = 0.8;
        e.state = 'recovering';
        e.stateTimer = 60;

        // GAME OVER CHECK
        if (p.hp <= 0) {
           state.stateMachine = 'gameover';
           state.slowMo = 0; // Freeze
           // Explode player
           for(let i=0; i<30; i++) {
             state.particles.push({
               x: p.x, y: p.y,
               vx: (Math.random()-0.5)*30, vy: (Math.random()-0.5)*30,
               life: 3.0, color: '#ff0055', size: 10, kind: 'star', shimmer: false
             });
           }
        }
      } 
      // JUST DODGE logic
      else if (distToPlayer < e.r + 40 && p.state !== 'attacking' && !e.justDodged) {
        e.justDodged = true;
        p.charge = 1.0;
        
        if (e.type === 'boss') {
           // SF6 Drive Impact Style Hitstop
           state.freezeFrames = 15; // heavy hitstop
           state.monochromeFrames = 20; // adding monochrome for boss dodge
           state.bgmMuffled = 60; // muffle BGM
           state.shakeMag = 60;
           state.shakeMs = 600;
           state.screenFlash = 0.8;
           state.shocks.push({ x: p.x, y: p.y, r: 10, targetR: 1200, life: 0, color: '#fcee0a', thickness: 30, dashed: false }); // Shockwave
           state.popups.push({
             x: p.x, y: p.y - 40,
             vy: -0.5, life: 2.0, color: '#fcee0a', text: 'PUNISH COUNTER!!', size: 36
           });
           for(let i=0; i<20; i++) {
             state.particles.push({
               x: p.x, y: p.y,
               vx: (Math.random()-0.5)*30, vy: (Math.random()-0.5)*30,
               life: 2.0, color: '#fcee0a', size: 10, kind: 'star', shimmer: true
             });
           }
        } else {
           // Normal dodge: no slow-mo, just small popup
           state.popups.push({
             x: p.x, y: p.y - 20,
             vy: -1, life: 1.0, color: '#00f0ff', text: 'Dodge!', size: 16
           });
        }
      }

      if (e.stateTimer <= 0) {
        e.state = 'recovering';
        e.stateTimer = e.type === 'gear' ? 80 : 40; 
      }
    }
    else if (e.state === 'recovering') {
      e.vx *= 0.85; 
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
