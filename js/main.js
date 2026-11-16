// Данные: state. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state } = Game;

  const frameSettings = document.getElementById('frame-settings');
  const fpsSelect = document.getElementById('fps-limit');
  const fpsCounter = document.getElementById('fps-counter');
  const gameCanvas = Game.viewport.canvas;
  gameCanvas.tabIndex = 0;
  let restoreGameFocus = false;
  function focusGame() {
    fpsSelect.blur();
    gameCanvas.focus({ preventScroll: true });
  }
  const allowedLimits = [0, 30, 60, 90, 120, 144, 165, 240];
  const storageKey = 'neon-survival.fpsLimit';
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null && allowedLimits.includes(Number(saved))) Game.settings.fpsLimit = Number(saved);
  } catch { /* Недоступное хранилище не мешает играть. */ }
  fpsSelect.value = String(Game.settings.fpsLimit);

  fpsSelect.addEventListener('change', () => {
    const limit = Number(fpsSelect.value);
    if (!allowedLimits.includes(limit)) return;
    Game.settings.fpsLimit = limit;
    frameAccumulator = 0;
    resetFpsCounter(performance.now());
    try { localStorage.setItem(storageKey, String(limit)); } catch { /* Настройка действует до закрытия. */ }
    // После выбора Enter/Esc/P снова должны управлять игрой, а не списком.
    focusGame();
    // Нативный список может восстановить свой фокус после change. Повторяем на следующем кадре.
    restoreGameFocus = true;
  });

  function syncFrameSettings() {
    const hidden = state.screen !== 'menu' && state.screen !== 'paused';
    if (frameSettings.hidden !== hidden) {
      if (hidden && document.activeElement === fpsSelect) fpsSelect.blur();
      frameSettings.hidden = hidden;
    }
  }

  /* =========================================================
     ВВОД
     ========================================================= */
  addEventListener('keydown', event => {
    const c = event.code;
    if (event.target === fpsSelect) {
      // Навигацию по вариантам сохраняем, но список не должен поглощать команды меню.
      if (!['Enter', 'NumpadEnter', 'Escape', 'KeyP', 'KeyR', 'KeyM'].includes(c)) return;
      event.preventDefault();
      focusGame();
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) event.preventDefault();

    if (c === 'KeyM') { Game.music.toggle(); return; }

    if (c === 'Enter' || c === 'NumpadEnter') {
      if (state.screen === 'menu' || state.screen === 'dead') {
        Game.resetGame();
        state.screen = 'playing';
        Game.music.init();
      }
      return;
    }

    if (state.screen === 'playing' || state.screen === 'paused') {
      if (c === 'Escape' || c === 'KeyP') {
        state.screen = state.screen === 'playing' ? 'paused' : 'playing';
        return;
      }
      if (state.screen === 'paused' && c === 'KeyR') {
        Game.resetGame();
        state.screen = 'playing';
        return;
      }
    }

    if (state.screen === 'playing' && c === 'Space') { Game.useSuper(); return; }

    if (state.screen === 'upgrade') {
      if (c === 'Digit1' || c === 'Numpad1') Game.chooseUpgrade(0);
      else if (c === 'Digit2' || c === 'Numpad2') Game.chooseUpgrade(1);
      else if (c === 'Digit3' || c === 'Numpad3') Game.chooseUpgrade(2);
      return;
    }
    if (state.screen === 'weapon') {
      if (c === 'Digit1' || c === 'Numpad1') Game.chooseWeapon(0);
      else if (c === 'Digit2' || c === 'Numpad2') Game.chooseWeapon(1);
      else if (c === 'Digit3' || c === 'Numpad3') Game.chooseWeapon(2);
      return;
    }

    state.keys.add(c);
  });

  addEventListener('keyup', event => state.keys.delete(event.code));
  addEventListener('blur', () => state.keys.clear());

  // Перестраиваем дорогой космический фон не чаще одного раза за кадр.
  let resizePending = false;
  addEventListener('resize', () => { resizePending = true; });

  /* =========================================================
     ЦИКЛ
     ========================================================= */
  let lastFrameTime = performance.now();
  let lastCallbackTime = lastFrameTime;
  let frameAccumulator = 0;
  let fpsSampleStart = lastFrameTime;
  let renderedFrames = 0;

  function resetFpsCounter(now) {
    fpsSampleStart = now;
    renderedFrames = 0;
    fpsCounter.textContent = 'FPS: —';
  }

  function recordRenderedFrame(now) {
    renderedFrames++;
    const duration = now - fpsSampleStart;
    if (duration >= 500) {
      fpsCounter.textContent = 'FPS: ' + Math.round(renderedFrames * 1000 / duration);
      fpsSampleStart = now;
      renderedFrames = 0;
    }
  }

  // Не включаем время, проведённое в скрытой вкладке, в следующий замер.
  document.addEventListener('visibilitychange', () => resetFpsCounter(performance.now()));

  Game.loop = function loop(now) {
    if (restoreGameFocus) {
      restoreGameFocus = false;
      focusGame();
    }
    const elapsed = Math.max(0, now - lastCallbackTime);
    lastCallbackTime = now;
    frameAccumulator += elapsed;
    const interval = Game.settings.fpsLimit > 0 ? 1000 / Game.settings.fpsLimit : 0;
    if (interval && frameAccumulator + 0.001 < interval && !resizePending) {
      requestAnimationFrame(loop);
      return;
    }
    // Остаток сохраняется, чтобы лимит не падал до ближайшего делителя частоты экрана.
    frameAccumulator = interval ? Math.max(0, frameAccumulator - interval * Math.floor((frameAccumulator + 0.001) / interval)) : 0;
    let raw = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    if (!isFinite(raw) || raw < 0) raw = 0;
    raw = Math.min(raw, 0.05);

    if (resizePending) {
      resizePending = false;
      Game.resize();
    }

    Game.updateBg(raw);

    // При 30 FPS делаем короткие шаги физики: быстрые пули не должны перескакивать цели.
    let remaining = raw;
    while (state.screen === 'playing' && remaining > 0.000001) {
      const slice = Math.min(remaining, 1 / 60);
      let dt = slice;
      if (state.hitstop > 0) { state.hitstop -= slice; dt *= 0.22; }
      Game.step(dt);
      remaining -= slice;
    }

    Game.render();
    recordRenderedFrame(now);
    syncFrameSettings();
    Game.syncWeaponSummary?.();
    requestAnimationFrame(loop);
  };

  Game.resetGame();
  state.screen = 'menu';
  Game.resize();
  syncFrameSettings();
  Game.syncWeaponSummary?.();
  requestAnimationFrame(Game.loop);

})(window.NeonGame);
