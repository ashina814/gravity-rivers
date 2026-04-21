/**
 * Welcome splash screen. Shows on first load and hides after
 * the user taps BEGIN (also hidden if state.began becomes true
 * via keyboard shortcut).
 */
export interface SplashRuntime {
  hide(): void;
  onStart(cb: () => void): void;
}

export function bindSplash(): SplashRuntime {
  const splash = document.getElementById('splash');
  if (!splash) throw new Error('Missing #splash');
  const btn = document.getElementById('btn-start');
  if (!btn) throw new Error('Missing #btn-start');

  let fired = false;
  let cb: (() => void) | null = null;

  btn.addEventListener('click', () => {
    if (fired) return;
    fired = true;
    splash.classList.add('hidden');
    cb?.();
  });

  return {
    hide() {
      if (fired) return;
      fired = true;
      splash.classList.add('hidden');
    },
    onStart(fn) {
      cb = fn;
    },
  };
}
