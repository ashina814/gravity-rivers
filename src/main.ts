import './style.css';

import { loadSettings, saveSettings } from '@/config/settings';
import { getPalette } from '@/config/palette';
import { makeState, type State } from '@/core/state';
import { makeApp } from '@/core/app';
import { attachViewport } from '@/render/canvas';
import { renderScene } from '@/render/scene';
import { makeAudioEngine } from '@/audio/audio';
import { makeBgm } from '@/audio/bgm';
import { sfxClick, sfxBoot } from '@/audio/sfx';
import { attachDrawing } from '@/input/drawing';
import { attachKeyboard, makeKeyboardBus, type Action } from '@/input/keyboard';
import { queryHud, bindHud } from '@/ui/hud';
import { bindPanel } from '@/ui/panel';
import { bindDock, applyAction, applyToolCursor } from '@/ui/dock';
import { bindSplash } from '@/ui/splash';
import { downloadSnapshot } from '@/ui/snap';

/**
 * Entry point — wires together all subsystems.
 *
 * Order matters:
 *   1. Load settings (localStorage)
 *   2. Build state + palette
 *   3. Attach canvas + renderer
 *   4. Instantiate audio + bgm (lazy; starts after splash)
 *   5. Bind HUD / dock / panel / splash
 *   6. Start loop
 */

function boot(): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('No #scene canvas');

  const settings = loadSettings();
  const palette = getPalette(settings.palette);
  const state: State = makeState(settings, palette);

  const viewport = attachViewport(state, canvas);
  const audio = makeAudioEngine();
  audio.setVolume(settings.volume);
  const bgm = makeBgm(audio);

  // HUD & UI
  const hudEls = queryHud();
  const hud = bindHud(hudEls);
  const bus = makeKeyboardBus();
  const dock = bindDock(bus);
  const panel = bindPanel(state, {
    onPaletteChange: () => { /* palette already applied by panel */ },
    onBgmChange: (enabled) => {
      state.settings.bgm = enabled;
      if (enabled) bgm.start();
      bgm.setMuted(!enabled);
    },
    onVolumeChange: (v) => audio.setVolume(v),
  });
  panel.syncFromState(state);
  hud.setHint('DRAW a line ·  release to channel');

  const splash = bindSplash();

  // Inputs
  attachKeyboard(state, bus);
  attachDrawing(canvas, state, audio);

  bus.on((a: Action) => {
    // Apply any direct state mutations (tool switches, etc.)
    applyAction(state, a);
    if (a.kind === 'tool') {
      dock.setTool(a.tool);
      applyToolCursor(canvas, a.tool);
      hud.setHint(a.tool === 'erase'
        ? 'ERASER active ·  drag to remove'
        : 'DRAW a line ·  release to channel');
    }
    if (a.kind === 'clear') {
      state.lines = [];
      sfxClick(audio);
      hud.setHint('lines cleared');
    }
    if (a.kind === 'snap') {
      downloadSnapshot(canvas);
      sfxClick(audio);
      hud.showBanner('SNAPSHOT', state.palette.accent, 900);
    }
    if (a.kind === 'pause') {
      app.setPaused(!state.paused);
      dock.setPaused(state.paused);
      sfxClick(audio);
      hud.setHint(state.paused ? 'PAUSED  ·  space to resume' : 'resumed');
    }
    if (a.kind === 'settings') {
      panel.toggle();
      sfxClick(audio);
    }
    if (a.kind === 'fullscreen') {
      toggleFullscreen();
    }
    if (a.kind === 'start') {
      startSession(state, splash, bgm, audio);
    }
  });

  // Cursor reflects starting tool
  applyToolCursor(canvas, state.tool);
  dock.setTool(state.tool);

  // App loop
  const app = makeApp(state, {
    audio,
    bgm,
    hud,
    render: (s) => {
      // Drawing a frame: set DPR transform, clear, then scene pipeline.
      // The entire render pipeline works in CSS-pixel coordinates; the
      // transform upscales to the physical-pixel canvas for crisp retina.
      const ctx = viewport.ctx;
      const { dpr, w, h } = s.stage;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      renderScene(ctx, s);
    },
  });

  splash.onStart(() => startSession(state, splash, bgm, audio));
  app.start();

  // Visibility change: pause sim when tab is hidden, re-sync when back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.setSuspended(true);
      app.setPaused(true);
      dock.setPaused(true);
    } else {
      audio.setSuspended(false);
      if (state.began) {
        app.setPaused(false);
        dock.setPaused(false);
      }
    }
  });

  // Save settings on unload (belt & suspenders — we already save on change).
  window.addEventListener('beforeunload', () => saveSettings(state.settings));

  // Expose a tiny dev handle.
  if (import.meta.env.DEV) {
    (window as any).__gr = { state, app, audio, bgm };
  }
}

function startSession(
  state: State,
  splash: ReturnType<typeof bindSplash>,
  bgm: ReturnType<typeof makeBgm>,
  audio: ReturnType<typeof makeAudioEngine>,
): void {
  if (state.began) return;
  state.began = true;
  audio.ensure();
  audio.setSuspended(false);
  sfxBoot(audio);
  if (state.settings.bgm) bgm.start();
  splash.hide();
}

function toggleFullscreen(): void {
  const doc = document as Document & {
    webkitFullscreenElement?: Element;
    webkitExitFullscreen?: () => Promise<void>;
  };
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  const isFs = document.fullscreenElement || doc.webkitFullscreenElement;
  if (isFs) {
    (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())?.catch(() => {});
  } else {
    (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch(() => {});
  }
}

try {
  boot();
} catch (err) {
  // Fail-loud error overlay — useful on GH Pages.
  console.error(err);
  const pre = document.createElement('pre');
  pre.style.cssText = `
    position: fixed; inset: 0;
    margin: 20px; padding: 16px;
    background: rgba(0, 0, 0, 0.88); color: #ffbaba;
    font-family: monospace; font-size: 12px; white-space: pre-wrap;
    border: 1px solid #f55; border-radius: 4px;
    overflow: auto; z-index: 99999;
  `;
  pre.textContent =
    'Gravity Rivers failed to start.\n\n' +
    (err instanceof Error ? err.stack || err.message : String(err));
  document.body.appendChild(pre);
}
