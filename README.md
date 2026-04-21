# Gravity Rivers

> **A neon CRT visual toy.** Draw lines on the canvas — they become rivers of
> gravity. Orbs fall through them. Guide the flow. There is no score.
> There is no lose. Make it beautiful.

![status](https://img.shields.io/badge/status-research_preview-ff2d96)
![stack](https://img.shields.io/badge/stack-Vite_%2B_TypeScript-00f0ff)
![license](https://img.shields.io/badge/license-MIT-fff04f)

Gravity Rivers is a single-page, no-backend, no-assets WebGL-free toy. The
entire experience — physics, audio, rendering, UI — fits in one bundle.

The aesthetic leans into a neon-CRT-TAJIMANIA register: scanlines, chromatic
glow, chiptune pads, and a generous amount of bloom. The simulation is tuned
for long sessions: there is no fail state, only escalating moments of
beautiful chaos.

---

## Core idea

1. Orbs spawn continuously from a fountain at the top of the screen.
2. You draw lines anywhere on the canvas with the mouse or a finger.
3. Each line becomes a channel of gravity — orbs slide, pool, and cascade
   along it, complete with tangent-aware friction, traffic-reactive glow,
   and rainbow trails when they reach high flow energy.
4. The more orbs are in steady, fluid motion across your rivers, the higher
   the **FLOW** meter climbs. When it overflows, a **BLOOM** event fires:
   the screen flashes, a chord resolves, and a name escalates with every
   chained bloom (`BLOOM → CASCADE → STREAM → SURGE → TORRENT → NOVA FLOW …`).

The whole loop is a satisfaction generator. Keep the rivers alive and the
names keep rising.

---

## Controls

| Key / Click         | Action                                                  |
| ------------------- | ------------------------------------------------------- |
| **Mouse / touch**   | Drag to draw a line, release to commit it as a river    |
| **Right click**     | Always erases while held                                |
| <kbd>D</kbd>        | Switch to the draw tool                                 |
| <kbd>E</kbd>        | Switch to the eraser                                    |
| <kbd>C</kbd>        | Clear all lines                                         |
| <kbd>S</kbd>        | Download a PNG snapshot of the canvas                   |
| <kbd>Space</kbd>    | Pause / resume                                          |
| <kbd>,</kbd>        | Toggle settings panel                                   |
| <kbd>F</kbd>        | Toggle fullscreen                                       |
| <kbd>Enter</kbd>    | Dismiss the splash screen                               |

Everything you can tune lives in the settings panel: spawn rate, gravity,
line life, trail glow, palette (`NEON / CANDY / LAVA / OCEAN / MONO`),
volume, BGM on/off, CRT post-fx, bloom post-fx. Settings persist to
`localStorage`.

---

## Quick start

```bash
# install
npm install

# dev server with hot reload
npm run dev

# production build (type-check + vite build)
npm run build

# locally preview the production build
npm run preview
```

The project is written in strict TypeScript. `npm run build` runs `tsc
--noEmit` before the bundler so type errors fail the build.

---

## Deploy to GitHub Pages

The `vite.config.ts` sets `base: './'` so the same `dist/` build can be
served from any sub-path (project pages, custom domains, itch.io, etc.).

### One-time setup

1. Push this repo to GitHub.
2. In the repo settings → Pages, pick **Source: GitHub Actions**.

### Workflow

Drop the following file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Push to `main` and the site is live at `https://<user>.github.io/<repo>/`.

---

## Architecture

```
src/
├── main.ts                  # entry — wires every subsystem together
├── style.css                # neon-CRT stylesheet (single file)
│
├── core/
│   ├── app.ts               # fixed-timestep loop + bloom trigger
│   ├── state.ts             # world state shape
│   └── time.ts              # clock primitive (alpha, substeps)
│
├── sim/
│   ├── balls.ts             # orb model + trail cap / recycling
│   ├── lines.ts             # smoothing, resampling, welding, erase
│   ├── spawn.ts             # fountain rate curve + color cursor
│   ├── physics.ts           # semi-implicit Euler, line tangent, pair resolve
│   └── flow.ts              # FLOW meter, charge integration, bloom names
│
├── render/
│   ├── canvas.ts            # DPR-aware canvas wrapper
│   ├── scene.ts             # render pipeline orchestrator
│   ├── background.ts        # gradient wash, spawn halo, horizon
│   ├── spawner.ts           # top fountain glow
│   ├── lines.ts             # multi-pass neon line renderer (traffic tint)
│   ├── trails.ts            # per-orb streak with blessed rainbow
│   ├── balls.ts             # orb body, rim, aura, sparkles
│   ├── fx.ts                # particles / flashes / shockrings / popups
│   ├── particles.ts         # data shapes for the above
│   └── postfx.ts            # scanlines, chromatic, bloom wash, vignette
│
├── audio/
│   ├── audio.ts             # AudioContext lifecycle wrapper
│   ├── sfx.ts               # one-shot procedural synths
│   └── bgm.ts               # ambient pad + sub + arp drum with LFO
│
├── input/
│   ├── drawing.ts           # pointer events, stroke smoothing, erase
│   └── keyboard.ts          # keymap + event bus
│
├── ui/
│   ├── hud.ts               # flow meter, bloom banner, stats
│   ├── panel.ts             # settings panel bindings (persisted)
│   ├── dock.ts              # left-side tool dock bindings
│   ├── splash.ts            # welcome screen lifecycle
│   └── snap.ts              # canvas → PNG download
│
├── config/
│   ├── palette.ts           # 5 palettes × 6 colors each
│   └── settings.ts          # Settings shape + localStorage
│
└── utils/
    ├── math.ts              # TAU, clamp, lerp, project, …
    ├── color.ts             # hex/rgb/hsl/mix/shade
    ├── easing.ts            # small easing library
    └── rand.ts              # Mulberry32 PRNG
```

### Frame pipeline

```
   ┌────────────┐   fixed step (120 Hz)
   │  main.ts   ├─────────────────────────┐
   └─────┬──────┘                         ▼
         │                          ┌────────────┐
         │                          │  sim step  │  ← spawn → physics → flow → bloom
         ▼                          └────────────┘
   ┌────────────┐
   │   render   │  per display frame
   │   scene    │  background → spawner → trails → lines → orbs → fx → post
   └─────┬──────┘
         ▼
   ┌────────────┐
   │    HUD     │  flow meter, bloom count, orb count, banner
   └────────────┘
```

The sim ticks at a fixed 120 Hz rate through `core/time.ts`, while the
renderer follows the display's refresh rate. Bloom thresholds scale with
chain index so sustained play produces deepening crescendos, not noise.

---

## Performance notes

- Cap: 220 simultaneous orbs. Spatial hash on pairwise collisions.
- Trail points capped per orb (18 normal / 42 blessed).
- Line commit runs Chaikin smoothing + resampling at commit time, so the
  renderer only traverses fixed poly-lines per frame — no per-frame curve
  recomputation.
- DPR clamped to 2 so high-PPI displays don't eat the GPU.
- Post-fx (scanlines, bloom wash) are cheap 2D fills; the whole stack
  holds 60 fps on integrated graphics at 1440p in testing.

---

## Credits & inspiration

Gravity Rivers is a deliberate mashup of:

- [Line Rider](https://www.linerider.com/) — draw-line-then-watch-physics.
- [Magic Pen](https://armorgames.com/play/2013/magic-pen) — the original
  "your lines ARE the puzzle" toy.
- [スイカゲーム](https://www.nintendo.com/jp/switch/aucma/) — satisfying
  chained flow dopamine.
- [TAJIMANIA](https://tajimania.netlify.app/) — neon CRT fever aesthetic.
- [patatap](https://patatap.com/) — tiny procedural audio reactivity.

Built with [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/).
No runtime dependencies.

---

## License

MIT. See [LICENSE](./LICENSE).
