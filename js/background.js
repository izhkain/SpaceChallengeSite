// Данные: state, viewport, math, background. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { state, viewport, math, background } = Game;
  const context = viewport.context;

  /* =========================================================
     КОСМИЧЕСКИЙ ФОН
     ========================================================= */
  background.stars = [];
  background.dust = [];
  background.shooters = [];
  background.nebula = null;
  background.galaxy = null;
  background.gpos = { x: 0, y: 0 };
  background.bgT = 0;
  background.shooterCd = 1.5;

  Game.makeNebula = function makeNebula() {
    const s = 0.62;
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.floor(viewport.width * s));
    c.height = Math.max(2, Math.floor(viewport.height * s));
    const g = c.getContext('2d');
    const pal = ['#5b2ea6', '#1d3f96', '#8a1f6e', '#0f6f82', '#3a1a7a', '#2b60b0', '#6b2f9e'];
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const x = math.randomRange(0, c.width), y = math.randomRange(0, c.height);
      const r = math.randomRange(c.width * 0.16, c.width * 0.55);
      const col = pal[i % pal.length];
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, math.colorWithAlpha(col, 0.22));
      grd.addColorStop(0.45, math.colorWithAlpha(col, 0.10));
      grd.addColorStop(1, math.colorWithAlpha(col, 0));
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, r, 0, math.TAU); g.fill();
    }
    for (let i = 0; i < 140; i++) {
      const x = math.randomRange(0, c.width), y = math.randomRange(0, c.height), r = math.randomRange(6, 58);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(200,225,255,0.09)');
      grd.addColorStop(1, 'rgba(120,170,255,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, r, 0, math.TAU); g.fill();
    }
    return c;
  };

  Game.makeGalaxy = function makeGalaxy() {
    const S = 440;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    const arms = 3, per = 560;
    for (let a = 0; a < arms; a++) {
      for (let i = 0; i < per; i++) {
        const t = i / per;
        const ang = a * (math.TAU / arms) + t * 4.6;
        const rad = 8 + t * S * 0.44;
        const x = S / 2 + Math.cos(ang) * rad + math.randomRange(-1, 1) * t * 15;
        const y = S / 2 + Math.sin(ang) * rad * 0.82 + math.randomRange(-1, 1) * t * 15;
        const al = 0.55 * (1 - t);
        g.fillStyle = 'rgba(' + (205 - t * 70 | 0) + ',' + (185 - t * 50 | 0) + ',255,' + al + ')';
        g.fillRect(x, y, math.randomRange(0.7, 2.2), math.randomRange(0.7, 2.2));
      }
    }
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.24);
    grd.addColorStop(0, 'rgba(255,245,255,0.6)');
    grd.addColorStop(0.4, 'rgba(190,160,255,0.2)');
    grd.addColorStop(1, 'rgba(120,80,200,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(S / 2, S / 2, S * 0.24, 0, math.TAU); g.fill();
    return c;
  };

  Game.buildBackground = function buildBackground() {
    background.stars = [];
    const area = viewport.width * viewport.height;
    const cols = ['#ffffff', '#cfe4ff', '#a9c8ff', '#ffd7f0', '#c9fff4', '#fff2c9', '#e0d0ff'];
    const layers = [
      { par: 0.08, n: Math.round(area / 6200), r0: 0.35, r1: 1.0, a: 0.38 },
      { par: 0.24, n: Math.round(area / 12000), r0: 0.65, r1: 1.7, a: 0.62 },
      { par: 0.52, n: Math.round(area / 28000), r0: 1.1, r1: 2.5, a: 0.95 }
    ];
    for (const L of layers) {
      for (let i = 0; i < L.n; i++) {
        background.stars.push({
          x: math.randomRange(0, viewport.width), y: math.randomRange(0, viewport.height), r: math.randomRange(L.r0, L.r1), a: math.randomRange(0.22, L.a),
          par: L.par, c: math.pickRandom(cols), ph: math.randomRange(0, math.TAU), tw: math.randomRange(0.5, 2.8)
        });
      }
    }
    background.dust = [];
    for (let i = 0; i < 80; i++) {
      background.dust.push({ x: math.randomRange(0, viewport.width), y: math.randomRange(0, viewport.height), r: math.randomRange(0.6, 2.3), a: math.randomRange(0.04, 0.2), par: math.randomRange(0.04, 0.28), vx: math.randomRange(-7, 7), vy: math.randomRange(-7, 7) });
    }
    background.nebula = Game.makeNebula();
    background.galaxy = Game.makeGalaxy();
    background.gpos = { x: viewport.width * 0.74, y: viewport.height * 0.2 };
    background.shooters = [];
  };

  Game.spawnShooter = function spawnShooter() {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? math.randomRange(-80, viewport.width * 0.4) : math.randomRange(viewport.width * 0.6, viewport.width + 80);
    const y = math.randomRange(-60, viewport.height * 0.5);
    const a = fromLeft ? math.randomRange(0.35, 0.75) : math.randomRange(Math.PI - 0.75, Math.PI - 0.35);
    const sp = math.randomRange(700, 1250);
    background.shooters.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.6, max: 1.6 });
  };

  Game.updateBg = function updateBg(dt) {
    background.bgT += dt;
    background.shooterCd -= dt;
    if (background.shooterCd <= 0) { background.shooterCd = math.randomRange(1.6, 5.0); Game.spawnShooter(); }
    for (let i = background.shooters.length - 1; i >= 0; i--) {
      const s = background.shooters[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0) background.shooters.splice(i, 1);
    }
    for (const dustParticle of background.dust) {
      dustParticle.x += dustParticle.vx * dt; dustParticle.y += dustParticle.vy * dt;
      if (dustParticle.x < -20) dustParticle.x = viewport.width + 20; if (dustParticle.x > viewport.width + 20) dustParticle.x = -20;
      if (dustParticle.y < -20) dustParticle.y = viewport.height + 20; if (dustParticle.y > viewport.height + 20) dustParticle.y = -20;
    }
  };

  Game.drawBackground = function drawBackground() {
    const g = context.createLinearGradient(0, 0, viewport.width * 0.6, viewport.height);
    g.addColorStop(0, '#070a18');
    g.addColorStop(0.45, '#0b0a20');
    g.addColorStop(1, '#04060f');
    context.fillStyle = g;
    context.fillRect(0, 0, viewport.width, viewport.height);

    context.restore();

    // далёкая галактика
    const gs = Math.max(0.45, Math.min(viewport.width, viewport.height) / 900);
    let gx = (background.gpos.x - state.camera.x * 0.04) % (viewport.width + 900); if (gx < 0) gx += viewport.width + 900;
    let gy = (background.gpos.y - state.camera.y * 0.04) % (viewport.height + 900); if (gy < 0) gy += viewport.height + 900;
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = 0.5;
    context.drawImage(background.galaxy, gx - 450 - background.galaxy.width * gs / 2, gy - 450 - background.galaxy.height * gs / 2, background.galaxy.width * gs, background.galaxy.height * gs);
    context.restore();

    // пыль
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const dustParticle of background.dust) {
      context.globalAlpha = dustParticle.a;
      context.fillStyle = '#9fc4ff';
      context.beginPath(); context.arc(dustParticle.x, dustParticle.y, dustParticle.r, 0, math.TAU); context.fill();
    }
    context.restore();

    // звёзды в три слоя
    for (const s of background.stars) {
      let sx = (s.x - state.camera.x * s.par) % viewport.width; if (sx < 0) sx += viewport.width;
      let sy = (s.y - state.camera.y * s.par) % viewport.height; if (sy < 0) sy += viewport.height;
      const tw = 0.6 + 0.4 * Math.sin(background.bgT * s.tw + s.ph);
      context.globalAlpha = s.a * tw;
      context.fillStyle = s.c;
      context.beginPath(); context.arc(sx, sy, s.r, 0, math.TAU); context.fill();
      if (s.r > 1.55) {
        context.globalAlpha = s.a * tw * 0.3;
        context.fillRect(sx - s.r * 3.2, sy - 0.5, s.r * 6.4, 1);
        context.fillRect(sx - 0.5, sy - s.r * 3.2, 1, s.r * 6.4);
      }
    }
    context.globalAlpha = 1;

    // падающие звёзды
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const s of background.shooters) {
      const k = s.life / s.max;
      const tx = s.x - s.vx * 0, ty = s.y - s.vy * 0;
      const lg = context.createLinearGradient(s.x, s.y, tx, ty);
      lg.addColorStop(0, 'rgba(255,255,255,' + (0.85 * k) + ')');
      lg.addColorStop(1, 'rgba(140,200,255,0)');
      context.strokeStyle = lg;
      context.lineWidth = 2.2;
      context.beginPath(); context.moveTo(s.x, s.y); context.lineTo(tx, ty); context.stroke();
    }
    context.restore();
    context.globalAlpha = 1;
  };

})(window.NeonGame);
