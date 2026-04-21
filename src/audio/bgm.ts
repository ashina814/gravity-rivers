import type { AudioEngine } from './audio';

/**
 * Ambient procedural BGM — two slowly-drifting detuned pads, a sub
 * drone, and a low-rate blip arpeggio that intensifies with flow.
 *
 * Everything is a single OscillatorNode chain so we don't fight
 * iOS audio restrictions. Start() is invoked after first user gesture.
 */
export interface BgmHandle {
  start(): void;
  stop(): void;
  setIntensity(v: number): void;
  setMuted(m: boolean): void;
}

export function makeBgm(engine: AudioEngine): BgmHandle {
  let started = false;
  let muted = false;
  let intensity = 0;
  let intensityTarget = 0;

  let masterGain: GainNode | null = null;
  let padOsc: OscillatorNode[] = [];
  let subOsc: OscillatorNode | null = null;
  let arpOsc: OscillatorNode | null = null;
  let arpGain: GainNode | null = null;
  let lfo: OscillatorNode | null = null;
  let rafToken = 0;

  const padNotes = [110, 164.81, 207.65, 246.94]; // A2, E3, G#3, B3 (tensionful minor-ish)
  const arpSeq = [0, 4, 7, 11, 7, 4, 0, -2]; // semitone offsets over a base
  let arpStep = 0;
  let arpLastT = 0;

  function start(): void {
    if (started) return;
    if (!engine.ensure() || !engine.ctx || !engine.master) return;
    const ctx = engine.ctx;
    const t = ctx.currentTime;
    started = true;

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0;
    masterGain.connect(engine.master);

    // Sub drone
    subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 55;
    const subG = ctx.createGain();
    subG.gain.value = 0.15;
    subOsc.connect(subG);
    subG.connect(masterGain);
    subOsc.start(t);

    // LFO modulating pad filter
    lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 380;
    lfo.connect(lfoG);

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.Q.value = 0.8;
    lfoG.connect(padFilter.frequency);
    padFilter.connect(masterGain);
    lfo.start(t);

    // Pads: triangle oscillators per note, detuned pairs
    for (const n of padNotes) {
      const a = ctx.createOscillator();
      const b = ctx.createOscillator();
      a.type = 'triangle';
      b.type = 'triangle';
      a.frequency.value = n;
      b.frequency.value = n * 1.0065;
      const g = ctx.createGain();
      g.gain.value = 0.08;
      a.connect(g);
      b.connect(g);
      g.connect(padFilter);
      a.start(t);
      b.start(t);
      padOsc.push(a, b);
    }

    // Arp oscillator (gated by updateArp loop)
    arpOsc = ctx.createOscillator();
    arpGain = ctx.createGain();
    arpGain.gain.value = 0.0;
    arpOsc.type = 'square';
    arpOsc.frequency.value = 440;
    const arpFilter = ctx.createBiquadFilter();
    arpFilter.type = 'highpass';
    arpFilter.frequency.value = 400;
    arpOsc.connect(arpGain);
    arpGain.connect(arpFilter);
    arpFilter.connect(masterGain);
    arpOsc.start(t);

    // Tick loop
    arpLastT = performance.now();
    loop();
  }

  function stop(): void {
    started = false;
    cancelAnimationFrame(rafToken);
    try {
      padOsc.forEach((o) => { try { o.stop(); } catch {} });
      subOsc?.stop();
      arpOsc?.stop();
      lfo?.stop();
    } catch {}
    padOsc = [];
    subOsc = null;
    arpOsc = null;
    arpGain = null;
    lfo = null;
    masterGain?.disconnect();
    masterGain = null;
  }

  function setIntensity(v: number): void {
    intensityTarget = Math.max(0, Math.min(1, v));
  }

  function setMuted(m: boolean): void {
    muted = m;
  }

  function loop(): void {
    if (!started || !engine.ctx || !masterGain || !arpOsc || !arpGain) return;
    intensity += (intensityTarget - intensity) * 0.05;
    const ctx = engine.ctx;
    const tc = ctx.currentTime;
    // Smoothly interpolate master toward the current intensity (capped).
    // When muted, keep gain at 0 regardless.
    const target = muted ? 0.0 : 0.35 + intensity * 0.35;
    masterGain.gain.setTargetAtTime(target, tc, 0.35);

    // Arp: step at ~ 3.5 Hz * intensity + base 0.4 Hz
    const now = performance.now();
    const rate = 0.4 + intensity * 3.3;
    const interval = 1000 / rate;
    if (now - arpLastT > interval) {
      arpLastT = now;
      arpStep = (arpStep + 1) % arpSeq.length;
      const semis = arpSeq[arpStep];
      // Base follows pad root, octaves up
      const base = 220;
      const freq = base * Math.pow(2, semis / 12) * 2;
      arpOsc.frequency.setTargetAtTime(freq, tc, 0.005);
      // Short envelope
      arpGain.gain.cancelScheduledValues(tc);
      arpGain.gain.setValueAtTime(0, tc);
      const peak = (0.02 + intensity * 0.05) * (muted ? 0 : 1);
      arpGain.gain.linearRampToValueAtTime(peak, tc + 0.005);
      arpGain.gain.exponentialRampToValueAtTime(0.0001, tc + 0.2);
    }

    rafToken = requestAnimationFrame(loop);
  }

  return { start, stop, setIntensity, setMuted };
}
