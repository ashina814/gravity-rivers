import { Application, Graphics, Container } from 'pixi.js';
import { AdvancedBloomFilter, CRTFilter, RGBSplitFilter } from 'pixi-filters';

// スマホ判定：描画負荷を下げるために使用
export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export let app: Application;
export let world: Container;
export let gfx: Graphics;
export let uiGfx: Graphics;
export let rgbFilter: RGBSplitFilter;

export async function initRenderer(canvas: HTMLCanvasElement) {
  app = new Application();
  await app.init({
    canvas,
    resizeTo: window,
    autoDensity: true,
    resolution: isMobile ? Math.min(2, window.devicePixelRatio || 1) : Math.max(1, window.devicePixelRatio || 1),
    backgroundColor: 0x0a0a18, // 真っ黒→少し青みを足して空間感を出す
  });

  world = new Container();
  app.stage.addChild(world);

  gfx = new Graphics();
  world.addChild(gfx);

  uiGfx = new Graphics();
  app.stage.addChild(uiGfx);

  // Bloom: 本当に明るい部分だけ光る（控えめ）
  const bloom = new AdvancedBloomFilter({
    threshold: isMobile ? 0.6 : 0.55,
    bloomScale: isMobile ? 0.5 : 0.7,
    brightness: 1.1,
    blur: isMobile ? 3 : 6,
    quality: isMobile ? 2 : 4
  });

  // CRT: 雰囲気だけ。ゲーム性を邪魔しない
  const crt = new CRTFilter({
    curvature: 0.3,          // 1.5 → 0.3: わずかな曲がりだけ
    lineWidth: 1.0,
    lineContrast: 0.04,      // 0.2 → 0.04: 走査線はほぼ見えない
    noise: isMobile ? 0.01 : 0.02,  // 0.15 → 0.02: ノイズ大幅削減
    seed: Math.random(),
    vignetting: 0.3,
    vignettingAlpha: 0.25    // 0.8 → 0.25: 周辺減光を控えめに
  });

  // RGB Split: デフォルトは無効。ヒット時のみ一瞬かける
  rgbFilter = new RGBSplitFilter({
    red: { x: 0, y: 0 },
    green: { x: 0, y: 0 },
    blue: { x: 0, y: 0 }
  });

  world.filters = [bloom, rgbFilter, crt];
}
