import { addEntity, addComponent } from 'bitecs';
import { world } from './world';
import { Position, Velocity, Collider, PlayerTag, PlayerState, Enemy, Projectile, Particle } from './components';

export function createPlayer(x: number, y: number) {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, Collider, eid);
  addComponent(world, PlayerTag, eid);
  addComponent(world, PlayerState, eid);
  
  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Collider.radius[eid] = 11;
  PlayerState.state[eid] = 0; // 0: moving, 1: charging, 2: attacking
  PlayerState.charge[eid] = 0;
  PlayerState.invulnTimer[eid] = 0;
  PlayerState.attackTimer[eid] = 0;
  return eid;
}

export function createEnemy(x: number, y: number, type: number, radius: number, hp: number) {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, Collider, eid);
  addComponent(world, Enemy, eid);
  
  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Collider.radius[eid] = radius;
  Enemy.type[eid] = type;
  Enemy.hp[eid] = hp;
  Enemy.stateTimer[eid] = Math.random() * 120; // Used for firing delays
  return eid;
}

export function createProjectile(x: number, y: number, vx: number, vy: number) {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, Collider, eid);
  addComponent(world, Projectile, eid);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = vx;
  Velocity.y[eid] = vy;
  Collider.radius[eid] = 5;
  Projectile.dead[eid] = 0;
  return eid;
}

export function createParticle(x: number, y: number, vx: number, vy: number, life: number, size: number, kind: number, colorIndex: number) {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Velocity, eid);
  addComponent(world, Particle, eid);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = vx;
  Velocity.y[eid] = vy;
  Particle.life[eid] = life;
  Particle.size[eid] = size;
  Particle.kind[eid] = kind;
  Particle.colorIndex[eid] = colorIndex; // 0: white, 1: red, 2: cyan, 3: yellow
  return eid;
}
