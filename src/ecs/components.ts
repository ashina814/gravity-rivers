import { defineComponent, Types } from 'bitecs';

// --- 基本コンポーネント ---

export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
});

export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
});

export const Collider = defineComponent({
  radius: Types.f32,
});

// --- キャラクター固有コンポーネント ---

export const PlayerTag = defineComponent();
export const PlayerState = defineComponent({
  // 0: moving, 1: charging, 2: attacking
  state: Types.ui8, 
  charge: Types.f32,
  attackTimer: Types.f32,
  invulnTimer: Types.f32,
  chainReady: Types.ui8,
});

export const Enemy = defineComponent({
  // 0: gear, 1: skull, 2: boss
  type: Types.ui8, 
  hp: Types.f32,
  stateTimer: Types.f32,
});

export const Projectile = defineComponent({
  dead: Types.ui8,
});

export const Particle = defineComponent({
  life: Types.f32,
  size: Types.f32,
  // 0: square, 1: spark, 2: star
  kind: Types.ui8, 
  colorIndex: Types.ui8,
});
