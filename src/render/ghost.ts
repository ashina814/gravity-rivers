/**
 * Ghost Replay Renderer
 * タイトル画面で前回のプレイデータをデモ再生する。
 * localStorage の 'gr_ghost' から読み取った座標データを元に、
 * 半透明のプレイヤーシルエットが画面内を滑走する。
 */
import { Graphics, Container, Text } from 'pixi.js';

export interface GhostFrame {
  x: number;
  y: number;
  s: number; // state: 0=moving, 1=charging, 2=attacking
  c: number; // charge: 0..1
}

export class GhostReplay {
  private frames: GhostFrame[] = [];
  private cursor = 0;
  private container: Container;
  private gfx: Graphics;
  private label: Text;
  private trail: Array<{ x: number; y: number; age: number }> = [];
  private active = false;

  constructor(parent: Container) {
    this.container = new Container();
    this.container.alpha = 0.4;
    parent.addChild(this.container);

    this.gfx = new Graphics();
    this.container.addChild(this.gfx);

    this.label = new Text({
      text: '▶ LAST PLAY',
      style: {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: 0x00f0ff,
        align: 'center',
      }
    });
    this.label.anchor.set(0.5);
    this.container.addChild(this.label);

    // localStorage から読み込み
    try {
      const raw = localStorage.getItem('gr_ghost');
      if (raw) {
        this.frames = JSON.parse(raw);
        if (this.frames.length > 10) {
          this.active = true;
        }
      }
    } catch {
      // データ破損時は再生しない
    }
  }

  get isActive() { return this.active; }

  update() {
    if (!this.active || this.frames.length === 0) {
      this.container.visible = false;
      return;
    }
    this.container.visible = true;

    const frame = this.frames[this.cursor];
    this.cursor = (this.cursor + 1) % this.frames.length;

    // 軌跡を追加
    this.trail.push({ x: frame.x, y: frame.y, age: 1.0 });
    if (this.trail.length > 30) this.trail.shift();

    this.gfx.clear();

    // 軌跡（ネオンの残像）
    for (const t of this.trail) {
      t.age -= 0.04;
      if (t.age <= 0) continue;
      const color = frame.s === 2 ? 0xff0055 : 0x00f0ff;
      this.gfx.circle(t.x, t.y, 3 * t.age);
      this.gfx.fill({ color, alpha: t.age * 0.5 });
    }
    this.trail = this.trail.filter(t => t.age > 0);

    // ゴースト本体（三角形シルエット）
    const baseColor = frame.s === 2 ? 0xff0055 : frame.s === 1 ? 0xffff00 : 0x00f0ff;
    const r = 10 + frame.c * 6;
    this.gfx.moveTo(frame.x, frame.y - r);
    this.gfx.lineTo(frame.x + r * 0.7, frame.y + r * 0.6);
    this.gfx.lineTo(frame.x - r * 0.7, frame.y + r * 0.6);
    this.gfx.closePath();
    this.gfx.fill({ color: baseColor, alpha: 0.6 });
    this.gfx.stroke({ width: 1.5, color: baseColor, alpha: 0.8 });

    // ラベル
    this.label.x = frame.x;
    this.label.y = frame.y - r - 14;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
