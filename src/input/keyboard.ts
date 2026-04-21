import type { State } from '@/core/state';

/**
 * Keyboard shortcuts. Exposed via a tiny event bus so the UI layer
 * can pipe actions through without hard imports.
 */
export type Action =
  | { kind: 'tool'; tool: 'draw' | 'erase' }
  | { kind: 'clear' }
  | { kind: 'snap' }
  | { kind: 'pause' }
  | { kind: 'settings' }
  | { kind: 'fullscreen' }
  | { kind: 'start' };

export interface KeyboardBus {
  on(handler: (a: Action) => void): () => void;
  emit(a: Action): void;
}

export function makeKeyboardBus(): KeyboardBus {
  const handlers = new Set<(a: Action) => void>();
  return {
    on(h) { handlers.add(h); return () => handlers.delete(h); },
    emit(a) { for (const h of handlers) h(a); },
  };
}

export function attachKeyboard(state: State, bus: KeyboardBus): void {
  window.addEventListener('keydown', (e) => {
    // Do not eat typing in inputs
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    // ignore repeat so we don't spam audio
    if (e.repeat) return;

    // modifier-only combos skipped
    if (e.metaKey || e.ctrlKey) return;

    const k = e.key.toLowerCase();
    switch (k) {
      case 'd': bus.emit({ kind: 'tool', tool: 'draw' }); e.preventDefault(); break;
      case 'e': bus.emit({ kind: 'tool', tool: 'erase' }); e.preventDefault(); break;
      case 'c': bus.emit({ kind: 'clear' }); e.preventDefault(); break;
      case 's': bus.emit({ kind: 'snap' }); e.preventDefault(); break;
      case ' ':
      case 'space':
        bus.emit({ kind: 'pause' });
        e.preventDefault();
        break;
      case ',':
        bus.emit({ kind: 'settings' });
        e.preventDefault();
        break;
      case 'f':
        bus.emit({ kind: 'fullscreen' });
        e.preventDefault();
        break;
      case 'enter':
        if (!state.began) bus.emit({ kind: 'start' });
        break;
      default:
        // ignore
        break;
    }
  });
}
