import { AudioEngine, now } from './audio';

/**
 * One-shot procedural sound effects. Kept short & subtle so they
 * layer nicely over the ambient BGM.
 */

export function sfxBoot(engine: AudioEngine): void {
  if (!engine.ensure() || !engine.ctx || !engine.master) return;
  const ctx = engine.ctx;
  const t = now(engine);

  // Deep metallic impact
  const o1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  o1.type = 'square';
  o1.frequency.setValueAtTime(80, t);
  o1.frequency.exponentialRampToValueAtTime(10, t + 0.5);
  g1.gain.setValueAtTime(0, t);
  g1.gain.linearRampToValueAtTime(0.6, t + 0.05);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
  o1.connect(g1);
  g1.connect(engine.master);
  o1.start(t);
  o1.stop(t + 2.1);

  // High metallic shimmer (brass gears spinning up)
  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.type = 'triangle';
  o2.frequency.setValueAtTime(800, t);
  o2.frequency.linearRampToValueAtTime(1600, t + 1.5);
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(0.2, t + 0.1);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  o2.connect(g2);
  g2.connect(engine.master);
  o2.start(t);
  o2.stop(t + 1.6);
  
  // Noise burst (steam venting)
  const bufferSize = ctx.sampleRate * 2;
  const noise = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(400, t);
  f.frequency.linearRampToValueAtTime(3000, t + 1.5);
  const g3 = ctx.createGain();
  g3.gain.setValueAtTime(0, t);
  g3.gain.linearRampToValueAtTime(0.4, t + 0.1);
  g3.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
  src.connect(f);
  f.connect(g3);
  g3.connect(engine.master);
  src.start(t);
  src.stop(t + 2.0);
}

export function sfxSpawn(engine: AudioEngine, colorHue: number = 0.5): void {
  if (!engine.ensure() || !engine.ctx || !engine.master) return;
  const ctx = engine.ctx;
  const t = now(engine);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  const freq = 380 + colorHue * 220;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.12);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g);
  g.connect(engine.master);
  o.start(t);
  o.stop(t + 0.2);
}

export function sfxContact(engine: AudioEngine, energy: number): void {
  if (!engine.ensure() || !engine.ctx || !engine.master) return;
  const ctx = engine.ctx;
  const t = now(engine);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  const freq = 620 + energy * 700;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.012 + energy * 0.015, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g);
  g.connect(engine.master);
  o.start(t);
  o.stop(t + 0.08);
}

export function sfxDraw(engine: AudioEngine, pitch: number): void {
  if (!engine.ensure() || !engine.ctx || !engine.master) return;
  const ctx = engine.ctx;
  const t = now(engine);
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(220 + pitch * 600, t);
  f.type = 'lowpass';
  f.frequency.value = 1500;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.02, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(f);
  f.connect(g);
  g.connect(engine.master);
  o.start(t);
  o.stop(t + 0.1);
}

export function sfxErase(engine: AudioEngine): void {
  if (!engine.ensure() || !engine.ctx || !engine.master) return;
  const ctx = engine.ctx;
  const t = now(engine);
  const bufferSize = 2048;
  const noise = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  src.connect(f);
  f.connect(g);
  g.connect(engine.master);
  src.start(t);
  src.stop(t + 0.09);
}

/**
 * BLOOM chord — triad stack tuned to chain index so later blooms
 * feel more anthemic.
 */
export function sfxBloom(engine: AudioEngine, chain: number): void {
  if (!engine.ensure() || !engine.ctx || !engine.master) return;
  const ctx = engine.ctx;
  const t = now(engine);
  // Pentatonic-ish stack, key rises slightly with chain
  const base = 220 * Math.pow(1.05946, Math.min(12, chain - 1));
  const intervals = [1.0, 1.25, 1.5, 2.0, 2.5];
  const total = ctx.createGain();
  total.gain.setValueAtTime(0.0, t);
  total.gain.linearRampToValueAtTime(0.14, t + 0.02);
  total.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  total.connect(engine.master);

  for (const mult of intervals) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(base * mult, t);
    o.frequency.linearRampToValueAtTime(base * mult * 1.015, t + 1.2);
    const g = ctx.createGain();
    g.gain.value = 0.2;
    o.connect(g);
    g.connect(total);
    o.start(t);
    o.stop(t + 1.5);
  }

  // Sparkle: high square arp
  for (let i = 0; i < 4; i++) {
    const oo = ctx.createOscillator();
    const gg = ctx.createGain();
    oo.type = 'square';
    oo.frequency.setValueAtTime(base * 4 * (1 + i * 0.25), t + i * 0.03);
    gg.gain.setValueAtTime(0, t + i * 0.03);
    gg.gain.linearRampToValueAtTime(0.03, t + i * 0.03 + 0.005);
    gg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + 0.18);
    oo.connect(gg);
    gg.connect(engine.master);
    oo.start(t + i * 0.03);
    oo.stop(t + i * 0.03 + 0.2);
  }
}

/**
 * UI tick for HUD clicks etc.
 */
export function sfxClick(engine: AudioEngine): void {
  if (!engine.ensure() || !engine.ctx || !engine.master) return;
  const ctx = engine.ctx;
  const t = now(engine);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(900, t);
  o.frequency.exponentialRampToValueAtTime(500, t + 0.04);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.025, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g);
  g.connect(engine.master);
  o.start(t);
  o.stop(t + 0.06);
}
