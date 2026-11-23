// Emberfall Duel, the painter. Everything the player sees is drawn here on one
// canvas: the felt table, both duelists, the cards (each element with its own
// colour, shape and motif), and the title, victory and defeat screens. The same
// layout numbers are exported for the input layer, so what is drawn is exactly
// what can be clicked.
import { CARDS, ELEMENTS } from './cards.js';
import { MAX_AETHER, YOU, FOE } from './engine.js';

export const VIEW_W = 1280;
export const VIEW_H = 800;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

export const CARD_W = 118;
export const CARD_H = 164;

// ---------------------------------------------------------------------------
// Layout: one source of truth for where things sit.
// ---------------------------------------------------------------------------
export const layout = {
  foeFace: { x: 36, y: 30, w: 92, h: 92 },
  youFace: { x: 36, y: 668, w: 92, h: 92 },
  endTurn: { x: 1128, y: 356, w: 124, h: 56 },
  foeBoard(i, n) {
    return boardRect(i, n, 176);
  },
  youBoard(i, n) {
    return boardRect(i, n, 428);
  },
  foeHand(i, n) {
    const w = 74;
    const gap = 10;
    const total = n * w + (n - 1) * gap;
    return { x: 640 - total / 2 + i * (w + gap), y: 18, w, h: 104 };
  },
  youHand(i, n) {
    const w = CARD_W;
    const step = n <= 3 ? 112 : n === 4 ? 108 : n === 5 ? 100 : n === 6 ? 92 : 86;
    const total = w + (n - 1) * step;
    return { x: 640 - total / 2 + i * step, y: 622, w, h: CARD_H };
  },
};

function boardRect(i, n, y) {
  const w = 124;
  const gap = 16;
  const total = n * w + (n - 1) * gap;
  return { x: 640 - total / 2 + i * (w + gap), y, w, h: 172 };
}

export function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// ---------------------------------------------------------------------------
// Small drawing helpers.
// ---------------------------------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, colour, align = 'center', weight = 'bold', family = 'Verdana, system-ui, sans-serif') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function wrapText(ctx, str, x, y, maxWidth, size, colour, lineHeight) {
  ctx.font = `${size}px Verdana, system-ui, sans-serif`;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * lineHeight, size, colour, 'center', 'normal'));
  return lines.length;
}

/** The element motif drawn in a card's art window: flame, wave, leaf or bolt. */
function drawMotif(ctx, element, cx, cy, s, t) {
  ctx.save();
  ctx.translate(cx, cy);
  if (element === 'ember') {
    const flick = Math.sin(t * 3) * s * 0.05;
    const grad = ctx.createLinearGradient(0, s * 0.6, 0, -s * 0.7);
    grad.addColorStop(0, '#e2572b');
    grad.addColorStop(0.6, '#f39c3c');
    grad.addColorStop(1, '#ffd94d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7 + flick);
    ctx.bezierCurveTo(s * 0.5, -s * 0.1, s * 0.34, s * 0.3, s * 0.3, s * 0.42);
    ctx.bezierCurveTo(s * 0.26, s * 0.62, -s * 0.26, s * 0.62, -s * 0.3, s * 0.42);
    ctx.bezierCurveTo(-s * 0.34, s * 0.3, -s * 0.5, -s * 0.1, 0, -s * 0.7 + flick);
    ctx.fill();
  } else if (element === 'tide') {
    ctx.strokeStyle = '#7cc0ff';
    ctx.lineWidth = s * 0.13;
    ctx.lineCap = 'round';
    for (let row = -1; row <= 1; row += 1) {
      ctx.beginPath();
      for (let x = -s * 0.55; x <= s * 0.55; x += 4) {
        const y = row * s * 0.3 + Math.sin(x / (s * 0.22) + row) * s * 0.09;
        if (x === -s * 0.55) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (element === 'grove') {
    const grad = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
    grad.addColorStop(0, '#7ed491');
    grad.addColorStop(1, '#2c7a3f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.62);
    ctx.bezierCurveTo(s * 0.55, -s * 0.2, s * 0.5, s * 0.35, 0, s * 0.62);
    ctx.bezierCurveTo(-s * 0.5, s * 0.35, -s * 0.55, -s * 0.2, 0, -s * 0.62);
    ctx.fill();
    ctx.strokeStyle = '#1e5c2c';
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(0, s * 0.52);
    ctx.stroke();
  } else {
    const grad = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
    grad.addColorStop(0, '#ffe066');
    grad.addColorStop(1, '#d9a41c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(s * 0.16, -s * 0.66);
    ctx.lineTo(-s * 0.34, s * 0.12);
    ctx.lineTo(-s * 0.02, s * 0.12);
    ctx.lineTo(-s * 0.16, s * 0.66);
    ctx.lineTo(s * 0.36, -s * 0.1);
    ctx.lineTo(s * 0.03, -s * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawCardBack(ctx, r, t) {
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  grad.addColorStop(0, '#3a2358');
  grad.addColorStop(1, '#241538');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawMotif(ctx, 'ember', r.x + r.w / 2, r.y + r.h / 2, r.w * 0.42, t);
}

/** One card face. `ward` (optional) is the live table instance with its current numbers. */
export function drawCard(ctx, r, cardId, opts = {}) {
  const card = CARDS[cardId];
  const el = ELEMENTS[card.element];
  const t = opts.time ?? 0;
  ctx.save();
  if (opts.dim) ctx.globalAlpha = 0.55;
  if (opts.lift) ctx.translate(0, -14);
  // body
  roundRect(ctx, r.x, r.y, r.w, r.h, 10);
  const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  grad.addColorStop(0, '#f7ecd2');
  grad.addColorStop(1, '#e8d5ae');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = opts.selected ? 4 : 2;
  ctx.strokeStyle = opts.kindled ? '#ffb703' : opts.selected ? '#ffffff' : '#5b4632';
  ctx.stroke();
  if (opts.kindled) {
    ctx.shadowColor = '#ffb703';
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // element band
  roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, 26, 6);
  ctx.fillStyle = el.colour;
  ctx.fill();
  text(ctx, el.glyph, r.x + 16, r.y + 18, 15, '#ffffff');
  text(ctx, card.name, r.x + r.w / 2 + 6, r.y + 18, r.w > 100 ? 10.5 : 9.5, '#ffffff');
  // art window
  const art = { x: r.x + 10, y: r.y + 38, w: r.w - 20, h: r.h * 0.36 };
  roundRect(ctx, art.x, art.y, art.w, art.h, 6);
  const sky = ctx.createLinearGradient(art.x, art.y, art.x, art.y + art.h);
  sky.addColorStop(0, el.soft);
  sky.addColorStop(1, '#2c2438');
  ctx.fillStyle = sky;
  ctx.fill();
  ctx.save();
  ctx.clip();
  drawMotif(ctx, card.element, art.x + art.w / 2, art.y + art.h / 2, art.h * 0.52, t);
  ctx.restore();
  ctx.strokeStyle = '#5b4632';
  ctx.lineWidth = 1;
  ctx.stroke();
  // cost gem, drawn over the art's corner like a wax seal
  ctx.beginPath();
  ctx.arc(r.x + 15, r.y + 44, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#37505e';
  ctx.fill();
  ctx.strokeStyle = '#bfe3ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, String(card.cost), r.x + 15, r.y + 45, 14, '#dff2ff');
  // rules text
  if (r.w > 100) wrapText(ctx, card.text, r.x + r.w / 2, r.y + art.h + 50, r.w - 14, 9.5, '#4a3a28', 11);
  // numbers
  if (card.kind === 'ward') {
    const power = opts.ward ? opts.ward.power : card.power;
    const guard = opts.ward ? opts.ward.guard : card.guard;
    const maxGuard = opts.ward ? opts.ward.maxGuard : card.guard;
    pill(ctx, r.x + 8, r.y + r.h - 30, power, '#b3392e', 'POW');
    pill(ctx, r.x + r.w - 40, r.y + r.h - 30, guard, guard < maxGuard ? '#b3392e' : '#2e6db3', 'GRD');
    if (card.bulwark) tag(ctx, r.x + r.w / 2, r.y + r.h - 19, 'BULWARK', '#6b4fa1');
    else if (card.swift) tag(ctx, r.x + r.w / 2, r.y + r.h - 19, 'SWIFT', '#a4760a');
  } else {
    tag(ctx, r.x + r.w / 2, r.y + r.h - 19, 'CHARM', el.colour);
  }
  ctx.restore();
}

function pill(ctx, x, y, value, colour, label) {
  roundRect(ctx, x, y, 32, 24, 7);
  ctx.fillStyle = colour;
  ctx.fill();
  text(ctx, String(value), x + 16, y + 13, 15, '#ffffff');
  text(ctx, label, x + 16, y - 6, 7.5, colour);
}

function tag(ctx, cx, y, str, colour) {
  ctx.font = 'bold 9px Verdana, sans-serif';
  const w = ctx.measureText(str).width + 12;
  roundRect(ctx, cx - w / 2, y - 8, w, 16, 8);
  ctx.fillStyle = colour;
  ctx.fill();
  text(ctx, str, cx, y + 1, 9, '#ffffff');
}

function drawDuelist(ctx, state, who, time) {
  const side = state.players[who];
  const foeSide = who === FOE;
  const r = foeSide ? layout.foeFace : layout.youFace;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  // portrait ring + sigil
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(cx, cy - 10, 6, cx, cy, 46);
  if (foeSide) {
    grad.addColorStop(0, '#5b3a7a');
    grad.addColorStop(1, '#241538');
  } else {
    grad.addColorStop(0, '#c9973f');
    grad.addColorStop(1, '#6e4d14');
  }
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = state.active === who && !state.winner ? '#ffe9a8' : '#191423';
  ctx.stroke();
  if (foeSide) {
    // Warden Vex: horned crescent
    ctx.strokeStyle = '#e8d9ff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 20, Math.PI * 0.15, Math.PI * 0.85, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy - 12);
    ctx.quadraticCurveTo(cx - 34, cy - 30, cx - 18, cy - 34);
    ctx.moveTo(cx + 26, cy - 12);
    ctx.quadraticCurveTo(cx + 34, cy - 30, cx + 18, cy - 34);
    ctx.stroke();
    drawMotif(ctx, 'storm', cx, cy + 12, 18, time);
  } else {
    drawMotif(ctx, 'ember', cx, cy + 2, 40, time);
  }
  text(ctx, foeSide ? 'WARDEN VEX' : 'YOU', cx, r.y + r.h + 16, 13, '#f3e9d2');
  // life orb
  const orbX = r.x + r.w + 58;
  const orbY = cy;
  ctx.beginPath();
  ctx.arc(orbX, orbY, 30, 0, Math.PI * 2);
  const lifeGrad = ctx.createRadialGradient(orbX - 8, orbY - 10, 4, orbX, orbY, 32);
  lifeGrad.addColorStop(0, '#ff8a75');
  lifeGrad.addColorStop(1, '#a02318');
  ctx.fillStyle = lifeGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd9d2';
  ctx.stroke();
  text(ctx, String(Math.max(0, side.life)), orbX, orbY + 1, 22, '#ffffff');
  text(ctx, 'LIFE', orbX, orbY + 42, 10, '#ffb4a6');
  // aether crystals
  for (let i = 0; i < MAX_AETHER; i += 1) {
    const x = r.x + 6 + i * 21;
    const y = foeSide ? r.y + r.h + 34 : r.y - 16;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < side.aether ? '#6fd3ff' : i < side.maxAether ? '#33505e' : '#1d2b33';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }
  text(ctx, `Deck ${side.deck.length}`, 268, foeSide ? r.y + r.h + 40 : r.y - 22, 11, '#9fb7a8', 'center', 'normal');
}

function drawTable(ctx, state, view) {
  // felt
  const grad = ctx.createRadialGradient(640, 400, 120, 640, 400, 760);
  grad.addColorStop(0, '#1f5c46');
  grad.addColorStop(0.7, '#174434');
  grad.addColorStop(1, '#0d2a20');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.strokeStyle = '#6e4d14';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, VIEW_W - 10, VIEW_H - 10);
  // centre emblem
  ctx.save();
  ctx.globalAlpha = 0.16;
  drawMotif(ctx, 'ember', 640, 392, 120, view.time);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 384, VIEW_W, 2);

  drawDuelist(ctx, state, FOE, view.time);
  drawDuelist(ctx, state, YOU, view.time);

  // foe hand (backs) and board
  const foe = state.players[FOE];
  foe.hand.forEach((_, i) => drawCardBack(ctx, layout.foeHand(i, foe.hand.length), view.time));
  foe.board.forEach((ward, i) => {
    const r = layout.foeBoard(i, foe.board.length);
    const fx = view.offsets?.[ward.uid] ?? { x: 0, y: 0 };
    drawCard(ctx, { ...r, x: r.x + fx.x, y: r.y + fx.y }, ward.card, {
      ward,
      time: view.time,
      selected: view.targets?.includes(ward.uid),
      dim: ward.spent && state.active === FOE,
    });
  });
  // your board
  const you = state.players[YOU];
  you.board.forEach((ward, i) => {
    const r = layout.youBoard(i, you.board.length);
    const fx = view.offsets?.[ward.uid] ?? { x: 0, y: 0 };
    drawCard(ctx, { ...r, x: r.x + fx.x, y: r.y + fx.y }, ward.card, {
      ward,
      time: view.time,
      selected: view.attacker === ward.uid,
      dim: (ward.sick || ward.spent) && state.active === YOU,
    });
  });
  // your hand
  you.hand.forEach((cardId, i) => {
    const r = layout.youHand(i, you.hand.length);
    const kindled = (view.kindledHint ?? []).includes(i);
    drawCard(ctx, r, cardId, {
      time: view.time,
      selected: view.selectedHand === i,
      lift: view.hoverHand === i || view.selectedHand === i,
      kindled,
      dim: state.active !== YOU || (view.costs?.[i] ?? false),
    });
  });

  // turn banner + log
  text(ctx, state.winner ? '' : state.active === YOU ? `TURN ${state.turn} — YOUR MOVE` : `TURN ${state.turn} — VEX PLAYS`, 640, 388, 15, '#ffe9a8');
  const lastLog = state.log[state.log.length - 1] ?? '';
  text(ctx, lastLog, 640, 412, 12.5, '#cfe3d4', 'center', 'normal');

  // end turn button
  if (!state.winner) {
    const r = layout.endTurn;
    const active = state.active === YOU;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = active ? '#c9973f' : '#3c4650';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffe9a8';
    ctx.stroke();
    text(ctx, active ? 'END TURN' : '···', r.x + r.w / 2, r.y + r.h / 2 + 1, 15, active ? '#241a05' : '#9fb7a8');
    text(ctx, 'Space / E', r.x + r.w / 2, r.y + r.h + 14, 10, '#9fb7a8', 'center', 'normal');
  }

  // floating combat text
  for (const fx of view.fx ?? []) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - fx.age / fx.life);
    text(ctx, fx.text, fx.x, fx.y - fx.age * 34, fx.size ?? 20, fx.colour);
    ctx.restore();
  }
  if (view.hint) text(ctx, view.hint, 640, 606, 13, '#ffe9a8');
}

function drawTitle(ctx, state, view) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#17102b');
  grad.addColorStop(0.6, '#1f5c46');
  grad.addColorStop(1, '#0d2a20');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // rising embers
  for (let i = 0; i < 42; i += 1) {
    const x = ((i * 173) % VIEW_W) + Math.sin(view.time * 0.7 + i) * 12;
    const y = VIEW_H - ((view.time * (14 + (i % 5) * 6) + i * 61) % (VIEW_H + 40)) + 20;
    ctx.fillStyle = i % 3 ? 'rgba(242,140,60,0.7)' : 'rgba(255,217,77,0.8)';
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  drawMotif(ctx, 'ember', 640, 168, 92, view.time);
  text(ctx, 'EMBERFALL', 640, 268, 84, '#ffd9a0', 'center', 'bold', 'Georgia, "Times New Roman", serif');
  text(ctx, 'D U E L', 640, 330, 40, '#f39c3c', 'center', 'bold', 'Georgia, "Times New Roman", serif');
  text(ctx, 'An original card duel of embers, tides, groves and storms', 640, 386, 19, '#e8f2e4', 'center', 'normal');
  const rules = [
    'Play wards and charms with aether. Chain the same element twice in a turn to KINDLE the second card.',
    'Bulwark wards must be attacked first. Swift wards strike at once. First duelist to 0 life falls.',
    'Warden Vex reads your table — every trade you offer, it will take.',
  ];
  rules.forEach((line, i) => text(ctx, line, 640, 448 + i * 30, 15.5, '#bcd8c2', 'center', 'normal'));
  // a fanned preview of real cards from the catalogue
  const preview = ['pyreColossus', 'tidalSerpent', 'elderwoodTitan', 'tempestRoc'];
  preview.forEach((cardId, i) => {
    const r = { x: 356 + i * 148, y: 548, w: CARD_W, h: CARD_H };
    drawCard(ctx, r, cardId, { time: view.time });
  });
  const pulse = 0.75 + Math.sin(view.time * 3) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK OR PRESS ENTER TO DUEL', 640, 752, 17, '#ffe9a8');
  ctx.restore();
  void state;
}

function drawEnd(ctx, state, view, won) {
  drawTable(ctx, state, { ...view, fx: [] });
  ctx.fillStyle = won ? 'rgba(30,22,4,0.72)' : 'rgba(6,4,14,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (won) {
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2 + view.time * 0.15;
      const r0 = 120;
      const r1 = 190 + Math.sin(view.time * 2 + i) * 12;
      ctx.strokeStyle = 'rgba(255,201,64,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(640 + Math.cos(a) * r0, 300 + Math.sin(a) * r0 * 0.6);
      ctx.lineTo(640 + Math.cos(a) * r1, 300 + Math.sin(a) * r1 * 0.6);
      ctx.stroke();
    }
    drawMotif(ctx, 'ember', 640, 300, 130, view.time);
  } else {
    drawMotif(ctx, 'tide', 640, 300, 110, view.time);
  }
  text(ctx, won ? 'VICTORY' : 'DEFEAT', 640, 452, 76, won ? '#ffd94d' : '#9fb4d8', 'center', 'bold', 'Georgia, "Times New Roman", serif');
  text(ctx, won ? 'Warden Vex falls among the embers. The table is yours.' : 'Your last ember fades. Warden Vex keeps the table — this time.', 640, 512, 18, '#f3e9d2', 'center', 'normal');
  const s = state.stats;
  text(ctx, `Turns ${state.turn}   ·   Cards played ${s.cardsPlayed}   ·   Damage dealt ${s.damageDealt}   ·   Kindled ${s.kindled}`, 640, 556, 16, '#cfe3d4', 'center', 'normal');
  const pulse = 0.75 + Math.sin(view.time * 3) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK OR PRESS ENTER TO DUEL AGAIN', 640, 620, 16, '#ffe9a8');
  ctx.restore();
}

/** Create the renderer bound to a canvas; draw(state, view) paints one frame. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function fit() {
    const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(VIEW_W * scale * dpr);
    canvas.height = Math.round(VIEW_H * scale * dpr);
    canvas.style.width = `${Math.round(VIEW_W * scale)}px`;
    canvas.style.height = `${Math.round(VIEW_H * scale)}px`;
    ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.width / VIEW_W, 0, 0);
  }
  window.addEventListener('resize', fit);
  fit();
  return {
    fit,
    /** Convert a client (CSS pixel) point to view coordinates. */
    toView(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * VIEW_W,
        y: ((clientY - rect.top) / rect.height) * VIEW_H,
      };
    },
    draw(state, view) {
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      if (view.screen === SCREEN_TITLE) drawTitle(ctx, state, view);
      else if (view.screen === SCREEN_WIN) drawEnd(ctx, state, view, true);
      else if (view.screen === SCREEN_LOSS) drawEnd(ctx, state, view, false);
      else drawTable(ctx, state, view);
    },
  };
}
