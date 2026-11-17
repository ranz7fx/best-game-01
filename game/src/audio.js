// Synthesised sound: every effect is an oscillator or filtered noise burst
// built with plain WebAudio, so the game ships no audio files at all. The
// context is created on the player's first gesture, never at load, so a
// staged screenshot (?shot=) stays silent and never blocks on autoplay.
import { MUTE_KEY } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let padNodes = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    try {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      /* sound is garnish; never break the game */
    }
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure()) return;
    try {
      const t0 = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t0);
    } catch {
      /* sound is garnish; never break the game */
    }
  }

  function startPad() {
    if (!ensure() || padNodes) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const a = ctx.createOscillator();
      a.type = 'sawtooth';
      a.frequency.value = 55;
      const b = ctx.createOscillator();
      b.type = 'sawtooth';
      b.frequency.value = 55.7;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      a.connect(filter);
      b.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      a.start();
      b.start();
      lfo.start();
      padNodes = { a, b, lfo, gain };
    } catch {
      padNodes = null;
    }
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      ensure();
      startPad();
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        /* ignore */
      }
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.05);
      return muted;
    },
    shoot() {
      tone(880, 0.08, 'square', 0.08, 320);
    },
    droneShoot() {
      tone(220, 0.12, 'sawtooth', 0.05, 140);
    },
    hit() {
      noise(0.08, 0.12, 1800);
    },
    explode(big) {
      noise(big ? 0.5 : 0.28, big ? 0.35 : 0.2, big ? 900 : 1400);
      tone(big ? 90 : 140, big ? 0.4 : 0.22, 'sine', 0.25, 40);
    },
    pickup(combo) {
      const base = 520 + Math.min(combo, 12) * 32;
      tone(base, 0.09, 'sine', 0.14);
      tone(base * 1.5, 0.12, 'sine', 0.1);
    },
    hurt() {
      tone(160, 0.25, 'sawtooth', 0.22, 60);
      noise(0.2, 0.18, 700);
    },
    waveHorn() {
      tone(196, 0.35, 'triangle', 0.18, 196);
      tone(294, 0.35, 'triangle', 0.12, 294);
    },
    upgrade() {
      [523, 659, 784, 1047].forEach((f, i) => {
        window.setTimeout(() => tone(f, 0.16, 'triangle', 0.14), i * 70);
      });
    },
    gameOver() {
      [392, 311, 233, 175].forEach((f, i) => {
        window.setTimeout(() => tone(f, 0.3, 'triangle', 0.16), i * 160);
      });
    },
    click() {
      tone(660, 0.05, 'sine', 0.1);
    },
  };
}
