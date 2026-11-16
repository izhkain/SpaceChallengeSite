// Данные: state, viewport, math, config. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state, viewport, math, config } = Game;

  /* =========================================================
     УРОН / СМЕРТЬ ВРАГОВ
     ========================================================= */
  Game.hurtEnemy = function hurtEnemy(enemy, dmg, opt) {
    if (!enemy || enemy.dead) return;
    enemy.hp -= dmg;
    enemy.flash = 0.1;
    if (opt) {
      if (opt.knock) {
        const a = Math.atan2(enemy.y - state.player.y, enemy.x - state.player.x);
        enemy.x += Math.cos(a) * opt.knock;
        enemy.y += Math.sin(a) * opt.knock;
      }
      if (opt.slow) { enemy.slow = Math.max(enemy.slow || 0, opt.slow); enemy.slowAmt = Math.min(enemy.slowAmt || 1, opt.amt || 0.5); }
      if (opt.burn) enemy.burn = Math.max(enemy.burn || 0, 1.6);
    }
    if (enemy.hp <= 0) Game.killEnemy(enemy);
  };

  Game.killEnemy = function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    state.kills++;
    const n = enemy.boss ? 42 : 7;
    for (let i = 0; i < n; i++) Game.spawnParticle(enemy.x, enemy.y, enemy.color, enemy.boss ? 430 : 210);
    if (enemy.boss) {
      if (state.activeBoss === enemy) {
        state.activeBoss = null;
        state.bossTimer = config.BOSS_EVERY;
      }
      state.bossesDefeated++;
      state.shake = 22; state.flash = 0.45;
      state.enemyBullets.length = 0;
      for (let i = 0; i < 26; i++) Game.spawnPickup(enemy.x + math.randomRange(-70, 70), enemy.y + math.randomRange(-70, 70), 'xp', 4);
      Game.spawnPickup(enemy.x, enemy.y, 'crateBoss');
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
      Game.addFloat(enemy.x, enemy.y - 30, 'БОСС ПОВЕРЖЕН!', '#ffd166');
    } else {
      Game.spawnPickup(enemy.x, enemy.y, 'xp', enemy.xp);
      if (Math.random() < 0.035) Game.spawnPickup(enemy.x, enemy.y, 'hp');
    }
  };

  Game.hitPlayer = function hitPlayer(dmg) {
    if (state.player.inv > 0) return;
    state.player.hp -= dmg;
    state.player.inv = 0.75;
    state.shake = Math.max(state.shake, 11);
    state.flash = Math.max(state.flash, 0.2);
    for (let i = 0; i < 10; i++) Game.spawnParticle(state.player.x, state.player.y, '#ff6b8a', 250);
    if (state.player.hp <= 0) {
      state.player.hp = 0;
      state.screen = 'dead';
      for (let i = 0; i < 60; i++) Game.spawnParticle(state.player.x, state.player.y, '#8adcff', 420);
      state.shake = 26;
    }
  };

  /* =========================================================
     ВРАГИ
     ========================================================= */
  Game.spawnEnemy = function spawnEnemy() {
    const t = state.gameTime;
    const diff = 1 + t / 55;
    let type = 'slime';
    const roll = Math.random();
    if (t > 22 && roll < 0.32) type = 'runner';
    else if (t > 55 && roll > 0.78) type = 'brute';
    const enemyType = config.ENEMY_TYPES[type];
    const a = math.randomRange(0, math.TAU), distance = Math.max(viewport.width, viewport.height) * 0.62;
    state.enemies.push({
      x: state.player.x + Math.cos(a) * distance, y: state.player.y + Math.sin(a) * distance,
      r: enemyType.r, hp: enemyType.hp * diff, maxHp: enemyType.hp * diff,
      speed: enemyType.speed * (1 + t / 620), color: enemyType.color, xp: enemyType.xp, dmg: enemyType.dmg,
      flash: 0, id: state.nextEntityId++, boss: false, slow: 0, slowAmt: 1, burn: 0, dead: false
    });
  };

  Game.spawnBoss = function spawnBoss() {
    // Не заменяем живого босса и его полосу здоровья новым.
    if (state.activeBoss && !state.activeBoss.dead) return state.activeBoss;
    state.bossTier++;
    const a = math.randomRange(0, math.TAU), distance = Math.max(viewport.width, viewport.height) * 0.62;
    const hp = 620 + state.bossTier * 560;
    const enemy = {
      x: state.player.x + Math.cos(a) * distance, y: state.player.y + Math.sin(a) * distance, r: 34,
      hp, maxHp: hp, tier: state.bossTier, speed: 48 + state.bossTier * 5, color: '#ff5f8f',
      xp: 40, dmg: 22, flash: 0, id: state.nextEntityId++, boss: true,
      shootCd: 2.0, dashCd: 3.4, dash: 0, dvx: 0, dvy: 0,
      slow: 0, slowAmt: 1, burn: 0, dead: false
    };
    state.enemies.push(enemy);
    state.activeBoss = enemy;
    state.shake = 18; state.flash = 0.35;
    Game.addFloat(state.player.x, state.player.y - 60, 'ВНИМАНИЕ: БОСС', '#ff5f8f');
    return enemy;
  };

  Game.updateBoss = function updateBoss(enemy, dt, sp) {
    enemy.shootCd -= dt;
    enemy.dashCd -= dt;
    
    // Увеличиваем скорость босса с уровнем
    const bossSpeedMultiplier = 1 + enemy.tier * 0.1;
    
    if (enemy.dash > 0) {
      enemy.dash -= dt;
      enemy.x += enemy.dvx * dt;
      enemy.y += enemy.dvy * dt;
    } else {
      const a = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      enemy.x += Math.cos(a) * sp * dt * bossSpeedMultiplier;
      enemy.y += Math.sin(a) * sp * dt * bossSpeedMultiplier;
      
      if (enemy.dashCd <= 0) {
        enemy.dashCd = math.randomRange(2.6 - enemy.tier * 0.1, 4.2 - enemy.tier * 0.1); // Уменьшаем время между рывками
        enemy.dash = 0.42;
        const dv = 520 + enemy.tier * 30; // Увеличиваем силу рывка
        enemy.dvx = Math.cos(a) * dv;
        enemy.dvy = Math.sin(a) * dv;
      }
    }
    
    if (enemy.shootCd <= 0) {
      // Уменьшаем время перезарядки с уровнем
      enemy.shootCd = Math.max(0.7 - enemy.tier * 0.05, 1.8 - enemy.tier * 0.09);
      
      // Увеличиваем количество пуль
      const n = 5 + enemy.tier * 3;
      
      const base = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.22;
        
        // Увеличиваем урон пуль
        const bulletDmg = 12 + enemy.tier * 2;
        
        state.enemyBullets.push({ 
          x: enemy.x, 
          y: enemy.y, 
          vx: Math.cos(a) * 265, 
          vy: Math.sin(a) * 265, 
          r: 6, 
          dmg: bulletDmg, 
          life: 3.4, 
          color: '#ff7aa8' 
        });
      }
    }
  };

  Game.updateEnemies = function updateEnemies(dt) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (enemy.dead) { state.enemies.splice(i, 1); continue; }
      if (enemy.flash > 0) enemy.flash -= dt;
      let sp = enemy.speed;
      if (enemy.slow > 0) { enemy.slow -= dt; sp *= (enemy.slowAmt || 0.5); }
      if (enemy.burn > 0) {
        enemy.burn -= dt;
        enemy.hp -= 9 * dt;
        if (enemy.hp <= 0) { Game.killEnemy(enemy); continue; }
      }
      if (enemy.boss) Game.updateBoss(enemy, dt, sp);
      else {
        const a = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
        enemy.x += Math.cos(a) * sp * dt;
        enemy.y += Math.sin(a) * sp * dt;
      }
      const dx = enemy.x - state.player.x, dy = enemy.y - state.player.y;
      if (dx * dx + dy * dy < (enemy.r + state.player.r) * (enemy.r + state.player.r)) Game.hitPlayer(enemy.dmg);
    }
  };

})(window.NeonGame);
