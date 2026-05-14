import type { State } from '@/core/state';

export function getStyleRank(combo: number) {
  if (combo < 5) return null;
  if (combo < 10) return { rank: 'C', word: 'CRAZY', color: 'rgba(255,255,255,0.6)' };
  if (combo < 20) return { rank: 'B', word: 'BADASS', color: 'rgba(255,255,255,0.7)' };
  if (combo < 35) return { rank: 'A', word: 'APOCALYPTIC', color: 'rgba(255,255,255,0.8)' };
  if (combo < 50) return { rank: 'S', word: 'SAVAGE', color: '#ffffff' };
  if (combo < 70) return { rank: 'SS', word: 'SICK SKILLS', color: '#ffffff' };
  return { rank: 'SSS', word: 'SMOKIN SEXY STYLE', color: '#ffffff' };
}

export function drawStyleRank(ctx: CanvasRenderingContext2D, state: State) {
  const rankObj = getStyleRank(state.combo);
  if (!rankObj) return;

  const { w } = state.stage;
  ctx.save();
  ctx.translate(w - 120, 140);
  
  const pulse = state.rankPulse > 0 ? state.rankPulse : 0;
  const scale = 1 + pulse * 0.3;
  ctx.scale(scale, scale);
  
  // Rank letter — big, white, clean
  ctx.font = '900 100px var(--font, monospace)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = rankObj.color;
  ctx.globalAlpha = 0.9;
  ctx.fillText(rankObj.rank, 0, 0);
  
  // Rank word — small, understated
  ctx.font = '900 14px var(--font, monospace)';
  ctx.globalAlpha = 0.5;
  ctx.letterSpacing = '4px';
  ctx.fillStyle = '#fff';
  ctx.fillText(rankObj.word, 0, 60);
  ctx.globalAlpha = 1.0;
  
  ctx.restore();
}

export function drawLives(ctx: CanvasRenderingContext2D, state: State) {
  if (state.stateMachine === 'gameover') return;
  const lives = state.player.lives;
  ctx.save();
  ctx.translate(30, 30);
  
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    // Small triangles for lives
    const ox = i * 28;
    ctx.moveTo(ox, -7);
    ctx.lineTo(ox + 7, 7);
    ctx.lineTo(ox - 7, 7);
    ctx.closePath();
    ctx.fillStyle = i < lives ? '#ffffff' : 'rgba(255,255,255,0.15)';
    ctx.fill();
  }
  ctx.restore();
}
