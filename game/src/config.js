// VOIDHARVEST tuning: one place for every number the game balances on, so a
// tweak here retunes the whole loop without touching the world or renderer.
export const FIELD = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const BEST_KEY = 'voidharvest-best-score';
export const MUTE_KEY = 'voidharvest-muted';

/** Palette: deep-space indigo, salvage amber, hull cyan, danger magenta. */
export const PALETTE = {
  spaceTop: '#070a18',
  spaceBottom: '#0b1030',
  nebulaAmber: 'rgba(255, 176, 66, 0.10)',
  nebulaCyan: 'rgba(64, 224, 255, 0.08)',
  nebulaMagenta: 'rgba(255, 77, 184, 0.07)',
  star: '#dfe9ff',
  hull: '#7fe7ff',
  hullDark: '#2b6f8f',
  cockpit: '#ffe9a8',
  thrust: '#ffb042',
  bolt: '#aef3ff',
  boltCore: '#ffffff',
  core: '#ffc53d',
  coreGlow: 'rgba(255, 197, 61, 0.55)',
  asteroid: '#8d7d6b',
  asteroidDark: '#5d5142',
  asteroidRim: '#d8c9ae',
  drone: '#ff5d8f',
  droneDark: '#8f2347',
  droneEye: '#ff2e63',
  elite: '#c77dff',
  enemyBolt: '#ff7ab8',
  shield: 'rgba(127, 231, 255, 0.55)',
  hudText: '#eaf6ff',
  hudDim: '#8fa8c8',
  hudGood: '#7dffb0',
  hudWarn: '#ffb042',
  hudBad: '#ff5d6c',
  cardBack: 'rgba(10, 18, 38, 0.92)',
  cardEdge: '#3d6f9e',
  cardEdgeHot: '#ffc53d',
  title: '#ffe9a8',
  subtitle: '#7fe7ff',
};

export const PLAYER = {
  radius: 20,
  accel: 620,
  maxSpeed: 340,
  drag: 0.985,
  turn: 0,
  maxHull: 100,
  maxShield: 50,
  shieldRegenPerSec: 9,
  shieldRegenDelay: 2.5,
  fireInterval: 0.16,
  boltSpeed: 640,
  boltDamage: 12,
  boltRadius: 5,
  boltLife: 0.9,
  magnetRadius: 130,
  invulnSeconds: 1.1,
  thrustParticleEvery: 0.03,
};

export const ASTEROID = {
  /** radius, hull, cores dropped, score, split count, drift speed range */
  sizes: [
    { radius: 46, hull: 30, cores: 3, score: 50, splits: 2, speed: [26, 55] },
    { radius: 28, hull: 16, cores: 2, score: 30, splits: 2, speed: [40, 80] },
    { radius: 16, hull: 8, cores: 1, score: 20, splits: 0, speed: [60, 110] },
  ],
};

export const DRONE = {
  radius: 18,
  hull: 26,
  speed: 150,
  fireInterval: 1.7,
  fireRange: 520,
  boltSpeed: 300,
  boltRadius: 6,
  boltDamage: 9,
  score: 120,
  cores: 4,
  touchDamage: 14,
};

export const ELITE = {
  radius: 30,
  hull: 90,
  speed: 120,
  fireInterval: 1.15,
  fireRange: 620,
  boltSpeed: 340,
  boltRadius: 8,
  boltDamage: 14,
  score: 400,
  cores: 8,
  touchDamage: 22,
};

export const CORE = {
  radius: 9,
  baseScore: 25,
  magnetSpeed: 420,
  driftSpeed: 26,
  lifeSeconds: 14,
};

export const COMBO = {
  windowSeconds: 3.0,
  cap: 12,
  /** score multiplier = 1 + combo * perStep */
  perStep: 0.1,
};

/** Wave N spawns this many asteroids and drones, over this many seconds. */
export function wavePlan(wave) {
  const asteroids = 4 + wave * 2;
  const drones = wave === 1 ? 0 : 1 + Math.floor(wave * 1.2);
  const elites = wave >= 3 ? Math.floor((wave - 1) / 2) : 0;
  const spawnSeconds = Math.min(6 + wave * 2, 24);
  const speedScale = 1 + (wave - 1) * 0.06;
  const hullScale = 1 + (wave - 1) * 0.12;
  return { asteroids, drones, elites, spawnSeconds, speedScale, hullScale };
}

export const UPGRADES = [
  {
    id: 'twin-coils',
    name: 'TWIN COILS',
    blurb: '+1 bolt per shot. Twice the salvage, twice the fun.',
    apply: (p) => { p.multishot += 1; },
  },
  {
    id: 'heavy-rounds',
    name: 'HEAVY ROUNDS',
    blurb: '+60% bolt damage. Asteroids crack open faster.',
    apply: (p) => { p.damage *= 1.6; },
  },
  {
    id: 'rapid-cycler',
    name: 'RAPID CYCLER',
    blurb: '+28% fire rate. Hold the trigger and hose them down.',
    apply: (p) => { p.fireInterval *= 0.78; },
  },
  {
    id: 'magnet-array',
    name: 'MAGNET ARRAY',
    blurb: '+75% pickup radius. Cores fly to you from afar.',
    apply: (p) => { p.magnetRadius *= 1.75; },
  },
  {
    id: 'ablative-plating',
    name: 'ABLATIVE PLATING',
    blurb: '+40 max hull and repair 40 hull now.',
    apply: (p) => { p.maxHull += 40; p.hull = Math.min(p.maxHull, p.hull + 40); },
  },
  {
    id: 'shield-capacitor',
    name: 'SHIELD CAPACITOR',
    blurb: '+35 max shield and faster shield recharge.',
    apply: (p) => { p.maxShield += 35; p.shield = p.maxShield; p.shieldRegen += 5; },
  },
  {
    id: 'ion-thrusters',
    name: 'ION THRUSTERS',
    blurb: '+25% thrust and top speed. Outrun anything.',
    apply: (p) => { p.accel *= 1.25; p.maxSpeed *= 1.25; },
  },
  {
    id: 'salvage-processor',
    name: 'SALVAGE PROCESSOR',
    blurb: 'Cores are worth +50% score. Get rich or drift trying.',
    apply: (p) => { p.coreValue *= 1.5; },
  },
];
