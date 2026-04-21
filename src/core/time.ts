/**
 * Fixed-timestep clock. Produces a deterministic tick count while
 * still rendering at the display's refresh rate.
 *
 * Usage:
 *   const clock = makeClock({ stepMs: 1000 / 120 });
 *   clock.advance(now, (dt) => sim(dt));
 *   render(clock.alpha);
 */
export interface Clock {
  readonly stepMs: number;
  readonly maxSubsteps: number;
  alpha: number;    // interpolation factor 0..1 for current render
  ticks: number;    // total simulation ticks executed
  elapsedMs: number;
  advance(nowMs: number, step: (dtMs: number) => void): void;
  reset(nowMs: number): void;
  setRunning(r: boolean): void;
  running: boolean;
}

export interface ClockOptions {
  stepMs?: number;
  maxSubsteps?: number;
}

export function makeClock(opts: ClockOptions = {}): Clock {
  const stepMs = opts.stepMs ?? 1000 / 120;
  const maxSubsteps = opts.maxSubsteps ?? 6;
  let last = 0;
  let acc = 0;
  let running = true;

  const clock: Clock = {
    stepMs,
    maxSubsteps,
    alpha: 0,
    ticks: 0,
    elapsedMs: 0,
    running,
    setRunning(r: boolean) {
      clock.running = r;
      running = r;
    },
    reset(nowMs: number) {
      last = nowMs;
      acc = 0;
      clock.alpha = 0;
    },
    advance(nowMs: number, step: (dtMs: number) => void) {
      if (!last) last = nowMs;
      let dt = nowMs - last;
      last = nowMs;

      if (!running) {
        acc = 0;
        clock.alpha = 0;
        return;
      }

      // cap long stalls (tab switch, etc.) so we don't spiral
      if (dt > 250) dt = 250;
      acc += dt;
      clock.elapsedMs += dt;

      let iter = 0;
      while (acc >= stepMs && iter < maxSubsteps) {
        step(stepMs);
        acc -= stepMs;
        clock.ticks++;
        iter++;
      }
      // if we blew through the substep budget, drain the remainder
      // to avoid snowballing lag without stepping too much.
      if (iter === maxSubsteps && acc > stepMs) {
        acc = stepMs;
      }
      clock.alpha = acc / stepMs;
    },
  };
  return clock;
}
