// Данные: state, config. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state, config } = Game;

  /* =========================================================
     ОРУЖИЕ (55 видов)
     ========================================================= */
  config.WEAPONS = [
    /* --- лучи навылет --- */
    { id: 'cutter', name: 'Плазменный резак', grp: 'Луч', type: 'beam', cd: 0.85, dmg: 26, color: '#6ff0ff', pierce: 3, range: 820 },
    { id: 'rail', name: 'Рельсотрон', grp: 'Луч', type: 'sniper', cd: 1.9, dmg: 95, color: '#9ad7ff', pierce: 14, speed: 1750 },
    { id: 'tribeam', name: 'Три луч-веера', grp: 'Луч', type: 'beam', cd: 1.1, dmg: 15, color: '#7cf5c8', pierce: 5, count: 3, range: 700, spread: 0.3 },
    { id: 'lance', name: 'Фотонная пика', grp: 'Луч', type: 'sniper', cd: 1.35, dmg: 58, color: '#c8b0ff', pierce: 7, speed: 1500 },
    { id: 'prism', name: 'Призма-разряд', grp: 'Луч', type: 'beam', cd: 1.5, dmg: 32, color: '#ffd166', pierce: 9, count: 2, range: 900, spread: 0.5 },
    { id: 'needle', name: 'Игломёт', grp: 'Луч', type: 'auto', cd: 0.17, dmg: 8, color: '#a8ffe0', speed: 1450, pierce: 2 },
    /* --- ракеты и взрывы --- */
    { id: 'rocket', name: 'Ракетница', grp: 'Ракеты', type: 'rocket', cd: 1.3, dmg: 42, color: '#ff9d5c', speed: 430, homing: 4.2, explode: 78 },
    { id: 'mortar', name: 'Миномёт', grp: 'Ракеты', type: 'rocket', cd: 1.7, dmg: 58, color: '#ffb46e', speed: 330, explode: 105 },
    { id: 'grad', name: 'Град гранат', grp: 'Ракеты', type: 'rocket', cd: 1.1, dmg: 22, color: '#ffcf6e', speed: 390, explode: 62, count: 3 },
    { id: 'thermo', name: 'Термобарический заряд', grp: 'Ракеты', type: 'rocket', cd: 3.1, dmg: 130, color: '#ff7a5c', speed: 340, explode: 160 },
    { id: 'cluster', name: 'Кластерная бомба', grp: 'Ракеты', type: 'rocket', cd: 2.2, dmg: 40, color: '#ffa0d0', speed: 400, explode: 70, cluster: 5 },
    /* --- молнии --- */
    { id: 'tesla', name: 'Тесла-дуга', grp: 'Молнии', type: 'chain', cd: 0.9, dmg: 20, color: '#8ecbff', chain: 5 },
    { id: 'storm', name: 'Штормовая дуга', grp: 'Молнии', type: 'chain', cd: 1.4, dmg: 18, color: '#b0e0ff', chain: 9 },
    { id: 'balllight', name: 'Шаровая молния', grp: 'Молнии', type: 'chain', cd: 1.8, dmg: 46, color: '#d0f0ff', chain: 6 },
    /* --- дробовики --- */
    { id: 'shrapnel', name: 'Шредер', grp: 'Дробовик', type: 'shotgun', cd: 0.95, dmg: 9, color: '#ffd9a0', count: 10, spread: 1.0, speed: 820 },
    { id: 'fanblade', name: 'Веер клинков', grp: 'Дробовик', type: 'shotgun', cd: 1.1, dmg: 16, color: '#c0ffd8', count: 5, spread: 0.7, speed: 900, pierce: 2 },
    { id: 'flak', name: 'Зенитный рой', grp: 'Дробовик', type: 'shotgun', cd: 0.85, dmg: 11, color: '#ffe08a', count: 7, spread: 0.85, speed: 880 },
    { id: 'bouncer', name: 'Рикошет-дробь', grp: 'Дробовик', type: 'shotgun', cd: 1.2, dmg: 12, color: '#9effc0', count: 8, spread: 0.9, speed: 760, bounce: 2 },
    /* --- автоматика --- */
    { id: 'nailgun', name: 'Гвоздемёт', grp: 'Автомат', type: 'auto', cd: 0.13, dmg: 6, color: '#ffe9a8', speed: 1200 },
    { id: 'mg', name: 'Пулемёт', grp: 'Автомат', type: 'auto', cd: 0.1, dmg: 5, color: '#ffd166', speed: 1150 },
    { id: 'minigun', name: 'Миниган', grp: 'Автомат', type: 'auto', cd: 0.07, dmg: 4, color: '#ffb066', speed: 1100 },
    { id: 'circlevolley', name: 'Круговой залп', grp: 'Автомат', type: 'ring', cd: 1.5, dmg: 12, color: '#b8a0ff', count: 12, speed: 620 },
    { id: 'critblade', name: 'Критический клинок', grp: 'Автомат', type: 'blade', cd: 0.5, dmg: 30, color: '#ff8ad0', speed: 1000 },
    { id: 'twin', name: 'Спаренные бластеры', grp: 'Автомат', type: 'auto', cd: 0.34, dmg: 12, color: '#8af0ff', count: 2, speed: 1000, spread: 0.16 },
    { id: 'arcsmg', name: 'Дуговой ПП', grp: 'Автомат', type: 'auto', cd: 0.16, dmg: 8, color: '#a0b8ff', speed: 900, homing: 2.4 },
    /* --- орбиты --- */
    { id: 'plasmaorbit', name: 'Плазменные сферы', grp: 'Орбита', type: 'orbit', cd: 0, dmg: 18, color: '#7ae0ff', count: 3, orbitR: 92, spin: 2.6, br: 16 },
    { id: 'hammer', name: 'Тяжёлый молот', grp: 'Орбита', type: 'orbit', cd: 0, dmg: 48, color: '#ffb46e', count: 1, orbitR: 118, spin: 1.5, br: 26 },
    { id: 'saturn', name: 'Сатурн', grp: 'Орбита', type: 'orbit', cd: 0, dmg: 14, color: '#ffd9a0', count: 6, orbitR: 112, spin: 1.8, br: 12 },
    { id: 'sawring', name: 'Кольцо пил', grp: 'Орбита', type: 'orbit', cd: 0, dmg: 22, color: '#c0ffd8', count: 4, orbitR: 72, spin: 3.4, br: 15 },
    { id: 'moons', name: 'Две луны', grp: 'Орбита', type: 'orbit', cd: 0, dmg: 30, color: '#b0c8ff', count: 2, orbitR: 150, spin: 1.2, br: 22 },
    /* --- ауры --- */
    { id: 'heat', name: 'Жар', grp: 'Аура', type: 'aura', cd: 0, dmg: 14, color: '#ff7a4a', auraR: 112, burn: true },
    { id: 'frost', name: 'Мороз', grp: 'Аура', type: 'aura', cd: 0, dmg: 7, color: '#8adcff', auraR: 134, slow: true, amt: 0.45 },
    { id: 'solar', name: 'Солнечная аура', grp: 'Аура', type: 'aura', cd: 0, dmg: 8, color: '#ffe08a', auraR: 104, heal: 0.6 },
    { id: 'static', name: 'Статическое поле', grp: 'Аура', type: 'aura', cd: 0, dmg: 11, color: '#c0a0ff', auraR: 120 },
    /* --- новы --- */
    { id: 'impulse', name: 'Импульс отбрасывания', grp: 'Нова', type: 'nova', cd: 1.6, dmg: 20, color: '#a0e0ff', maxR: 220, speed: 520, knock: 70 },
    { id: 'shockwave', name: 'Ударная волна', grp: 'Нова', type: 'nova', cd: 2.2, dmg: 45, color: '#ffd166', maxR: 280, speed: 600 },
    { id: 'pulsering', name: 'Пульсирующее кольцо', grp: 'Нова', type: 'nova', cd: 1.0, dmg: 14, color: '#8affd0', maxR: 170, speed: 480 },
    /* --- мины --- */
    { id: 'miner', name: 'Минёр', grp: 'Мины', type: 'mine', cd: 1.4, dmg: 42, color: '#ffd166', mineR: 80 },
    { id: 'clustermines', name: 'Кластерные мины', grp: 'Мины', type: 'mine', cd: 2.0, dmg: 30, color: '#ffa0a0', mineR: 70, count: 3 },
    { id: 'proximity', name: 'Прокси-мины', grp: 'Мины', type: 'mine', cd: 1.1, dmg: 32, color: '#c0ffa0', mineR: 66 },
    /* --- спирали --- */
    { id: 'spiraldrill', name: 'Спиральный бур', grp: 'Спираль', type: 'spiral', cd: 0.09, dmg: 8, color: '#9ef0ff', speed: 820, step: 0.42 },
    { id: 'plasmastorm', name: 'Плазменный шторм', grp: 'Спираль', type: 'spiral', cd: 0.06, dmg: 6, color: '#c8a0ff', speed: 760, step: 0.5, count: 2 },
    { id: 'helix', name: 'Геликс', grp: 'Спираль', type: 'spiral', cd: 0.13, dmg: 11, color: '#a0ffc8', speed: 900, step: 0.3 },
    /* --- бумеранги --- */
    { id: 'disc', name: 'Диск-бумеранг', grp: 'Бумеранг', type: 'boomerang', cd: 1.0, dmg: 26, color: '#8affff', speed: 700 },
    { id: 'twinscythe', name: 'Два серпа', grp: 'Бумеранг', type: 'boomerang', cd: 1.2, dmg: 20, color: '#ffd0a0', speed: 640, count: 2 },
    { id: 'jumpball', name: 'Прыгающий шар', grp: 'Бумеранг', type: 'bounce', cd: 0.7, dmg: 18, color: '#ffb0e0', speed: 720, bounce: 4 },
    { id: 'yoyo', name: 'Йо-йо', grp: 'Бумеранг', type: 'boomerang', cd: 0.8, dmg: 16, color: '#c0ffa0', speed: 820 },
    /* --- дроны --- */
    { id: 'drones', name: 'Орбитальные дроны', grp: 'Дроны', type: 'drone', cd: 0.5, dmg: 12, color: '#8af0ff', count: 2, orbitR: 74, speed: 780 },
    { id: 'turret', name: 'Мультитурель', grp: 'Дроны', type: 'drone', cd: 0.25, dmg: 9, color: '#ffd166', count: 1, orbitR: 58, speed: 900 },
    { id: 'swarm', name: 'Рой дронов', grp: 'Дроны', type: 'drone', cd: 0.8, dmg: 8, color: '#c0a0ff', count: 3, orbitR: 88, speed: 800 },
    /* --- огнемёты --- */
    { id: 'flamer', name: 'Огнемёт', grp: 'Огонь', type: 'flame', cd: 0.07, dmg: 5, color: '#ff8a3a' },
    { id: 'acid', name: 'Кислотный распылитель', grp: 'Огонь', type: 'flame', cd: 0.1, dmg: 6, color: '#a8ff6a', burn: true },
    { id: 'cryospray', name: 'Криопульверизатор', grp: 'Огонь', type: 'flame', cd: 0.08, dmg: 4, color: '#9adfff', slow: true, amt: 0.5 },
    /* --- гравитация --- */
    { id: 'graviton', name: 'Гравитон', grp: 'Гравитация', type: 'gravity', cd: 2.5, dmg: 12, color: '#b090ff', wellR: 170, pull: 260, dur: 1.6 },
    { id: 'blackhole', name: 'Чёрная дыра', grp: 'Гравитация', type: 'gravity', cd: 4.0, dmg: 22, color: '#8a70ff', wellR: 230, pull: 420, dur: 2.2 }
  ];

  config.UPGRADES = [
    { id: 'dmg', name: 'Мощь', desc: '+15% урона всем стволам', ap: () => { state.player.dmgMul *= 1.15; } },
    { id: 'rate', name: 'Скорострельность', desc: '+14% скорости стрельбы', ap: () => { state.player.rateMul *= 1.14; } },
    { id: 'bullet', name: 'Дополнительный болт', desc: '+1 пуля в базовом залпе', ap: () => { state.player.bullets++; } },
    { id: 'pierce', name: 'Бронебой', desc: '+1 пробитие базовых пуль', ap: () => { state.player.pierceBonus++; } },
    { id: 'spd', name: 'Ускорение', desc: '+8% скорости движения', ap: () => { state.player.speed *= 1.08; } },
    { id: 'hp', name: 'Пластины', desc: '+20 макс. HP и лечение', ap: () => { state.player.maxHp += 20; state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20); } },
    { id: 'regen', name: 'Регенерация', desc: '+0.8 HP в секунду', ap: () => { state.player.regen += 0.8; } },
    { id: 'magnet', name: 'Магнит', desc: '+70 радиус сбора опыта', ap: () => { state.player.magnet += 70; } },
    { id: 'super', name: 'Заряд суперудара', desc: '−15% перезарядки', ap: () => { state.player.superMax = Math.max(10, state.player.superMax * 0.85); } },
    { id: 'crit', name: 'Точный глаз', desc: '+10% урона и +5% скорости', ap: () => { state.player.dmgMul *= 1.1; state.player.speed *= 1.05; } }
  ];

  config.ENEMY_TYPES = {
    slime: { hp: 16, speed: 54, r: 14, color: '#7ef0c0', xp: 1, dmg: 8 },
    runner: { hp: 11, speed: 108, r: 10, color: '#ff8ac4', xp: 1, dmg: 6 },
    brute: { hp: 78, speed: 38, r: 22, color: '#ffb46e', xp: 3, dmg: 15 }
  };

})(window.NeonGame);
