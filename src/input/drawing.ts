import type { State } from '@/core/state';
import { buildLine, eraseAt, tryWeldLines, MAX_LINE_LENGTH } from '@/sim/lines';
import type { AudioEngine } from '@/audio/audio';
import { sfxDraw, sfxErase } from '@/audio/sfx';
import { dist } from '@/utils/math';
import { LEVELS } from '@/core/levels';

/**
 * Wire up pointer events for drawing and erasing.
 * Pointer capture keeps the stroke glued to the cursor even if it
 * slips outside the canvas during a fast flick.
 */
export function attachDrawing(
  canvas: HTMLCanvasElement,
  state: State,
  engine: AudioEngine,
): void {
  const toLocal = (e: PointerEvent) => {
    // Stage dimensions are CSS pixels (same space as clientX/Y & boundingRect),
    // so we just subtract the rect origin. Scale only kicks in if the canvas
    // is being displayed at a CSS size different from the stage (not our case).
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width > 0 ? state.stage.w / rect.width : 1;
    const sy = rect.height > 0 ? state.stage.h / rect.height : 1;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    return { x, y };
  };

  // Accumulate since last recorded point to gate sfxDraw calls
  let drawBeepAcc = 0;

  const onDown = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    // middle or right click => erase even when draw is selected
    const erasing = state.tool === 'erase' || e.button === 2;
    const { x, y } = toLocal(e);

    state.drawing.active = true;
    state.drawing.erasing = erasing;
    state.drawing.points = [{ x, y, t: performance.now() }];
    state.drawing.pointerId = e.pointerId;
    state.drawing.startedAt = performance.now();
    state.drawing.lastAddedAt = performance.now();
    drawBeepAcc = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* older browsers */ }
    e.preventDefault();

    if (erasing) {
      eraseAt(state, x, y, 22, state.tick);
      sfxErase(engine);
    } else {
      sfxDraw(engine, 0.4);
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!state.drawing.active) return;
    if (state.drawing.pointerId !== null && e.pointerId !== state.drawing.pointerId) return;
    const { x, y } = toLocal(e);
    const last = state.drawing.points[state.drawing.points.length - 1];
    const d = dist(last.x, last.y, x, y);
    if (d < 2) return;
    
    // Check Ink Limit
    const levelDef = LEVELS[state.currentLevelIdx] || LEVELS[0];
    if (!state.drawing.erasing && state.inkUsed + d > levelDef.maxInk) return;

    // soft cap by total stroke length so we don't keep a 10,000 pt buffer
    let totalLen = 0;
    const pts = state.drawing.points;
    for (let i = 1; i < pts.length; i++) {
      totalLen += dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    }
    totalLen += d;
    if (totalLen > MAX_LINE_LENGTH) return;

    const now = performance.now();
    state.drawing.points.push({ x, y, t: now });
    state.drawing.lastAddedAt = now;

    if (state.drawing.erasing) {
      eraseAt(state, x, y, 22, state.tick);
      // Throttle erase sfx
      if (Math.random() < 0.08) sfxErase(engine);
    } else {
      drawBeepAcc += d;
      if (drawBeepAcc > 48) {
        drawBeepAcc = 0;
        sfxDraw(engine, (y / state.stage.h));
      }
    }
  };

  const onUp = (e: PointerEvent) => {
    if (!state.drawing.active) return;
    if (state.drawing.pointerId !== null && e.pointerId !== state.drawing.pointerId) return;
    if (!state.drawing.erasing) commitLine(state);
    state.drawing.active = false;
    state.drawing.points = [];
    state.drawing.pointerId = null;
    state.drawing.erasing = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const onLeave = onUp;
  const onCancel = onUp;

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function commitLine(state: State): void {
  const pts = state.drawing.points.map((p) => ({ x: p.x, y: p.y }));
  if (pts.length < 2) return;
  // Drop strokes shorter than a threshold (accidental click).
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  if (total < 8) return;

  const newLine = buildLine(pts, state.tick, false);

  // Try to weld with an existing endpoint-adjacent line for seamless extension.
  for (let i = state.lines.length - 1; i >= 0; i--) {
    const ex = state.lines[i];
    const merged = tryWeldLines(ex, newLine, state.tick, 16);
    if (merged) {
      state.lines.splice(i, 1);
      state.lines.push(merged);
      enforceLineLimits(state);
      return;
    }
  }
  state.lines.push(newLine);
  enforceLineLimits(state);
}

const HARD_LINE_CAP = 60;

function enforceLineLimits(state: State): void {
  // Keep a hard cap to avoid runaway renderer work.
  while (state.lines.length > HARD_LINE_CAP) state.lines.shift();
}
