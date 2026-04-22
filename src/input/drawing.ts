import type { State } from '@/core/state';
import type { AudioEngine } from '@/audio/audio';
import { sfxClick } from '@/audio/sfx';

export function attachDrawing(canvas: HTMLCanvasElement, state: State, audio: AudioEngine): void {
  function toStage(ex: number, ey: number) {
    const rect = canvas.getBoundingClientRect();
    const x = (ex - rect.left) * (state.stage.cssW / rect.width);
    const y = (ey - rect.top) * (state.stage.cssH / rect.height);
    return { x, y };
  }

  function onDown(e: PointerEvent) {
    if (!state.began || state.paused || state.player.state === 'dashing') return;
    canvas.setPointerCapture(e.pointerId);
    
    // Slingshot: start aiming
    state.player.state = 'aiming';
    state.player.aimTarget = toStage(e.clientX, e.clientY);
    state.slowMo = 60; // Bullet time
  }

  function onMove(e: PointerEvent) {
    if (state.player.state === 'aiming') {
      state.player.aimTarget = toStage(e.clientX, e.clientY);
    }
  }

  function onUp(e: PointerEvent) {
    if (state.player.state === 'aiming') {
      canvas.releasePointerCapture(e.pointerId);
      
      const target = toStage(e.clientX, e.clientY);
      const dx = target.x - state.player.x;
      const dy = target.y - state.player.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 10) {
         // Dash
         const speed = 25;
         state.player.vx = (dx / dist) * speed;
         state.player.vy = (dy / dist) * speed;
         state.player.state = 'dashing';
         state.player.dashTimer = Math.min(20, dist / speed); 
         sfxClick(audio); // Temp sound
         state.slowMo = 0;
      } else {
         state.player.state = 'idle';
         state.slowMo = 0;
      }
      state.player.aimTarget = null;
    }
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
}
