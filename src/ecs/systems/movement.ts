import { defineQuery } from 'bitecs';
import { Position, Velocity } from '../components';

const movementQuery = defineQuery([Position, Velocity]);

export function movementSystem(world: any, dt: number) {
  const entities = movementQuery(world);
  // This loop runs extremely fast because it iterates over typed arrays continuously in memory
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    Position.x[eid] += Velocity.x[eid] * dt;
    Position.y[eid] += Velocity.y[eid] * dt;
  }
}
