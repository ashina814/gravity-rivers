import { defineQuery, removeEntity } from 'bitecs';
import { Position, Velocity, Particle } from '../components';

const particleQuery = defineQuery([Position, Velocity, Particle]);

export function particleSystem(world: any, dt: number) {
  const entities = particleQuery(world);
  
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    
    // Gravity and Friction
    Velocity.y[eid] += 0.05 * dt;
    Velocity.x[eid] *= Math.pow(0.98, dt);
    
    Particle.life[eid] -= 0.012 * dt;

    if (Particle.life[eid] <= 0) {
      removeEntity(world, eid);
    }
  }
}
