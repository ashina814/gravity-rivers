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
  let lastHpPct = -1;
  let lastHpValue = '';
  let lastCombo = -1;
  let lastScore = -1;

  function update(state: State) {
    const p = state.player;
    
    // HP meter for Player
    const hpPct = Math.max(0, p.hp);
    if (Math.abs(hpPct - lastHpPct) > 0.4) {
      els.inkFill.style.width = hpPct.toFixed(1) + '%';
      
      // Flash red if low HP
      if (hpPct < 30) {
        els.inkFill.style.background = '#ff0055';
      } else {
        els.inkFill.style.background = '#fcee0a';
      }
      
      lastHpPct = hpPct;
    }
    
    const nStr = Math.floor(hpPct) + ' HP';
    if (nStr !== lastHpValue) {
      els.inkValue.textContent = nStr;
      lastHpValue = nStr;
    }
    
    if (state.combo !== lastCombo) {
      els.levelCount.textContent = String(state.combo);
      lastCombo = state.combo;
    }
    
    if (state.score !== lastScore) {
      els.scoreCount.textContent = String(state.score);
      lastScore = state.score;
    }
  }

  function showBanner(text: string, color: string, durationMs = 1400) {
    els.bloomBanner.textContent = text;
    els.bloomBanner.style.color = color;
    els.bloomBanner.style.borderColor = color;
    els.bloomBanner.style.textShadow = `none`;
    els.bloomBanner.style.boxShadow = `4px 4px 0 ${color}`;
    els.bloomBanner.classList.add('show');
    // Hide logic handled outside
  }

  function setHint(text: string) {
    els.hint.textContent = text;
  }

  return { update, showBanner, setHint };
}
