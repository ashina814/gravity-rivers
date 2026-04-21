import type { State } from '@/core/state';
import type { Action, KeyboardBus } from '@/input/keyboard';

/**
 * Bind the bottom-left tool dock to the keyboard bus.
 * Clicking a tool dispatches the same Action event that a key press
 * would, so a single handler can manage both input surfaces.
 */
export interface DockRuntime {
  setTool(tool: 'draw' | 'erase'): void;
  setPaused(paused: boolean): void;
}

export function bindDock(bus: KeyboardBus): DockRuntime {
  const q = (sel: string) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Missing DOM: ${sel}`);
    return el as HTMLElement;
  };

  const drawBtn = q('[data-tool="draw"]');
  const eraseBtn = q('[data-tool="erase"]');
  const clearBtn = q('#btn-clear');
  const snapBtn = q('#btn-snap');
  const pauseBtn = q('#btn-pause');
  const cfgBtn = q('#btn-settings');

  drawBtn.addEventListener('click', () => bus.emit({ kind: 'tool', tool: 'draw' }));
  eraseBtn.addEventListener('click', () => bus.emit({ kind: 'tool', tool: 'erase' }));
  clearBtn.addEventListener('click', () => bus.emit({ kind: 'clear' }));
  snapBtn.addEventListener('click', () => bus.emit({ kind: 'snap' }));
  pauseBtn.addEventListener('click', () => bus.emit({ kind: 'pause' }));
  cfgBtn.addEventListener('click', () => bus.emit({ kind: 'settings' }));

  function setTool(tool: 'draw' | 'erase') {
    drawBtn.classList.toggle('active', tool === 'draw');
    eraseBtn.classList.toggle('active', tool === 'erase');
  }

  function setPaused(paused: boolean) {
    pauseBtn.classList.toggle('active', paused);
  }

  return { setTool, setPaused };
}

/** Apply tool cursor / body class for CSS cursor swaps. */
export function applyToolCursor(canvas: HTMLCanvasElement, tool: 'draw' | 'erase'): void {
  canvas.classList.toggle('erase', tool === 'erase');
}

/** Translate dock/keyboard actions back into state mutations. */
export function applyAction(state: State, a: Action): void {
  switch (a.kind) {
    case 'tool': state.tool = a.tool; break;
    // the other kinds are handled by the app shell (app.ts)
    default: break;
  }
}
