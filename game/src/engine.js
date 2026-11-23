// Emberfall Duel, the rules. This module knows nothing of the canvas: it holds the
// duel's state, says which actions are legal, applies them, and plans the rival's
// turns. The renderer and the input layer only ever read state and call these.
//
// The one rule that makes a duel more than trading blows is Kindle: a card played
// right after a card of the same element, on the same turn, is Kindled — wards
// arrive +1/+1 and every number on a charm grows by 1. Order your plays by
// element and the same hand hits harder.
import { CARDS, buildDeckList } from './cards.js';
import { createRng } from './rng.js';

export const MAX_BOARD = 4;
export const MAX_HAND = 7;
export const MAX_AETHER = 8;
export const START_LIFE = 24;
export const OPENING_HAND = 4;

export const YOU = 'you';
export const FOE = 'foe';
export const other = (who) => (who === YOU ? FOE : YOU);

function makeSide(rng, life) {
  return {
    life,
    maxLife: life,
    aether: 0,
    maxAether: 0,
    deck: rng.shuffled(buildDeckList()),
    hand: [],
    board: [],
    fatigue: 0,
  };
}

export function createDuel(options = {}) {
  const rng = createRng(options.seed ?? 1);
  const lives = options.lives ?? {};
  const state = {
    rng,
    turn: 1,
    active: YOU,
    players: {
      you: makeSide(rng, lives.you ?? START_LIFE),
      foe: makeSide(rng, lives.foe ?? START_LIFE),
    },
    lastElement: { you: null, foe: null },
    winner: null,
    log: ['The duel begins. Your move.'],
    stats: { damageDealt: 0, cardsPlayed: 0, kindled: 0 },
    uidSeq: 1,
  };
  drawCards(state, YOU, OPENING_HAND, []);
  drawCards(state, FOE, OPENING_HAND, []);
  beginTurn(state, YOU, true);
  return state;
}

function note(state, text) {
  state.log.push(text);
  if (state.log.length > 4) state.log.shift();
}

/** Draw `n` cards for a side; an empty deck bites harder every time it happens. */
export function drawCards(state, who, n, events) {
  const side = state.players[who];
  for (let i = 0; i < n; i += 1) {
    if (side.deck.length === 0) {
      side.fatigue += 1;
      hurtDuelist(state, who, side.fatigue, events, 'fatigue');
      continue;
    }
    if (side.hand.length >= MAX_HAND) return;
    side.hand.push(side.deck.pop());
  }
}

function beginTurn(state, who, first = false) {
  const side = state.players[who];
  if (!first) {
    side.maxAether = Math.min(MAX_AETHER, side.maxAether + 1);
    drawCards(state, who, 1, []);
  } else {
    side.maxAether = 1;
  }
  side.aether = side.maxAether;
  state.lastElement[who] = null;
  for (const ward of side.board) {
    ward.sick = false;
    ward.spent = false;
  }
}

export function endTurn(state) {
  if (state.winner) return;
  const next = other(state.active);
  state.active = next;
  if (next === YOU) state.turn += 1;
  beginTurn(state, next);
  note(state, next === YOU ? 'Your turn.' : 'Warden Vex is thinking…');
}

function hurtDuelist(state, who, amount, events, cause = 'damage') {
  const side = state.players[who];
  side.life -= amount;
  events.push({ type: 'face', side: who, amount, cause });
  if (who === FOE) state.stats.damageDealt += Math.max(0, amount);
  if (side.life <= 0 && !state.winner) {
    state.winner = other(who);
    note(state, state.winner === YOU ? 'Warden Vex falls. You win the duel!' : 'You fall. Warden Vex takes the table.');
  }
}

function hurtWard(state, owner, ward, amount, events) {
  ward.guard -= amount;
  events.push({ type: 'wardhit', side: owner, uid: ward.uid, amount });
}

function sweepDead(state, events) {
  for (const who of [YOU, FOE]) {
    const side = state.players[who];
    for (let i = side.board.length - 1; i >= 0; i -= 1) {
      if (side.board[i].guard <= 0) {
        events.push({ type: 'death', side: who, uid: side.board[i].uid, name: side.board[i].name });
        note(state, `${side.board[i].name} is destroyed.`);
        side.board.splice(i, 1);
      }
    }
  }
}

export function findWard(state, who, uid) {
  return state.players[who].board.find((ward) => ward.uid === uid) ?? null;
}

/** Is this card Kindled if played now? (Same element as the last card this side played this turn.) */
export function isKindled(state, who, cardId) {
  return state.lastElement[who] !== null && state.lastElement[who] === CARDS[cardId].element;
}

/** Does playing this charm ask the player to point at something? Returns a target kind or null. */
export function targetKind(cardId) {
  const card = CARDS[cardId];
  if (card.kind !== 'charm') return null;
  if (card.effect === 'bolt') return 'any';
  if (card.effect === 'chain' || card.effect === 'uproot') return 'enemyWard';
  if (card.effect === 'grow') return 'ownWard';
  return null;
}

export function canPlay(state, who, handIndex) {
  if (state.winner || state.active !== who) return false;
  const side = state.players[who];
  const cardId = side.hand[handIndex];
  if (!cardId) return false;
  const card = CARDS[cardId];
  if (card.cost > side.aether) return false;
  if (card.kind === 'ward' && side.board.length >= MAX_BOARD) return false;
  return true;
}

export function legalTarget(state, who, cardId, target) {
  if (!target) return targetKind(cardId) === null;
  const card = CARDS[cardId];
  const kind = targetKind(cardId);
  const foe = other(who);
  if (kind === 'any') {
    if (target.face) return true;
    return Boolean(findWard(state, target.side, target.uid));
  }
  if (kind === 'enemyWard') {
    const ward = findWard(state, foe, target.uid);
    if (!ward) return false;
    if (card.effect === 'uproot') return ward.power <= card.amount + (isKindled(state, who, cardId) ? 1 : 0);
    return true;
  }
  if (kind === 'ownWard') return Boolean(findWard(state, who, target.uid));
  return false;
}

/** Play a card from hand. `target` is {face: side} or {side, uid} where a target is needed. */
export function playCard(state, who, handIndex, target = null) {
  const events = [];
  if (!canPlay(state, who, handIndex)) return events;
  const side = state.players[who];
  const foe = other(who);
  const cardId = side.hand[handIndex];
  const card = CARDS[cardId];
  if (!legalTarget(state, who, cardId, target)) return events;
  const kindled = isKindled(state, who, cardId);
  const boost = kindled ? 1 : 0;

  side.aether -= card.cost;
  side.hand.splice(handIndex, 1);
  state.lastElement[who] = card.element;
  if (who === YOU) state.stats.cardsPlayed += 1;
  if (kindled) {
    state.stats.kindled += who === YOU ? 1 : 0;
    events.push({ type: 'kindle', side: who });
    note(state, `${card.name} is Kindled!`);
  } else {
    note(state, `${who === YOU ? 'You play' : 'Vex plays'} ${card.name}.`);
  }

  if (card.kind === 'ward') {
    const ward = {
      uid: state.uidSeq,
      card: cardId,
      name: card.name,
      power: card.power + boost,
      guard: card.guard + boost,
      maxGuard: card.guard + boost,
      sick: !card.swift,
      spent: !card.swift,
      bulwark: Boolean(card.bulwark),
    };
    state.uidSeq += 1;
    side.board.push(ward);
    events.push({ type: 'summon', side: who, uid: ward.uid });
    if (card.arrive === 'mend') {
      side.life = Math.min(side.maxLife, side.life + 1 + boost);
      events.push({ type: 'heal', side: who, amount: 1 + boost });
    }
  } else {
    applyCharm(state, who, card, boost, target, events);
  }
  sweepDead(state, events);
  return events;
}

function applyCharm(state, who, card, boost, target, events) {
  const side = state.players[who];
  const foe = other(who);
  const amount = card.amount + boost;
  switch (card.effect) {
    case 'bolt': {
      if (target.face) hurtDuelist(state, target.face, amount, events);
      else hurtWard(state, target.side, findWard(state, target.side, target.uid), amount, events);
      break;
    }
    case 'wildfire': {
      for (const ward of state.players[foe].board.slice()) hurtWard(state, foe, ward, amount, events);
      break;
    }
    case 'mend': {
      side.life = Math.min(side.maxLife, side.life + amount);
      events.push({ type: 'heal', side: who, amount });
      break;
    }
    case 'draw': {
      drawCards(state, who, amount, events);
      break;
    }
    case 'grow': {
      const ward = findWard(state, who, target.uid);
      if (ward) {
        ward.power += amount;
        ward.guard += amount;
        ward.maxGuard += amount;
        events.push({ type: 'grow', side: who, uid: ward.uid, amount });
      }
      break;
    }
    case 'uproot': {
      const ward = findWard(state, foe, target.uid);
      if (ward) {
        ward.guard = 0;
        events.push({ type: 'wardhit', side: foe, uid: ward.uid, amount: 0 });
      }
      break;
    }
    case 'chain': {
      const ward = findWard(state, foe, target.uid);
      if (ward) {
        hurtWard(state, foe, ward, amount, events);
        hurtDuelist(state, foe, 1 + boost, events);
      }
      break;
    }
    case 'surge': {
      side.aether += amount;
      events.push({ type: 'surge', side: who, amount });
      break;
    }
    default:
      break;
  }
}

/** Wards that must be answered before anything behind them can be attacked. */
export function bulwarks(state, who) {
  return state.players[who].board.filter((ward) => ward.bulwark);
}

export function canAttack(state, who, uid) {
  if (state.winner || state.active !== who) return false;
  const ward = findWard(state, who, uid);
  return Boolean(ward) && !ward.sick && !ward.spent;
}

export function legalAttackTarget(state, who, target) {
  const foe = other(who);
  const guards = bulwarks(state, foe);
  if (target.face) return guards.length === 0;
  const ward = findWard(state, foe, target.uid);
  if (!ward) return false;
  return guards.length === 0 || ward.bulwark;
}

/** One ward strikes a target: another ward (which strikes back) or the enemy duelist. */
export function attack(state, who, uid, target) {
  const events = [];
  if (!canAttack(state, who, uid) || !legalAttackTarget(state, who, target)) return events;
  const foe = other(who);
  const attacker = findWard(state, who, uid);
  attacker.spent = true;
  events.push({ type: 'attack', side: who, uid, target });
  if (target.face) {
    note(state, `${attacker.name} hits ${foe === YOU ? 'you' : 'Vex'} for ${attacker.power}.`);
    hurtDuelist(state, foe, attacker.power, events);
  } else {
    const defender = findWard(state, foe, target.uid);
    note(state, `${attacker.name} clashes with ${defender.name}.`);
    hurtWard(state, foe, defender, attacker.power, events);
    hurtWard(state, who, attacker, defender.power, events);
  }
  sweepDead(state, events);
  return events;
}

// ---------------------------------------------------------------------------
// Warden Vex, the rival. planAiAction returns one readable action at a time so
// the table can show each move; applyAction carries it out (the player's moves
// go through the same door, so the rules can never drift apart).
// ---------------------------------------------------------------------------

export function applyAction(state, action) {
  if (action.type === 'play') return playCard(state, action.who, action.handIndex, action.target ?? null);
  if (action.type === 'attack') return attack(state, action.who, action.uid, action.target);
  if (action.type === 'end') {
    endTurn(state);
    return [];
  }
  return [];
}

function aiPlayableCards(state) {
  const side = state.players[FOE];
  const out = [];
  side.hand.forEach((cardId, index) => {
    if (canPlay(state, FOE, index)) out.push({ cardId, index, card: CARDS[cardId] });
  });
  return out;
}

function aiCharmPlay(state, entry) {
  const { cardId, index, card } = entry;
  const you = state.players[YOU];
  const foe = state.players[FOE];
  const kindled = isKindled(state, FOE, cardId);
  const amount = card.amount + (kindled ? 1 : 0);
  switch (card.effect) {
    case 'bolt': {
      const killable = you.board.filter((w) => w.guard <= amount).sort((a, b) => b.power - a.power)[0];
      if (killable) return { type: 'play', who: FOE, handIndex: index, target: { side: YOU, uid: killable.uid } };
      if (you.life <= 6) return { type: 'play', who: FOE, handIndex: index, target: { face: YOU } };
      return null;
    }
    case 'wildfire':
      return you.board.length >= 2 ? { type: 'play', who: FOE, handIndex: index } : null;
    case 'mend':
      return foe.life <= 13 ? { type: 'play', who: FOE, handIndex: index } : null;
    case 'draw':
      return foe.hand.length <= 4 ? { type: 'play', who: FOE, handIndex: index } : null;
    case 'grow': {
      const biggest = foe.board.slice().sort((a, b) => b.power - a.power)[0];
      return biggest ? { type: 'play', who: FOE, handIndex: index, target: { side: FOE, uid: biggest.uid } } : null;
    }
    case 'uproot': {
      const victim = you.board.filter((w) => w.power <= amount).sort((a, b) => b.guard - a.guard)[0];
      return victim ? { type: 'play', who: FOE, handIndex: index, target: { side: YOU, uid: victim.uid } } : null;
    }
    case 'chain': {
      const target = you.board.slice().sort((a, b) => b.guard - a.guard)[0];
      return target ? { type: 'play', who: FOE, handIndex: index, target: { side: YOU, uid: target.uid } } : null;
    }
    case 'surge': {
      const enables = foe.hand.some((id, i) => i !== index && CARDS[id].cost <= foe.aether - card.cost + amount && CARDS[id].cost > foe.aether - card.cost);
      return enables ? { type: 'play', who: FOE, handIndex: index } : null;
    }
    default:
      return null;
  }
}

function aiAttack(state) {
  const foe = state.players[FOE];
  const you = state.players[YOU];
  for (const ward of foe.board) {
    if (!canAttack(state, FOE, ward.uid)) continue;
    const guards = bulwarks(state, YOU);
    if (guards.length > 0) {
      return { type: 'attack', who: FOE, uid: ward.uid, target: { side: YOU, uid: guards[0].uid } };
    }
    const trade = you.board
      .filter((target) => ward.power >= target.guard && ward.guard > target.power)
      .sort((a, b) => b.power - a.power)[0];
    if (trade) return { type: 'attack', who: FOE, uid: ward.uid, target: { side: YOU, uid: trade.uid } };
    if (ward.power >= 3 || you.board.length === 0) {
      return { type: 'attack', who: FOE, uid: ward.uid, target: { face: YOU } };
    }
  }
  return null;
}

/** The rival's next single action, or {type:'end'} when it is done. */
export function planAiAction(state) {
  if (state.winner || state.active !== FOE) return { type: 'end', who: FOE };
  const playable = aiPlayableCards(state);
  // Kindled plays first: the rival chains elements when it can, so you can read it.
  const kindledWard = playable.find((e) => e.card.kind === 'ward' && isKindled(state, FOE, e.cardId));
  if (kindledWard) return { type: 'play', who: FOE, handIndex: kindledWard.index };
  const ward = playable
    .filter((e) => e.card.kind === 'ward')
    .sort((a, b) => b.card.cost - a.card.cost)[0];
  if (ward) return { type: 'play', who: FOE, handIndex: ward.index };
  for (const entry of playable) {
    if (entry.card.kind !== 'charm') continue;
    const action = aiCharmPlay(state, entry);
    if (action) return action;
  }
  const strike = aiAttack(state);
  if (strike) return strike;
  return { type: 'end', who: FOE };
}
