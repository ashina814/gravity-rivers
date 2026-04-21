/**
 * Small, dependency-free Mulberry32 PRNG so we can
 * seed experiments and keep particle noise deterministic.
 */
export interface Rng {
  (): number;
  int(lo: number, hi: number): number;
  range(lo: number, hi: number): number;
  pick<T>(arr: T[]): T;
  seed(n: number): void;
}

export function makeRng(seed: number = (Math.random() * 0xffffffff) | 0): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = next as Rng;
  rng.int = (lo, hi) => Math.floor(lo + next() * (hi - lo));
  rng.range = (lo, hi) => lo + next() * (hi - lo);
  rng.pick = (arr) => arr[Math.floor(next() * arr.length) % arr.length];
  rng.seed = (n) => { state = (n >>> 0); };
  return rng;
}

export const defaultRng: Rng = makeRng();
