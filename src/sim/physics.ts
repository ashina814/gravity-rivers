import type { State } from '@/core/state';
import type { Orb } from './balls';
import { BASE_TRAIL_CAP, BLESSED_TRAIL_CAP } from './balls';
import type { Line } from './lines';
import { lerp } from '@/utils/math';
import { LEVELS } from '@/core/levels';

/**
 * Convert the user gravity slider (0..1) into px/frame² acceleration.
 * The simulation runs at 1000/120 ms per step (8.33ms), so this is per-step.
 */
export function gravityFromSetting(g01: number): number {
  return lerp(0.04, 0.42, Math.max(0, Math.min(1, g01)));
}

const SUBSTEPS = 3;       // sub-steps per simulation tick (extra precision for fast orbs)
const MAX_VEL = 8.5;      // soft cap to prevent tunneling
const FLOOR_RESTITUTION = 0.18;
const WALL_RESTITUTION = 0.32;
const LINE_FRICTION = 0.985;     // along-line damping
const NORMAL_BOUNCE = 0.12;     // small lateral bounce for groove feel
const CONTACT_PAD = 1.6;          // gap maintained between orb and line

/**
 * Integrate physics for one fixed timestep.
 */
export function stepPhysics(state: State, dtMs: number): void {
  if (state.orbs.length === 0) return;
  const g = gravityFromSetting(state.settings.gravity);
  const sub = SUBSTEPS;
  const subG = g / sub;

  const level = LEVELS[state.currentLevelIdx] || LEVELS[0];
  const { w, h } = state.stage;
  const minDim = Math.min(w, h);
  const gx = level.goal.rx * w;
  const gy = level.goal.ry * h;
  const gr = level.goal.rr * minDim;
  const obstacles = level.obstacles.map(obs => ({
    x: obs.rx * w, y: obs.ry * h, w: obs.rw * w, h: obs.rh * h
  }));

  for (let s = 0; s < sub; s++) {
    // integrate
    for (const o of state.orbs) {
      if (o.dead) continue;
      o.vy += subG;
      // mild horizontal drag so spirals settle
      o.vx *= 0.998;
      // velocity cap
      if (o.vy > MAX_VEL) o.vy = MAX_VEL;
      else if (o.vy < -MAX_VEL) o.vy = -MAX_VEL;
      if (o.vx > MAX_VEL) o.vx = MAX_VEL;
      else if (o.vx < -MAX_VEL) o.vx = -MAX_VEL;

      o.px = o.x; o.py = o.y;
      o.x += o.vx / sub;
      o.y += o.vy / sub;
    }

    // line collisions
    for (const o of state.orbs) {
      if (o.dead) continue;
      let hit = false;
      for (const L of state.lines) {
        if (L.life <= 0) continue;
        if (collideOrbLine(o, L, state.tick)) hit = true;
      }
      if (hit) o.lastContactMs = 0;
    }

    // ball-ball
    resolveOrbCollisions(state.orbs);

    // walls / floor / goal / obstacles
    for (const o of state.orbs) {
      if (o.dead) continue;

      // Goal Check
      const d2 = (o.x - gx) ** 2 + (o.y - gy) ** 2;
      if (d2 < gr * gr) {
        o.dead = true;
        if (state.stateMachine === 'playing') {
          state.score++;
        }
        continue;
      }

      // Obstacle Check
      for (const obs of obstacles) {
        if (o.x > obs.x && o.x < obs.x + obs.w && o.y > obs.y && o.y < obs.y + obs.h) {
          o.dead = true;
          // Spawn death particles
          for(let i=0; i<4; i++) {
             state.particles.push({
               x: o.x, y: o.y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5,
               life: 1, color: '#ff2255', size: 4, kind: 'star', shimmer: false
             });
          }
          break;
        }
      }
      if (o.dead) continue;

      const W = state.stage.w;
      const H = state.stage.h;
      if (o.x < o.r) {
        o.x = o.r;
        o.vx = Math.abs(o.vx) * WALL_RESTITUTION;
      } else if (o.x > W - o.r) {
        o.x = W - o.r;
        o.vx = -Math.abs(o.vx) * WALL_RESTITUTION;
      }
      // soft floor — orbs eventually fall off the bottom and get harvested.
      if (o.y > H + o.r + 30) {
        o.dead = true;
      }
    }
  }

  // post-step bookkeeping
  for (const o of state.orbs) {
    if (o.dead) continue;
    o.age++;
    o.lifeMs += dtMs;
    o.lastContactMs += dtMs;
    o.spawnAnim = Math.max(0, o.spawnAnim - 1);

    // flow energy accumulation: orb is "in flow" when moving but not free-falling
    const speed = Math.hypot(o.vx, o.vy);
    const inFlow = speed > 0.4 && o.lastContactMs < 250;
    if (inFlow) {
      o.flowMs += dtMs;
      o.streak++;
      o.energy = Math.min(1, o.energy + 0.0028 + speed * 0.0012);
    } else {
      o.flowMs = Math.max(0, o.flowMs - dtMs * 0.6);
      o.streak = Math.max(0, o.streak - 1);
      o.energy = Math.max(0, o.energy - 0.0014);
    }
    if (!o.blessed && o.energy > 0.72) o.blessed = true;
    if (o.blessed && o.energy < 0.35) o.blessed = false;

    // append trail point if moved enough
    pushTrail(o, state.tick);
  }
}

const TRAIL_MIN_DIST = 3;

function pushTrail(o: Orb, tick: number) {
  const last = o.trail[o.trail.length - 1];
  if (!last || (last.x - o.x) ** 2 + (last.y - o.y) ** 2 > TRAIL_MIN_DIST * TRAIL_MIN_DIST) {
    o.trail.push({
      x: o.x,
      y: o.y,
      t: tick,
      color: o.color,
      size: o.r * (0.85 + o.energy * 0.5),
    });
  }
  const cap = o.blessed ? BLESSED_TRAIL_CAP : BASE_TRAIL_CAP;
  while (o.trail.length > cap) o.trail.shift();
}

/**
 * Collide an orb against every segment of `line`. 
 * Instead of bouncing, it applies a Vector Flow force parallel to the line.
 */
function collideOrbLine(o: Orb, line: Line, tick: number): boolean {
  const pts = line.points;
  if (pts.length < 2) return false;

  let bestIdx = -1;
  let bestDist = Infinity;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-3) continue;
    let t = ((o.x - a.x) * dx + (o.y - a.y) * dy) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = a.x + t * dx;
    const cy = a.y + t * dy;
    const d2 = (o.x - cx) * (o.x - cx) + (o.y - cy) * (o.y - cy);
    if (d2 < bestDist) {
      bestDist = d2;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return false;
  
  // Influence radius of the current
  const influenceRadius = o.r + 35;
  if (bestDist > influenceRadius * influenceRadius) return false;

  const a = pts[bestIdx], b = pts[bestIdx + 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const tx = dx / len, ty = dy / len;

  // Apply flow force
  const dist = Math.sqrt(bestDist);
  const falloff = Math.max(0, 1 - (dist / influenceRadius));
  const force = 0.45 * falloff;

  o.vx += tx * force;
  o.vy += ty * force;
  
  // Dampen perpendicular velocity so orbs get sucked into the stream
  const vDotT = o.vx * tx + o.vy * ty;
  const nx = -ty, ny = tx;
  const vDotN = o.vx * nx + o.vy * ny;
  
  o.vx = tx * vDotT + nx * vDotN * 0.94;
  o.vy = ty * vDotT + ny * vDotN * 0.94;

  // ledger
  line.seg[bestIdx].traffic = Math.min(1, line.seg[bestIdx].traffic + 0.045);
  line.seg[bestIdx].lastHit = tick;
  return true;
}

/**
 * Pairwise orb collision resolution with spatial hash for efficiency.
 */
function resolveOrbCollisions(orbs: Orb[]): void {
  if (orbs.length < 2) return;
  // Spatial hash with cell size ~ 24px (~2x avg radius).
  const cell = 24;
  const grid = new Map<string, Orb[]>();
  for (const o of orbs) {
    if (o.dead) continue;
    const cx = Math.floor(o.x / cell);
    const cy = Math.floor(o.y / cell);
    const k = cx + ',' + cy;
    let bucket = grid.get(k);
    if (!bucket) { bucket = []; grid.set(k, bucket); }
    bucket.push(o);
  }
  const seen = new Set<number>();
  for (const o of orbs) {
    if (o.dead) continue;
    const cx = Math.floor(o.x / cell);
    const cy = Math.floor(o.y / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = grid.get((cx + dx) + ',' + (cy + dy));
        if (!bucket) continue;
        for (const p of bucket) {
          if (p === o || p.dead) continue;
          const key = o.id < p.id ? o.id * 1000003 + p.id : p.id * 1000003 + o.id;
          if (seen.has(key)) continue;
          seen.add(key);
          resolvePair(o, p);
        }
      }
    }
  }
}

function resolvePair(a: Orb, b: Orb): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  const minD = a.r + b.r;
  if (d2 >= minD * minD || d2 < 1e-6) return;
  const d = Math.sqrt(d2);
  const nx = dx / d, ny = dy / d;
  const overlap = minD - d;
  // resolve based on mass
  const total = a.mass + b.mass;
  const aShare = b.mass / total;
  const bShare = a.mass / total;
  a.x -= nx * overlap * aShare;
  a.y -= ny * overlap * aShare;
  b.x += nx * overlap * bShare;
  b.y += ny * overlap * bShare;

  // velocity exchange (elastic with damping)
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongN = rvx * nx + rvy * ny;
  if (velAlongN > 0) return; // moving apart already
  const restitution = 0.45;
  const j = -(1 + restitution) * velAlongN / (1 / a.mass + 1 / b.mass);
  const ix = j * nx, iy = j * ny;
  a.vx -= ix / a.mass; a.vy -= iy / a.mass;
  b.vx += ix / b.mass; b.vy += iy / b.mass;
}
