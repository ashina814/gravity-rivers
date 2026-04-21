/**
 * Thin wrapper around Web Audio so the rest of the codebase can
 * fire-and-forget sound without caring about AudioContext lifecycle.
 */
export interface AudioEngine {
  ctx: AudioContext | null;
  master: GainNode | null;
  ready: boolean;
  ensure(): boolean;
  setVolume(v: number): void;
  setSuspended(s: boolean): void;
}

export function makeAudioEngine(): AudioEngine {
  const engine: AudioEngine = {
    ctx: null,
    master: null,
    ready: false,
    ensure,
    setVolume,
    setSuspended,
  };

  function ensure(): boolean {
    if (engine.ready) return true;
    const AC: typeof AudioContext | undefined =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return false;
    try {
      engine.ctx = new AC();
      const master = engine.ctx.createGain();
      master.gain.value = 0.55;
      master.connect(engine.ctx.destination);
      engine.master = master;
      engine.ready = true;
    } catch {
      engine.ctx = null;
      engine.ready = false;
      return false;
    }
    return true;
  }

  function setVolume(v: number) {
    if (!engine.master || !engine.ctx) return;
    const tc = engine.ctx.currentTime;
    engine.master.gain.cancelScheduledValues(tc);
    engine.master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, v)), tc + 0.12);
  }

  function setSuspended(s: boolean) {
    if (!engine.ctx) return;
    if (s && engine.ctx.state === 'running') engine.ctx.suspend().catch(() => {});
    else if (!s && engine.ctx.state !== 'running') engine.ctx.resume().catch(() => {});
  }

  return engine;
}

/** Convenience: current sample time or 0 if no ctx. */
export function now(engine: AudioEngine): number {
  return engine.ctx?.currentTime ?? 0;
}
