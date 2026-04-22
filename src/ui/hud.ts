import type { State } from '@/core/state';

export interface HudElements {
  inkFill: HTMLElement;
  inkValue: HTMLElement;
  levelCount: HTMLElement;
  scoreCount: HTMLElement;
  bloomBanner: HTMLElement;
  hint: HTMLElement;
}

export function queryHud(): HudElements {
  const q = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`HUD element not found: ${id}`);
    return el as T;
  };
  return {
    inkFill: q('ink-fill'),
    inkValue: q('ink-value'),
    levelCount: q('level-count'),
    scoreCount: q('score-count'),
    bloomBanner: q('bloom-banner'),
    hint: q('hint'),
  };
}

export interface HudRuntime {
  update(state: State): void;
  showBanner(text: string, color: string, durationMs?: number): void;
  setHint(text: string): void;
}

export function bindHud(els: HudElements): HudRuntime {
  let lastInkFill = -1;
  let lastInkValue = '';
  let lastCombo = -1;
  let lastScore = -1;
  let bannerTimer = 0;
  let hintLast = '';

  function update(state: State) {
    const p = state.player;
    
    // Energy meter for OVERDRIVE (Fever)
    const energyPct = Math.min(100, p.energy);
    if (Math.abs(energyPct - lastInkFill) > 0.4) {
      els.inkFill.style.width = energyPct.toFixed(1) + '%';
      lastInkFill = energyPct;
    }
    
    const nStr = Math.floor(energyPct) + '%';
    if (nStr !== lastInkValue) {
      els.inkValue.textContent = nStr;
      lastInkValue = nStr;
    }
    
    if (p.combo !== lastCombo) {
      els.levelCount.textContent = String(p.combo);
      lastCombo = p.combo;
    }
    
    if (state.score !== lastScore) {
      els.scoreCount.textContent = String(state.score);
      lastScore = state.score;
    }

    if (bannerTimer > 0) {
      bannerTimer -= state.lastFrameMs;
      if (bannerTimer <= 0) {
        els.bloomBanner.classList.remove('show');
        els.bloomBanner.textContent = '';
      }
    }
  }

  function showBanner(text: string, color: string, durationMs = 1400) {
    els.bloomBanner.textContent = text;
    els.bloomBanner.style.color = color;
    els.bloomBanner.style.borderColor = color;
    els.bloomBanner.style.textShadow = `0 0 8px ${color}`;
    els.bloomBanner.style.boxShadow = `0 0 24px ${color}55`;
    els.bloomBanner.classList.add('show');
    bannerTimer = durationMs;
  }

  function setHint(text: string) {
    if (text === hintLast) return;
    hintLast = text;
    els.hint.textContent = text;
  }

  return { update, showBanner, setHint };
}
