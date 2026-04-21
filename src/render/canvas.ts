import type { State } from '@/core/state';

/**
 * Lightweight wrapper around a DPR-aware 2D canvas. Resizes when the
 * container changes. Exposes context + logical dimensions.
 */
export interface Viewport {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  resize(): void;
}

export function attachViewport(state: State, canvas: HTMLCanvasElement): Viewport {
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: false });
  if (!ctx) throw new Error('2D canvas unsupported');

  const resize = () => {
    // Physical-pixel DPR scaling for crisp rendering on retina displays.
    // The render pipeline is written against CSS-pixel coordinates and we
    // apply a setTransform(dpr, 0, 0, dpr, 0, 0) at draw time to upscale.
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(300, rect.width);
    const cssH = Math.max(300, rect.height);
    const physW = Math.round(cssW * dpr);
    const physH = Math.round(cssH * dpr);
    if (canvas.width !== physW || canvas.height !== physH) {
      canvas.width = physW;
      canvas.height = physH;
    }
    state.stage.cssW = cssW;
    state.stage.cssH = cssH;
    // Logical coordinates (used everywhere in sim + render) are CSS units.
    state.stage.w = cssW;
    state.stage.h = cssH;
    state.stage.dpr = dpr;
  };

  resize();
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  window.addEventListener('orientationchange', resize);

  return { canvas, ctx, resize };
}
