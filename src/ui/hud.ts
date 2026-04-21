import type { State } from '@/core/state';
import { bloomName } from '@/sim/flow';

/**
 * Glue the HUD DOM to the game state. Called every frame.
 * Updates are idempotent and cached to avoid layout thrash.
 */
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

import { LEVELS } from '@/core/levels';

export function bindHud(els: HudElements): HudRuntime {
  let lastInkFill = -1;
  let lastInkValue = '';
  let lastLevel = -1;
  let lastScore = -1;
  let bannerTimer = 0;
  let hintLast = '';

  function update(state: State) {
    const levelDef = LEVELS[state.currentLevelIdx] || LEVELS[0];
    
    // Ink meter
    const inkPct = Math.max(0, 100 - (state.inkUsed / levelDef.maxInk) * 100);
    if (Math.abs(inkPct - lastInkFill) > 0.4) {
      els.inkFill.style.width = inkPct.toFixed(1) + '%';
      lastInkFill = inkPct;
    }
    
    const nStr = Math.floor(inkPct) + '%';
    if (nStr !== lastInkValue) {
      els.inkValue.textContent = nStr;
      lastInkValue = nStr;
    }
    
    if (state.currentLevelIdx + 1 !== lastLevel) {
      els.levelCount.textContent = String(state.currentLevelIdx + 1);
      lastLevel = state.currentLevelIdx + 1;
    }
    
    if (state.score !== lastScore) {
      els.scoreCount.textContent = `${state.score} / ${levelDef.goal.required}`;
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

export function formatBloomBanner(chain: number): string {
  return `${bloomName(chain)} ×${chain}`;
}
