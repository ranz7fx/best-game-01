// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five phases: title,
// play, upgrade draft, paused and game over.
//
// ?seed=N fixes the field. ?shot=start|play|upgrade|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import {
  PHASE_OVER, PHASE_PAUSED, PHASE_PLAY, PHASE_TITLE, PHASE_UPGRADE,
  applyUpgrade, createWorld, startRun, stepWorld,
} from './world.js';
import { cardAt, createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function writeBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* private mode: the best just lives for this session */
  }
}

const view = {
  mouse: input.mouse,
  hoverCard: -1,
  best: readBest(),
  isNewBest: false,
};
world.best = view.best;

function playEvent(event) {
  if (event.type === 'shoot') audio.shoot();
  else if (event.type === 'droneShoot') audio.droneShoot();
  else if (event.type === 'hit') audio.hit();
  else if (event.type === 'explode') audio.explode(event.big);
  else if (event.type === 'pickup') audio.pickup(event.combo);
  else if (event.type === 'hurt') audio.hurt();
  else if (event.type === 'waveclear') { audio.waveHorn(); }
  else if (event.type === 'gameover') {
    audio.gameOver();
    if (world.score > view.best) {
      view.isNewBest = true;
      view.best = world.score;
      world.best = world.score;
      writeBest(world.score);
    }
  }
}

function unlockAudio() {
  audio.unlock();
}

window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

function announce() {
  const phase = world.phase;
  const text = phase === PHASE_TITLE
    ? 'VOIDHARVEST title screen. Press Enter to start.'
    : phase === PHASE_PLAY
      ? `Wave ${world.wave}. Score ${world.score}. Hull ${Math.ceil(world.player.hull)}.`
      : phase === PHASE_UPGRADE
        ? 'Wave cleared. Choose an upgrade.'
        : phase === PHASE_OVER
          ? `Game over. Final score ${world.score}. Press R to play again.`
          : 'Paused.';
  status.textContent = text;
}

let lastAnnounce = '';

function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = now - (frame.last ?? now);
  frame.last = now;
  const dt = Math.min(MAX_FRAME, dtMs / 1000);
  if (input.mutePressed()) {
    const muted = audio.toggleMute();
    status.textContent = muted ? 'Sound muted.' : 'Sound on.';
  }
  if (world.phase === PHASE_TITLE) {
    if (input.confirmPressed()) {
      audio.unlock();
      audio.click();
      startRun(world);
      view.isNewBest = false;
    }
  } else if (world.phase === PHASE_PLAY) {
    if (input.pausePressed()) {
      world.phase = PHASE_PAUSED;
      audio.click();
    }
  } else if (world.phase === PHASE_PAUSED) {
    if (input.pausePressed() || input.confirmPressed()) {
      world.phase = PHASE_PLAY;
      audio.click();
    }
  } else if (world.phase === PHASE_UPGRADE) {
    view.hoverCard = cardAt(input.mouse.x, input.mouse.y);
    const digit = input.digitPressed();
    if (digit >= 0 && digit < world.draft.length) {
      audio.upgrade();
      applyUpgrade(world, digit);
    } else if (input.confirmPressed() && view.hoverCard >= 0) {
      audio.upgrade();
      applyUpgrade(world, view.hoverCard);
    }
  } else if (world.phase === PHASE_OVER) {
    if (input.restartPressed() || input.confirmPressed()) {
      audio.click();
      view.isNewBest = false;
      startRun(world);
    }
  }
  const cmd = {
    thrust: input.thrust(),
    aimX: input.mouse.x,
    aimY: input.mouse.y,
    firing: input.firing(),
  };
  let acc = (frame.acc ?? 0) + dt;
  let guard = 0;
  while (acc >= STEP && guard < 8) {
    acc -= STEP;
    guard += 1;
    if (world.phase === PHASE_PLAY) {
      const events = stepWorld(world, STEP, cmd);
      for (const event of events) playEvent(event);
    } else if (world.phase === PHASE_TITLE || world.phase === PHASE_UPGRADE || world.phase === PHASE_OVER) {
      stepWorld(world, STEP, cmd);
    }
  }
  frame.acc = acc;
  renderer.render(world, view);
  const text = `${world.phase}|${world.score}|${world.wave}`;
  if (text !== lastAnnounce) {
    lastAnnounce = text;
    announce();
  }
  input.endFrame();
}

if (shot === 'start' || shot === 'play' || shot === 'upgrade' || shot === 'end') {
  stageShot(world, renderer, view, shot);
} else {
  requestAnimationFrame(frame);
}
