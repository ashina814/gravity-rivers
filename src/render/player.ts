import type { State } from '@/core/state';
import type { Graphics } from 'pixi.js';

export function drawPlayer(g: Graphics, state: State) {
  const p = state.player;
  if (p.invulnTimer > 0 && Math.floor(state.timeMs / 80) % 2 === 0) return;

  const isMaxCharge = p.charge > 0.9;
  const primaryColor = 0xffffff;
  const accentColor = isMaxCharge ? 0xff0055 : 0xffffff;
  const accentAlpha = isMaxCharge ? 1.0 : 0.5;
  
  // Charge ring
  if (p.state === 'charging') {
    const attackRadius = 40 + p.charge * 60;
    const alpha = 0.4 + p.charge * 0.6;
    g.circle(p.x, p.y, attackRadius);
    g.stroke({ width: isMaxCharge ? 2 : 1, color: accentColor, alpha: alpha * accentAlpha });
  }

  // Attack flash
  if (p.state === 'attacking') {
    const attackRadius = 40 + p.charge * 60;
    const alpha = Math.max(0, (p.attackTimer / 15) * 0.15);
    g.circle(p.x, p.y, attackRadius);
    g.fill({ color: 0xffffff, alpha });
  }

  // Player triangle
  g.moveTo(p.x, p.y - 14);
  g.lineTo(p.x + 11, p.y + 11);
  g.lineTo(p.x - 11, p.y + 11);
  g.closePath();
  g.fill({ color: primaryColor });

  // Overdrive glow
  if (state.overdriveTimer > 0) {
    g.circle(p.x, p.y, 18);
    g.stroke({ width: 2, color: 0xfcee0a });
  }
}
