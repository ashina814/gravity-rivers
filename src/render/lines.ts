import type { State } from '@/core/state';
import type { Line } from '@/sim/lines';
import { rgba } from '@/utils/color';

/**
 * Draw all player-drawn rivers. Each segment glows brighter the more
 * traffic it has received. The actively-drawn line is rendered on top.
 */
export function drawLines(ctx: CanvasRenderingContext2D, state: State): void {
  const dpr = state.stage.dpr;
  const accent = state.palette.accent;

  for (const L of state.lines) {
    drawOneLine(ctx, L, accent, dpr, state);
  }

  const drawing = state.drawing;
  if (drawing.active && drawing.points.length >= 2 && state.tool === 'draw') {
    drawGhostLine(ctx, drawing.points, accent, dpr);
  }
}

function drawOneLine(
  ctx: CanvasRenderingContext2D,
  L: Line,
  accent: string,
  dpr: number,
  state: State,
): void {
  const pts = L.points;
  if (pts.length < 2) return;
  const alpha = Math.max(0, Math.min(1, L.life));
  if (alpha <= 0) return;

  // Outer halo pass — single stroke, wide + low-alpha glow
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(accent, 0.18 * alpha);
  ctx.lineWidth = 10;
  ctx.shadowColor = accent;
  // shadowBlur is specified in coordinate-space units; keep it DPR-scaled
  // so the glow radius matches what players see on HiDPI displays.
  ctx.shadowBlur = 22 * dpr;
  strokePath(ctx, pts);
  ctx.restore();

  // Core pass — per-segment so we can tint high-traffic bits brighter
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10 * dpr;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const t = L.seg[i]?.traffic ?? 0;
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    const hot = Math.min(1, t * 1.6);
    // base + traffic-tinted warm color
    g.addColorStop(0, rgba(blendHot(accent, hot), 0.8 * alpha));
    g.addColorStop(1, rgba(blendHot(accent, hot), 0.9 * alpha));
    ctx.strokeStyle = g;
    ctx.lineWidth = 3.2 + hot * 2.2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();

  // Inner highlight pass — flowing arrows/dashed line
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * alpha})`;
  ctx.lineWidth = 2.0;
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 4 * dpr;
  
  // Make it flow!
  ctx.setLineDash([12, 18]);
  ctx.lineDashOffset = -state.timeMs * 0.12;
  
  strokePath(ctx, pts);
  ctx.restore();

  // Endpoints: small nodes to mark termini (helps players sight lines)
  drawEndpoints(ctx, pts, accent, alpha, dpr, state.tick);
}

function drawGhostLine(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; t: number }[],
  accent: string,
  dpr: number,
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(accent, 0.18);
  ctx.lineWidth = 8;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 16 * dpr;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // core
  ctx.strokeStyle = `rgba(255,255,255,0.85)`;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 2 * dpr;
  ctx.stroke();
  ctx.restore();
}

function strokePath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  // Use quadratic curves through midpoints for visual smoothness.
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    ctx.quadraticCurveTo(a.x, a.y, mx, my);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();
}

function blendHot(base: string, hot: number): string {
  // When traffic is low, return the accent; as it climbs, push toward white.
  if (hot <= 0) return base;
  const { r, g, b } = hexToRgb(base);
  return `rgb(${mix(r, 255, hot)}, ${mix(g, 255, hot)}, ${mix(b, 255, hot)})`;
}
function mix(a: number, b: number, t: number) { return a + (b - a) * t; }
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function drawEndpoints(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  accent: string,
  alpha: number,
  dpr: number,
  tick: number,
): void {
  const first = pts[0];
  const last = pts[pts.length - 1];
  const pulse = 0.75 + Math.sin(tick * 0.08) * 0.25;
  for (const p of [first, last]) {
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${0.9 * alpha})`;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12 * dpr;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
