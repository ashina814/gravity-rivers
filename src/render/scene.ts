import type { State, Enemy } from '@/core/state';
import { drawFx } from './fx';

const TT_PINK = '#FE2C55';
const TT_CYAN = '#25F4EE';

export function renderScene(ctx: CanvasRenderingContext2D, state: State): void {
  const { w, h } = state.stage;
  
  // Pitch black background
  ctx.fillStyle = '#010101';
  ctx.fillRect(0, 0, w, h);
  
  // Overdrive jitter
  let ox = 0, oy = 0;
  if (state.overdriveTimer > 0) {
    ox = (Math.random() - 0.5) * 4;
    oy = (Math.random() - 0.5) * 4;
  }

  ctx.save();
  ctx.translate(ox, oy);

  drawGrid(ctx, w, h);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawFx(ctx, state);
  
  ctx.restore();

  // Hard White Flash
  if (state.screenFlash > 0) {
    ctx.save();
    // TikTok glitch flash uses inverted colors sometimes, but white is fine
    ctx.fillStyle = state.overdriveTimer > 0 && Math.random() > 0.5 
      ? `rgba(254, 44, 85, ${state.screenFlash})` // TT_PINK flash
      : `rgba(255, 255, 255, ${state.screenFlash})`;
    
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(0, 0, w, h);
    state.screenFlash = Math.max(0, state.screenFlash - 0.1);
    ctx.restore();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gridR = 60;
  for(let x=0; x<w; x+=gridR) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for(let y=0; y<h; y+=gridR) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.restore();
}

function drawGlitchPath(ctx: CanvasRenderingContext2D, pathFn: () => void, jitter: number) {
  const jx = (Math.random() - 0.5) * jitter;
  const jy = (Math.random() - 0.5) * jitter;
  
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  // Cyan layer
  ctx.strokeStyle = TT_CYAN;
  ctx.fillStyle = TT_CYAN;
  ctx.translate(-2 + jx, -2 + jy);
  pathFn();
  
  // Pink layer
  ctx.translate(4 - jx*2, 4 - jy*2);
  ctx.strokeStyle = TT_PINK;
  ctx.fillStyle = TT_PINK;
  pathFn();
  
  // White (Base) layer
  ctx.translate(-2 + jx, -2 + jy);
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  pathFn();
  
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: State) {
  const p = state.player;
  
  ctx.save();
  
  // Charge Indicator Radius
  if (p.state === 'charging') {
    const attackRadius = 40 + p.charge * 60;
    const jitter = p.charge > 0.9 ? 5 : 0;
    
    drawGlitchPath(ctx, () => {
      ctx.setLineDash(p.charge > 0.9 ? [] : [5, 5]);
      ctx.lineWidth = p.charge > 0.9 ? 4 : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, attackRadius, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
    }, jitter);
  }

  // Attack Hitbox Flash
  if (p.state === 'attacking') {
    const attackRadius = 40 + p.charge * 60;
    ctx.fillStyle = p.charge > 0.9 ? TT_PINK : '#ffffff';
    ctx.globalAlpha = (p.attackTimer / 15);
    ctx.beginPath();
    ctx.arc(p.x, p.y, attackRadius, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Core Solid Shape
  drawGlitchPath(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 12);
    ctx.lineTo(p.x + 10, p.y + 10);
    ctx.lineTo(p.x - 10, p.y + 10);
    ctx.closePath();
    ctx.fill();
  }, state.overdriveTimer > 0 ? 3 : 0);

  ctx.restore();
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: State) {
  for (const e of state.enemies) {
    const r = e.r;
    ctx.save();
    ctx.translate(e.x, e.y);
    
    // Base style
    ctx.lineWidth = 3;
    let jitter = 0;

    if (e.state === 'telegraph') jitter = (e.stateTimer / 45) * 4;
    if (e.state === 'lunging') jitter = 8;
    if (state.overdriveTimer > 0) jitter += 4;

    // Draw Telegraph indicator
    if (e.state === 'telegraph') {
      ctx.strokeStyle = TT_PINK;
      ctx.beginPath();
      ctx.arc(0, 0, r + (e.stateTimer / 45) * 20, 0, Math.PI*2);
      ctx.stroke();
    }

    const drawEnemyShape = () => {
      if (e.type === 'gear') {
        ctx.save();
        ctx.rotate(state.tick * 0.05);
        ctx.beginPath();
        const spikes = 8;
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes;
          const radius = i % 2 === 0 ? r : r * 0.6;
          if (i === 0) ctx.moveTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
          else ctx.lineTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      } else {
        // Skull
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, -r*0.5);
        ctx.lineTo(r*0.8, r);
        ctx.lineTo(-r*0.8, r);
        ctx.lineTo(-r, -r*0.5);
        ctx.closePath();
        ctx.stroke();

        // Eyes
        ctx.beginPath();
        ctx.arc(-r*0.3, -r*0.1, r*0.2, 0, Math.PI*2);
        ctx.arc(r*0.3, -r*0.1, r*0.2, 0, Math.PI*2);
        ctx.fill();
      }
    };

    if (e.state === 'recovering') {
       // Vulnerable: Pure Cyan, no jitter
       ctx.strokeStyle = TT_CYAN;
       ctx.fillStyle = TT_CYAN;
       drawEnemyShape();
    } else {
       // Normal / Attacking: Glitch it
       drawGlitchPath(ctx, drawEnemyShape, jitter);
    }
    
    // HP Bar if damaged
    if (e.hp < 100) {
       ctx.fillStyle = '#222';
       ctx.fillRect(-15, -r - 15, 30, 4);
       ctx.fillStyle = '#fff';
       ctx.fillRect(-15, -r - 15, 30 * Math.max(0, e.hp / 100), 4);
    }
    
    ctx.restore();
  }
}
