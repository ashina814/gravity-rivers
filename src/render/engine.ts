import { Application, Graphics, Container } from 'pixi.js';
import { AdvancedBloomFilter, CRTFilter, RGBSplitFilter } from 'pixi-filters';

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
    resolution: Math.max(1, window.devicePixelRatio || 1),
    backgroundColor: 0x060606,
  });

  world = new Container();
  app.stage.addChild(world);

  gfx = new Graphics();
  world.addChild(gfx);

  uiGfx = new Graphics();
  app.stage.addChild(uiGfx);

  const bloom = new AdvancedBloomFilter({
    threshold: 0.3,
    bloomScale: 1.5,
    brightness: 1.2,
    blur: 8,
    quality: 4
  });

  const crt = new CRTFilter({
    curvature: 1.5,
    lineWidth: 2.0,
    lineContrast: 0.2,
    noise: 0.15,
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
