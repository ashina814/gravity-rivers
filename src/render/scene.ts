import type { State } from '@/core/state';
import type { Graphics } from 'pixi.js';
import { drawPlayer } from './player';
import { drawEnemies } from './enemies';
import { drawProjectiles } from './projectiles';
import { updateStyleRank, drawLives, updatePopups } from './ui';
import { drawFx } from './fx';
import { gfx, uiGfx, world } from './engine';

export function renderScene(state: State): void {
  const { w, h } = state.stage;

  // Clear graphics
  gfx.clear();
  uiGfx.clear();

  // Dynamic Camera Zoom
  const scale = state.slowMo > 0 ? 1.02 : 1.0;
  const cx = w / 2;
  const cy = h / 2;
  
  let ox = 0, oy = 0;
  if (state.overdriveTimer > 0) {
    ox = (Math.random() - 0.5) * 2;
    oy = (Math.random() - 0.5) * 2;
  }

  // Update world container transform
  world.position.set(cx + ox, cy + oy);
  world.scale.set(scale);
  world.pivot.set(cx, cy);

  drawGrid(gfx, w, h);

  // Draw Screen Slash Lines
  for (const sl of state.slashLines) {
    const dx = sl.x2 - sl.x1;
    const dy = sl.y2 - sl.y1;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const ex1 = sl.x1 - nx * 2000;
      const ey1 = sl.y1 - ny * 2000;
      const ex2 = sl.x2 + nx * 2000;
      const ey2 = sl.y2 + ny * 2000;
      
      const slColor = sl.color === '#ff0055' ? 0xff0055 : 0x00f0ff;
      
      gfx.moveTo(ex1, ey1);
      gfx.lineTo(ex2, ey2);
      gfx.stroke({ width: 10 * sl.life, color: 0xffffff, alpha: sl.life });

      gfx.moveTo(ex1, ey1);
      gfx.lineTo(ex2, ey2);
      gfx.stroke({ width: 30 * (sl.life ** 2), color: slColor });
    }
  }

  if (state.stateMachine !== 'gameover') {
    if (state.player.state === 'charging') {
      const p = state.player;
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dashDist = (30 + p.charge * 80) * 5; 
      
      gfx.moveTo(p.x, p.y);
      const angle = Math.atan2(dy, dx);
      gfx.lineTo(p.x + Math.cos(angle)*dashDist, p.y + Math.sin(angle)*dashDist);
      gfx.stroke({ width: 1 + p.charge * 2, color: 0xffffff, alpha: 0.15 + p.charge * 0.35 });
    }
    
    drawPlayer(gfx, state);
  }
  drawEnemies(gfx, state);
  drawProjectiles(gfx, state);
  drawFx(gfx, state);
  
  updatePopups(world, state);
  drawLives(uiGfx, state);
  updateStyleRank(state);

  // Screen Flash
  if (state.screenFlash > 0) {
    uiGfx.rect(0, 0, w, h);
    uiGfx.fill({ color: 0xffffff, alpha: state.screenFlash });
    state.screenFlash = Math.max(0, state.screenFlash - 0.1);
  }

  // Monochrome Flash
  if (state.monochromeFrames > 0) {
    uiGfx.rect(0, 0, w, h);
    uiGfx.fill({ color: 0x000000, alpha: 0.9 });
    state.monochromeFrames -= state.lastFrameMs / 16;
  }
}

function drawGrid(g: Graphics, w: number, h: number) {
  const gridR = 80;
  for(let x=0; x<w; x+=gridR) { g.moveTo(x, 0); g.lineTo(x, h); }
  for(let y=0; y<h; y+=gridR) { g.moveTo(0, y); g.lineTo(w, y); }
  g.stroke({ width: 1, color: 0xffffff, alpha: 0.03 });
}
