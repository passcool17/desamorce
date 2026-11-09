/* Désamorce! — Phaser 3, graphismes procéduraux, sons WebAudio. Tout est fictif. */
(function () {
  'use strict';
  const L = window.DesamorceLogic;
  const W = 450, H = 800;
  const START_MS = 5 * 60 * 1000, PENALTY_MS = 30 * 1000, MAX_STRIKES = 3;
  const FACES = ['Fils', 'Clavier', 'Panneau', 'Aiguille'];
  const FONT = 'Arial, Helvetica, sans-serif';
  const MONO = '"Courier New", monospace';
  const BODY = { x: 20, y: 140, w: 410, h: 545 };

  // ---------- Son ----------
  const Sfx = {
    ctx: null,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    },
    tone(freq, dur, type = 'square', vol = 0.06, slide = 0) {
      const c = this.ctx; if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur + 0.02);
    },
    tick(fast) { this.tone(fast ? 1400 : 1000, 0.03, 'square', 0.035); },
    click() { this.tone(600, 0.04, 'triangle', 0.08); },
    good() { this.tone(880, 0.09, 'sine', 0.1); setTimeout(() => this.tone(1320, 0.12, 'sine', 0.1), 90); },
    bad() { this.tone(160, 0.35, 'sawtooth', 0.12, -80); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'sine', 0.12), i * 120)); },
    boom() {
      const c = this.ctx; if (!c) return;
      const len = c.sampleRate * 1.6, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = 0.6;
      s.buffer = buf; s.connect(f).connect(g).connect(c.destination); s.start();
    }
  };

  const fmt = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const txt = (scene, x, y, s, size, color = '#e8e8e8', extra = {}) =>
    scene.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, align: 'center' }, extra)).setOrigin(0.5);

  function button(scene, x, y, w, h, label, onTap, opts = {}) {
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const draw = (pressed) => {
      g.clear();
      g.fillStyle(pressed ? (opts.pressed || 0x555b66) : (opts.fill || 0x3a3f48), 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      g.lineStyle(2, opts.stroke || 0x7a828f, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    };
    draw(false);
    const t = txt(scene, 0, 0, label, opts.size || 22, opts.color || '#ffffff', { fontStyle: 'bold' });
    const z = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerdown', (p, lx, ly, ev) => { draw(true); });
    z.on('pointerout', () => draw(false));
    z.on('pointerup', () => { draw(false); Sfx.init(); onTap(); });
    c.add([g, t, z]); c.label = t;
    return c;
  }

  // ---------- Écran titre ----------
  class Titre extends Phaser.Scene {
    constructor() { super('Titre'); }
    create() {
      this.cameras.main.setBackgroundColor('#111418');
      txt(this, W / 2, 150, 'DÉSAMORCE!', 54, '#ff5252', { fontStyle: 'bold' });
      txt(this, W / 2, 205, 'Une bombe. Quatre faces. Cinq minutes.', 18, '#bbbbbb');
      const g = this.add.graphics();
      g.fillStyle(0x2b2f36).fillRoundedRect(W / 2 - 80, 250, 160, 120, 16);
      g.fillStyle(0x000000).fillRoundedRect(W / 2 - 60, 275, 120, 50, 6);
      g.lineStyle(6, 0xe53935).beginPath().moveTo(W / 2 - 80, 350).lineTo(W / 2 - 120, 390).strokePath();
      const led = txt(this, W / 2, 300, '5:00', 34, '#ff3b30', { fontFamily: MONO, fontStyle: 'bold' });
      this.tweens.add({ targets: led, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
      txt(this, W / 2, 470,
        '• Glisse à gauche/droite (ou ◀ ▶) pour tourner la bombe.\n' +
        '• Chaque face a un module à désamorcer.\n' +
        '• Les indices sont cachés sur les AUTRES faces.\n' +
        '• Erreur : −30 s. Trois erreurs : BOUM.\n' +
        '• Nouvelle bombe à chaque partie.',
        17, '#dddddd', { align: 'left', lineSpacing: 8, wordWrap: { width: 390 } });
      button(this, W / 2, 640, 260, 70, 'COMMENCER', () => this.scene.start('Jeu'), { fill: 0xb71c1c, stroke: 0xff8a80, size: 28 });
      txt(this, W / 2, 760, 'Jeu fictif — aucune vraie bombe n’a été blessée.', 13, '#777777');
    }
  }

  // ---------- Jeu ----------
  class Jeu extends Phaser.Scene {
    constructor() { super('Jeu'); }

    create() {
      this.p = L.generate();
      this.remaining = START_MS;
      this.strikes = 0;
      this.solved = { fils: false, clavier: false, panneau: false, aiguille: false };
      this.face = 0;
      this.over = false;
      this.lastSec = Math.ceil(this.remaining / 1000);
      this.cameras.main.setBackgroundColor('#111418');

      this.drawHud();
      this.drawBody();
      this.faces = [this.buildWires(), this.buildKeypad(), this.buildPanel(), this.buildMaze()];
      this.faces.forEach((f, i) => { f.setVisible(i === 0); this.setFaceInput(f, i === 0); });
      this.drawNav();
      this.setupSwipe();
      this.keys = this.input.keyboard.createCursorKeys();
      this.input.keyboard.on('keydown-LEFT', () => this.rotate(-1));
      this.input.keyboard.on('keydown-RIGHT', () => this.rotate(1));
      this.updateFaceLabel();
    }

    // --- HUD ---
    drawHud() {
      const g = this.add.graphics();
      g.fillStyle(0x000000).fillRoundedRect(W / 2 - 110, 18, 220, 70, 10);
      g.lineStyle(3, 0x444a55).strokeRoundedRect(W / 2 - 110, 18, 220, 70, 10);
      this.timerText = txt(this, W / 2, 53, fmt(this.remaining), 52, '#ff3b30', { fontFamily: MONO, fontStyle: 'bold' });
      this.strikeIcons = [];
      for (let i = 0; i < MAX_STRIKES; i++) {
        this.strikeIcons.push(txt(this, W / 2 - 40 + i * 40, 112, '✖', 26, '#3a3f48', { fontStyle: 'bold' }));
      }
      this.penaltyText = txt(this, W / 2 + 150, 53, '', 24, '#ff5252', { fontStyle: 'bold' }).setAlpha(0);
      this.statusLeds = {};
      ['fils', 'clavier', 'panneau', 'aiguille'].forEach((k, i) => {
        const x = 28 + (i % 2) * 22, y = 35 + Math.floor(i / 2) * 22;
        this.statusLeds[k] = this.add.circle(x, y, 7, 0x333333).setStrokeStyle(2, 0x666666);
      });
      txt(this, 50, 82, 'modules', 11, '#888888');
    }

    drawBody() {
      const g = this.add.graphics();
      g.fillStyle(0x23272e).fillRoundedRect(BODY.x, BODY.y, BODY.w, BODY.h, 22);
      g.lineStyle(4, 0x4a515c).strokeRoundedRect(BODY.x, BODY.y, BODY.w, BODY.h, 22);
      // rivets
      g.fillStyle(0x5c6470);
      [[BODY.x + 18, BODY.y + 18], [BODY.x + BODY.w - 18, BODY.y + 18], [BODY.x + 18, BODY.y + BODY.h - 18], [BODY.x + BODY.w - 18, BODY.y + BODY.h - 18]]
        .forEach(([x, y]) => g.fillCircle(x, y, 6));
      this.faceTitle = txt(this, W / 2, BODY.y + 24, '', 22, '#ffd54f', { fontStyle: 'bold' });
    }

    drawNav() {
      button(this, 60, 740, 90, 70, '◀', () => this.rotate(-1), { size: 34 });
      button(this, W - 60, 740, 90, 70, '▶', () => this.rotate(1), { size: 34 });
      this.dots = FACES.map((_, i) => this.add.circle(W / 2 - 45 + i * 30, 728, 8, 0x444a55));
      this.navLabel = txt(this, W / 2, 762, '', 15, '#aaaaaa');
    }

    updateFaceLabel() {
      this.faceTitle.setText('Face ' + (this.face + 1) + ' — ' + FACES[this.face]);
      this.dots.forEach((d, i) => d.setFillStyle(i === this.face ? 0xffd54f : 0x444a55));
      this.navLabel.setText('glisse pour tourner');
    }

    setupSwipe() {
      this.input.on('pointerdown', p => { this.swipeStart = { x: p.x, y: p.y, t: p.downTime }; Sfx.init(); });
      this.input.on('pointerup', p => {
        if (!this.swipeStart) return;
        const dx = p.x - this.swipeStart.x, dy = p.y - this.swipeStart.y;
        this.swipeStart = null;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) this.rotate(dx < 0 ? 1 : -1);
      });
    }

    setFaceInput(obj, on) {
      (obj.list || []).forEach(ch => {
        if (ch.input && !ch.removed) ch.input.enabled = on;
        if (ch.list) this.setFaceInput(ch, on);
      });
    }

    rotate(dir) {
      if (this.over || this.rotating) return;
      const from = this.faces[this.face];
      this.face = (this.face + dir + 4) % 4;
      const to = this.faces[this.face];
      this.rotating = true;
      Sfx.tone(300, 0.06, 'triangle', 0.05);
      this.setFaceInput(from, false);
      to.setVisible(true).setX(dir * W).setAlpha(1);
      this.tweens.add({ targets: from, x: -dir * W, duration: 220, ease: 'Cubic.easeInOut', onComplete: () => from.setVisible(false).setX(0) });
      this.tweens.add({ targets: to, x: 0, duration: 220, ease: 'Cubic.easeInOut', onComplete: () => { this.rotating = false; this.setFaceInput(to, true); } });
      this.updateFaceLabel();
    }

    plate(c, y, s) {
      const g = this.add.graphics();
      g.fillStyle(0xc9b37a).fillRoundedRect(45, y - 24, 360, 48, 6);
      g.lineStyle(2, 0x7d6a3a).strokeRoundedRect(45, y - 24, 360, 48, 6);
      const t = txt(this, W / 2, y, s, 14, '#2b230f', { fontStyle: 'bold', wordWrap: { width: 345 } });
      c.add([g, t]);
    }

    strike(reason) {
      if (this.over) return;
      this.strikes++;
      this.remaining -= PENALTY_MS;
      Sfx.bad();
      this.cameras.main.shake(250, 0.012);
      this.cameras.main.flash(150, 180, 0, 0);
      this.strikeIcons[this.strikes - 1].setColor('#ff3b30');
      this.penaltyText.setText('−30 s').setAlpha(1).setY(53);
      this.tweens.add({ targets: this.penaltyText, alpha: 0, y: 30, duration: 900 });
      if (this.strikes >= MAX_STRIKES || this.remaining <= 0) this.lose();
    }

    solve(key) {
      this.solved[key] = true;
      this.statusLeds[key].setFillStyle(0x00e676);
      Sfx.good();
      if (Object.values(this.solved).every(Boolean)) {
        this.over = true;
        Sfx.win();
        this.time.delayedCall(700, () => this.scene.start('Fin', { win: true, remaining: this.remaining, strikes: this.strikes }));
      }
    }

    lose() {
      this.over = true;
      this.timerText.setText('0:00');
      this.scene.start('Fin', { win: false, strikes: this.strikes });
    }

    moduleLed(c, x, y) {
      const led = this.add.circle(x, y, 10, 0x550000).setStrokeStyle(2, 0x222222);
      c.add(led);
      return led;
    }

    // --- Face 1 : Fils (+ numéro de série) ---
    buildWires() {
      const c = this.add.container(0, 0);
      const p = this.p;
      // autocollant numéro de série
      const g = this.add.graphics();
      g.fillStyle(0xf5f5f5).fillRect(95, 190, 260, 50);
      g.lineStyle(2, 0x999999).strokeRect(95, 190, 260, 50);
      c.add(g);
      c.add(txt(this, W / 2, 202, 'N° DE SÉRIE', 11, '#555555', { fontStyle: 'bold' }));
      c.add(txt(this, W / 2, 224, p.serial, 24, '#111111', { fontFamily: MONO, fontStyle: 'bold' }));
      // bornes
      const bg = this.add.graphics();
      bg.fillStyle(0x15181d).fillRoundedRect(50, 265, 350, 310, 10);
      bg.fillStyle(0x8d939c);
      c.add(bg);
      const led = this.moduleLed(c, 380, 282);
      const cutDone = new Set();
      p.wires.forEach((colorId, i) => {
        const col = L.colorById(colorId);
        const y = 305 + i * 58;
        bg.fillRect(62, y - 12, 22, 24).fillRect(366, y - 12, 22, 24);
        const wg = this.add.graphics();
        const drawWire = (cut) => {
          wg.clear();
          wg.lineStyle(12, 0x000000, 0.5);
          wg.lineStyle(10, col.hex);
          if (!cut) {
            wg.beginPath(); wg.moveTo(84, y);
            for (let k = 1; k <= 20; k++) wg.lineTo(84 + k * 14.1, y + Math.sin(k * 0.8 + i) * 6);
            wg.strokePath();
          } else {
            wg.beginPath(); wg.moveTo(84, y); wg.lineTo(200, y + 8); wg.strokePath();
            wg.beginPath(); wg.moveTo(250, y + 8); wg.lineTo(366, y); wg.strokePath();
            wg.fillStyle(0xd4a017).fillCircle(200, y + 8, 4).fillCircle(250, y + 8, 4);
          }
        };
        drawWire(false);
        const lbl = txt(this, 225, y - 20, col.label, 12, '#cfcfcf');
        const z = this.add.zone(225, y, 300, 50).setInteractive({ useHandCursor: true });
        z.on('pointerup', () => {
          if (this.over || this.solved.fils || cutDone.has(i) || this.rotating) return;
          if (this.swipeMoved()) return;
          cutDone.add(i);
          drawWire(true);
          Sfx.tone(2200, 0.05, 'square', 0.07);
          if (!p.solution.wiresToCut.includes(i)) { this.strike('fil'); return; }
          if (p.solution.wiresToCut.every(k => cutDone.has(k))) { led.setFillStyle(0x00e676); this.solve('fils'); }
        });
        c.add([wg, lbl, z]);
      });
      this.plate(c, 625, 'Coupe tous les fils dont la couleur correspond à un voyant ALLUMÉ.');
      return c;
    }

    swipeMoved() {
      const p = this.input.activePointer;
      return Math.abs(p.upX - p.downX) > 30;
    }

    // --- Face 2 : Clavier ---
    buildKeypad() {
      const c = this.add.container(0, 0);
      const p = this.p;
      const g = this.add.graphics();
      g.fillStyle(0x0b1a0b).fillRoundedRect(105, 180, 240, 60, 8);
      g.lineStyle(3, 0x2e7d32).strokeRoundedRect(105, 180, 240, 60, 8);
      c.add(g);
      const display = txt(this, W / 2, 210, '_ _ _ _', 36, '#69f0ae', { fontFamily: MONO, fontStyle: 'bold' });
      c.add(display);
      const led = this.moduleLed(c, 375, 210);
      let entry = '';
      const show = () => display.setText((entry + '____').slice(0, 4).split('').join(' '));
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'EFF', '0', 'OK'];
      keys.forEach((k, i) => {
        const x = 145 + (i % 3) * 80, y = 290 + Math.floor(i / 3) * 75;
        const isOk = k === 'OK';
        const b = button(this, x, y, 70, 64, k, () => {
          if (this.over || this.solved.clavier || this.rotating) return;
          if (k === 'EFF') { entry = ''; Sfx.click(); }
          else if (isOk) {
            if (entry.length < 4) { Sfx.tone(300, 0.08); return; }
            if (entry === p.solution.code) { led.setFillStyle(0x00e676); display.setColor('#ffffff'); this.solve('clavier'); return; }
            entry = ''; this.strike('code');
          } else if (entry.length < 4) { entry += k; Sfx.click(); }
          show();
        }, { size: k.length > 1 ? 18 : 28, fill: isOk ? 0x1b5e20 : (k === 'EFF' ? 0x5d4037 : 0x3a3f48) });
        c.add(b);
      });
      this.plate(c, 625, 'Code : les 4 symboles cachés, traduits avec la légende.');
      return c;
    }

    // --- Face 3 : Panneau à vis (+ voyants) ---
    buildPanel() {
      const c = this.add.container(0, 0);
      const p = this.p;
      // voyants
      const vg = this.add.graphics();
      vg.fillStyle(0x15181d).fillRoundedRect(50, 178, 350, 82, 10);
      c.add(vg);
      c.add(txt(this, W / 2, 190, 'VOYANTS', 11, '#888888', { fontStyle: 'bold' }));
      p.lights.forEach((l, i) => {
        const col = L.colorById(l.color);
        const x = 98 + i * 85, y = 220;
        const halo = this.add.circle(x, y, 20, col.hex, l.lit ? 0.35 : 0);
        const bulb = this.add.circle(x, y, 13, col.hex, l.lit ? 1 : 0.18).setStrokeStyle(3, col.hex, l.lit ? 1 : 0.6);
        const lab = txt(this, x, y + 27, col.label + (l.lit ? '' : ' (éteint)'), 11, l.lit ? '#ffffff' : '#777777');
        c.add([halo, bulb, lab]);
        if (l.lit) this.tweens.add({ targets: halo, alpha: 0.1, duration: 600 + i * 90, yoyo: true, repeat: -1 });
      });
      // panneau
      const px = 80, py = 285, pw = 290, ph = 290;
      const under = this.add.graphics();
      under.fillStyle(0x0d0f12).fillRoundedRect(px, py, pw, ph, 8);
      c.add(under);
      c.add(txt(this, W / 2, py + 50, 'SYMBOLES', 13, '#888888', { fontStyle: 'bold' }));
      c.add(txt(this, W / 2, py + 140, p.panelSymbols.join('  '), 52, '#ffd54f'));
      c.add(txt(this, W / 2, py + 230, '(dans l’ordre, de gauche à droite)', 13, '#aaaaaa'));
      const lid = this.add.container(0, 0);
      const lg = this.add.graphics();
      lg.fillStyle(0x7b828c).fillRoundedRect(px, py, pw, ph, 8);
      lg.lineStyle(3, 0x50565f).strokeRoundedRect(px, py, pw, ph, 8);
      lg.lineStyle(1, 0x9aa1ab, 0.5);
      for (let k = 1; k < 10; k++) lg.lineBetween(px + 10, py + k * 29, px + pw - 10, py + k * 29);
      lid.add(lg);
      lid.add(txt(this, W / 2, py + ph / 2, '⚠ NE PAS OUVRIR ⚠', 18, '#2b2f36', { fontStyle: 'bold' }));
      c.add(lid);
      const led = this.moduleLed(c, 385, 272);
      const corners = [[px + 30, py + 30], [px + pw - 30, py + 30], [px + 30, py + ph - 30], [px + pw - 30, py + ph - 30]];
      let step = 0;
      corners.forEach(([x, y], i) => {
        const n = i + 1;
        const head = this.add.circle(x, y, 22, 0xb0b6bf).setStrokeStyle(3, 0x50565f);
        const slot = this.add.rectangle(x, y, 26, 5, 0x50565f).setAngle(45 * (n % 2));
        const num = txt(this, x + (i % 2 ? -36 : 36), y + (i < 2 ? 26 : -26), String(n), 16, '#1b1e23', { fontStyle: 'bold' });
        head.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(22, 22, 32), hitAreaCallback: Phaser.Geom.Circle.Contains });
        head.on('pointerup', () => {
          if (this.over || this.solved.panneau || this.rotating || head.removed) return;
          if (p.solution.screwOrder[step] !== n) { this.strike('vis'); return; }
          step++;
          Sfx.tone(500, 0.12, 'sawtooth', 0.05, 400);
          head.removed = true;
          head.disableInteractive();
          this.tweens.add({ targets: [head, slot], angle: '+=540', scale: 0.4, alpha: 0, duration: 450, onComplete: () => { head.setVisible(false); slot.setVisible(false); } });
          if (step === 4) {
            this.tweens.add({ targets: lid, y: 420, alpha: 0, duration: 700, delay: 400, ease: 'Back.easeIn', onComplete: () => lid.setVisible(false) });
            this.time.delayedCall(500, () => { led.setFillStyle(0x00e676); this.solve('panneau'); });
          }
        });
        lid.add([head, slot, num]);
      });
      this.plate(c, 625, 'Dévisse dans l’ordre des chiffres du numéro de série.');
      return c;
    }

    // --- Face 4 : Aiguille / labyrinthe (+ légende) ---
    buildMaze() {
      const c = this.add.container(0, 0);
      const m = this.p.maze;
      const cell = 42, ox = W / 2 - (m.size * cell) / 2, oy = 180;
      const g = this.add.graphics();
      g.fillStyle(0x0d1b2a).fillRect(ox - 6, oy - 6, m.size * cell + 12, m.size * cell + 12);
      g.lineStyle(4, 0x90caf9);
      for (let y = 0; y < m.size; y++) for (let x = 0; x < m.size; x++) {
        const w = m.walls[y][x], X = ox + x * cell, Y = oy + y * cell;
        if (w.n) g.lineBetween(X, Y, X + cell, Y);
        if (w.w) g.lineBetween(X, Y, X, Y + cell);
        if (y === m.size - 1 && w.s) g.lineBetween(X, Y + cell, X + cell, Y + cell);
        if (x === m.size - 1 && w.e) g.lineBetween(X + cell, Y, X + cell, Y + cell);
      }
      c.add(g);
      const cx = x => ox + x * cell + cell / 2, cy = y => oy + y * cell + cell / 2;
      const flag = txt(this, cx(m.goal[0]), cy(m.goal[1]), '⚑', 28, '#ff5252');
      let pos = m.start.slice();
      const needle = this.add.circle(cx(pos[0]), cy(pos[1]), 12, 0xffd54f).setStrokeStyle(3, 0xff6f00);
      c.add([flag, needle]);
      const led = this.moduleLed(c, 395, 190);
      const legendText = txt(this, W / 2, 425, 'LÉGENDE VERROUILLÉE\nAmène l’aiguille au drapeau ⚑', 15, '#90a4ae', { lineSpacing: 4 });
      c.add(legendText);
      const move = (d) => {
        if (this.over || this.solved.aiguille || this.rotating) return;
        if (!L.canMove(m, pos[0], pos[1], d)) {
          this.tweens.add({ targets: needle, x: needle.x + L.STEP[d][0] * 8, y: needle.y + L.STEP[d][1] * 8, duration: 60, yoyo: true });
          this.strike('mur'); return;
        }
        pos = [pos[0] + L.STEP[d][0], pos[1] + L.STEP[d][1]];
        Sfx.tone(700, 0.03, 'sine', 0.06);
        this.tweens.add({ targets: needle, x: cx(pos[0]), y: cy(pos[1]), duration: 90 });
        if (pos[0] === m.goal[0] && pos[1] === m.goal[1]) {
          led.setFillStyle(0x00e676);
          flag.setColor('#00e676');
          legendText.setText('LÉGENDE\n' + this.p.legend.map(l => l.symbol + ' = ' + l.digit).join('    ')).setColor('#ffffff').setFontSize(17);
          legendText.setWordWrapWidth(380);
          this.solve('aiguille');
        }
      };
      const pad = [['n', W / 2, 497, '▲'], ['w', W / 2 - 70, 552, '◀'], ['e', W / 2 + 70, 552, '▶'], ['s', W / 2, 552, '▼']];
      pad.forEach(([d, x, y, s]) => c.add(button(this, x, y, 62, 50, s, () => move(d), { size: 24, fill: 0x263238 })));
      this.input.keyboard.on('keydown-UP', () => { if (this.face === 3) move('n'); });
      this.input.keyboard.on('keydown-DOWN', () => { if (this.face === 3) move('s'); });
      this.plate(c, 625, 'Guide l’aiguille sans toucher les murs. Récompense : la légende.');
      return c;
    }

    update(time, delta) {
      if (this.over) return;
      this.remaining -= delta;
      if (this.remaining <= 0) { this.remaining = 0; this.lose(); return; }
      const sec = Math.ceil(this.remaining / 1000);
      this.timerText.setText(fmt(this.remaining));
      if (sec !== this.lastSec) {
        this.lastSec = sec;
        Sfx.tick(sec <= 30);
        if (sec <= 30) this.timerText.setAlpha(sec % 2 ? 1 : 0.5);
      }
    }
  }

  // ---------- Fin ----------
  class Fin extends Phaser.Scene {
    constructor() { super('Fin'); }
    init(d) { this.d = d; }
    create() {
      const d = this.d;
      if (d.win) {
        this.cameras.main.setBackgroundColor('#0b2410');
        txt(this, W / 2, 190, 'BOMBE\nDÉSAMORCÉE!', 50, '#69f0ae', { fontStyle: 'bold' });
        txt(this, W / 2, 320, 'Temps restant', 20, '#cccccc');
        txt(this, W / 2, 370, fmt(d.remaining), 64, '#ffffff', { fontFamily: MONO, fontStyle: 'bold' });
        txt(this, W / 2, 440, 'Erreurs : ' + d.strikes + ' / ' + MAX_STRIKES, 20, '#cccccc');
        txt(this, W / 2, 490, d.strikes === 0 ? 'Sans faute, chapeau! 🎩' : 'Bien joué, ç’a passé proche!', 18, '#a5d6a7');
        for (let i = 0; i < 40; i++) {
          const s = this.add.rectangle(Phaser.Math.Between(0, W), -20, 8, 14, Phaser.Display.Color.RandomRGB().color);
          this.tweens.add({ targets: s, y: H + 20, angle: 720, duration: Phaser.Math.Between(1500, 3500), delay: Phaser.Math.Between(0, 1500), repeat: -1 });
        }
      } else {
        this.cameras.main.setBackgroundColor('#000000');
        Sfx.boom();
        this.cameras.main.flash(500, 255, 220, 120);
        this.cameras.main.shake(900, 0.03);
        const cols = [0xffeb3b, 0xff9800, 0xf44336, 0x795548, 0x9e9e9e];
        for (let i = 0; i < 70; i++) {
          const r = Phaser.Math.Between(8, 40);
          const b = this.add.circle(W / 2, 330, r, Phaser.Utils.Array.GetRandom(cols), 0.9);
          const a = Math.random() * Math.PI * 2, dist = Phaser.Math.Between(60, 420);
          this.tweens.add({ targets: b, x: W / 2 + Math.cos(a) * dist, y: 330 + Math.sin(a) * dist, scale: 2.5, alpha: 0, duration: Phaser.Math.Between(700, 1600), ease: 'Cubic.easeOut' });
        }
        const t = txt(this, W / 2, 300, 'BOUM!', 96, '#ff3d00', { fontStyle: 'bold', stroke: '#ffeb3b', strokeThickness: 6 }).setScale(0.2);
        this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut', delay: 200 });
        txt(this, W / 2, 430, d.strikes >= MAX_STRIKES ? 'Trois erreurs de trop…' : 'Le chrono est tombé à zéro.', 20, '#ffcc80');
      }
      button(this, W / 2, 620, 260, 70, 'REJOUER', () => this.scene.start('Jeu'), { fill: 0xb71c1c, stroke: 0xff8a80, size: 28 });
      button(this, W / 2, 710, 200, 54, 'Accueil', () => this.scene.start('Titre'), { size: 20 });
    }
  }

  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'jeu',
    width: W, height: H,
    backgroundColor: '#111418',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Titre, Jeu, Fin]
  });
})();
