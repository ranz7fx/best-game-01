// VOIDHARVEST renderer: paints the world state onto the canvas and nothing
// else. No game rule lives here, so a screenshot of a staged state is exactly
// what a player would see in that moment of a real run.
import { FIELD, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSED = 'paused';

const TAU = Math.PI * 2;

/** Upgrade cards: three panels across the middle of the field. */
export const CARDS = {
  width: 320,
  height: 250,
  gap: 36,
  y: 290,
};

export function cardAt(x, y) {
  const total = CARDS.width * 3 + CARDS.gap * 2;
  const x0 = (FIELD.width - total) / 2;
  if (y < CARDS.y || y > CARDS.y + CARDS.height) return -1;
  for (let i = 0; i < 3; i += 1) {
    const cx = x0 + i * (CARDS.width + CARDS.gap);
    if (x >= cx && x <= cx + CARDS.width) return i;
  }
  return -1;
}

function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  function drawBackground(state) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.spaceTop);
    grad.addColorStop(1, PALETTE.spaceBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const neb of state.nebulae) {
      const g = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
      g.addColorStop(0, neb.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(neb.x - neb.r, neb.y - neb.r, neb.r * 2, neb.r * 2);
    }
    const px = state.player.x - FIELD.width / 2;
    const py = state.player.y - FIELD.height / 2;
    for (const star of state.stars) {
      const par = [0.02, 0.05, 0.09][star.layer];
      let x = (star.x - px * par) % FIELD.width;
      let y = (star.y - py * par) % FIELD.height;
      if (x < 0) x += FIELD.width;
      if (y < 0) y += FIELD.height;
      const tw = 0.55 + 0.45 * Math.sin(star.twinkle);
      ctx.globalAlpha = tw * (0.5 + star.layer * 0.2);
      ctx.fillStyle = PALETTE.star;
      ctx.fillRect(x, y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawAsteroid(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rot);
    ctx.beginPath();
    rock.shape.forEach((pt, i) => {
      const x = Math.cos(pt.a) * pt.r;
      const y = Math.sin(pt.a) * pt.r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = rock.flash > 0 ? '#e8dcc4' : PALETTE.asteroid;
    ctx.fill();
    ctx.strokeStyle = PALETTE.asteroidRim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.asteroidDark;
    ctx.beginPath();
    ctx.arc(-rock.radius * 0.3, -rock.radius * 0.2, rock.radius * 0.22, 0, TAU);
    ctx.arc(rock.radius * 0.35, rock.radius * 0.3, rock.radius * 0.16, 0, TAU);
    ctx.fill();
    if (rock.hull < rock.maxHull) {
      ctx.rotate(-rock.rot);
      bar(ctx, -rock.radius, -rock.radius - 12, rock.radius * 2, 4, rock.hull / rock.maxHull, '#ffb042', 'rgba(0,0,0,0.5)');
    }
    ctx.restore();
  }

  function drawDrone(drone) {
    const def = drone.elite;
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.angle);
    ctx.fillStyle = drone.flash > 0 ? '#ffffff' : (def ? PALETTE.elite : PALETTE.drone);
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-8, -16);
    ctx.lineTo(-18, -8);
    ctx.lineTo(-18, 8);
    ctx.lineTo(-8, 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = def ? PALETTE.eliteLight : PALETTE.droneDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.droneEye;
    ctx.beginPath();
    ctx.arc(8, 0, def ? 7 : 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(9.5, -1.5, 2, 0, TAU);
    ctx.fill();
    if (def) {
      ctx.strokeStyle = PALETTE.eliteLight;
      ctx.beginPath();
      ctx.moveTo(-18, -8);
      ctx.lineTo(-28, -14);
      ctx.moveTo(-18, 8);
      ctx.lineTo(-28, 14);
      ctx.stroke();
    }
    ctx.restore();
    if (drone.hull < drone.maxHull) {
      bar(ctx, drone.x - drone.radius, drone.y - drone.radius - 12, drone.radius * 2, 4, drone.hull / drone.maxHull, '#ff5d8f', 'rgba(0,0,0,0.5)');
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    if (!p.alive) return;
    if (p.invuln > 0 && Math.floor(state.time * 14) % 2 === 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.shadowColor = PALETTE.thrust;
    ctx.shadowBlur = 18;
    ctx.fillStyle = PALETTE.thrust;
    ctx.beginPath();
    ctx.moveTo(-p.radius * 0.8, -6);
    ctx.lineTo(-p.radius * 1.5 - Math.random() * 8, 0);
    ctx.lineTo(-p.radius * 0.8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hull;
    ctx.beginPath();
    ctx.moveTo(p.radius + 6, 0);
    ctx.lineTo(-p.radius * 0.6, -p.radius * 0.75);
    ctx.lineTo(-p.radius * 0.35, 0);
    ctx.lineTo(-p.radius * 0.6, p.radius * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.hullDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.cockpit;
    ctx.beginPath();
    ctx.arc(4, 0, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3d6f9e';
    ctx.fillRect(-p.radius * 0.5, -3, 10, 6);
    ctx.restore();
    if (p.shield > 1) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.35 * (p.shield / p.maxShield);
      ctx.strokeStyle = PALETTE.shield;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 10, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBolt(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = PALETTE.bolt;
    roundRect(ctx, -10, -2.5, 20, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = PALETTE.boltCore;
    roundRect(ctx, -5, -1.5, 12, 3, 1.5);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemyBolt(b) {
    ctx.save();
    ctx.shadowColor = PALETTE.enemyBolt;
    ctx.shadowBlur = 10;
    ctx.fillStyle = PALETTE.enemyBolt;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawCore(c) {
    const blink = c.life < 3 ? (Math.floor(c.life * 6) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.spin);
    ctx.globalAlpha = blink;
    ctx.shadowColor = PALETTE.core;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.core;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3.5, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-3.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawCrosshair(view) {
    const { x, y } = view.mouse;
    ctx.save();
    ctx.strokeStyle = 'rgba(234, 246, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, TAU);
    ctx.moveTo(x - 17, y);
    ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 17, y);
    ctx.moveTo(x, y - 17);
    ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x, y + 17);
    ctx.stroke();
    ctx.fillStyle = PALETTE.bolt;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawHud(state, view) {
    const p = state.player;
    // Frosted panels behind each HUD cluster so the text stays readable over
    // busy starfields, explosions and bright nebulae.
    ctx.fillStyle = 'rgba(3, 7, 18, 0.55)';
    roundRect(ctx, 12, 14, 280, 64, 10);
    ctx.fill();
    roundRect(ctx, FIELD.width / 2 - 110, 14, 220, 64, 10);
    ctx.fill();
    roundRect(ctx, FIELD.width - 242, 14, 230, 78, 10);
    ctx.fill();
    roundRect(ctx, 12, FIELD.height - 68, 360, 58, 10);
    ctx.fill();
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.hudText;
    ctx.textAlign = 'left';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE ${fmt(state.score)}`, 24, 44);
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(`BEST ${fmt(Math.max(state.best, state.score))}`, 24, 68);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.wave}`, FIELD.width / 2, 40);
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    const left = state.phase === 'playing' ? state.asteroids.length + state.drones.length
      + state.spawnQueue.asteroids + state.spawnQueue.drones + state.spawnQueue.elites : 0;
    ctx.fillText(`HOSTILES ${left}`, FIELD.width / 2, 64);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.core;
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`CORES ${fmt(state.cores)}`, FIELD.width - 24, 40);
    if (state.combo > 1) {
      ctx.fillStyle = state.combo >= 8 ? PALETTE.hudWarn : PALETTE.hudGood;
      ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.combo}`, FIELD.width - 24, 68);
      bar(ctx, FIELD.width - 144, 76, 120, 6, state.comboTimer / 3, state.combo >= 8 ? PALETTE.hudWarn : PALETTE.hudGood, 'rgba(255,255,255,0.15)');
    }
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText('HULL', 24, FIELD.height - 46);
    bar(ctx, 70, FIELD.height - 58, 210, 14, p.hull / p.maxHull, p.hull > 50 ? PALETTE.hudGood : p.hull > 25 ? PALETTE.hudWarn : PALETTE.hudBad, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(`${Math.ceil(p.hull)} / ${p.maxHull}`, 290, FIELD.height - 46);
    ctx.fillText('SHIELD', 24, FIELD.height - 22);
    bar(ctx, 70, FIELD.height - 34, 210, 10, p.shield / p.maxShield, PALETTE.hull, 'rgba(255,255,255,0.15)');
    ctx.fillText(`${Math.ceil(p.shield)} / ${p.maxShield}`, 290, FIELD.height - 22);
    if (state.hintTimer > 0 && state.phase === 'playing') {
      ctx.globalAlpha = Math.min(1, state.hintTimer / 2);
      ctx.textAlign = 'right';
      ctx.font = '14px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = PALETTE.hudDim;
      ctx.fillText('WASD thrust  ·  Mouse aim  ·  Click / Space fire  ·  P pause  ·  M mute', FIELD.width - 24, FIELD.height - 24);
      ctx.globalAlpha = 1;
    }
    if (state.waveBanner > 0 && state.phase === 'playing') {
      const a = Math.min(1, state.waveBanner);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = PALETTE.title;
      ctx.fillText(`WAVE ${state.wave}`, FIELD.width / 2, 180);
      ctx.font = '18px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = PALETTE.subtitle;
      ctx.fillText(state.wave === 1 ? 'Crack the rocks. Grab the cores. Stay alive.' : 'The field gets meaner. So do you.', FIELD.width / 2, 212);
      ctx.globalAlpha = 1;
    }
  }

  /** Hero ship for the title screen: the player's skiff, drawn large with a
   *  thrust flame and two glowing cores flanking it, so the title has a
   *  subject instead of floating over an empty field. */
  function drawHeroShip(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(-Math.PI / 2);
    ctx.shadowColor = PALETTE.thrust;
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.thrust;
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(-32, 0);
    ctx.lineTo(-16, 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hull;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(-12, -15);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.hullDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.cockpit;
    ctx.beginPath();
    ctx.arc(4, 0, 6, 0, TAU);
    ctx.fill();
    ctx.restore();
    for (const cx of [x - 150, x + 150]) {
      ctx.save();
      ctx.translate(cx, y);
      ctx.shadowColor = PALETTE.core;
      ctx.shadowBlur = 14;
      ctx.fillStyle = PALETTE.core;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(3.5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-3.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawTitle(state, view) {
    ctx.fillStyle = 'rgba(4, 7, 16, 0.68)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    drawHeroShip(FIELD.width / 2, 116, 1.25);
    ctx.shadowColor = PALETTE.subtitle;
    ctx.shadowBlur = 34;
    ctx.fillStyle = PALETTE.title;
    ctx.font = 'bold 96px "Segoe UI", system-ui, sans-serif';
    try { ctx.letterSpacing = '10px'; } catch { /* older canvas: no tracking */ }
    ctx.fillText('VOIDHARVEST', FIELD.width / 2, 250);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.subtitle;
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('— SALVAGE RUN —', FIELD.width / 2, 300);
    ctx.fillStyle = PALETTE.core;
    ctx.fillRect(FIELD.width / 2 - 90, 320, 180, 3);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('The belt is full of wrecked rocks and hungry drones.', FIELD.width / 2, 352);
    ctx.fillText('Crack asteroids, tractor in the glowing cores, and outlast the waves.', FIELD.width / 2, 380);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('WASD / Arrows — thrust      Mouse — aim      Click / Space — fire', FIELD.width / 2, 440);
    ctx.fillText('Clear a wave to pick a salvage upgrade.  P — pause    M — mute', FIELD.width / 2, 468);
    if (view.best > 0) {
      ctx.fillStyle = PALETTE.core;
      ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`BEST SCORE  ${fmt(view.best)}`, FIELD.width / 2, 522);
    }
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 4);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 596);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('An original arcade game. No network, no downloads — just you and the belt.', FIELD.width / 2, 760);
  }

  /** One small vector glyph per upgrade, drawn in salvage amber, so each card
   *  reads at a glance instead of being two lines of text in a big empty box. */
  function drawUpgradeIcon(id, cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = PALETTE.core;
    ctx.fillStyle = PALETTE.core;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (id === 'twin-coils') {
      ctx.rotate(-Math.PI / 4);
      roundRect(ctx, -r, -r * 0.45, r * 1.7, r * 0.28, r * 0.14);
      ctx.fill();
      roundRect(ctx, -r * 0.7, r * 0.2, r * 1.7, r * 0.28, r * 0.14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, -r * 0.4, -r * 0.45 + r * 0.06, r * 0.7, r * 0.16, r * 0.08);
      ctx.fill();
    } else if (id === 'heavy-rounds') {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#7a4d00';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.14, 0, TAU);
      ctx.fill();
    } else if (id === 'rapid-cycler') {
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.55 - r * 0.25, -r * 0.7);
        ctx.lineTo(i * r * 0.55 + r * 0.35, 0);
        ctx.lineTo(i * r * 0.55 - r * 0.25, r * 0.7);
        ctx.stroke();
      }
    } else if (id === 'magnet-array') {
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.7, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.1);
      ctx.lineTo(-r * 0.7, r * 0.55);
      ctx.moveTo(r * 0.7, -r * 0.1);
      ctx.lineTo(r * 0.7, r * 0.55);
      ctx.stroke();
      ctx.fillStyle = PALETTE.hudText;
      ctx.fillRect(-r * 0.9, r * 0.55, r * 0.4, r * 0.28);
      ctx.fillRect(r * 0.5, r * 0.55, r * 0.4, r * 0.28);
    } else if (id === 'ablative-plating') {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(r * 0.75, -r * 0.45);
      ctx.lineTo(r * 0.6, r * 0.45);
      ctx.lineTo(0, r * 0.9);
      ctx.lineTo(-r * 0.6, r * 0.45);
      ctx.lineTo(-r * 0.75, -r * 0.45);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.45);
      ctx.lineTo(r * 0.35, -r * 0.2);
      ctx.lineTo(r * 0.28, r * 0.3);
      ctx.lineTo(0, r * 0.55);
      ctx.lineTo(-r * 0.28, r * 0.3);
      ctx.lineTo(-r * 0.35, -r * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (id === 'shield-capacitor') {
      roundRect(ctx, -r * 0.7, -r * 0.55, r * 1.4, r * 1.1, 6);
      ctx.stroke();
      ctx.fillRect(-r * 0.7, -r * 0.55, r * 0.85, r * 1.1);
      ctx.fillStyle = PALETTE.cardBack;
      ctx.fillRect(r * 0.75, -r * 0.25, r * 0.2, r * 0.5);
    } else if (id === 'ion-thrusters') {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.quadraticCurveTo(r * 0.8, -r * 0.1, r * 0.4, r * 0.6);
      ctx.quadraticCurveTo(0, r * 0.95, -r * 0.4, r * 0.6);
      ctx.quadraticCurveTo(-r * 0.8, -r * 0.1, 0, -r * 0.9);
      ctx.fill();
    } else { // salvage-processor: the glowing core diamond
      ctx.save();
      ctx.shadowColor = PALETTE.core;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r * 0.9);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.4);
      ctx.lineTo(r * 0.3, 0);
      ctx.lineTo(0, r * 0.4);
      ctx.lineTo(-r * 0.3, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawUpgrade(state, view) {
    ctx.fillStyle = 'rgba(4, 7, 16, 0.86)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudGood;
    ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 150);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('CHOOSE YOUR SALVAGE UPGRADE', FIELD.width / 2, 196);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Click a card or press 1, 2 or 3 — then the next wave begins.', FIELD.width / 2, 228);
    const total = CARDS.width * 3 + CARDS.gap * 2;
    const x0 = (FIELD.width - total) / 2;
    state.draft.forEach((up, i) => {
      const x = x0 + i * (CARDS.width + CARDS.gap);
      const y = CARDS.y;
      const hot = view.hoverCard === i;
      ctx.fillStyle = hot ? 'rgba(22, 38, 68, 0.95)' : PALETTE.cardBack;
      roundRect(ctx, x, y, CARDS.width, CARDS.height, 14);
      ctx.fill();
      ctx.strokeStyle = hot ? PALETTE.cardEdgeHot : PALETTE.cardEdge;
      ctx.lineWidth = hot ? 3 : 2;
      roundRect(ctx, x, y, CARDS.width, CARDS.height, 14);
      ctx.stroke();
      ctx.fillStyle = PALETTE.cardEdgeHot;
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`[${i + 1}]`, x + CARDS.width / 2, y + 44);
      ctx.fillStyle = PALETTE.title;
      ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(up.name, x + CARDS.width / 2, y + 90);
      ctx.fillStyle = PALETTE.core;
      ctx.fillRect(x + CARDS.width / 2 - 40, y + 106, 80, 3);
      drawUpgradeIcon(up.id, x + CARDS.width / 2, y + 152, 26);
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = '17px "Segoe UI", system-ui, sans-serif';
      const words = up.blurb.split(' ');
      const lines = [''];
      for (const w of words) {
        const test = lines[lines.length - 1] === '' ? w : `${lines[lines.length - 1]} ${w}`;
        if (ctx.measureText(test).width > CARDS.width - 48 && lines[lines.length - 1] !== '') lines.push(w);
        else lines[lines.length - 1] = test;
      }
      lines.forEach((line, li) => ctx.fillText(line, x + CARDS.width / 2, y + 206 + li * 26));
    });
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SCORE ${fmt(state.score)}   ·   CORES ${fmt(state.cores)}   ·   HULL ${Math.ceil(state.player.hull)}`, FIELD.width / 2, 620);
  }

  function drawGameOver(state, view) {
    ctx.fillStyle = 'rgba(10, 4, 10, 0.74)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudBad;
    ctx.font = 'bold 72px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SIGNAL LOST', FIELD.width / 2, 220);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Your skiff broke apart in the belt. The cores drift on without you.', FIELD.width / 2, 264);
    const isBest = view.isNewBest;
    ctx.fillStyle = PALETTE.title;
    ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(fmt(state.score), FIELD.width / 2, 368);
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('FINAL SCORE', FIELD.width / 2, 306);
    if (isBest) {
      ctx.fillStyle = PALETTE.core;
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('★ NEW BEST ★', FIELD.width / 2, 392);
    }
    const rows = [
      ['BEST', fmt(Math.max(view.best, state.score))],
      ['REACHED WAVE', String(state.wave)],
      ['CORES SALVAGED', fmt(state.cores)],
      ['KILLS', fmt(state.stats.kills)],
      ['ACCURACY', state.stats.shots > 0 ? `${Math.round((state.stats.hits / state.stats.shots) * 100)}%` : '—'],
    ];
    ctx.font = '19px "Segoe UI", system-ui, sans-serif';
    rows.forEach((row, i) => {
      const y = 448 + i * 34;
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.hudDim;
      ctx.fillText(row[0], FIELD.width / 2 - 12, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.hudText;
      ctx.fillText(row[1], FIELD.width / 2 + 12, y);
    });
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 4);
    ctx.globalAlpha = pulse;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', FIELD.width / 2, 680);
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4, 7, 16, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PAUSED', FIELD.width / 2, 380);
    ctx.font = '19px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('Press P to resume', FIELD.width / 2, 424);
  }

  function render(state, view) {
    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    for (const rock of state.asteroids) drawAsteroid(rock);
    for (const drone of state.drones) drawDrone(drone);
    for (const c of state.pickups) drawCore(c);
    for (const b of state.bolts) drawBolt(b);
    for (const b of state.enemyBolts) drawEnemyBolt(b);
    if (state.phase !== 'title') drawPlayer(state);
    drawParticles(state);
    drawFloaters(state);
    ctx.restore();
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 80, ${state.flash * 0.55})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    const vg = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.45, FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (state.phase === 'title') drawTitle(state, view);
    else if (state.phase === 'playing' || state.phase === 'paused') {
      drawHud(state, view);
      if (state.phase === 'playing') drawCrosshair(view);
      if (state.phase === 'paused') drawPaused();
    } else if (state.phase === 'upgrade') {
      drawHud(state, view);
      drawUpgrade(state, view);
    } else if (state.phase === 'over') {
      drawGameOver(state, view);
    }
  }

  return { render };
}
