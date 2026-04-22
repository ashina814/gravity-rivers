import type { State } from '@/core/state';
import type { AudioEngine } from '@/audio/audio';
import { sfxSlash } from '@/audio/sfx';

export function attachDrawing(canvas: HTMLCanvasElement, state: State, audio: AudioEngine): void {
  function toStage(ex: number, ey: number) {
    const rect = canvas.getBoundingClientRect();
    const x = (ex - rect.left) * (state.stage.cssW / rect.width);
    const y = (ey - rect.top) * (state.stage.cssH / rect.height);
    return { x, y };
  }

  function onDown(e: PointerEvent) {
    if (!state.began || state.paused) return;
    canvas.setPointerCapture(e.pointerId);
    state.player.target = toStage(e.clientX, e.clientY);
    
    if (state.player.state === 'moving') {
      state.player.state = 'charging';
      state.player.charge = 0;
    }
  }

  function onMove(e: PointerEvent) {
    state.player.target = toStage(e.clientX, e.clientY);
  }

  function onUp(e: PointerEvent) {
    canvas.releasePointerCapture(e.pointerId);
    state.player.target = toStage(e.clientX, e.clientY);
    
    if (state.player.state === 'charging') {
      state.player.state = 'attacking';
      state.player.attackTimer = 15; // 15 frames of attack/recovery
      sfxSlash(audio, state.player.charge);
    }
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
}
