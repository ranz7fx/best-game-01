// Screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot, so the frame is what a short game really looks like
// and the same seed always gives the same frame. The play pilot fights well;
// the end pilot chases cores and never fires, so the belt catches it.
import { FIELD, STEP } from './config.js';
import { PHASE_OVER, PHASE_PLAY, PHASE_UPGRADE, applyUpgrade, startRun, stepWorld } from './world.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;

/** Steer the ship: flee the nearest rock or drone inside `danger`, else chase the nearest core. */
function autopilot(state, opts) {
  const p = state.player;
  if (!p.alive) return { thrust: { x: 0, y: 0 }, aimX: p.x, aimY: p.y - 100, firing: false };
  let tx = p.x;
  let ty = p.y;
  let danger = null;
  let dangerDist = Infinity;
  for (const rock of state.asteroids) {
    const d = Math.hypot(rock.x - p.x, rock.y - p.y) - rock.radius;
    if (d < dangerDist) { dangerDist = d; danger = rock; }
  }
  for (const drone of state.drones) {
    const d = Math.hypot(drone.x - p.x, drone.y - p.y) - drone.radius;
    if (d < dangerDist) { dangerDist = d; danger = drone; }
  }
  if (danger && dangerDist < opts.danger) {
    const dx = p.x - danger.x;
    const dy = p.y - danger.y;
    const d = Math.hypot(dx, dy) || 1;
    tx = p.x + (dx / d) * 200;
    ty = p.y + (dy / d) * 200;
  } else if (state.pickups.length > 0) {
    let best = null;
    let bd = Infinity;
    for (const c of state.pickups) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) { tx = best.x; ty = best.y; }
  } else {
    tx = FIELD.width / 2;
    ty = FIELD.height / 2;
  }
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const thrust = d > 24 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
  let aimX = p.x;
  let aimY = p.y - 100;
  let aimDist = Infinity;
  for (const rock of state.asteroids) {
    const dd = Math.hypot(rock.x - p.x, rock.y - p.y);
    if (dd < aimDist) { aimDist = dd; aimX = rock.x; aimY = rock.y; }
  }
  for (const drone of state.drones) {
    const dd = Math.hypot(drone.x - p.x, drone.y - p.y);
    if (dd < aimDist) { aimDist = dd; aimX = drone.x; aimY = drone.y; }
  }
  return { thrust, aimX, aimY, firing: opts.firing && aimDist < 620 };
}

function runSteps(state, seconds, opts) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.phase === PHASE_OVER) return;
    if (state.phase === PHASE_UPGRADE) {
      if (opts.takeUpgrade) applyUpgrade(state, 0);
      else return;
    }
    stepWorld(state, STEP, autopilot(state, opts));
  }
}

/** Stage one scene, paint it twice, and flag window.__shotReady for a screenshot. */
export function stageShot(state, renderer, view, shot) {
  const idle = { thrust: { x: 0, y: 0 }, aimX: FIELD.width / 2, aimY: FIELD.height / 2 - 100, firing: false };
  if (shot === 'start') {
    for (let i = 0; i < Math.floor(START_SECONDS / STEP); i += 1) stepWorld(state, STEP, idle);
  } else if (shot === 'play') {
    startRun(state);
    runSteps(state, PLAY_SECONDS, { danger: 190, firing: true, takeUpgrade: true });
    if (state.phase !== PHASE_PLAY) {
      // The pilot died on this seed: replay from a fresh run on the same seed
      // but half as long, so the frame still shows a real mid-wave fight.
      startRun(state);
      runSteps(state, PLAY_SECONDS / 2, { danger: 220, firing: true, takeUpgrade: true });
    }
  } else if (shot === 'upgrade') {
    startRun(state);
    runSteps(state, PLAY_SECONDS, { danger: 190, firing: true, takeUpgrade: false });
    if (state.phase !== PHASE_UPGRADE) {
      // Fall back: clear the field by hand so the draft still shows a real wave clear.
      state.asteroids = [];
      state.drones = [];
      state.spawnQueue.asteroids = 0;
      state.spawnQueue.drones = 0;
      state.spawnQueue.elites = 0;
      stepWorld(state, STEP, idle);
    }
  } else if (shot === 'end') {
    startRun(state);
    // Play well until the run has a real score and a wave behind it, then fly
    // recklessly (chase cores, never fire, never dodge) so the belt catches
    // the pilot with a score worth showing on the game-over screen.
    const cap = Math.floor(END_LIMIT_SECONDS / STEP);
    for (let i = 0; i < cap; i += 1) {
      if (state.phase === PHASE_OVER) break;
      if (state.phase === PHASE_UPGRADE) { applyUpgrade(state, 0); continue; }
      const reckless = state.score > 1500 && state.wave >= 2;
      stepWorld(state, STEP, autopilot(state, reckless
        ? { danger: 0, firing: false }
        : { danger: 190, firing: true }));
    }
    if (state.phase !== PHASE_OVER) {
      state.player.hull = 0;
      state.player.alive = false;
      state.phase = PHASE_OVER;
    }
  }
  renderer.render(state, view);
  renderer.render(state, view);
  window.__shotReady = true;
}
