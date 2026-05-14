import type { State } from '@/core/state';
import type { AudioEngine } from '@/audio/audio';
import { sfxExplode, sfxPlayerHit } from '@/audio/sfx';

export function damagePlayer(state: State, audio?: AudioEngine) {
  if (state.player.invulnTimer > 0) return;
  state.player.lives--;
  state.combo = 0;
  if (audio) sfxPlayerHit(audio);
  state.shakeMag = 80;
  state.shakeMs = 600;
  state.screenFlash = 1.0;
  state.bgmMuffled = 60;
  state.player.invulnTimer = 60; // 1 second invuln
  
  if (state.player.lives <= 0) {
     state.stateMachine = 'gameover';
     state.slowMo = 0; 
     state.monochromeFrames = 60; 
     for(let i=0; i<40; i++) {
        state.particles.push({
          x: state.player.x, y: state.player.y,
          vx: (Math.random()-0.5)*40, vy: (Math.random()-0.5)*40,
          life: 3.0, color: '#ff0055', size: 10, kind: 'spark', shimmer: false
        });
     }
  } else {
     for(let i=0; i<20; i++) {
        state.particles.push({
          x: state.player.x, y: state.player.y,
          vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
          life: 1.5, color: '#ff0055', size: 6, kind: 'spark', shimmer: false
        });
     }
  }
}

export function updatePlayer(state: State, stepMs: number, dt: number, audio?: AudioEngine) {
  const p = state.player;

  if (p.invulnTimer > 0) {
    p.invulnTimer -= (stepMs / 16);
  }

  // 1. Time Dilation (Cyber-Iai)
  if (p.state === 'charging') {
    const wasMax = p.charge >= 1.0;
    p.charge = Math.min(1, p.charge + 0.05 * (stepMs / 16)); 
    if (state.overdriveTimer > 0) p.charge = 1.0;
    
    if (!wasMax && p.charge >= 1.0) {
      state.screenFlash = 0.5;
      state.popups.push({ x: p.x, y: p.y - 30, vy: -1.5, life: 1.0, color: '#ffffff', text: 'MAX', size: 24 });
      for(let i=0; i<10; i++) {
         state.particles.push({
           x: p.x, y: p.y,
           vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
           life: 1.0, color: '#ffffff', size: 4, kind: 'spark', shimmer: false
         });
      }
    }
    state.bgmMuffled = Math.max(state.bgmMuffled, 2); // Muffle BGM while charging
  }

  // Player Movement (Damping towards target)
  if (p.state === 'moving') {
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    
    p.vx = dx * 0.2;
    p.vy = dy * 0.2;
    
    const maxSpeed = 8;
    const velMag = Math.hypot(p.vx, p.vy);
    if (velMag > maxSpeed) {
      p.vx = (p.vx / velMag) * maxSpeed;
      p.vy = (p.vy / velMag) * maxSpeed;
    }

    p.x += p.vx * (dt / 16);
    p.y += p.vy * (dt / 16);
  } else if (p.state === 'charging') {
    // Stand perfectly still to aim
    p.vx = 0;
    p.vy = 0;
  }

  // Attack Resolution
  if (p.state === 'attacking') {
    if (p.attackTimer === 15) {
      p.dashStartX = p.x;
      p.dashStartY = p.y;
      p.chainReady = false;
    }
    
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

    // Chain Strike Cancel (Skip recovery)
    if (p.attackTimer <= 10 && p.chainReady) {
       p.attackTimer = 0; // Instant cancel!
    }

    // Damage phase
    if (p.attackTimer > 8 && p.attackTimer <= 15) {
      const attackRadius = 60 + p.charge * 80;
      let killedThisFrame = 0;
      
      // Projectiles Hit
      for (const proj of state.projectiles) {
        if (proj.dead) continue;
        const dist = Math.hypot(proj.x - p.x, proj.y - p.y);
        if (dist < attackRadius + 5) {
          proj.dead = true;
          state.combo++;
          killedThisFrame++;
          state.particles.push({
             x: proj.x, y: proj.y, vx: 0, vy: 0, life: 1.0, color: '#ffffff', size: 20, kind: 'spark', shimmer: false
          });
          state.popups.push({ x: proj.x, y: proj.y - 20, vy: -1, life: 1.0, color: '#00f0ff', text: 'PARRY!', size: 24 });
        }
      }
      
      for (const e of state.enemies) {
        if (e.dead) continue;
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        
        if (dist < attackRadius + e.r) {
          // Shielded Boss
          if (e.type === 'boss' && p.charge < 1.0) {
             p.attackTimer = 0; 
             state.combo = 0; 
             p.charge = 0;
             p.chainReady = false;
             state.shakeMag = 20; state.shakeMs = 200;
             state.popups.push({ x: p.x, y: p.y - 40, vy: -1, life: 1.0, color: '#ff9a30', text: 'SHIELDED!', size: 32 });
             // Bounce player away
             const dx = p.x - e.x; const dy = p.y - e.y;
             const pDist = Math.hypot(dx, dy);
             if(pDist > 0) { p.x += (dx/pDist)*30; p.y += (dy/pDist)*30; }
             continue;
          }
          
          e.hp -= (50 + p.charge * 150);
          if (e.hp <= 0 || e.type !== 'boss') { // Normal enemies always die instantly
            e.dead = true;
            
            if (audio) sfxExplode(audio, p.charge);

            state.killSplashes.push({
               x: e.x, y: e.y, timer: 1.0, color: p.charge > 0.8 ? '#ff0055' : '#ffffff'
            });
            
            state.combo++;
            state.maxCombo = Math.max(state.maxCombo, state.combo);
            state.score += 100 * state.combo;
            killedThisFrame++;
            
            // Trigger Rank Pulse on threshold
            const thresholds = [5, 10, 20, 35, 50, 70];
            if (thresholds.includes(state.combo)) {
               state.rankPulse = 1.0;
            }
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
               size: p.charge > 0.8 ? 6 : 3, kind: 'spark', shimmer: false
             });
          }
        }
      }

      if (killedThisFrame > 0) {
        p.chainReady = true; // Enables instant recovery cancel
      }

      if (killedThisFrame >= 2) {
        // Screen Slash Effect
        state.slashLines.push({
           x1: p.dashStartX || p.x, y1: p.dashStartY || p.y,
           x2: p.x, y2: p.y,
           life: 1.0, maxLife: 1.0,
           color: p.charge > 0.8 ? '#ff0055' : '#00f0ff'
        });
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
             life: 2.5, color: '#fcee0a', size: 8, kind: 'spark', shimmer: false
           });
        }
      } else if (killedThisFrame > 1) {
        state.popups.push({
          x: p.x, y: p.y - 40,
          vy: -1, life: 1.5, color: '#ff9a30', text: 'MULTIKILL!', size: 24
        });
      }
    }

    if (p.attackTimer <= 0) {
      p.state = 'moving';
      p.charge = 0;
    }
  }
}
