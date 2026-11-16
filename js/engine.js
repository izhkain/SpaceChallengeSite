"use strict";

// Единственный общий объект приложения. Подсистемы хранят данные и API здесь.
window.NeonGame = { settings: { fpsLimit: 60 }, state: {}, viewport: {}, config: {}, math: {}, background: {} };

// Данные: state, viewport, math, config. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state, viewport, math, config } = Game;

  /* =========================================================
     БАЗА
     ========================================================= */
  math.TAU = Math.PI * 2;
  math.randomRange = (a, bullet) => a + Math.random() * (bullet - a);
  math.randomInteger = (a, bullet) => Math.floor(math.randomRange(a, bullet + 1));
  math.pickRandom = a => a[(Math.random() * a.length) | 0];
  math.clamp = (v, a, bullet) => (v < a ? a : v > bullet ? bullet : v);
  math.midiToFrequency = m => 440 * Math.pow(2, (m - 69) / 12);
  math.colorWithAlpha = (h, a) => {
    const n = parseInt(h.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  viewport.canvas = document.getElementById('cv');
  viewport.context = viewport.canvas.getContext('2d');
  // Единственный источник семейства шрифта — CSS страницы, в том числе для Canvas.
  viewport.fontFamily = getComputedStyle(document.body).fontFamily;
  viewport.width = innerWidth;
  viewport.height = innerHeight;
  viewport.pixelRatio = Math.min(2, devicePixelRatio || 1);

  Game.resize = function resize() {
    const previousWidth = viewport.width;
    const previousHeight = viewport.height;
    viewport.pixelRatio = Math.min(2, devicePixelRatio || 1);
    viewport.width = Math.max(320, innerWidth);
    viewport.height = Math.max(240, innerHeight);
    viewport.canvas.width = Math.floor(viewport.width * viewport.pixelRatio);
    viewport.canvas.height = Math.floor(viewport.height * viewport.pixelRatio);
    viewport.canvas.style.width = viewport.width + 'px';
    viewport.canvas.style.height = viewport.height + 'px';
    viewport.context.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0);
    // Сохраняем положение камеры относительно центра нового окна, в том числе в паузе.
    if (state.player) {
      state.camera.x -= (viewport.width - previousWidth) / 2;
      state.camera.y -= (viewport.height - previousHeight) / 2;
    }
    Game.buildBackground();
  };

  /* =========================================================
     СОСТОЯНИЕ
     ========================================================= */
  config.SUPER_CD = 30;
  config.DROP_EVERY = 45;
  config.DROP_LIFE = 75;
  config.MAX_WEAPONS = 12;
  config.FIRST_BOSS = 40;
  config.BOSS_EVERY = 55;

  state.screen = 'menu';           // menu | playing | paused | upgrade | weapon | dead
  state.player = null;
  state.camera = { x: 0, y: 0 };
  state.enemies = [];
  state.bullets = [];
  state.enemyBullets = [];
  state.pickups = [];
  state.particles = [];
  state.waves = [];
  state.mines = [];
  state.wells = [];
  state.effects = [];
  state.floatingTexts = [];
  state.gameTime = 0;
  state.kills = 0;
  state.level = 1;
  state.xp = 0;
  state.experienceNeeded = 6;
  state.pendingLevels = 0;
  state.shake = 0;
  state.flash = 0;
  state.hitstop = 0;
  state.dropNotice = 0;
  state.spawnTimer = 0;
  state.bossTimer = config.FIRST_BOSS;
  state.dropTimer = config.DROP_EVERY;
  state.bossesDefeated = 0;
  state.bossTier = 0;
  state.activeBoss = null;
  state.cards = [];
  state.weaponCards = [];
  state.nextEntityId = 1;
  state.keys = new Set();

  Game.resetGame = function resetGame() {
    state.player = {
      x: 0, y: 0, r: 14, hp: 100, maxHp: 100, speed: 212,
      dmgMul: 1, rateMul: 1, bullets: 1, pierceBonus: 0, magnet: 130, regen: 0,
      fireCd: 0, weapons: [], inv: 0, face: 0,
      superCd: 0, superMax: config.SUPER_CD
    };
    state.camera.x = state.player.x - viewport.width / 2;
    state.camera.y = state.player.y - viewport.height / 2;
    state.enemies = []; state.bullets = []; state.enemyBullets = []; state.pickups = []; state.particles = [];
    state.waves = []; state.mines = []; state.wells = []; state.effects = []; state.floatingTexts = [];
    state.gameTime = 0; state.kills = 0; state.level = 1; state.xp = 0; state.experienceNeeded = 6; state.pendingLevels = 0;
    state.shake = 0; state.flash = 0; state.hitstop = 0; state.dropNotice = 0;
    state.spawnTimer = 0; state.bossTimer = config.FIRST_BOSS; state.dropTimer = config.DROP_EVERY;
    state.bossesDefeated = 0;
    state.bossTier = 0; state.activeBoss = null; state.cards = []; state.weaponCards = [];
    Game.music.intensity = 0;
  };

  /* =========================================================
     ХЕЛПЕРЫ
     ========================================================= */
  Game.nearestEnemy = function nearestEnemy(x, y, maxD, exclude) {
    let best = null, bd = (maxD || 1e9) * (maxD || 1e9);
    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      if (enemy.dead) continue;
      if (exclude && exclude.has(enemy.id)) continue;
      const dx = enemy.x - x, dy = enemy.y - y, d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = enemy; }
    }
    return best;
  };

  Game.spawnParticle = function spawnParticle(x, y, color, speed, life) {
    const a = math.randomRange(0, math.TAU), sp = math.randomRange(speed * 0.3, speed);
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: math.randomRange(1.4, 3.6), life: life || math.randomRange(0.3, 0.8), max: life || 0.7, color
    });
  };

  Game.addFloat = function addFloat(x, y, text, color) {
    state.floatingTexts.push({ x, y, text, color: color || '#eaf2ff', life: 1.4, max: 1.4 });
  };

  Game.spawnPickup = function spawnPickup(x, y, kind, val, def) {
    state.pickups.push({
      x, y, kind, val: val || 1, def: def || null,
      vx: math.randomRange(-30, 30), vy: math.randomRange(-30, 30),
      r: kind === 'weapon' || kind === 'crateBoss' ? 16 : 6,
      life: kind === 'weapon' ? config.DROP_LIFE : (kind === 'crateBoss' ? 1e9 : 26),
      color: kind === 'hp' ? '#7ef0c0' : (kind === 'weapon' ? (def ? def.color : '#fff') : (kind === 'crateBoss' ? '#ffd166' : '#8ab8ff'))
    });
  };

})(window.NeonGame);
