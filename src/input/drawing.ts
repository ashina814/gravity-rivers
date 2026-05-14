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

  let dragAnchor: { x: number; y: number } | null = null;
  let playerAnchor: { x: number; y: number } | null = null;

  function onDown(e: PointerEvent) {
    if (!state.began || state.paused) return;
    canvas.setPointerCapture(e.pointerId);
    
    const stagePos = toStage(e.clientX, e.clientY);
    dragAnchor = stagePos;
    playerAnchor = { x: state.player.x, y: state.player.y };
    
    // Slingshot: initialize target to current player pos (no dash distance yet)
    state.player.target = { x: state.player.x, y: state.player.y };

    if (state.player.state === 'moving') {
      state.player.state = 'charging';
      state.player.charge = 0;
    }
  }

  function onMove(e: PointerEvent) {
    if (!dragAnchor || !playerAnchor) {
      // If just hovering mouse, we can auto-follow (good for desktop)
      if (e.pointerType === 'mouse' && state.player.state === 'moving') {
        state.player.target = toStage(e.clientX, e.clientY);
      }
      return;
    }

    const stagePos = toStage(e.clientX, e.clientY);
    
    // Reverse Slingshot: pull back to aim forward
    const dx = stagePos.x - dragAnchor.x;
    const dy = stagePos.y - dragAnchor.y;
    
    // Apply a sensitivity multiplier (e.g. 1.2x)
    state.player.target = {
      x: playerAnchor.x - dx * 1.2,
      y: playerAnchor.y - dy * 1.2
    };
  }

  function onUp(e: PointerEvent) {
    if (!dragAnchor) return;
    canvas.releasePointerCapture(e.pointerId);
    
    const stagePos = toStage(e.clientX, e.clientY);
    const dx = stagePos.x - dragAnchor.x;
    const dy = stagePos.y - dragAnchor.y;
    
    state.player.target = {
      x: playerAnchor!.x - dx * 1.2,
      y: playerAnchor!.y - dy * 1.2
    };

    dragAnchor = null;
    playerAnchor = null;
    
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
