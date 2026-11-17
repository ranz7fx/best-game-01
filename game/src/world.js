// VOIDHARVEST world: every rule of the game lives here and nowhere else.
// The renderer only paints this state; the input only feeds it a command
// { thrust, aimX, aimY, firing } each fixed step. That split is what lets the
// screenshot stager replay the real rules with an autopilot instead of a human.
import {
  ASTEROID, COMBO, CORE, DRONE, ELITE, FIELD, PALETTE, PLAYER, STEP,
  UPGRADES, wavePlan,
} from './config.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'playing';
export const PHASE_UPGRADE = 'upgrade';
export const PHASE_OVER = 'over';
export const PHASE_PAUSED = 'paused';

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function makeStars(random) {
  const stars = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const count = [70, 45, 25][layer];
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: random.range(0, FIELD.width),
        y: random.range(0, FIELD.height),
        layer,
        size: random.range(0.6, 1.4 + layer * 0.5),
        twinkle: random.range(0, TAU),
      });
    }
  }
  return stars;
}

function makeNebulae(random) {
  const spots = [
    { x: 0.2, y: 0.25, r: 320, color: PALETTE.nebulaAmber },
    { x: 0.85, y: 0.2, r: 300, color: PALETTE.nebulaCyan },
    { x: 0.6, y: 0.8, r: 360, color: PALETTE.nebulaMagenta },
    { x: 0.1, y: 0.85, r: 260, color: PALETTE.nebulaCyan },
    { x: 0.5, y: 0.45, r: 240, color: PALETTE.nebulaAmber },
  ];
  return spots.map((s) => ({
    x: s.x * FIELD.width + random.range(-40, 40),
    y: s.y * FIELD.height + random.range(-40, 40),
    r: s.r,
    color: s.color,
  }));
}

function makePlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hull: PLAYER.maxHull,
    maxHull: PLAYER.maxHull,
    shield: PLAYER.maxShield,
    maxShield: PLAYER.maxShield,
    shieldRegen: PLAYER.shieldRegenPerSec,
    shieldTimer: 0,
    fireTimer: 0,
    fireInterval: PLAYER.fireInterval,
    damage: PLAYER.boltDamage,
    multishot: 1,
    boltSpeed: PLAYER.boltSpeed,
    magnetRadius: PLAYER.magnetRadius,
    accel: PLAYER.accel,
    maxSpeed: PLAYER.maxSpeed,
    coreValue: 1,
    invuln: 0,
    thrustFx: 0,
    alive: true,
  };
}

export function createWorld(random) {
  const state = {
    random,
    phase: PHASE_TITLE,
    time: 0,
    score: 0,
    cores: 0,
    combo: 0,
    comboTimer: 0,
    wave: 0,
    best: 0,
    player: makePlayer(),
    asteroids: [],
    drones: [],
    bolts: [],
    enemyBolts: [],
    pickups: [],
    particles: [],
    floaters: [],
    stars: makeStars(random),
    nebulae: makeNebulae(random),
    spawnQueue: { asteroids: 0, drones: 0, elites: 0, timer: 0, interval: 1 },
    draft: [],
    stats: { kills: 0, collected: 0, shots: 0, hits: 0 },
    shake: 0,
    flash: 0,
    waveBanner: 0,
    hintTimer: 12,
    runTime: 0,
  };
  // Attract mode behind the title: a few slow rocks drifting by.
  for (let i = 0; i < 5; i += 1) spawnAsteroid(state, 2, true);
  return state;
}

export function enemiesLeft(state) {
  const q = state.spawnQueue;
  return q.asteroids + q.drones + q.elites + state.asteroids.length + state.drones.length;
}

function edgeSpawn(state, minPlayerDist) {
  const p = state.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const side = state.random.int(0, 3);
    let x;
    let y;
    if (side === 0) { x = state.random.range(0, FIELD.width); y = -60; }
    else if (side === 1) { x = FIELD.width + 60; y = state.random.range(0, FIELD.height); }
    else if (side === 2) { x = state.random.range(0, FIELD.width); y = FIELD.height + 60; }
    else { x = -60; y = state.random.range(0, FIELD.height); }
    if (dist2(x, y, p.x, p.y) > minPlayerDist * minPlayerDist) return { x, y };
  }
  return { x: 60, y: 60 };
}

function rockShape(random, radius) {
  const points = [];
  const n = 9;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU;
    points.push({ a, r: radius * random.range(0.72, 1.08) });
  }
  return points;
}

export function spawnAsteroid(state, size, anywhere = false) {
  const plan = state.random;
  const def = ASTEROID.sizes[size];
  const pos = anywhere
    ? { x: plan.range(80, FIELD.width - 80), y: plan.range(80, FIELD.height - 80) }
    : edgeSpawn(state, 320);
  const angle = plan.range(0, TAU);
  const speed = plan.range(def.speed[0], def.speed[1]);
  state.asteroids.push({
    size,
    x: pos.x,
    y: pos.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: def.radius,
    hull: def.hull,
    maxHull: def.hull,
    rot: plan.range(0, TAU),
    rotSpeed: plan.range(-0.9, 0.9),
    shape: rockShape(plan, def.radius),
    flash: 0,
  });
}

function spawnDrone(state, elite) {
  const def = elite ? ELITE : DRONE;
  const pos = edgeSpawn(state, 380);
  const plan = wavePlan(state.wave);
  state.drones.push({
    elite,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: def.radius,
    hull: Math.round(def.hull * plan.hullScale),
    maxHull: Math.round(def.hull * plan.hullScale),
    speed: def.speed * plan.speedScale,
    fireTimer: state.random.range(0.8, 1.8),
    flash: 0,
  });
}

function spawnPickup(state, x, y, value) {
  const a = state.random.range(0, TAU);
  const speed = state.random.range(20, 70);
  state.pickups.push({
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    radius: CORE.radius,
    value,
    life: CORE.lifeSeconds,
    spin: state.random.range(0, TAU),
  });
}

function burst(state, x, y, color, count, speed, size, life) {
  for (let i = 0; i < count; i += 1) {
    const a = state.random.range(0, TAU);
    const v = state.random.range(speed * 0.3, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: state.random.range(life * 0.5, life),
      maxLife: life,
      size: state.random.range(size * 0.5, size),
      color,
      drag: 0.94,
    });
  }
}

function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function addScore(state, base, x, y) {
  const mult = 1 + state.combo * COMBO.perStep;
  const gained = Math.round(base * mult);
  state.score += gained;
  if (x !== undefined) addFloater(state, x, y, `+${gained}`, '#ffe9a8');
  return gained;
}

function bumpCombo(state) {
  state.combo = state.comboTimer > 0 ? Math.min(COMBO.cap, state.combo + 1) : 1;
  state.comboTimer = COMBO.windowSeconds;
}

function beginWave(state) {
  const plan = wavePlan(state.wave);
  state.spawnQueue = {
    asteroids: plan.asteroids,
    drones: plan.drones,
    elites: plan.elites,
    timer: 0.5,
    interval: plan.spawnSeconds / Math.max(1, plan.asteroids + plan.drones + plan.elites),
  };
  state.waveBanner = 2.4;
}

export function startRun(state) {
  state.player = makePlayer();
  state.asteroids = [];
  state.drones = [];
  state.bolts = [];
  state.enemyBolts = [];
  state.pickups = [];
  state.particles = [];
  state.floaters = [];
  state.score = 0;
  state.cores = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.wave = 1;
  state.stats = { kills: 0, collected: 0, shots: 0, hits: 0 };
  state.shake = 0;
  state.flash = 0;
  state.hintTimer = 12;
  state.runTime = 0;
  state.phase = PHASE_PLAY;
  beginWave(state);
}

export function offerDraft(state) {
  const pool = [...UPGRADES];
  const draft = [];
  while (draft.length < 3 && pool.length > 0) {
    const i = Math.floor(state.random.next() * pool.length);
    draft.push(pool.splice(i, 1)[0]);
  }
  state.draft = draft;
  state.phase = PHASE_UPGRADE;
}

export function applyUpgrade(state, index) {
  const up = state.draft[index];
  if (!up) return false;
  up.apply(state.player);
  state.draft = [];
  state.wave += 1;
  state.phase = PHASE_PLAY;
  beginWave(state);
  return true;
}

function damagePlayer(state, amount, sx, sy) {
  const p = state.player;
  if (!p.alive || p.invuln > 0) return [];
  let rest = amount;
  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, rest);
    p.shield -= absorbed;
    rest -= absorbed;
  }
  p.hull -= rest;
  p.shieldTimer = PLAYER.shieldRegenDelay;
  p.invuln = PLAYER.invulnSeconds;
  const events = [{ type: 'hurt' }];
  state.shake = Math.min(16, state.shake + 7);
  state.flash = 0.25;
  burst(state, p.x, p.y, '#ff5d6c', 14, 260, 4, 0.5);
  if (sx !== undefined) {
    const dx = p.x - sx;
    const dy = p.y - sy;
    const d = Math.hypot(dx, dy) || 1;
    p.vx += (dx / d) * 260;
    p.vy += (dy / d) * 260;
  }
  if (p.hull <= 0) {
    p.hull = 0;
    p.alive = false;
    burst(state, p.x, p.y, PALETTE.hull, 60, 420, 5, 1.1);
    burst(state, p.x, p.y, PALETTE.thrust, 40, 300, 4, 0.9);
    state.shake = 20;
    state.flash = 0.6;
    state.phase = PHASE_OVER;
    events.push({ type: 'gameover' });
  }
  return events;
}

function destroyAsteroid(state, index) {
  const rock = state.asteroids[index];
  const def = ASTEROID.sizes[rock.size];
  state.asteroids.splice(index, 1);
  burst(state, rock.x, rock.y, PALETTE.asteroidRim, 18, 260, 4, 0.7);
  burst(state, rock.x, rock.y, '#ffb042', 10, 200, 3, 0.5);
  state.shake = Math.min(14, state.shake + (rock.size === 0 ? 4 : 2));
  bumpCombo(state);
  state.stats.kills += 1;
  addScore(state, def.score, rock.x, rock.y);
  for (let i = 0; i < def.cores; i += 1) spawnPickup(state, rock.x, rock.y, CORE.baseScore);
  if (def.splits > 0) {
    for (let i = 0; i < def.splits; i += 1) {
      const a = state.random.range(0, TAU);
      const speed = state.random.range(70, 130);
      const nextDef = ASTEROID.sizes[rock.size + 1];
      state.asteroids.push({
        size: rock.size + 1,
        x: rock.x,
        y: rock.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: nextDef.radius,
        hull: nextDef.hull,
        maxHull: nextDef.hull,
        rot: state.random.range(0, TAU),
        rotSpeed: state.random.range(-1.4, 1.4),
        shape: rockShape(state.random, nextDef.radius),
        flash: 0,
      });
    }
  }
  return [{ type: 'explode', big: rock.size === 0 }];
}

function destroyDrone(state, index) {
  const drone = state.drones[index];
  const def = drone.elite ? ELITE : DRONE;
  state.drones.splice(index, 1);
  burst(state, drone.x, drone.y, PALETTE.drone, 26, 320, 4, 0.8);
  burst(state, drone.x, drone.y, '#ffffff', 10, 200, 3, 0.4);
  state.shake = Math.min(14, state.shake + (drone.elite ? 6 : 3));
  bumpCombo(state);
  state.stats.kills += 1;
  addScore(state, def.score, drone.x, drone.y);
  for (let i = 0; i < def.cores; i += 1) spawnPickup(state, drone.x, drone.y, CORE.baseScore);
  return [{ type: 'explode', big: drone.elite }];
}

function firePlayerBolt(state) {
  const p = state.player;
  const n = p.multishot;
  for (let i = 0; i < n; i += 1) {
    const off = (i - (n - 1) / 2) * 0.09;
    const a = p.angle + off;
    state.bolts.push({
      x: p.x + Math.cos(a) * (p.radius + 6),
      y: p.y + Math.sin(a) * (p.radius + 6),
      vx: Math.cos(a) * p.boltSpeed + p.vx * 0.4,
      vy: Math.sin(a) * p.boltSpeed + p.vy * 0.4,
      radius: PLAYER.boltRadius,
      damage: p.damage,
      life: PLAYER.boltLife,
    });
  }
  state.stats.shots += n;
  burst(state, p.x + Math.cos(p.angle) * (p.radius + 4), p.y + Math.sin(p.angle) * (p.radius + 4), PALETTE.bolt, 3, 120, 2, 0.15);
}

function stepSpawning(state, dt) {
  const q = state.spawnQueue;
  const total = q.asteroids + q.drones + q.elites;
  if (total <= 0) return;
  q.timer -= dt;
  if (q.timer > 0) return;
  q.timer = q.interval;
  const roll = state.random.next();
  const weights = [q.asteroids, q.drones, q.elites];
  const sum = weights[0] + weights[1] + weights[2];
  const pick = roll * sum;
  if (pick < weights[0]) {
    q.asteroids -= 1;
    spawnAsteroid(state, state.random.chance(0.55) ? 0 : 1);
  } else if (pick < weights[0] + weights[1]) {
    q.drones -= 1;
    spawnDrone(state, false);
  } else {
    q.elites -= 1;
    spawnDrone(state, true);
  }
}

function stepPlayer(state, dt, cmd) {
  const p = state.player;
  if (!p.alive) return [];
  p.angle = Math.atan2(cmd.aimY - p.y, cmd.aimX - p.x);
  p.vx += cmd.thrust.x * p.accel * dt;
  p.vy += cmd.thrust.y * p.accel * dt;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > p.maxSpeed) {
    p.vx = (p.vx / speed) * p.maxSpeed;
    p.vy = (p.vy / speed) * p.maxSpeed;
  }
  p.vx *= Math.pow(PLAYER.drag, dt * 60);
  p.vy *= Math.pow(PLAYER.drag, dt * 60);
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.x < p.radius) { p.x = p.radius; p.vx = Math.abs(p.vx) * 0.4; }
  if (p.x > FIELD.width - p.radius) { p.x = FIELD.width - p.radius; p.vx = -Math.abs(p.vx) * 0.4; }
  if (p.y < p.radius) { p.y = p.radius; p.vy = Math.abs(p.vy) * 0.4; }
  if (p.y > FIELD.height - p.radius) { p.y = FIELD.height - p.radius; p.vy = -Math.abs(p.vy) * 0.4; }
  p.invuln = Math.max(0, p.invuln - dt);
  p.shieldTimer = Math.max(0, p.shieldTimer - dt);
  if (p.shieldTimer <= 0 && p.shield < p.maxShield) {
    p.shield = Math.min(p.maxShield, p.shield + p.shieldRegen * dt);
  }
  const thrusting = cmd.thrust.x !== 0 || cmd.thrust.y !== 0;
  p.thrustFx -= dt;
  if (thrusting && p.thrustFx <= 0) {
    p.thrustFx = PLAYER.thrustParticleEvery;
    const back = p.angle + Math.PI;
    state.particles.push({
      x: p.x + Math.cos(back) * p.radius * 0.9,
      y: p.y + Math.sin(back) * p.radius * 0.9,
      vx: Math.cos(back) * 120 + state.random.range(-30, 30),
      vy: Math.sin(back) * 120 + state.random.range(-30, 30),
      life: 0.3,
      maxLife: 0.3,
      size: 3,
      color: PALETTE.thrust,
      drag: 0.9,
    });
  }
  const events = [];
  p.fireTimer -= dt;
  if (cmd.firing && p.fireTimer <= 0) {
    p.fireTimer = p.fireInterval;
    firePlayerBolt(state);
    events.push({ type: 'shoot' });
  }
  return events;
}

function stepAsteroids(state, dt) {
  for (const rock of state.asteroids) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.rot += rock.rotSpeed * dt;
    rock.flash = Math.max(0, rock.flash - dt * 6);
    if (rock.x < -70) rock.x = FIELD.width + 60;
    if (rock.x > FIELD.width + 70) rock.x = -60;
    if (rock.y < -70) rock.y = FIELD.height + 60;
    if (rock.y > FIELD.height + 70) rock.y = -60;
  }
}

function stepDrones(state, dt) {
  const p = state.player;
  const events = [];
  for (const drone of state.drones) {
    const dx = p.x - drone.x;
    const dy = p.y - drone.y;
    const d = Math.hypot(dx, dy) || 1;
    const def = drone.elite ? ELITE : DRONE;
    const want = d > 230 ? 1 : d < 150 ? -0.6 : 0;
    drone.vx += (dx / d) * def.speed * want * dt * 3;
    drone.vy += (dy / d) * def.speed * want * dt * 3;
    const sp = Math.hypot(drone.vx, drone.vy);
    if (sp > def.speed) {
      drone.vx = (drone.vx / sp) * def.speed;
      drone.vy = (drone.vy / sp) * def.speed;
    }
    drone.x += drone.vx * dt;
    drone.y += drone.vy * dt;
    drone.angle = Math.atan2(dy, dx);
    drone.flash = Math.max(0, drone.flash - dt * 6);
    drone.fireTimer -= dt;
    if (p.alive && d < def.fireRange && drone.fireTimer <= 0) {
      drone.fireTimer = def.fireInterval * state.random.range(0.85, 1.2);
      const aimErr = state.random.range(-0.09, 0.09);
      const a = Math.atan2(dy, dx) + aimErr;
      state.enemyBolts.push({
        x: drone.x + Math.cos(a) * (drone.radius + 4),
        y: drone.y + Math.sin(a) * (drone.radius + 4),
        vx: Math.cos(a) * def.boltSpeed,
        vy: Math.sin(a) * def.boltSpeed,
        radius: def.boltRadius,
        damage: def.boltDamage,
        life: 2.2,
      });
      events.push({ type: 'droneShoot' });
    }
  }
  return events;
}

function stepBolts(state, dt) {
  const events = [];
  for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
    const b = state.bolts[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
    if (!dead) {
      for (let j = state.asteroids.length - 1; j >= 0; j -= 1) {
        const rock = state.asteroids[j];
        const rr = rock.radius + b.radius;
        if (dist2(b.x, b.y, rock.x, rock.y) < rr * rr) {
          rock.hull -= b.damage;
          rock.flash = 1;
          state.stats.hits += 1;
          burst(state, b.x, b.y, '#ffffff', 4, 140, 2, 0.2);
          dead = true;
          events.push({ type: 'hit' });
          if (rock.hull <= 0) events.push(...destroyAsteroid(state, j));
          break;
        }
      }
    }
    if (!dead) {
      for (let j = state.drones.length - 1; j >= 0; j -= 1) {
        const drone = state.drones[j];
        const rr = drone.radius + b.radius;
        if (dist2(b.x, b.y, drone.x, drone.y) < rr * rr) {
          drone.hull -= b.damage;
          drone.flash = 1;
          state.stats.hits += 1;
          burst(state, b.x, b.y, PALETTE.drone, 5, 160, 2, 0.2);
          dead = true;
          events.push({ type: 'hit' });
          if (drone.hull <= 0) events.push(...destroyDrone(state, j));
          break;
        }
      }
    }
    if (dead) state.bolts.splice(i, 1);
  }
  return events;
}

function stepEnemyBolts(state, dt) {
  const events = [];
  const p = state.player;
  for (let i = state.enemyBolts.length - 1; i >= 0; i -= 1) {
    const b = state.enemyBolts[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
    if (!dead && p.alive) {
      const rr = p.radius + b.radius;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        dead = true;
        events.push(...damagePlayer(state, b.damage, b.x, b.y));
      }
    }
    if (dead) state.enemyBolts.splice(i, 1);
  }
  return events;
}

function stepPickups(state, dt) {
  const p = state.player;
  const events = [];
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const c = state.pickups[i];
    c.life -= dt;
    c.spin += dt * 3;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    if (p.alive && d < p.magnetRadius) {
      const pull = CORE.magnetSpeed * (1 - d / (p.magnetRadius * 1.4));
      c.vx += (dx / d) * pull * dt * 6;
      c.vy += (dy / d) * pull * dt * 6;
    }
    c.vx *= Math.pow(0.98, dt * 60);
    c.vy *= Math.pow(0.98, dt * 60);
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (c.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    if (p.alive && d < p.radius + c.radius + 4) {
      state.pickups.splice(i, 1);
      state.cores += 1;
      state.stats.collected += 1;
      bumpCombo(state);
      addScore(state, Math.round(CORE.baseScore * p.coreValue), c.x, c.y);
      burst(state, c.x, c.y, PALETTE.core, 8, 160, 3, 0.4);
      events.push({ type: 'pickup', combo: state.combo });
    }
  }
  return events;
}

function stepContacts(state) {
  const events = [];
  const p = state.player;
  if (!p.alive) return events;
  for (let j = state.asteroids.length - 1; j >= 0; j -= 1) {
    const rock = state.asteroids[j];
    const rr = rock.radius + p.radius - 4;
    if (dist2(p.x, p.y, rock.x, rock.y) < rr * rr) {
      events.push(...damagePlayer(state, rock.size === 0 ? 18 : rock.size === 1 ? 13 : 9, rock.x, rock.y));
      rock.vx = -rock.vx * 0.8;
      rock.vy = -rock.vy * 0.8;
      if (!p.alive) return events;
    }
  }
  for (let j = state.drones.length - 1; j >= 0; j -= 1) {
    const drone = state.drones[j];
    const rr = drone.radius + p.radius - 2;
    if (dist2(p.x, p.y, drone.x, drone.y) < rr * rr) {
      const def = drone.elite ? ELITE : DRONE;
      events.push(...damagePlayer(state, def.touchDamage, drone.x, drone.y));
      drone.vx = -drone.vx;
      drone.vy = -drone.vy;
      if (!p.alive) return events;
    }
  }
  return events;
}

function stepFx(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.pow(pt.drag, dt * 60);
    pt.vy *= Math.pow(pt.drag, dt * 60);
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y -= 34 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
  state.shake = Math.max(0, state.shake - dt * 26);
  state.flash = Math.max(0, state.flash - dt * 1.4);
  state.waveBanner = Math.max(0, state.waveBanner - dt);
  state.hintTimer = Math.max(0, state.hintTimer - dt);
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.comboTimer <= 0) state.combo = 0;
  for (const star of state.stars) star.twinkle += dt * 2;
}

export function stepWorld(state, dt, cmd) {
  const events = [];
  state.time += dt;
  if (state.phase === PHASE_TITLE) {
    stepAsteroids(state, dt);
    if (state.asteroids.length < 5 && state.random.chance(dt * 0.2)) spawnAsteroid(state, 2, true);
    stepFx(state, dt);
    return events;
  }
  if (state.phase !== PHASE_PLAY) {
    stepFx(state, dt);
    return events;
  }
  state.runTime += dt;
  stepSpawning(state, dt);
  events.push(...stepPlayer(state, dt, cmd));
  stepAsteroids(state, dt);
  events.push(...stepDrones(state, dt));
  events.push(...stepBolts(state, dt));
  events.push(...stepEnemyBolts(state, dt));
  events.push(...stepPickups(state, dt));
  events.push(...stepContacts(state));
  stepFx(state, dt);
  if (state.phase === PHASE_PLAY && enemiesLeft(state) === 0) {
    const bonus = 100 * state.wave;
    state.score += bonus;
    addFloater(state, FIELD.width / 2, FIELD.height / 2 - 60, `WAVE ${state.wave} CLEAR  +${bonus}`, '#7dffb0');
    events.push({ type: 'waveclear' });
    offerDraft(state);
  }
  return events;
}
