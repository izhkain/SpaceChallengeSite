// Данные: state, viewport, math, config. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state, viewport, math, config } = Game;
  const context = viewport.context;

  /* =========================================================
     РЕНДЕР
     ========================================================= */
  Game.glowCircle = function glowCircle(x, y, r, color, alpha) {
    const g = context.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, math.colorWithAlpha(color, alpha));
    g.addColorStop(0.55, math.colorWithAlpha(color, alpha * 0.32));
    g.addColorStop(1, math.colorWithAlpha(color, 0));
    context.fillStyle = g;
    context.beginPath(); context.arc(x, y, r, 0, math.TAU); context.fill();
  };

  Game.drawEnemy = function drawEnemy(enemy) {
    const c = enemy.flash > 0 ? '#ffffff' : enemy.color;
    if (enemy.boss) {
      context.save();
      context.globalCompositeOperation = 'lighter';
      Game.glowCircle(enemy.x, enemy.y, enemy.r * 2.6, '#ff5f8f', 0.4);
      context.restore();
      context.fillStyle = c;
      context.beginPath(); context.arc(enemy.x, enemy.y, enemy.r, 0, math.TAU); context.fill();
      context.strokeStyle = 'rgba(255,255,255,0.65)';
      context.lineWidth = 2.5;
      context.beginPath(); context.arc(enemy.x, enemy.y, enemy.r * 0.62, 0, math.TAU); context.stroke();
      context.fillStyle = '#2a0716';
      context.beginPath(); context.arc(enemy.x, enemy.y, enemy.r * 0.3, 0, math.TAU); context.fill();
    } else {
      context.fillStyle = math.colorWithAlpha(c, 0.85);
      context.beginPath(); context.arc(enemy.x, enemy.y, enemy.r, 0, math.TAU); context.fill();
      context.fillStyle = c;
      context.beginPath(); context.arc(enemy.x, enemy.y, enemy.r * 0.55, 0, math.TAU); context.fill();
    }
    if (enemy.burn > 0) {
      context.strokeStyle = 'rgba(255,140,60,0.85)';
      context.lineWidth = 2;
      context.beginPath(); context.arc(enemy.x, enemy.y, enemy.r + 3, 0, math.TAU); context.stroke();
    }
    if (enemy.slow > 0) {
      context.strokeStyle = 'rgba(140,220,255,0.7)';
      context.lineWidth = 2;
      context.beginPath(); context.arc(enemy.x, enemy.y, enemy.r + 6, 0, math.TAU); context.stroke();
    }
  };

  Game.drawWeaponVisuals = function drawWeaponVisuals() {
    for (const weapon of state.player.weapons) {
      const definition = weapon.def;
      if (definition.type === 'aura') {
        const R = definition.auraR;
        const g = context.createRadialGradient(state.player.x, state.player.y, R * 0.25, state.player.x, state.player.y, R + state.player.r);
        g.addColorStop(0, math.colorWithAlpha(definition.color, 0.03));
        g.addColorStop(0.75, math.colorWithAlpha(definition.color, 0.1));
        g.addColorStop(1, math.colorWithAlpha(definition.color, 0));
        context.fillStyle = g;
        context.beginPath(); context.arc(state.player.x, state.player.y, R + state.player.r, 0, math.TAU); context.fill();
        context.strokeStyle = math.colorWithAlpha(definition.color, 0.35);
        context.lineWidth = 1.5;
        context.beginPath(); context.arc(state.player.x, state.player.y, R + state.player.r, 0, math.TAU); context.stroke();
      } else if (definition.type === 'orbit') {
        const cnt = definition.count || 2, rad = definition.orbitR || 95, br = definition.br || 16;
        context.strokeStyle = math.colorWithAlpha(definition.color, 0.16);
        context.lineWidth = 1;
        context.beginPath(); context.arc(state.player.x, state.player.y, rad, 0, math.TAU); context.stroke();
        for (let i = 0; i < cnt; i++) {
          const a = weapon.ang + i * math.TAU / cnt;
          const ox = state.player.x + Math.cos(a) * rad, oy = state.player.y + Math.sin(a) * rad;
          context.save();
          context.globalCompositeOperation = 'lighter';
          Game.glowCircle(ox, oy, br * 2, definition.color, 0.45);
          context.restore();
          context.fillStyle = definition.color;
          context.beginPath(); context.arc(ox, oy, br * 0.62, 0, math.TAU); context.fill();
        }
      } else if (definition.type === 'drone') {
        const cnt = definition.count || 1, rad = definition.orbitR || 70;
        context.strokeStyle = math.colorWithAlpha(definition.color, 0.12);
        context.lineWidth = 1;
        context.beginPath(); context.arc(state.player.x, state.player.y, rad, 0, math.TAU); context.stroke();
        for (let i = 0; i < cnt; i++) {
          const a = weapon.ang + i * math.TAU / cnt;
          const ox = state.player.x + Math.cos(a) * rad, oy = state.player.y + Math.sin(a) * rad;
          context.fillStyle = definition.color;
          context.beginPath();
          context.moveTo(ox, oy - 7);
          context.lineTo(ox + 6, oy + 5);
          context.lineTo(ox - 6, oy + 5);
          context.closePath();
          context.fill();
        }
      }
    }
  };

  Game.render = function render() {
    Game.drawBackground();

    context.save();
    const sx = state.shake > 0 ? math.randomRange(-state.shake, state.shake) * 0.5 : 0;
    const sy = state.shake > 0 ? math.randomRange(-state.shake, state.shake) * 0.5 : 0;
    context.translate(-state.camera.x + sx, -state.camera.y + sy);

    Game.drawGravityWells();
    Game.drawMines();
    Game.drawPickups();
    Game.drawEnemies();
    Game.drawPlayerBullets();
    Game.drawEnemyBullets();
    Game.drawWaves();
    Game.drawAttackEffects();
    Game.drawPlayerWeapons();
    Game.drawPlayer();
    Game.drawParticles();
    Game.drawFloatingText();

    context.restore(); // конец мира

    Game.drawScreenEffects();

    if (state.screen !== 'menu') Game.drawHUD();
    Game.drawOverlays();
  };

  Game.drawGravityWells = function drawGravityWells() {
    for (const well of state.wells) {
      const k = well.life / well.max;
      const g = context.createRadialGradient(well.x, well.y, 0, well.x, well.y, well.r);
      g.addColorStop(0, 'rgba(10,4,24,0.85)');
      g.addColorStop(0.5, math.colorWithAlpha(well.color, 0.25 * k));
      g.addColorStop(1, math.colorWithAlpha(well.color, 0));
      context.fillStyle = g;
      context.beginPath(); context.arc(well.x, well.y, well.r, 0, math.TAU); context.fill();
      context.strokeStyle = math.colorWithAlpha(well.color, 0.5 * k);
      context.lineWidth = 2;
      context.beginPath(); context.arc(well.x, well.y, well.r * 0.7, 0, math.TAU); context.stroke();
    }
  };

  Game.drawMines = function drawMines() {
    for (const m of state.mines) {
      const pul = 0.5 + 0.5 * Math.sin(m.t * 8);
      context.save();
      context.globalCompositeOperation = 'lighter';
      Game.glowCircle(m.x, m.y, 22 + pul * 8, m.color, 0.4);
      context.restore();
      context.fillStyle = m.color;
      context.beginPath(); context.arc(m.x, m.y, m.r, 0, math.TAU); context.fill();
    }
  };

  Game.drawPickups = function drawPickups() {
    for (const pickup of state.pickups) {
      if (pickup.kind === 'weapon' || pickup.kind === 'crateBoss') {
        const bob = Math.sin(performance.now() / 260) * 4;
        const col = pickup.kind === 'crateBoss' ? '#ffd166' : pickup.def.color;
        context.save();
        context.globalCompositeOperation = 'lighter';
        Game.glowCircle(pickup.x, pickup.y + bob, 52, col, 0.45);
        const lg = context.createLinearGradient(pickup.x, pickup.y - 200, pickup.x, pickup.y);
        lg.addColorStop(0, math.colorWithAlpha(col, 0));
        lg.addColorStop(1, math.colorWithAlpha(col, 0.35));
        context.fillStyle = lg;
        context.fillRect(pickup.x - 14, pickup.y - 200, 28, 200);
        context.restore();
        context.strokeStyle = math.colorWithAlpha(col, 0.6);
        context.lineWidth = 2;
        context.beginPath(); context.arc(pickup.x, pickup.y, 24 + Math.sin(performance.now() / 300) * 3, 0, math.TAU); context.stroke();
        context.fillStyle = '#0c1020';
        context.fillRect(pickup.x - 11, pickup.y + bob - 11, 22, 22);
        context.strokeStyle = col;
        context.lineWidth = 2.5;
        context.strokeRect(pickup.x - 11, pickup.y + bob - 11, 22, 22);
        context.fillStyle = col;
        context.fillRect(pickup.x - 3, pickup.y + bob - 3, 6, 6);
        context.fillStyle = '#dfe9ff';
        context.font = '600 11px ' + viewport.fontFamily;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const nm = pickup.kind === 'crateBoss' ? 'ЯЩИК БОССА' : pickup.def.name;
        context.fillText(nm, pickup.x, pickup.y - 30 + bob);
        if (pickup.kind === 'weapon') {
          context.fillStyle = 'rgba(200,215,240,0.6)';
          context.font = '10px ' + viewport.fontFamily;
          context.fillText(Math.ceil(pickup.life) + ' с', pickup.x, pickup.y + 30 + bob);
        }
      } else if (pickup.kind === 'xp') {
        context.save();
        context.globalCompositeOperation = 'lighter';
        Game.glowCircle(pickup.x, pickup.y, 14, '#5aa8ff', 0.55);
        context.restore();
        context.fillStyle = '#bfe0ff';
        context.beginPath(); context.arc(pickup.x, pickup.y, pickup.r * 0.62, 0, math.TAU); context.fill();
      } else {
        context.save();
        context.globalCompositeOperation = 'lighter';
        Game.glowCircle(pickup.x, pickup.y, 16, '#7ef0c0', 0.6);
        context.restore();
        context.fillStyle = '#7ef0c0';
        context.fillRect(pickup.x - 6, pickup.y - 2, 12, 4);
        context.fillRect(pickup.x - 2, pickup.y - 6, 4, 12);
      }
    }
  };

  Game.drawEnemies = function drawEnemies() {
    for (const enemy of state.enemies) Game.drawEnemy(enemy);
  };

  Game.drawPlayerBullets = function drawPlayerBullets() {
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const bullet of state.bullets) {
      if (bullet.ret) {
        context.fillStyle = bullet.color;
        context.beginPath(); context.arc(bullet.x, bullet.y, bullet.r, 0, math.TAU); context.fill();
        context.strokeStyle = math.colorWithAlpha(bullet.color, 0.5);
        context.lineWidth = 2;
        context.beginPath(); context.arc(bullet.x, bullet.y, bullet.r + 5, bullet.phase * 12, bullet.phase * 12 + 4); context.stroke();
      } else {
        const ang = Math.atan2(bullet.vy, bullet.vx);
        const tl = bullet.long ? 34 : 13;
        context.strokeStyle = math.colorWithAlpha(bullet.color, 0.85);
        context.lineWidth = bullet.r * 0.9;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(bullet.x, bullet.y);
        context.lineTo(bullet.x - Math.cos(ang) * tl, bullet.y - Math.sin(ang) * tl);
        context.stroke();
        context.fillStyle = bullet.color;
        context.beginPath(); context.arc(bullet.x, bullet.y, bullet.r * 0.75, 0, math.TAU); context.fill();
      }
    }
    context.restore();
  };

  Game.drawEnemyBullets = function drawEnemyBullets() {
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const bullet of state.enemyBullets) {
      Game.glowCircle(bullet.x, bullet.y, bullet.r * 3, bullet.color, 0.6);
      context.fillStyle = '#fff';
      context.beginPath(); context.arc(bullet.x, bullet.y, bullet.r * 0.5, 0, math.TAU); context.fill();
    }
    context.restore();
  };

  Game.drawWaves = function drawWaves() {
    for (const wave of state.waves) {
      const k = math.clamp(wave.r / wave.maxR, 0, 1);
      context.strokeStyle = math.colorWithAlpha(wave.color, (1 - k) * 0.9);
      context.lineWidth = (wave.w || 6) * (1 - k * 0.6);
      context.beginPath(); context.arc(wave.x, wave.y, wave.r, 0, math.TAU); context.stroke();
      context.strokeStyle = math.colorWithAlpha('#ffffff', (1 - k) * 0.35);
      context.lineWidth = 1.5;
      context.beginPath(); context.arc(wave.x, wave.y, wave.r * 0.94, 0, math.TAU); context.stroke();
    }
  };

  Game.drawAttackEffects = function drawAttackEffects() {
    for (const fx of state.effects) {
      const k = fx.life / fx.max;
      if (fx.kind === 'beam') {
        context.save();
        context.translate(fx.x, fx.y);
        context.rotate(fx.a);
        const g = context.createLinearGradient(0, 0, fx.len, 0);
        g.addColorStop(0, math.colorWithAlpha(fx.color, 0.95 * k));
        g.addColorStop(1, math.colorWithAlpha(fx.color, 0));
        context.fillStyle = g;
        context.fillRect(0, -5 * k, fx.len, 10 * k);
        context.fillStyle = 'rgba(255,255,255,' + (0.9 * k) + ')';
        context.fillRect(0, -1.5, fx.len, 3);
        context.restore();
      } else if (fx.kind === 'chain') {
        context.strokeStyle = math.colorWithAlpha(fx.color, 0.9 * k);
        context.lineWidth = 2.5;
        context.beginPath();
        for (const s of fx.segs) {
          const steps = 5;
          context.moveTo(s[0], s[1]);
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const px = s[0] + (s[2] - s[0]) * t + math.randomRange(-9, 9);
            const py = s[1] + (s[3] - s[1]) * t + math.randomRange(-9, 9);
            context.lineTo(px, py);
          }
        }
        context.stroke();
      }
    }
  };

  Game.drawPlayerWeapons = function drawPlayerWeapons() {
    if (state.player) Game.drawWeaponVisuals();
  };

  Game.drawPlayer = function drawPlayer() {
    if (state.player && state.screen !== 'dead') {
      context.save();
      context.globalCompositeOperation = 'lighter';
      Game.glowCircle(state.player.x, state.player.y, 62, '#6ad8ff', 0.35);
      if (state.player.superCd <= 0) {
        const pul = 0.5 + 0.5 * Math.sin(performance.now() / 220);
        context.strokeStyle = 'rgba(200,160,255,' + (0.35 + pul * 0.45) + ')';
        context.lineWidth = 2;
        context.beginPath(); context.arc(state.player.x, state.player.y, 26 + pul * 4, 0, math.TAU); context.stroke();
      }
      context.restore();
      const blink = state.player.inv > 0 && Math.floor(state.player.inv * 14) % 2 === 0;
      context.fillStyle = blink ? '#ffffff' : '#bfeaff';
      context.beginPath(); context.arc(state.player.x, state.player.y, state.player.r, 0, math.TAU); context.fill();
      context.fillStyle = '#0a1a2e';
      context.beginPath(); context.arc(state.player.x, state.player.y, state.player.r * 0.5, 0, math.TAU); context.fill();
      context.fillStyle = '#7ff0ff';
      context.beginPath(); context.arc(state.player.x, state.player.y, state.player.r * 0.28, 0, math.TAU); context.fill();
    }
  };

  Game.drawParticles = function drawParticles() {
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const particle of state.particles) {
      const k = math.clamp(particle.life / particle.max, 0, 1);
      context.globalAlpha = k;
      context.fillStyle = particle.color;
      context.beginPath(); context.arc(particle.x, particle.y, particle.r * k, 0, math.TAU); context.fill();
    }
    context.restore();
    context.globalAlpha = 1;
  };

  Game.drawFloatingText = function drawFloatingText() {
    for (const f of state.floatingTexts) {
      const k = math.clamp(f.life / f.max, 0, 1);
      context.globalAlpha = k;
      context.fillStyle = f.color;
      context.font = '700 14px ' + viewport.fontFamily;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(f.text, f.x, f.y);
    }
    context.globalAlpha = 1;
  };

  Game.drawScreenEffects = function drawScreenEffects() {
    // винтетка
    const vg = context.createRadialGradient(viewport.width / 2, viewport.height / 2, Math.min(viewport.width, viewport.height) * 0.35, viewport.width / 2, viewport.height / 2, Math.max(viewport.width, viewport.height) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.72)');
    context.fillStyle = vg;
    context.fillRect(0, 0, viewport.width, viewport.height);

    if (state.flash > 0) {
      context.fillStyle = 'rgba(200,180,255,' + (state.flash * 0.5) + ')';
      context.fillRect(0, 0, viewport.width, viewport.height);
    }

  };

  /* =========================================================
     HUD
     ========================================================= */
  Game.drawRoundedRect = function drawRoundedRect(x, y, width, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + h - r);
    context.quadraticCurveTo(x + width, y + h, x + width - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  };

  Game.drawText = function drawText(s, x, y, size, color, align) {
    context.fillStyle = color;
    context.font = '700 ' + size + 'px ' + viewport.fontFamily;
    context.textAlign = align || 'left';
    context.textBaseline = 'middle';
    context.fillText(s, x, y);
  };

  Game.drawHealthBar = function drawHealthBar(x, y, width, height, current, maximum) {
    const ratio = maximum > 0 ? math.clamp(current / maximum, 0, 1) : 0;
    const filledWidth = width * ratio;
    const label = Math.ceil(Math.max(0, current)) + ' / ' + maximum;
    context.save();
    Game.drawRoundedRect(x, y, width, height, height / 2);
    context.fillStyle = '#0a0f1a';
    context.fill();
    // Общая форма бара задаёт скругления, а прямоугольник — точную границу HP.
    context.clip();
    const gradient = context.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, '#ff4d6d');
    gradient.addColorStop(1, '#ff9a5c');
    context.fillStyle = gradient;
    context.fillRect(x, y, filledWidth, height);
    Game.drawText(label, x + width / 2, y + height / 2, 11, '#eaf2ff', 'center');
    context.save();
    context.beginPath();
    context.rect(x, y, filledWidth, height);
    context.clip();
    Game.drawText(label, x + width / 2, y + height / 2, 11, '#0a0f1a', 'center');
    context.restore();
    context.restore();
  };

  Game.drawHUD = function drawHUD() {
    // HP: цвет цифр следует за точной границей заполнения, включая часть символа.
    const bx = 22, by = 22, bw = 264;
    Game.drawHealthBar(bx, by, bw, 16, state.player.hp, state.player.maxHp);

    // XP
    context.fillStyle = 'rgba(10,14,26,0.72)';
    Game.drawRoundedRect(bx, by + 22, bw, 7, 4); context.fill();
    context.fillStyle = '#5aa8ff';
    Game.drawRoundedRect(bx, by + 22, Math.max(3, bw * math.clamp(state.xp / state.experienceNeeded, 0, 1)), 7, 4); context.fill();

    Game.drawText('УР. ' + state.level, bx, by + 48, 13, '#bfe0ff');

    // таймер / убийства
    Game.drawText(Math.floor(state.gameTime / 60) + ':' + String(Math.floor(state.gameTime % 60)).padStart(2, '0'), viewport.width - 22, by + 8, 20, '#eaf2ff', 'right');
    Game.drawText('убито: ' + state.kills, viewport.width - 22, by + 30, 12, '#8fa4c8', 'right');
    const dtxt = 'оружие: ' + Math.ceil(state.dropTimer) + ' с';
    Game.drawText(dtxt, viewport.width - 22, by + 50, 12, state.dropTimer < 8 ? '#ffd166' : '#8fa4c8', 'right');
    Game.drawText(Game.music.on ? '♪ музыка вкл' : '♪ музыка выкл', viewport.width - 22, by + 68, 11, Game.music.on ? '#7ef0c0' : '#6b7a9c', 'right');

    // полоса босса
    if (state.activeBoss && !state.activeBoss.dead) {
      const width = Math.min(560, viewport.width - 120), x = (viewport.width - width) / 2, y = 26;
      context.fillStyle = 'rgba(10,14,26,0.75)';
      Game.drawRoundedRect(x, y, width, 14, 7); context.fill();
      const k = math.clamp(state.activeBoss.hp / state.activeBoss.maxHp, 0, 1);
      const g = context.createLinearGradient(x, 0, x + width, 0);
      g.addColorStop(0, '#ff2d6f');
      g.addColorStop(1, '#ff8a5c');
      context.fillStyle = g;
      Game.drawRoundedRect(x, y, Math.max(4, width * k), 14, 7); context.fill();
      Game.drawText('МИНИ-БОСС ' + state.activeBoss.tier + ' · ' + Math.ceil(Math.max(0, state.activeBoss.hp)) + '/' + state.activeBoss.maxHp + ' HP', viewport.width / 2, y + 34, 12, '#ff8ab0', 'center');
    }

    // суперудар
    const sw = 300, swx = (viewport.width - sw) / 2, swy = viewport.height - 52;
    context.fillStyle = 'rgba(10,14,26,0.72)';
    Game.drawRoundedRect(swx, swy, sw, 14, 7); context.fill();
    const sk = state.player.superCd > 0 ? 1 - state.player.superCd / state.player.superMax : 1;
    const sg = context.createLinearGradient(swx, 0, swx + sw, 0);
    sg.addColorStop(0, '#8a5cff');
    sg.addColorStop(1, '#c8a0ff');
    context.fillStyle = sg;
    Game.drawRoundedRect(swx, swy, Math.max(4, sw * sk), 14, 7); context.fill();
    if (state.player.superCd <= 0) {
      const pul = 0.6 + 0.4 * Math.sin(performance.now() / 180);
      context.globalAlpha = pul;
      Game.drawText('ПРОБЕЛ — СУПЕРУДАР ГОТОВ', viewport.width / 2, swy + 7, 12, '#ffffff', 'center');
      context.globalAlpha = 1;
    } else {
      Game.drawText('СУПЕРУДАР: ' + Math.ceil(state.player.superCd) + ' с', viewport.width / 2, swy + 7, 11, '#c9b8ff', 'center');
    }

    // оружие в слотах
    let ix = 22, iy = viewport.height - 40;
    for (const weapon of state.player.weapons) {
      context.fillStyle = 'rgba(10,14,26,0.8)';
      Game.drawRoundedRect(ix, iy, 34, 34, 8); context.fill();
      context.strokeStyle = math.colorWithAlpha(weapon.def.color, 0.85);
      context.lineWidth = 2;
      Game.drawRoundedRect(ix, iy, 34, 34, 8); context.stroke();
      context.fillStyle = weapon.def.color;
      context.beginPath(); context.arc(ix + 17, iy + 17, 8, 0, math.TAU); context.fill();
      if (weapon.stack > 1) Game.drawText('×' + weapon.stack, ix + 30, iy + 6, 10, '#fff', 'right');
      ix += 40;
    }

    // указатель на упавшее оружие за экраном
    for (const pickup of state.pickups) {
      if (pickup.kind !== 'weapon') continue;
      const sx2 = pickup.x - state.camera.x, sy2 = pickup.y - state.camera.y;
      if (sx2 > 20 && sx2 < viewport.width - 20 && sy2 > 20 && sy2 < viewport.height - 20) continue;
      const cx = math.clamp(sx2, 46, viewport.width - 46), cy = math.clamp(sy2, 90, viewport.height - 90);
      const a = Math.atan2(sy2 - viewport.height / 2, sx2 - viewport.width / 2);
      context.save();
      context.translate(cx, cy);
      context.rotate(a);
      context.fillStyle = math.colorWithAlpha(pickup.def.color, 0.9);
      context.beginPath();
      context.moveTo(12, 0); context.lineTo(-8, -8); context.lineTo(-8, 8);
      context.closePath(); context.fill();
      context.restore();
    }
  };

  /* =========================================================
     ЭКРАНЫ
     ========================================================= */
  Game.panel = function panel(width, h, top) {
    context.fillStyle = 'rgba(4,6,16,0.82)';
    context.fillRect(0, 0, viewport.width, viewport.height);
    const x = (viewport.width - width) / 2, y = top === undefined ? (viewport.height - h) / 2 : top;
    context.fillStyle = 'rgba(12,16,32,0.94)';
    Game.drawRoundedRect(x, y, width, h, 16); context.fill();
    context.strokeStyle = 'rgba(120,200,255,0.28)';
    context.lineWidth = 1.5;
    Game.drawRoundedRect(x, y, width, h, 16); context.stroke();
    return { x, y };
  };

  Game.drawOverlays = function drawOverlays() {
    if (state.screen === 'menu') {
      context.fillStyle = 'rgba(4,6,16,0.55)';
      context.fillRect(0, 0, viewport.width, viewport.height);
      const cy = viewport.height / 2;
      context.save();
      context.shadowColor = '#6ad8ff';
      context.shadowBlur = 26;
      Game.drawText('НЕОН', viewport.width / 2, cy - 78, 68, '#dff4ff', 'center');
      context.shadowColor = '#c8a0ff';
      Game.drawText('ВЫЖИВАНИЕ', viewport.width / 2, cy - 16, 46, '#c8a0ff', 'center');
      context.restore();
      Game.drawText('55 видов оружия · боссы · сверхновая', viewport.width / 2, cy + 34, 14, '#8fa4c8', 'center');
      const pul = 0.55 + 0.45 * Math.sin(performance.now() / 320);
      context.globalAlpha = pul;
      Game.drawText('ENTER — НАЧАТЬ', viewport.width / 2, cy + 84, 20, '#7ef0c0', 'center');
      context.globalAlpha = 1;
      Game.drawText('WASD — движение · ПРОБЕЛ — суперудар · ESC/P — пауза · M — музыка', viewport.width / 2, cy + 126, 12, '#6b7a9c', 'center');
      Game.drawText('каждые 45 секунд рядом падает ящик с новым оружием', viewport.width / 2, cy + 150, 12, '#5d6b8c', 'center');
    }

    if (state.screen === 'paused') {
      const width = Math.min(440, viewport.width - 32), h = 330;
      const panelBounds = Game.panel(width, h, viewport.width < 1000 ? 16 : undefined);
      Game.drawText('ПАУЗА', viewport.width / 2, panelBounds.y + 44, 30, '#dff4ff', 'center');
      Game.drawText('время: ' + Math.floor(state.gameTime) + ' с · убито: ' + state.kills + ' · уровень: ' + state.level, viewport.width / 2, panelBounds.y + 86, 13, '#8fa4c8', 'center');
      Game.drawText('Арсенал: ' + state.player.weapons.length + '/' + config.MAX_WEAPONS + ' · подробности слева', viewport.width / 2, panelBounds.y + 118, 12, '#7ef0c0', 'center');
      Game.drawText('суперудар: ' + (state.player.superCd > 0 ? Math.ceil(state.player.superCd) + ' с' : 'готов'), viewport.width / 2, panelBounds.y + 146, 12, '#c8a0ff', 'center');
      Game.drawText('УРОН ×' + state.player.dmgMul.toFixed(2) + ' · СКОРОСТРЕЛЬНОСТЬ ×' + state.player.rateMul.toFixed(2), viewport.width / 2, panelBounds.y + 174, 12, '#ffd166', 'center');
      Game.drawText('ESC / P — продолжить', viewport.width / 2, panelBounds.y + 200, 15, '#eaf2ff', 'center');
      Game.drawText('R — начать заново', viewport.width / 2, panelBounds.y + 232, 15, '#ffb0c0', 'center');
      Game.drawText('M — музыка ' + (Game.music.on ? 'выкл' : 'вкл'), viewport.width / 2, panelBounds.y + 264, 13, '#8fa4c8', 'center');
    }

    if (state.screen === 'upgrade') {
      const width = Math.min(720, viewport.width - 60), h = 330, panelBounds = Game.panel(width, h);
      Game.drawText('НОВЫЙ УРОВЕНЬ ' + state.level, viewport.width / 2, panelBounds.y + 40, 24, '#7ef0c0', 'center');
      Game.drawText('выбери улучшение — клавиши 1 / 2 / 3', viewport.width / 2, panelBounds.y + 72, 13, '#8fa4c8', 'center');
      const cw = (width - 80) / 3;
      for (let i = 0; i < state.cards.length; i++) {
        const cx = panelBounds.x + 26 + i * (cw + 14);
        const cy = panelBounds.y + 100;
        context.fillStyle = 'rgba(20,28,48,0.95)';
        Game.drawRoundedRect(cx, cy, cw, 180, 12); context.fill();
        context.strokeStyle = 'rgba(126,240,192,0.5)';
        context.lineWidth = 1.5;
        Game.drawRoundedRect(cx, cy, cw, 180, 12); context.stroke();
        Game.drawText(String(i + 1), cx + cw / 2, cy + 26, 20, '#7ef0c0', 'center');
        const words = state.cards[i].name.split(' ');
        let line = '', ly = cy + 66;
        context.font = '700 15px ' + viewport.fontFamily;
        for (const wd of words) {
          if ((line + ' ' + wd).length > 16) {
            Game.drawText(line, cx + cw / 2, ly, 15, '#eaf2ff', 'center');
            line = wd; ly += 20;
          } else line = line ? line + ' ' + wd : wd;
        }
        if (line) Game.drawText(line, cx + cw / 2, ly, 15, '#eaf2ff', 'center');
        const dwords = state.cards[i].desc.split(' ');
        let dl = '', dly = ly + 34;
        context.font = '400 12px ' + viewport.fontFamily;
        for (const wd of dwords) {
          if ((dl + ' ' + wd).length > 22) {
            Game.drawText(dl, cx + cw / 2, dly, 12, '#8fa4c8', 'center');
            dl = wd; dly += 16;
          } else dl = dl ? dl + ' ' + wd : wd;
        }
        if (dl) Game.drawText(dl, cx + cw / 2, dly, 12, '#8fa4c8', 'center');
      }
    }

    if (state.screen === 'weapon') {
      const width = Math.min(760, viewport.width - 60), h = 320, panelBounds = Game.panel(width, h);
      Game.drawText('ЯЩИК С ОРУЖИЕМ', viewport.width / 2, panelBounds.y + 38, 24, '#ffd166', 'center');
      Game.drawText('выбери ствол — клавиши 1 / 2 / 3 · он останется навсегда', viewport.width / 2, panelBounds.y + 70, 13, '#8fa4c8', 'center');
      const cw = (width - 80) / 3;
      for (let i = 0; i < state.weaponCards.length; i++) {
        const definition = state.weaponCards[i];
        const cx = panelBounds.x + 26 + i * (cw + 14);
        const cy = panelBounds.y + 98;
        context.fillStyle = 'rgba(20,28,48,0.95)';
        Game.drawRoundedRect(cx, cy, cw, 180, 12); context.fill();
        context.strokeStyle = math.colorWithAlpha(definition.color, 0.6);
        context.lineWidth = 1.5;
        Game.drawRoundedRect(cx, cy, cw, 180, 12); context.stroke();
        context.save();
        context.globalCompositeOperation = 'lighter';
        Game.glowCircle(cx + cw / 2, cy + 44, 34, definition.color, 0.5);
        context.restore();
        context.fillStyle = definition.color;
        context.beginPath(); context.arc(cx + cw / 2, cy + 44, 12, 0, math.TAU); context.fill();
        Game.drawText(definition.name, cx + cw / 2, cy + 92, 14, '#eaf2ff', 'center');
        Game.drawText(definition.grp + ' · ' + definition.dmg + ' урона', cx + cw / 2, cy + 118, 12, '#8fa4c8', 'center');
        Game.drawText(String(i + 1), cx + cw / 2, cy + 156, 16, definition.color, 'center');
      }
    }

    if (state.screen === 'dead') {
      const width = Math.min(520, viewport.width - 60), h = 300, panelBounds = Game.panel(width, h);
      Game.drawText('ТЫ ПАЛ', viewport.width / 2, panelBounds.y + 46, 32, '#ff6b8a', 'center');
      Game.drawText('продержался ' + Math.floor(state.gameTime) + ' с', viewport.width / 2, panelBounds.y + 94, 18, '#eaf2ff', 'center');
      Game.drawText('убито врагов: ' + state.kills + ' · уровень: ' + state.level + ' · боссов побеждено: ' + state.bossesDefeated, viewport.width / 2, panelBounds.y + 128, 13, '#8fa4c8', 'center');
      Game.drawText('оружия собрано: ' + state.player.weapons.length, viewport.width / 2, panelBounds.y + 152, 13, '#8fa4c8', 'center');
      const pul = 0.55 + 0.45 * Math.sin(performance.now() / 300);
      context.globalAlpha = pul;
      Game.drawText('ENTER — ещё раз', viewport.width / 2, panelBounds.y + 212, 19, '#7ef0c0', 'center');
      context.globalAlpha = 1;
    }
  };


  // Описываем реальные единицы урона, не выдавая суммарный урон залпа за DPS.
  Game.getWeaponSummaryRows = function getWeaponSummaryRows() {
    const player = state.player;
    if (!player) return [];
    const number = value => Number(value.toFixed(2)).toLocaleString('ru-RU');
    const rows = [{
      id: 'base', name: 'Базовый бластер', stack: 1,
      damage: 10 * player.dmgMul, interval: 0.55 / player.rateMul,
      detail: 'Урон пули: ' + number(10 * player.dmgMul) + ' · интервал: ' + number(0.55 / player.rateMul) + ' с\n' +
        'Пуль в залпе: ' + player.bullets + ' · бонус пробития: ' + player.pierceBonus + ' · без слота'
    }];
    for (const weapon of player.weapons) {
      const definition = weapon.def;
      const multiplier = Math.pow(1.28, weapon.stack - 1) * player.dmgMul;
      let damage = definition.dmg * multiplier;
      let unit = 'Урон снаряда';
      let interval = definition.cd / player.rateMul;
      let extra = '';
      if (definition.type === 'orbit') {
        interval = 0.3 / player.rateMul; unit = 'Урон контакта';
        extra = 'Орбит: ' + (definition.count || 2) + ' · радиус: ' + (definition.orbitR || 95);
      } else if (definition.type === 'aura') {
        interval = 0.3 / player.rateMul; damage *= 1.2; unit = 'Урон импульса';
        extra = 'Радиус ауры: ' + definition.auraR;
      } else if (definition.type === 'gravity') {
        damage *= 2.2; unit = 'Урон в секунду в поле';
        extra = 'Радиус: ' + definition.wellR + ' · длительность: ' + definition.dur + ' с';
      } else if (definition.type === 'chain') {
        unit = 'Урон на цель'; extra = 'Целей в цепи: ' + (definition.chain || 4);
      } else if (definition.type === 'beam') {
        unit = 'Урон луча'; extra = 'Лучей: ' + (definition.count || 1) + ' · пробитие: ' + definition.pierce;
      } else if (definition.type === 'flame') {
        damage *= 0.55; extra = 'Частиц в залпе: 3';
      } else if (definition.type === 'mine') {
        unit = 'Урон взрыва'; extra = 'Мин за раз: ' + (definition.count || 1) + ' · радиус взрыва: ' + definition.mineR;
      } else if (definition.type === 'nova') {
        unit = 'Урон волны'; extra = 'Радиус волны: ' + definition.maxR;
      } else if (definition.type === 'drone') {
        extra = 'Дронов: ' + (definition.count || 1);
      } else {
        extra = 'Снарядов за раз: ' + (definition.count || 1);
        if (definition.explode) extra += ' · урон взрывной волны: ' + number(damage * 0.7);
      }
      rows.push({
        id: definition.id, name: definition.name, stack: weapon.stack, damage, interval,
        detail: definition.grp + ' · ' + unit + ': ' + number(damage) + '\nИнтервал атак: ' + number(interval) + ' с · ' + extra
      });
    }
    return rows;
  };

  let weaponSummary = document.getElementById('weapon-summary');
  let weaponSummaryList = document.getElementById('weapon-summary-list');
  function ensureWeaponSummary() {
    // Предпросмотр может обновить JS раньше HTML. Дополнительная панель не должна блокировать запуск.
    if (!weaponSummary) {
      weaponSummary = document.createElement('aside');
      weaponSummary.id = 'weapon-summary';
      weaponSummary.hidden = true;
      const heading = document.createElement('h2');
      heading.textContent = 'АРСЕНАЛ';
      weaponSummary.appendChild(heading);
      document.body.appendChild(weaponSummary);
    }
    if (!weaponSummaryList) {
      weaponSummaryList = document.createElement('div');
      weaponSummaryList.id = 'weapon-summary-list';
      weaponSummary.appendChild(weaponSummaryList);
    }
  }
  let lastWeaponSummary = '';
  let lastWeaponSummaryKey = '';
  Game.syncWeaponSummary = function syncWeaponSummary() {
    ensureWeaponSummary();
    weaponSummary.hidden = state.screen !== 'paused';
    if (weaponSummary.hidden) return;
    const player = state.player;
    const summaryKey = JSON.stringify([player.dmgMul, player.rateMul, player.bullets, player.pierceBonus,
      player.weapons.map(weapon => [weapon.def.id, weapon.stack])]);
    if (summaryKey === lastWeaponSummaryKey) return;
    lastWeaponSummaryKey = summaryKey;
    const rows = Game.getWeaponSummaryRows();
    // Первый предмет остаётся внизу; новые предметы добавляются над ним.
    const text = rows.reverse().map(row => row.name + (row.stack > 1 ? ' ×' + row.stack : '') + '\n' + row.detail).join('\n\n');
    if (text !== lastWeaponSummary) {
      weaponSummaryList.textContent = text;
      lastWeaponSummary = text;
      weaponSummary.scrollTop = weaponSummary.scrollHeight;
    }
  };

})(window.NeonGame);
