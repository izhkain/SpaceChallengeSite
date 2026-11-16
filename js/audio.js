// Данные: math. Общий API подсистем доступен через Game.
(function (Game) {
  "use strict";

  const { math } = Game;

  /* =========================================================
     МУЗЫКА (процедурный синтез на WebAudio)
     ========================================================= */
  const chordProgression = [
    // Am9 — «невесомость»: мрачный низ, мерцающий верх
    { bass: 28, pad: [57, 64, 67, 71], arp: [76, 79, 83, 88] },
    // Fmaj9 — тёплая туманность
    { bass: 29, pad: [53, 60, 64, 69], arp: [77, 81, 84, 89] },
    // Cmaj7#11 — «свет далёкой звезды», лидийский оттенок
    { bass: 24, pad: [55, 62, 64, 67], arp: [74, 79, 83, 86] },
    // Em(add9) — тревожная глубина перед возвратом
    { bass: 28, pad: [55, 59, 62, 66], arp: [71, 76, 79, 83] }
  ];

  Game.music = {
    ctx: null, master: null, delay: null, noise: null,
    on: true, started: false, timer: null, step: 0, next: 0,
    bpm: 104, intensity: 0, vol: 0.22,

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = new AC();
        this.ctx = c;
        const m = c.createGain();
        m.gain.value = 0.0001;
        m.connect(c.destination);
        this.master = m;

        const dl = c.createDelay(1.0);
        dl.delayTime.value = 0.29;
        const fb = c.createGain(); fb.gain.value = 0.34;
        const wet = c.createGain(); wet.gain.value = 0.32;
        dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(m);
        this.delay = dl;

        const len = Math.floor(c.sampleRate * 1.2);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const distance = buf.getChannelData(0);
        for (let i = 0; i < len; i++) distance[i] = Math.random() * 2 - 1;
        this.noise = buf;

        this.step = 0;
        this.next = c.currentTime + 0.08;
        m.gain.exponentialRampToValueAtTime(this.on ? this.vol : 0.0001, c.currentTime + 2.0);
        this.started = true;
        this.timer = setInterval(() => this.schedule(), 26);
      } catch (error) { console.warn('audio error', error); }
    },

    toggle() {
      this.on = !this.on;
      if (!this.ctx) { if (this.on) this.init(); return this.on; }
      const c = this.ctx;
      this.master.gain.cancelScheduledValues(c.currentTime);
      this.master.gain.setTargetAtTime(this.on ? this.vol : 0.0001, c.currentTime, 0.12);
      if (c.state === 'suspended') c.resume();
      return this.on;
    },

    schedule() {
      const c = this.ctx;
      if (!c || !this.on) return;
      const stepDur = 60 / this.bpm / 4;
      while (this.next < c.currentTime + 0.2) {
        this.playStep(this.step, this.next);
        this.next += stepDur;
        this.step = (this.step + 1) % 64;
      }
    },

    playStep(s, t) {
      const ch = chordProgression[((s / 16) | 0) % chordProgression.length];
      const sub = s % 16;
      if (sub === 0) this.pad(ch.pad, t, (60 / this.bpm) * 4 * 0.97);
      if (sub % 2 === 0) {
        const idx = (sub / 2) | 0;
        const off = (idx === 3 || idx === 7) ? 12 : (idx === 5 ? 7 : 0);
        this.bass(math.midiToFrequency(ch.bass + off), t, 0.22);
      }
      this.arp(math.midiToFrequency(ch.arp[s % 4] + (Math.random() < 0.1 ? 12 : 0)), t, 0.16);
      if (sub === 0 || sub === 8) this.kick(t);
      if (sub === 4 || sub === 12) this.snare(t);
      if (sub % 2 === 1) this.hat(t, sub % 4 === 3 ? 0.05 : 0.028);
      if (this.intensity > 0.4 && sub % 2 === 0) this.hat(t, 0.018);
    },

    pad(notes, t, dur) {
      const c = this.ctx;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1050 + this.intensity * 950;
      f.Q.value = 0.7;
      g.connect(f); f.connect(this.master);
      for (let i = 0; i < notes.length; i++) {
        for (const det of [-7, 7]) {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = math.midiToFrequency(notes[i]);
          o.detune.value = det;
          o.connect(g);
          o.start(t); o.stop(t + dur + 0.1);
        }
      }
    },

    bass(freq, t, dur) {
      const c = this.ctx;
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 430;
      o.connect(g); g.connect(f); f.connect(this.master);
      o.start(t); o.stop(t + dur + 0.05);
    },

    arp(freq, t, dur) {
      const c = this.ctx;
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      g.connect(this.delay);
      o.start(t); o.stop(t + dur + 0.05);
    },

    kick(t) {
      const c = this.ctx;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(125, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      const g = c.createGain();
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.3);
    },

    hat(t, v) {
      const c = this.ctx;
      const s = c.createBufferSource();
      s.buffer = this.noise;
      const g = c.createGain();
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      const f = c.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7200;
      s.connect(g); g.connect(f); f.connect(this.master);
      s.start(t); s.stop(t + 0.07);
    },

    snare(t) {
      const c = this.ctx;
      const s = c.createBufferSource();
      s.buffer = this.noise;
      const g = c.createGain();
      g.gain.setValueAtTime(0.13, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.9;
      s.connect(g); g.connect(f); f.connect(this.master);
      s.start(t); s.stop(t + 0.2);
    }
  };

})(window.NeonGame);
