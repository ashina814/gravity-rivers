import './style.css';

import { loadSettings, saveSettings } from '@/config/settings';
import { getPalette } from '@/config/palette';
import { makeState, type State } from '@/core/state';
import { makeApp } from '@/core/app';
import { attachViewport } from '@/render/canvas';
import { renderScene } from '@/render/scene';
import { makeAudioEngine } from '@/audio/audio';
import { makeBgm } from '@/audio/bgm';
import { sfxBoot } from '@/audio/sfx';
import { attachDrawing } from '@/input/drawing';
import { queryHud, bindHud } from '@/ui/hud';
import { bindSplash } from '@/ui/splash';

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
  hud.setHint('Drag to aim · Release to SLASH');

  const splash = bindSplash();

  // Inputs
  attachDrawing(canvas, state, audio);

  // App loop
  const app = makeApp(state, {
    audio,
    bgm,
    hud,
    render: (s) => {
      const ctx = viewport.ctx;
      const { dpr, w, h } = s.stage;
      
      // Update screen shake
      if (s.shakeMs > 0) {
        s.shakeMs -= s.lastFrameMs;
        const mag = s.shakeMag * (s.shakeMs / 200); // 200ms default fade
        const ox = (Math.random() - 0.5) * mag * 2 * dpr;
        const oy = (Math.random() - 0.5) * mag * 2 * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, ox, oy);
      } else {
        s.shakeMag = 0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);
      renderScene(ctx, s);
    },
  });

  splash.onStart(() => startSession(state, splash, bgm, audio));
  app.start();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.setSuspended(true);
      app.setPaused(true);
    } else {
      audio.setSuspended(false);
      if (state.began) {
        app.setPaused(false);
      }
    }
  });

  window.addEventListener('beforeunload', () => saveSettings(state.settings));

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

try {
  boot();
} catch (err) {
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
