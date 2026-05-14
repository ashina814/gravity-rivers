import { Text, Container, Graphics } from 'pixi.js';
import type { State } from '@/core/state';

let rankText: Text;
let wordText: Text;
export let uiContainer: Container;

export function initUi(parent: Container) {
  uiContainer = new Container();
  parent.addChild(uiContainer);

  rankText = new Text({ text: '', style: { fontFamily: 'monospace', fontSize: 100, fontWeight: '900', fill: 0xffffff, align: 'center' }});
  rankText.anchor.set(0.5);
  
  wordText = new Text({ text: '', style: { fontFamily: 'monospace', fontSize: 14, fontWeight: '900', fill: 0xffffff, letterSpacing: 4, align: 'center' }});
  wordText.anchor.set(0.5);
  wordText.y = 60;
  wordText.alpha = 0.5;

  uiContainer.addChild(rankText);
  uiContainer.addChild(wordText);
}

export function getStyleRank(combo: number) {
  if (combo < 5) return null;
  if (combo < 10) return { rank: 'C', word: 'CRAZY', color: 0xffffff, alpha: 0.6 };
  if (combo < 20) return { rank: 'B', word: 'BADASS', color: 0xffffff, alpha: 0.7 };
  if (combo < 35) return { rank: 'A', word: 'APOCALYPTIC', color: 0xffffff, alpha: 0.8 };
  if (combo < 50) return { rank: 'S', word: 'SAVAGE', color: 0xffffff, alpha: 1.0 };
  if (combo < 70) return { rank: 'SS', word: 'SICK SKILLS', color: 0xffffff, alpha: 1.0 };
  return { rank: 'SSS', word: 'SMOKIN SEXY STYLE', color: 0xffffff, alpha: 1.0 };
}

export function updateStyleRank(state: State) {
  if (!uiContainer) return;
  const rankObj = getStyleRank(state.combo);
  if (!rankObj) {
    uiContainer.visible = false;
    return;
  }
  uiContainer.visible = true;

  const { w } = state.stage;
  uiContainer.x = w - 120;
  uiContainer.y = 140;

  const pulse = state.rankPulse > 0 ? state.rankPulse : 0;
  const scale = 1 + pulse * 0.3;
  uiContainer.scale.set(scale);

  rankText.text = rankObj.rank;
  rankText.style.fill = rankObj.color;
  rankText.alpha = rankObj.alpha;
  wordText.text = rankObj.word;
}

export function drawLives(g: Graphics, state: State) {
  if (state.stateMachine === 'gameover') return;
  const lives = state.player.lives;
  
  for (let i = 0; i < 3; i++) {
    const ox = 30 + i * 28;
    const oy = 30;
    g.moveTo(ox, oy - 7);
    g.lineTo(ox + 7, oy + 7);
    g.lineTo(ox - 7, oy + 7);
    g.closePath();
    g.fill({ color: 0xffffff, alpha: i < lives ? 1.0 : 0.15 });
  }
}
