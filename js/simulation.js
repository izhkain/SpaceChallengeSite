// Данные: state, viewport, math, config. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state, viewport, math, config } = Game;

  /* =========================================================
     ПУЛИ И ЭФФЕКТЫ
     ========================================================= */
  Game.explodeAt = function explodeAt(x, y, radius, dmg, color, cluster) {
    state.waves.push({ x, y, r: 10, maxR: radius, speed: radius * 4.2, dmg, hit: {}, color, knock: 0, w: 5 });
    for (let i = 0; i < 14; i++) Game.spawnParticle(x, y, color, 300);
    if (cluster) {
      for (let i = 0; i < cluster; i++) {
        const a = (i / cluster) * math.TAU;
        state.waves.push({
          x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26,
          r: 6, maxR: radius * 0.6, speed: radius * 3.4,
          dmg: dmg * 0.55, hit: {}, color, knock: 0, w: 4
        });
      }
    }
  };

  Game.updateBullets = function updateBullets(dt) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const bullet = state.bullets[i];
      bullet.life -= dt;

      if (bullet.homing > 0) {
        const t = Game.nearestEnemy(bullet.x, bullet.y, 560);
        if (t) {
          const want = Math.atan2(t.y - bullet.y, t.x - bullet.x);
          const cur = Math.atan2(bullet.vy, bullet.vx);
          let diff = ((want - cur + Math.PI * 3) % math.TAU) - Math.PI;
          const na = cur + math.clamp(diff, -bullet.homing * dt, bullet.homing * dt);
          const sp = Math.hypot(bullet.vx, bullet.vy) || 1;
          bullet.vx = Math.cos(na) * sp;
          bullet.vy = Math.sin(na) * sp;
        }
      }

      if (bullet.ret) {
        bullet.phase += dt;
        if (bullet.phase > 0.44) {
          const a = Math.atan2(state.player.y - bullet.y, state.player.x - bullet.x);
          bullet.vx += Math.cos(a) * 1700 * dt;
          bullet.vy += Math.sin(a) * 1700 * dt;
          const cur = Math.hypot(bullet.vx, bullet.vy);
          if (cur > 1450) { bullet.vx *= 1450 / cur; bullet.vy *= 1450 / cur; }
          bullet.hitIds = {};
        }
      }

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (bullet.bounce > 0) {
        const sx = bullet.x - state.camera.x, sy = bullet.y - state.camera.y;
        if (sx < 0) { bullet.x = state.camera.x; bullet.vx = Math.abs(bullet.vx); bullet.bounce--; }
        else if (sx > viewport.width) { bullet.x = state.camera.x + viewport.width; bullet.vx = -Math.abs(bullet.vx); bullet.bounce--; }
        if (sy < 0) { bullet.y = state.camera.y; bullet.vy = Math.abs(bullet.vy); bullet.bounce--; }
        else if (sy > viewport.height) { bullet.y = state.camera.y + viewport.height; bullet.vy = -Math.abs(bullet.vy); bullet.bounce--; }
      }

      let hitSomething = false;
      for (let j = 0; j < state.enemies.length; j++) {
        const enemy = state.enemies[j];
        if (enemy.dead || bullet.hitIds[enemy.id]) continue;
        const dx = enemy.x - bullet.x, dy = enemy.y - bullet.y;
        if (dx * dx + dy * dy < (enemy.r + bullet.r) * (enemy.r + bullet.r)) {
          bullet.hitIds[enemy.id] = 1;
          Game.hurtEnemy(enemy, bullet.dmg, { burn: bullet.burn > 0, slow: bullet.slow, amt: bullet.slowAmt });
          hitSomething = true;
          if (bullet.explode) { Game.explodeAt(bullet.x, bullet.y, bullet.explode, bullet.dmg * 0.7, bullet.color, bullet.cluster); bullet.life = 0; break; }
          if (bullet.pierce > 0) bullet.pierce--;
          else { bullet.life = 0; break; }
        }
      }
      if (hitSomething && bullet.ret) { /* бумеранг летит дальше */ }
      if (bullet.life <= 0) {
        if (bullet.explode) Game.explodeAt(bullet.x, bullet.y, bullet.explode, bullet.dmg * 0.7, bullet.color, bullet.cluster);
        state.bullets.splice(i, 1);
      }
    }
  };

  Game.updateEnemyBullets = function updateEnemyBullets(dt) {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = state.enemyBullets[i];
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      const dx = bullet.x - state.player.x, dy = bullet.y - state.player.y;
      if (dx * dx + dy * dy < (state.player.r + bullet.r) * (state.player.r + bullet.r)) {
        Game.hitPlayer(bullet.dmg);
        state.enemyBullets.splice(i, 1);
        continue;
      }
      if (bullet.life <= 0) state.enemyBullets.splice(i, 1);
    }
  };

  Game.updateWaves = function updateWaves(dt) {
    for (let i = state.waves.length - 1; i >= 0; i--) {
      const wave = state.waves[i];
      wave.r += wave.speed * dt;
      for (const enemy of state.enemies) {
        if (enemy.dead || wave.hit[enemy.id]) continue;
        const dx = enemy.x - wave.x, dy = enemy.y - wave.y;
        if (dx * dx + dy * dy < (wave.r + enemy.r) * (wave.r + enemy.r)) {
          wave.hit[enemy.id] = 1;
          Game.hurtEnemy(enemy, wave.dmg, { knock: wave.knock });
        }
      }
      if (wave.r > wave.maxR) state.waves.splice(i, 1);
    }
  };

  Game.updateMines = function updateMines(dt) {
    for (let i = state.mines.length - 1; i >= 0; i--) {
      const m = state.mines[i];
      m.life -= dt;
      m.t += dt;
      let boom = m.life <= 0;
      for (const enemy of state.enemies) {
        if (enemy.dead) continue;
        const dx = enemy.x - m.x, dy = enemy.y - m.y;
        if (dx * dx + dy * dy < (m.mineR * 0.55 + enemy.r) * (m.mineR * 0.55 + enemy.r)) { boom = true; break; }
      }
      if (boom) {
        Game.explodeAt(m.x, m.y, m.mineR, m.dmg, m.color, 0);
        state.mines.splice(i, 1);
      }
    }
  };

  Game.updateWells = function updateWells(dt) {
    for (let i = state.wells.length - 1; i >= 0; i--) {
      const well = state.wells[i];
      well.life -= dt;
      for (const enemy of state.enemies) {
        if (enemy.dead) continue;
        const dx = well.x - enemy.x, dy = well.y - enemy.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < well.r) {
          const k = (1 - distance / well.r) * well.pull * dt;
          enemy.x += dx / distance * k;
          enemy.y += dy / distance * k;
          Game.hurtEnemy(enemy, well.dps * dt);
        }
      }
      if (well.life <= 0) state.wells.splice(i, 1);
    }
  };

  Game.updatePickups = function updatePickups(dt) {
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const pickup = state.pickups[i];
      pickup.life -= dt;
      if (pickup.life <= 0) { state.pickups.splice(i, 1); continue; }
      if (pickup.kind === 'xp') {
        pickup.x += pickup.vx * dt; pickup.y += pickup.vy * dt;
        pickup.vx *= 0.96; pickup.vy *= 0.96;
        const dx = state.player.x - pickup.x, dy = state.player.y - pickup.y, d2 = dx * dx + dy * dy;
        if (d2 < state.player.magnet * state.player.magnet) {
          const distance = Math.sqrt(d2) || 1;
          pickup.x += dx / distance * 470 * dt;
          pickup.y += dy / distance * 470 * dt;
        }
        if (d2 < (state.player.r + pickup.r + 6) * (state.player.r + pickup.r + 6)) { Game.gainXp(pickup.val); state.pickups.splice(i, 1); }
      } else {
        const dx = state.player.x - pickup.x, dy = state.player.y - pickup.y, d2 = dx * dx + dy * dy;
        const reach = state.player.r + pickup.r + 14;
        if (d2 < reach * reach) {
          if (pickup.kind === 'hp') {
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
            Game.addFloat(state.player.x, state.player.y - 18, '+20 HP', '#7ef0c0');
          } else if (pickup.kind === 'weapon') {
            Game.grantWeapon(pickup.def);
          } else if (pickup.kind === 'crateBoss') {
            Game.openWeaponChoice();
          }
          state.pickups.splice(i, 1);
        }
      }
    }
  };

  /* =========================================================
     СУПЕРУДАР И ДРОП
     ========================================================= */
  Game.useSuper = function useSuper() {
    if (state.screen !== 'playing' || state.player.superCd > 0) return;
    state.player.superCd = state.player.superMax;
    const dmg = 140 + state.player.dmgMul * 60;
    state.waves.push({ x: state.player.x, y: state.player.y, r: 10, maxR: 540, speed: 1500, dmg, hit: {}, color: '#c8a0ff', knock: 95, w: 14 });
    state.waves.push({ x: state.player.x, y: state.player.y, r: 10, maxR: 360, speed: 1100, dmg: dmg * 0.5, hit: {}, color: '#ffffff', knock: 60, w: 8 });
    state.shake = 24; state.flash = 0.5; state.hitstop = 0.14;
    for (let i = 0; i < 80; i++) Game.spawnParticle(state.player.x, state.player.y, '#c8a0ff', 430);
    Game.addFloat(state.player.x, state.player.y - 44, 'СВЕРХНОВАЯ', '#e0c8ff');
  };

  Game.spawnGroundDrop = function spawnGroundDrop() {
    const a = math.randomRange(0, math.TAU), distance = math.randomRange(260, 430);
    const free = config.WEAPONS.filter(weapon => !state.player.weapons.some(o => o.def.id === weapon.id));
    const def = free.length ? math.pickRandom(free) : math.pickRandom(config.WEAPONS);
    state.pickups.push({
      x: state.player.x + Math.cos(a) * distance, y: state.player.y + Math.sin(a) * distance,
      kind: 'weapon', def, val: 1, vx: 0, vy: 0, r: 16,
      life: config.DROP_LIFE, color: def.color
    });
    Game.addFloat(state.player.x, state.player.y - 56, 'ОРУЖИЕ УПАЛО РЯДОМ', def.color);
  };

  /* =========================================================
     АПДЕЙТ ИГРЫ
     ========================================================= */
  Game.updatePlayer = function updatePlayer(dt) {
    let mx = 0, my = 0;
    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) mx--;
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) mx++;
    if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) my--;
    if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) my++;
    if (mx || my) {
      const l = Math.hypot(mx, my);
      state.player.x += mx / l * state.player.speed * dt;
      state.player.y += my / l * state.player.speed * dt;
      state.player.face = Math.atan2(my, mx);
    }
    if (state.player.inv > 0) state.player.inv -= dt;
    if (state.player.regen > 0) state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regen * dt);
    if (state.player.superCd > 0) state.player.superCd = Math.max(0, state.player.superCd - dt);

    const kx = Math.min(1, dt * 7), ky = Math.min(1, dt * 7);
    state.camera.x += ((state.player.x - viewport.width / 2) - state.camera.x) * kx;
    state.camera.y += ((state.player.y - viewport.height / 2) - state.camera.y) * ky;

    state.player.fireCd -= dt;
    if (state.player.fireCd <= 0) {
      const t = Game.nearestEnemy(state.player.x, state.player.y, 1500);
      if (t) {
        state.player.fireCd = 0.55 / state.player.rateMul;
        const baseA = Math.atan2(t.y - state.player.y, t.x - state.player.x);
        const n = state.player.bullets;
        for (let i = 0; i < n; i++) {
          const a = baseA + (n > 1 ? (-0.1 + 0.2 * i / (n - 1)) : math.randomRange(-0.03, 0.03));
          state.bullets.push({
            x: state.player.x, y: state.player.y, vx: Math.cos(a) * 680, vy: Math.sin(a) * 680,
            r: 5, dmg: 10 * state.player.dmgMul, life: 1.5, pierce: state.player.pierceBonus, color: '#a8f0ff',
            homing: 0, explode: 0, cluster: 0, bounce: 0, ret: false,
            burn: 0, slow: 0, slowAmt: 0.5, hitIds: {}, phase: 0, ang: a, long: false, spin: 0
          });
        }
      }
    }
  };

  Game.step = function step(dt) {
    state.gameTime += dt;

    Game.updatePlayer(dt);
    Game.updateWeapons(dt);
    Game.updatePersistent(dt);
    Game.updateEnemies(dt);
    Game.updateBullets(dt);
    Game.updateEnemyBullets(dt);
    Game.updateWaves(dt);
    Game.updateMines(dt);
    Game.updateWells(dt);
    Game.updatePickups(dt);

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const particle = state.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      particle.vx *= 0.94; particle.vy *= 0.94;
      if (particle.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const f = state.floatingTexts[i];
      f.life -= dt;
      f.y -= 26 * dt;
      if (f.life <= 0) state.floatingTexts.splice(i, 1);
    }
    for (let i = state.effects.length - 1; i >= 0; i--) {
      state.effects[i].life -= dt;
      if (state.effects[i].life <= 0) state.effects.splice(i, 1);
    }

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 46);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.9);
    if (state.dropNotice > 0) state.dropNotice -= dt;

    // спавн врагов
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = Math.max(0.16, 0.85 - state.gameTime / 170);
      Game.spawnEnemy();
      if (state.gameTime > 40 && Math.random() < 0.45) Game.spawnEnemy();
    }

    // Пока босс жив, отсчёт следующего появления остановлен.
    if (!state.activeBoss || state.activeBoss.dead) {
      state.bossTimer -= dt;
      if (state.bossTimer <= 0) Game.spawnBoss();
    }

    // оружие на землю
    state.dropTimer -= dt;
    if (state.dropTimer <= 0) {
      state.dropTimer = config.DROP_EVERY;
      Game.spawnGroundDrop();
    }

    Game.music.intensity = state.activeBoss ? 1 : math.clamp(state.gameTime / 150, 0, 0.8);
  };

})(window.NeonGame);
