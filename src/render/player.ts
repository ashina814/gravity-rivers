import type { State } from '@/core/state';
import type { Graphics } from 'pixi.js';
import { defineQuery } from 'bitecs';
import { world } from '@/ecs/world';
import { Position, PlayerTag, PlayerState } from '@/ecs/components';

const playerQuery = defineQuery([Position, PlayerTag, PlayerState]);

export function drawPlayer(g: Graphics, state: State) {
  const players = playerQuery(world);
  if (players.length === 0) return;
  const eid = players[0];

  const px = Position.x[eid];
  const py = Position.y[eid];
  const pState = PlayerState.state[eid];
  const charge = PlayerState.charge[eid];
  const attackTimer = PlayerState.attackTimer[eid];
  const invulnTimer = PlayerState.invulnTimer[eid];

  if (invulnTimer > 0 && Math.floor(state.timeMs / 80) % 2 === 0) return;

  const isMaxCharge = charge > 0.9;
  const primaryColor = 0xffffff;
  const accentColor = isMaxCharge ? 0xff0055 : 0xffffff;
  const accentAlpha = isMaxCharge ? 1.0 : 0.5;
  
  if (pState === 1) { // charging
    const attackRadius = 40 + charge * 60;
    const alpha = 0.4 + charge * 0.6;
    g.circle(px, py, attackRadius);
    g.stroke({ width: isMaxCharge ? 2 : 1, color: accentColor, alpha: alpha * accentAlpha });
  }

  if (pState === 2) { // attacking
    const attackRadius = 40 + charge * 60;
    const alpha = Math.max(0, (attackTimer / 15) * 0.15);
    g.circle(px, py, attackRadius);
    g.fill({ color: 0xffffff, alpha });
  }

  g.moveTo(px, py - 14);
  g.lineTo(px + 11, py + 11);
  g.lineTo(px - 11, py + 11);
  g.closePath();
  g.fill({ color: primaryColor });

  if (state.overdriveTimer > 0) {
    g.circle(px, py, 18);
    g.stroke({ width: 2, color: 0xfcee0a });
  }
}
