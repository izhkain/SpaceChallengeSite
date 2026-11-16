// Данные: state, math, config. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state, math, config } = Game;

  /* =========================================================
     ВЫСТРЕЛЫ
     ========================================================= */
  Game.pushBullet = function pushBullet(a, dmg, definition, o) {
    const sp = o.speed || 900;
    state.bullets.push({
      x: state.player.x, y: state.player.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: o.r || 4.5, dmg, life: o.life || 1.6, pierce: o.pierce || 0,
      color: definition.color, homing: o.homing || 0, explode: o.explode || 0,
      cluster: o.cluster || 0, bounce: o.bounce || 0, ret: !!o.ret,
      burn: o.burn || 0, slow: o.slow || 0, slowAmt: o.amt || 0.5,
      hitIds: {}, phase: 0, ang: a, long: !!o.long, spin: o.spin || 0
    });
  };

  Game.castBeam = function castBeam(a, dmg, pierce, range, color) {
    const cs = Math.cos(a), sn = Math.sin(a);
    const hits = [];
    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      if (enemy.dead) continue;
      const dx = enemy.x - state.player.x, dy = enemy.y - state.player.y;
      const t = dx * cs + dy * sn;
      if (t < 0 || t > range) continue;
      const perp = Math.abs(-dx * sn + dy * cs);
      if (perp < enemy.r + 12) hits.push({ e: enemy, t });
    }
    hits.sort((leftHit, rightHit) => leftHit.t - rightHit.t);
    let n = 0;
    for (const h of hits) {
      if (n >= pierce) break;
      Game.hurtEnemy(h.e, dmg);
      n++;
    }
    const len = hits.length ? Math.min(range, hits[Math.min(hits.length - 1, pierce - 1)].t + 50) : range * 0.5;
    state.effects.push({ kind: 'beam', x: state.player.x, y: state.player.y, a, len, color, life: 0.16, max: 0.16 });
  };

  Game.fireWeapon = function fireWeapon(weapon) {
    const definition = weapon.def;
    const mult = Math.pow(1.28, weapon.stack - 1);
    const dmg = definition.dmg * state.player.dmgMul * mult;
    const tgt = Game.nearestEnemy(state.player.x, state.player.y, 1400);
    const baseA = tgt ? Math.atan2(tgt.y - state.player.y, tgt.x - state.player.x) : state.player.face;

    switch (definition.type) {
      case 'auto': {
        const n = definition.count || 1, sp = definition.spread || 0;
        for (let i = 0; i < n; i++) {
          const a = baseA + (n > 1 ? (-sp / 2 + sp * i / (n - 1)) : math.randomRange(-0.04, 0.04));
          Game.pushBullet(a, dmg, definition, { speed: definition.speed || 1000, pierce: definition.pierce || 0, homing: definition.homing || 0, life: 1.6 });
        }
        break;
      }
      case 'sniper':
        Game.pushBullet(baseA, dmg, definition, { speed: definition.speed || 1600, pierce: definition.pierce || 4, life: 2.0, r: 6, long: true });
        break;
      case 'blade':
        Game.pushBullet(baseA, dmg, definition, { speed: definition.speed || 1000, pierce: 3, life: 1.4, r: 9, spin: 16 });
        break;
      case 'beam': {
        const n = definition.count || 1, sp = definition.spread || 0;
        for (let i = 0; i < n; i++) {
          const a = baseA + (n > 1 ? (-sp / 2 + sp * i / (n - 1)) : 0);
          Game.castBeam(a, dmg, definition.pierce || 2, definition.range || 800, definition.color);
        }
        break;
      }
      case 'rocket': {
        const n = definition.count || 1;
        for (let i = 0; i < n; i++) {
          const a = baseA + (n > 1 ? math.randomRange(-0.3, 0.3) : math.randomRange(-0.05, 0.05));
          Game.pushBullet(a, dmg, definition, {
            speed: definition.speed || 420, life: 2.2, r: 6,
            homing: definition.homing || 0, explode: definition.explode || 70, cluster: definition.cluster || 0
          });
        }
        break;
      }
      case 'chain': {
        let pos = { x: state.player.x, y: state.player.y };
        const used = new Set();
        const segs = [];
        for (let i = 0; i < (definition.chain || 4); i++) {
          const enemy = Game.nearestEnemy(pos.x, pos.y, 350, used);
          if (!enemy) break;
          used.add(enemy.id);
          segs.push([pos.x, pos.y, enemy.x, enemy.y]);
          Game.hurtEnemy(enemy, dmg);
          pos = { x: enemy.x, y: enemy.y };
        }
        if (segs.length) state.effects.push({ kind: 'chain', segs, color: definition.color, life: 0.18, max: 0.18 });
        break;
      }
      case 'shotgun': {
        const n = definition.count || 6, sp = definition.spread || 0.9;
        for (let i = 0; i < n; i++) {
          const a = baseA + math.randomRange(-sp / 2, sp / 2);
          Game.pushBullet(a, dmg, definition, { speed: definition.speed || 820, life: 0.62, r: 4, pierce: definition.pierce || 0, bounce: definition.bounce || 0 });
        }
        break;
      }
      case 'ring': {
        const n = definition.count || 12;
        for (let i = 0; i < n; i++) {
          Game.pushBullet((i / n) * math.TAU + state.gameTime, dmg, definition, { speed: definition.speed || 620, life: 1.5, r: 5, pierce: 1 });
        }
        break;
      }
      case 'nova':
        state.waves.push({ x: state.player.x, y: state.player.y, r: 8, maxR: definition.maxR || 220, speed: definition.speed || 520, dmg, hit: {}, color: definition.color, knock: definition.knock || 0, w: 6 });
        break;
      case 'mine': {
        const n = definition.count || 1;
        for (let i = 0; i < n; i++) {
          state.mines.push({ x: state.player.x + math.randomRange(-45, 45), y: state.player.y + math.randomRange(-45, 45), r: 9, dmg, mineR: definition.mineR || 80, life: 16, color: definition.color, t: 0 });
        }
        break;
      }
      case 'spiral': {
        const n = definition.count || 1;
        weapon.ang = (weapon.ang || 0) + (definition.step || 0.4);
        for (let i = 0; i < n; i++) {
          Game.pushBullet(weapon.ang + i * math.TAU / n, dmg, definition, { speed: definition.speed || 800, life: 1.6, r: 5 });
        }
        break;
      }
      case 'boomerang': {
        const n = definition.count || 1;
        for (let i = 0; i < n; i++) {
          const a = baseA + (n > 1 ? i * math.TAU / n : 0);
          Game.pushBullet(a, dmg, definition, { speed: definition.speed || 700, life: 2.4, r: 9, pierce: 99, ret: true });
        }
        break;
      }
      case 'bounce':
        Game.pushBullet(baseA, dmg, definition, { speed: definition.speed || 720, life: 3.2, r: 7, pierce: 99, bounce: definition.bounce || 3 });
        break;
      case 'flame': {
        for (let i = 0; i < 3; i++) {
          const a = baseA + math.randomRange(-0.34, 0.34);
          state.bullets.push({
            x: state.player.x + Math.cos(a) * 18, y: state.player.y + Math.sin(a) * 18,
            vx: Math.cos(a) * math.randomRange(360, 580), vy: Math.sin(a) * math.randomRange(360, 580),
            r: math.randomRange(7, 12), dmg: dmg * 0.55, life: 0.34, pierce: 2, color: definition.color,
            homing: 0, explode: 0, cluster: 0, bounce: 0, ret: false,
            burn: definition.burn ? 1.6 : 0, slow: definition.slow ? 1 : 0, slowAmt: definition.amt || 0.5,
            hitIds: {}, phase: 0, ang: a, long: false, spin: 0
          });
        }
        break;
      }
    }
  };

  /* =========================================================
     ОРУЖИЕ ИГРОКА
     ========================================================= */
  Game.grantWeapon = function grantWeapon(def) {
    const ex = state.player.weapons.find(weapon => weapon.def.id === def.id);
    if (ex) {
      ex.stack++;
      Game.addFloat(state.player.x, state.player.y - 20, def.name + ' ×' + ex.stack, def.color);
      return;
    }
    if (state.player.weapons.length >= config.MAX_WEAPONS) {
      const old = state.player.weapons.shift();
      Game.addFloat(state.player.x, state.player.y - 34, '− ' + old.def.name, '#ff8a8a');
    }
    state.player.weapons.push({ def, stack: 1, t: 0, ang: math.randomRange(0, math.TAU), hitCd: 0 });
    Game.addFloat(state.player.x, state.player.y - 20, def.name, def.color);
  };

  Game.updateWeapons = function updateWeapons(dt) {
    for (const weapon of state.player.weapons) {
      const ty = weapon.def.type;
      if (ty === 'orbit' || ty === 'aura' || ty === 'drone' || ty === 'gravity') continue;
      weapon.t -= dt;
      if (weapon.t <= 0) {
        weapon.t = weapon.def.cd / state.player.rateMul;
        Game.fireWeapon(weapon);
      }
    }
  };

  Game.updatePersistent = function updatePersistent(dt) {
    for (const weapon of state.player.weapons) {
      const definition = weapon.def;
      const mult = Math.pow(1.28, weapon.stack - 1) * state.player.dmgMul;

      if (definition.type === 'orbit') {
        weapon.ang += dt * (definition.spin || 2.2);
        weapon.hitCd -= dt;
        if (weapon.hitCd <= 0) {
          weapon.hitCd = 0.3 / state.player.rateMul;
          const cnt = definition.count || 2, rad = definition.orbitR || 95;
          for (let i = 0; i < cnt; i++) {
            const a = weapon.ang + i * math.TAU / cnt;
            const ox = state.player.x + Math.cos(a) * rad, oy = state.player.y + Math.sin(a) * rad;
            const br = definition.br || 16;
            for (const enemy of state.enemies) {
              if (enemy.dead) continue;
              const dx = enemy.x - ox, dy = enemy.y - oy;
              if (dx * dx + dy * dy < (enemy.r + br) * (enemy.r + br)) Game.hurtEnemy(enemy, definition.dmg * mult);
            }
          }
        }
      } else if (definition.type === 'aura') {
        weapon.t -= dt;
        if (weapon.t <= 0) {
          weapon.t = 0.3 / state.player.rateMul;
          const R = definition.auraR + state.player.r;
          for (const enemy of state.enemies) {
            if (enemy.dead) continue;
            const dx = enemy.x - state.player.x, dy = enemy.y - state.player.y;
            if (dx * dx + dy * dy < (R + enemy.r) * (R + enemy.r)) {
              Game.hurtEnemy(enemy, definition.dmg * mult * 0.3 * 4, { slow: definition.slow ? 1.0 : 0, amt: definition.amt, burn: !!definition.burn });
              if (definition.heal) state.player.hp = Math.min(state.player.maxHp, state.player.hp + definition.heal / state.player.rateMul);
            }
          }
        }
      } else if (definition.type === 'drone') {
        weapon.ang += dt * 1.15;
        weapon.t -= dt;
        if (weapon.t <= 0) {
          weapon.t = definition.cd / state.player.rateMul;
          const cnt = definition.count || 1;
          for (let i = 0; i < cnt; i++) {
            const a = weapon.ang + i * math.TAU / cnt;
            const dx = state.player.x + Math.cos(a) * (definition.orbitR || 70);
            const dy = state.player.y + Math.sin(a) * (definition.orbitR || 70);
            const tgt = Game.nearestEnemy(dx, dy, 900);
            if (!tgt) continue;
            const aa = Math.atan2(tgt.y - dy, tgt.x - dx);
            state.bullets.push({
              x: dx, y: dy, vx: Math.cos(aa) * (definition.speed || 700), vy: Math.sin(aa) * (definition.speed || 700),
              r: 4, dmg: definition.dmg * mult, life: 1.2, pierce: 0, color: definition.color,
              homing: 0, explode: 0, cluster: 0, bounce: 0, ret: false,
              burn: 0, slow: 0, slowAmt: 0.5, hitIds: {}, phase: 0, ang: aa, long: false, spin: 0
            });
          }
        }
      } else if (definition.type === 'gravity') {
        weapon.t -= dt;
        if (weapon.t <= 0) {
          weapon.t = definition.cd / state.player.rateMul;
          const tgt = Game.nearestEnemy(state.player.x, state.player.y, 700);
          state.wells.push({
            x: tgt ? tgt.x : state.player.x + math.randomRange(-140, 140),
            y: tgt ? tgt.y : state.player.y + math.randomRange(-140, 140),
            r: definition.wellR || 170, life: definition.dur || 1.6, max: definition.dur || 1.6,
            pull: definition.pull || 260, dps: definition.dmg * mult * 2.2, color: definition.color
          });
        }
      }
    }
  };

})(window.NeonGame);
