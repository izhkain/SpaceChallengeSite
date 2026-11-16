// Данные: state, config. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state, config } = Game;

  /* =========================================================
     ОПЫТ И ВЫБОР АПГРЕЙДОВ
     ========================================================= */
  Game.gainXp = function gainXp(v) {
    state.xp += v;
    while (state.xp >= state.experienceNeeded) {
      state.xp -= state.experienceNeeded;
      state.level++;
      state.experienceNeeded = Math.ceil(state.experienceNeeded * 1.32);
      state.pendingLevels++;
    }
    if (state.pendingLevels > 0 && state.screen === 'playing') Game.openUpgrade();
  };

  Game.openUpgrade = function openUpgrade() {
    const pool = config.UPGRADES.slice();
    state.cards = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      state.cards.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    }
    state.screen = 'upgrade';
  };

  Game.chooseUpgrade = function chooseUpgrade(idx) {
    const c = state.cards[idx];
    if (!c) return;
    c.ap();
    state.pendingLevels--;
    if (state.pendingLevels > 0) Game.openUpgrade();
    else { state.screen = 'playing'; state.cards = []; }
  };

  Game.openWeaponChoice = function openWeaponChoice() {
    const pool = config.WEAPONS.slice();
    state.weaponCards = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      state.weaponCards.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    }
    state.screen = 'weapon';
  };

  Game.chooseWeapon = function chooseWeapon(idx) {
    const definition = state.weaponCards[idx];
    if (!definition) return;
    Game.grantWeapon(definition);
    state.screen = 'playing';
    state.weaponCards = [];
  };

})(window.NeonGame);
