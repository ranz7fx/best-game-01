// Keyboard + mouse, reduced to the few actions the game cares about. The
// canvas is scaled by CSS, so mouse pixels are mapped back into the game's
// 1280x800 logical field before anything else reads them.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';

const CONFIRM_KEYS = new Set(['Enter', ' ']);
const PAUSE_KEYS = new Set(['p', 'P', 'Escape']);
const RESTART_KEYS = new Set(['r', 'R']);
const MUTE_KEYS = new Set(['m', 'M']);
const THRUST_KEYS = new Set(['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput(canvas) {
  const keys = new Set();
  const justPressed = new Set();
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2, down: false, clicked: false };
  let hoverCard = -1;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const sx = FIELD.width / rect.width;
    const sy = FIELD.height / rect.height;
    return { x: (event.clientX - rect.left) * sx, y: (event.clientY - rect.top) * sy };
  }

  function onKeyDown(event) {
    if (THRUST_KEYS.has(event.key) || CONFIRM_KEYS.has(event.key)) event.preventDefault();
    if (!event.repeat) {
      keys.add(event.key);
      justPressed.add(event.key);
    }
  }

  function onKeyUp(event) {
    keys.delete(event.key);
  }

  function onMouseMove(event) {
    const p = toLogical(event);
    mouse.x = p.x;
    mouse.y = p.y;
  }

  function onMouseDown(event) {
    const p = toLogical(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  function pressed(action) {
    const set = action === ACTION_CONFIRM ? CONFIRM_KEYS : action === ACTION_PAUSE ? PAUSE_KEYS
      : action === ACTION_RESTART ? RESTART_KEYS : MUTE_KEYS;
    for (const key of justPressed) if (set.has(key)) return true;
    return false;
  }

  return {
    mouse,
    get hoverCard() {
      return hoverCard;
    },
    set hoverCard(v) {
      hoverCard = v;
    },
    /** WASD / arrows as a -1..1 thrust vector, normalised. */
    thrust() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    firing() {
      return mouse.down || keys.has(' ');
    },
    confirmPressed() {
      return pressed(ACTION_CONFIRM) || mouse.clicked;
    },
    pausePressed() {
      return pressed(ACTION_PAUSE);
    },
    restartPressed() {
      return pressed(ACTION_RESTART);
    },
    mutePressed() {
      return pressed(ACTION_MUTE);
    },
    digitPressed() {
      for (const key of justPressed) {
        if (key === '1' || key === '2' || key === '3') return Number(key) - 1;
      }
      return -1;
    },
    /** Clear the per-frame edges; call once per frame after the world reads them. */
    endFrame() {
      justPressed.clear();
      mouse.clicked = false;
    },
  };
}
