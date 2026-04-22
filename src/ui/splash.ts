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
  const splash = document.getElementById('title-screen');
  if (!splash) throw new Error('Missing #title-screen');
  const btn = document.getElementById('btn-start');
  if (!btn) throw new Error('Missing #btn-start');
  const hud = document.getElementById('hud');

  const tutBtn = document.getElementById('btn-tutorial-open');
  const tutClose = document.getElementById('btn-tutorial-close');
  const tutPanel = document.getElementById('panel-tutorial');
  if (tutBtn && tutClose && tutPanel) {
    tutBtn.addEventListener('click', () => tutPanel.classList.remove('hidden'));
    tutClose.addEventListener('click', () => tutPanel.classList.add('hidden'));
  }

  let fired = false;
  let cb: (() => void) | null = null;

  btn.addEventListener('click', () => {
    if (fired) return;
    fired = true;
    
    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'flash-overlay';
    document.body.appendChild(flash);
    
    // Trigger animation
    requestAnimationFrame(() => {
      flash.classList.add('show');
      splash.classList.add('booting');
      
      setTimeout(() => {
        flash.classList.remove('show');
        if (hud) hud.style.display = 'flex';
        setTimeout(() => flash.remove(), 200);
      }, 150);
    });
    
    cb?.();
  });

  return {
    hide() {
      if (fired) return;
      fired = true;
      splash.classList.add('booting');
      if (hud) hud.style.display = 'flex';
    },
    onStart(fn) {
      cb = fn;
    },
  };
}
