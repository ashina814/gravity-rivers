import { Application, Graphics, Container } from 'pixi.js';
import { AdvancedBloomFilter, CRTFilter, RGBSplitFilter } from 'pixi-filters';

// スマホ判定：描画負荷を下げるために使用
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export let app: Application;
export let world: Container;
export let gfx: Graphics;
export let uiGfx: Graphics;

export async function initRenderer(canvas: HTMLCanvasElement) {
  app = new Application();
  await app.init({
    canvas,
    resizeTo: window,
    autoDensity: true,
    // スマホでは解像度を最大2に制限（4Kスマホ等での重さを回避）
    resolution: isMobile ? Math.min(2, window.devicePixelRatio || 1) : Math.max(1, window.devicePixelRatio || 1),
    backgroundColor: 0x060606,
  });

  world = new Container();
  app.stage.addChild(world);

  gfx = new Graphics();
  world.addChild(gfx);

  uiGfx = new Graphics();
  app.stage.addChild(uiGfx);

  // スマホの場合はBloomのQualityとBlurを下げて負荷軽減
  const bloom = new AdvancedBloomFilter({
    threshold: isMobile ? 0.4 : 0.3,
    bloomScale: isMobile ? 1.0 : 1.5,
    brightness: 1.2,
    blur: isMobile ? 4 : 8,
    quality: isMobile ? 2 : 4
  });

  const crt = new CRTFilter({
    curvature: 1.5,
    lineWidth: 2.0,
    lineContrast: 0.2,
    noise: isMobile ? 0.05 : 0.15,
    seed: Math.random(),
    vignetting: 0.4,
    vignettingAlpha: 0.8
  });

  const rgb = new RGBSplitFilter({
    red: { x: -2, y: 0 },
    green: { x: 0, y: 2 },
    blue: { x: 2, y: 0 }
  });

  world.filters = [bloom, rgb, crt];
}
