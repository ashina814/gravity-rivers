import type { State } from '@/core/state';
import { bloomName } from '@/sim/flow';

/**
 * Glue the HUD DOM to the game state. Called every frame.
 * Updates are idempotent and cached to avoid layout thrash.
 */
export interface HudElements {
  flowFill: HTMLElement;
  flowValue: HTMLElement;
  bloomCount: HTMLElement;
  orbCount: HTMLElement;
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
    flowFill: q('flow-fill'),
    flowValue: q('flow-value'),
    bloomCount: q('bloom-count'),
    orbCount: q('orb-count'),
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
  let lastFlowFill = -1;
  let lastFlowValue = -1;
  let lastBloom = -1;
  let lastOrb = -1;
  let bannerTimer = 0;
  let hintLast = '';

  function update(state: State) {
    // Flow meter
    const pct = Math.min(100, state.flow.value * 100);
    if (Math.abs(pct - lastFlowFill) > 0.4) {
      els.flowFill.style.width = pct.toFixed(1) + '%';
      lastFlowFill = pct;
    }
    const num = state.flow.value + state.flow.charge * 0.5;
    const nStr = num.toFixed(2);
    if (parseFloat(nStr) !== lastFlowValue) {
      els.flowValue.textContent = nStr;
      lastFlowValue = parseFloat(nStr);
    }
    if (state.bloom.count !== lastBloom) {
      els.bloomCount.textContent = String(state.bloom.count);
      lastBloom = state.bloom.count;
    }
    if (state.orbs.length !== lastOrb) {
      els.orbCount.textContent = String(state.orbs.length);
      lastOrb = state.orbs.length;
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
