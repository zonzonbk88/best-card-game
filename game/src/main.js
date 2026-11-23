// Emberfall Duel: boot, the frame loop, and every click and key, wired to the
// engine. The engine holds the rules; this file holds the conversation — what
// is selected, which target is being chosen, how Warden Vex's moves are paced
// out so each one can be seen, and the floating numbers combat leaves behind.
//
// ?seed=N fixes the deck order. ?shot=title|play|win|loss (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import {
  applyAction, canPlay, createDuel, isKindled, legalAttackTarget, legalTarget,
  planAiAction, targetKind, FOE, YOU,
} from './engine.js';
import { CARDS } from './cards.js';
import { createRenderer, inside, layout, SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

if (shot) {
  const scene = stageShot(shot, seed);
  let painted = 0;
  const paint = () => {
    renderer.draw(scene.state, { screen: scene.screen, time: 1.2, fx: [] });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  runGame();
}

function runGame() {
  let state = createDuel({ seed });
  let screen = SCREEN_TITLE;
  let time = 0;
  let last = performance.now();
  let selectedHand = -1;
  let attackerUid = null;
  let hoverHand = -1;
  let busy = false;
  let fx = [];
  let lunge = null;
  let lastLog = '';

  function wardCentres() {
    const map = new Map();
    for (const who of [YOU, FOE]) {
      const board = state.players[who].board;
      board.forEach((ward, i) => {
        const r = who === YOU ? layout.youBoard(i, board.length) : layout.foeBoard(i, board.length);
        map.set(ward.uid, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
      });
    }
    return map;
  }

  function faceCentre(who) {
    const r = who === YOU ? layout.youFace : layout.foeFace;
    return { x: r.x + r.w + 58, y: r.y + r.h / 2 };
  }

  function spawnFx(events, centres) {
    for (const ev of events) {
      if (ev.type === 'face') {
        const p = faceCentre(ev.side);
        fx.push({ x: p.x, y: p.y - 30, text: `-${ev.amount}`, colour: ev.side === FOE ? '#ffd94d' : '#ff9a8a', size: 24, age: 0, life: 1.1 });
        audio.play('thud');
      } else if (ev.type === 'wardhit' && ev.amount > 0) {
        const p = centres.get(ev.uid);
        if (p) fx.push({ x: p.x, y: p.y - 20, text: `-${ev.amount}`, colour: '#ffb4a6', size: 20, age: 0, life: 1 });
        audio.play('hit');
      } else if (ev.type === 'death') {
        const p = centres.get(ev.uid);
        if (p) fx.push({ x: p.x, y: p.y, text: 'DESTROYED', colour: '#ffd9a0', size: 15, age: 0, life: 1.2 });
        audio.play('crumble');
      } else if (ev.type === 'heal') {
        const p = faceCentre(ev.side);
        fx.push({ x: p.x, y: p.y - 30, text: `+${ev.amount}`, colour: '#8affc1', size: 20, age: 0, life: 1.1 });
        audio.play('heal');
      } else if (ev.type === 'kindle') {
        fx.push({ x: 640, y: 352, text: 'KINDLED!', colour: '#ffb703', size: 26, age: 0, life: 1.1 });
        audio.play('kindle');
      } else if (ev.type === 'summon') {
        audio.play('summon');
      } else if (ev.type === 'grow') {
        const p = centres.get(ev.uid);
        if (p) fx.push({ x: p.x, y: p.y - 20, text: `+${ev.amount}/+${ev.amount}`, colour: '#8affc1', size: 17, age: 0, life: 1 });
      } else if (ev.type === 'surge') {
        const p = faceCentre(ev.side);
        fx.push({ x: p.x - 40, y: p.y + 52, text: `+${ev.amount} AETHER`, colour: '#6fd3ff', size: 14, age: 0, life: 1 });
      }
    }
  }

  function doAction(action) {
    const centres = wardCentres();
    if (action.type === 'attack') {
      const from = centres.get(action.uid);
      const to = action.target.face ? faceCentre(FOE === action.who ? YOU : FOE) : centres.get(action.target.uid);
      if (from && to) lunge = { uid: action.uid, dx: (to.x - from.x) * 0.4, dy: (to.y - from.y) * 0.4, started: time };
      audio.play('hit');
    }
    const events = applyAction(state, action);
    spawnFx(events, centres);
    selectedHand = -1;
    attackerUid = null;
    if (state.winner) {
      busy = true;
      setTimeout(() => {
        screen = state.winner === YOU ? SCREEN_WIN : SCREEN_LOSS;
        audio.play(state.winner === YOU ? 'win' : 'loss');
        busy = false;
      }, 1000);
    }
  }

  function runAi() {
    busy = true;
    const step = () => {
      if (state.winner) return;
      const action = planAiAction(state);
      doAction(action);
      if (action.type === 'end' || state.winner) {
        busy = false;
        return;
      }
      setTimeout(step, 720);
    };
    setTimeout(step, 650);
  }

  function endPlayerTurn() {
    doAction({ type: 'end', who: YOU });
    audio.play('turn');
    if (!state.winner) runAi();
  }

  function newDuel() {
    state = createDuel({ seed: Math.floor(Math.random() * 4294967296) });
    screen = SCREEN_PLAY;
    selectedHand = -1;
    attackerUid = null;
    fx = [];
    busy = false;
  }

  function handAction(i) {
    const cardId = state.players[YOU].hand[i];
    if (!cardId || !canPlay(state, YOU, i)) return;
    if (targetKind(cardId) === null) {
      doAction({ type: 'play', who: YOU, handIndex: i });
    } else {
      selectedHand = selectedHand === i ? -1 : i;
      attackerUid = null;
      audio.play('select');
    }
  }

  function currentTargets() {
    const out = [];
    if (selectedHand >= 0) {
      const cardId = state.players[YOU].hand[selectedHand];
      const kind = targetKind(cardId);
      for (const who of [YOU, FOE]) {
        for (const ward of state.players[who].board) {
          if (kind === 'any' || (kind === 'enemyWard' && who === FOE) || (kind === 'ownWard' && who === YOU)) {
            if (legalTarget(state, YOU, cardId, { side: who, uid: ward.uid })) out.push(ward.uid);
          }
        }
      }
    } else if (attackerUid !== null) {
      for (const ward of state.players[FOE].board) {
        if (legalAttackTarget(state, YOU, { side: FOE, uid: ward.uid })) out.push(ward.uid);
      }
    }
    return out;
  }

  function onPress(x, y) {
    audio.unlock();
    if (screen !== SCREEN_PLAY) {
      newDuel();
      return;
    }
    if (busy || state.winner || state.active !== YOU) return;
    if (inside(x, y, layout.endTurn)) {
      selectedHand = -1;
      attackerUid = null;
      endPlayerTurn();
      return;
    }
    const you = state.players[YOU];
    const foe = state.players[FOE];
    // Choosing a target for a selected card or attacker?
    if (selectedHand >= 0 || attackerUid !== null) {
      for (let i = 0; i < foe.board.length; i += 1) {
        if (inside(x, y, layout.foeBoard(i, foe.board.length))) {
          const target = { side: FOE, uid: foe.board[i].uid };
          if (selectedHand >= 0) doAction({ type: 'play', who: YOU, handIndex: selectedHand, target });
          else doAction({ type: 'attack', who: YOU, uid: attackerUid, target });
          return;
        }
      }
      for (let i = 0; i < you.board.length; i += 1) {
        if (inside(x, y, layout.youBoard(i, you.board.length))) {
          const target = { side: YOU, uid: you.board[i].uid };
          if (selectedHand >= 0) doAction({ type: 'play', who: YOU, handIndex: selectedHand, target });
          else {
            attackerUid = you.board[i].uid;
            audio.play('select');
          }
          return;
        }
      }
      const foeFace = { ...layout.foeFace, w: layout.foeFace.w + 116 };
      const youFace = { ...layout.youFace, w: layout.youFace.w + 116 };
      if (inside(x, y, foeFace)) {
        if (selectedHand >= 0) doAction({ type: 'play', who: YOU, handIndex: selectedHand, target: { face: FOE } });
        else doAction({ type: 'attack', who: YOU, uid: attackerUid, target: { face: FOE } });
        return;
      }
      if (inside(x, y, youFace) && selectedHand >= 0) {
        doAction({ type: 'play', who: YOU, handIndex: selectedHand, target: { face: YOU } });
        return;
      }
      selectedHand = -1;
      attackerUid = null;
      return;
    }
    // Pick a hand card or a ready ward.
    for (let i = you.hand.length - 1; i >= 0; i -= 1) {
      if (inside(x, y, layout.youHand(i, you.hand.length))) {
        handAction(i);
        return;
      }
    }
    for (let i = 0; i < you.board.length; i += 1) {
      if (inside(x, y, layout.youBoard(i, you.board.length))) {
        const ward = you.board[i];
        if (!ward.sick && !ward.spent) {
          attackerUid = ward.uid;
          audio.play('select');
        }
        return;
      }
    }
  }

  function onMove(x, y) {
    hoverHand = -1;
    if (screen !== SCREEN_PLAY) return;
    const you = state.players[YOU];
    for (let i = you.hand.length - 1; i >= 0; i -= 1) {
      if (inside(x, y, layout.youHand(i, you.hand.length))) {
        hoverHand = i;
        return;
      }
    }
  }

  function onKey(key) {
    audio.unlock();
    if (screen !== SCREEN_PLAY) {
      if (key === 'Enter' || key === ' ') newDuel();
      return;
    }
    if (busy || state.winner || state.active !== YOU) return;
    if (key === ' ' || key === 'e' || key === 'E') {
      selectedHand = -1;
      attackerUid = null;
      endPlayerTurn();
    } else if (key === 'Escape') {
      selectedHand = -1;
      attackerUid = null;
    } else if (key === 'm' || key === 'M') {
      audio.toggleMute();
    } else if (/^[1-9]$/.test(key)) {
      handAction(Number(key) - 1);
    }
  }

  createInput(canvas, renderer, { onPress, onMove, onKey });

  function hint() {
    if (screen !== SCREEN_PLAY || state.winner) return '';
    if (busy || state.active !== YOU) return 'Warden Vex is playing…';
    if (selectedHand >= 0) {
      const card = CARDS[state.players[YOU].hand[selectedHand]];
      return `${card.name}: click a glowing target — or click elsewhere to put it back.`;
    }
    if (attackerUid !== null) return 'Click an enemy ward — or Warden Vex — to strike. Bulwarks must fall first.';
    return 'Click a card to play it. Click one of your ready wards, then a target, to attack.';
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    fx = fx.filter((f) => (f.age += dt) < f.life);
    const offsets = {};
    if (lunge) {
      const phase = (time - lunge.started) / 0.28;
      if (phase >= 1) lunge = null;
      else {
        const k = phase < 0.45 ? phase / 0.45 : 1 - (phase - 0.45) / 0.55;
        offsets[lunge.uid] = { x: lunge.dx * k, y: lunge.dy * k };
      }
    }
    const you = state.players[YOU];
    const view = {
      screen,
      time,
      fx,
      offsets,
      selectedHand,
      attacker: attackerUid,
      hoverHand,
      targets: currentTargets(),
      kindledHint: you.hand.map((id, i) => (canPlay(state, YOU, i) && isKindled(state, YOU, id) ? i : -1)).filter((i) => i >= 0),
      costs: you.hand.map((id) => CARDS[id].cost > you.aether),
      hint: hint(),
    };
    renderer.draw(state, view);
    const log = state.log[state.log.length - 1] ?? '';
    if (log !== lastLog) {
      lastLog = log;
      status.textContent = log;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
