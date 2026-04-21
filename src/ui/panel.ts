import type { State } from '@/core/state';
import { saveSettings, DEFAULT_SETTINGS, type Settings } from '@/config/settings';
import { getPalette, type PaletteName } from '@/config/palette';

/**
 * Bind the settings panel inputs to state. All mutations are
 * persisted via saveSettings so the configuration survives reload.
 */
export interface PanelRuntime {
  syncFromState(state: State): void;
  open(): void;
  close(): void;
  toggle(): void;
  readonly isOpen: boolean;
}

export interface PanelHooks {
  onPaletteChange?: (p: PaletteName) => void;
  onBgmChange?: (enabled: boolean) => void;
  onVolumeChange?: (v: number) => void;
}

export function bindPanel(state: State, hooks: PanelHooks = {}): PanelRuntime {
  const panel = el('panel-settings');
  const closeBtn = el('panel-close');
  const resetBtn = el('btn-reset-config');

  const spawn = el<HTMLInputElement>('in-spawn-rate');
  const gravity = el<HTMLInputElement>('in-gravity');
  const lineLife = el<HTMLInputElement>('in-line-life');
  const trail = el<HTMLInputElement>('in-trail');
  const volume = el<HTMLInputElement>('in-volume');
  const bgm = el<HTMLInputElement>('in-bgm');
  const palette = el<HTMLSelectElement>('in-palette');
  const crt = el<HTMLInputElement>('in-crt');
  const bloom = el<HTMLInputElement>('in-bloom');

  const vSpawn = el('val-spawn-rate');
  const vGravity = el('val-gravity');
  const vLineLife = el('val-line-life');
  const vTrail = el('val-trail');
  const vVolume = el('val-volume');
  const vBgm = el('val-bgm');
  const vCrt = el('val-crt');
  const vBloom = el('val-bloom');

  let open = false;

  function fmtPct(v01: number): string { return Math.round(v01 * 100) + '%'; }
  function fmtSec(v01: number): string {
    if (v01 <= 0) return 'INFINITE';
    return (v01 * 16).toFixed(1) + 's';
  }

  function applyFromInputs() {
    const s = state.settings;
    s.spawnRate = toUnit(spawn);
    s.gravity   = toUnit(gravity);
    s.lineLife  = toUnit(lineLife);
    s.trailGlow = toUnit(trail);
    s.volume    = toUnit(volume);
    s.bgm       = bgm.checked;
    s.palette   = palette.value as PaletteName;
    s.crt       = crt.checked;
    s.bloom     = bloom.checked;

    state.palette = getPalette(s.palette);
    updateLabels();
    saveSettings(s);

    hooks.onPaletteChange?.(s.palette);
    hooks.onBgmChange?.(s.bgm);
    hooks.onVolumeChange?.(s.volume);
  }

  function updateLabels() {
    vSpawn.textContent = fmtPct(state.settings.spawnRate);
    vGravity.textContent = fmtPct(state.settings.gravity);
    vLineLife.textContent = fmtSec(state.settings.lineLife);
    vTrail.textContent = fmtPct(state.settings.trailGlow);
    vVolume.textContent = fmtPct(state.settings.volume);
    vBgm.textContent = state.settings.bgm ? 'ON' : 'OFF';
    vCrt.textContent = state.settings.crt ? 'ON' : 'OFF';
    vBloom.textContent = state.settings.bloom ? 'ON' : 'OFF';
  }

  function syncFromState(state: State) {
    spawn.value = String(Math.round(state.settings.spawnRate * 100));
    gravity.value = String(Math.round(state.settings.gravity * 100));
    lineLife.value = String(Math.round(state.settings.lineLife * 100));
    trail.value = String(Math.round(state.settings.trailGlow * 100));
    volume.value = String(Math.round(state.settings.volume * 100));
    bgm.checked = state.settings.bgm;
    palette.value = state.settings.palette;
    crt.checked = state.settings.crt;
    bloom.checked = state.settings.bloom;
    updateLabels();
  }

  for (const input of [spawn, gravity, lineLife, trail, volume]) {
    input.addEventListener('input', applyFromInputs);
  }
  for (const input of [bgm, crt, bloom]) {
    input.addEventListener('change', applyFromInputs);
  }
  palette.addEventListener('change', applyFromInputs);

  closeBtn.addEventListener('click', () => setOpen(false));
  resetBtn.addEventListener('click', () => {
    Object.assign(state.settings, DEFAULT_SETTINGS);
    state.palette = getPalette(state.settings.palette);
    syncFromState(state);
    saveSettings(state.settings);
    hooks.onPaletteChange?.(state.settings.palette);
    hooks.onBgmChange?.(state.settings.bgm);
    hooks.onVolumeChange?.(state.settings.volume);
  });

  function setOpen(v: boolean) {
    open = v;
    panel.classList.toggle('hidden', !v);
    panel.setAttribute('aria-hidden', v ? 'false' : 'true');
  }

  return {
    syncFromState,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    get isOpen() { return open; },
  };
}

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`DOM element missing: #${id}`);
  return e as T;
}

function toUnit(input: HTMLInputElement): number {
  const n = parseFloat(input.value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n / 100));
}
