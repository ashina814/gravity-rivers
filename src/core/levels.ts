export interface SpawnerDef {
  rx: number; // relative x (0..1)
  ry: number; // relative y (0..1)
  rate: number; // spawns per frame
}

export interface GoalDef {
  rx: number;
  ry: number;
  rr: number; // relative radius based on min(w, h)
  required: number; // number of orbs to clear
}

export interface ObstacleDef {
  rx: number;
  ry: number;
  rw: number;
  rh: number;
}

export interface LevelDef {
  name: string;
  maxInk: number; // Maximum length of line points allowed
  spawners: SpawnerDef[];
  goal: GoalDef;
  obstacles: ObstacleDef[];
}

export const LEVELS: LevelDef[] = [
  {
    name: "LEVEL 1: GO WITH THE FLOW",
    maxInk: 1500,
    spawners: [{ rx: 0.2, ry: 0.1, rate: 0.2 }],
    goal: { rx: 0.8, ry: 0.8, rr: 0.12, required: 50 },
    obstacles: [
      { rx: 0.4, ry: 0.4, rw: 0.2, rh: 0.05 } // central blocker
    ]
  },
  {
    name: "LEVEL 2: SPLIT DECISION",
    maxInk: 2000,
    spawners: [{ rx: 0.5, ry: 0.1, rate: 0.25 }],
    goal: { rx: 0.5, ry: 0.85, rr: 0.1, required: 80 },
    obstacles: [
      { rx: 0.2, ry: 0.4, rw: 0.6, rh: 0.04 }, // large horizontal wall
      { rx: 0.45, ry: 0.44, rw: 0.1, rh: 0.2 } // pillar blocking the middle
    ]
  },
  {
    name: "LEVEL 3: VORTEX MAZE",
    maxInk: 2500,
    spawners: [{ rx: 0.1, ry: 0.1, rate: 0.2 }],
    goal: { rx: 0.9, ry: 0.1, rr: 0.1, required: 60 },
    obstacles: [
      { rx: 0.0, ry: 0.3, rw: 0.7, rh: 0.05 },
      { rx: 0.3, ry: 0.6, rw: 0.7, rh: 0.05 }
    ]
  }
];
