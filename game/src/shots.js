// The screenshot scenes behind ?shot=title|play|win|loss. Each one is a real
// duel played forward through the engine's own rules — a scripted, greedy
// autopilot makes the player's moves and Warden Vex plans its own — so the
// frame is what a short game really looks like, and a seed always stages the
// same frame.
import {
  applyAction, attack, canAttack, canPlay, createDuel, endTurn,
  isKindled, legalAttackTarget, legalTarget, planAiAction, playCard,
  FOE, YOU, other,
} from './engine.js';
import { CARDS } from './cards.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** One greedy charm play for the autopilot, or null when no charm is worth playing. */
function autoCharm(state, who, index) {
  const cardId = state.players[who].hand[index];
  const card = CARDS[cardId];
  const foe = other(who);
  const enemy = state.players[foe];
  const mine = state.players[who];
  const amount = card.amount + (isKindled(state, who, cardId) ? 1 : 0);
  switch (card.effect) {
    case 'bolt': {
      const killable = enemy.board.filter((w) => w.guard <= amount).sort((a, b) => b.power - a.power)[0];
      if (killable) return { side: foe, uid: killable.uid };
      return { face: foe };
    }
    case 'wildfire':
      return enemy.board.length >= 2 ? {} : null;
    case 'mend':
      return mine.life <= 15 ? {} : null;
    case 'draw':
      return {};
    case 'grow': {
      const biggest = mine.board.slice().sort((a, b) => b.power - a.power)[0];
      return biggest ? { side: who, uid: biggest.uid } : null;
    }
    case 'uproot': {
      const victim = enemy.board.filter((w) => w.power <= amount)[0];
      return victim ? { side: foe, uid: victim.uid } : null;
    }
    case 'chain': {
      const target = enemy.board.slice().sort((a, b) => b.guard - a.guard)[0];
      return target ? { side: foe, uid: target.uid } : null;
    }
    case 'surge':
      return {};
    default:
      return null;
  }
}

/** Play one full autopilot turn for `who`. `attacking` false means it never strikes. */
function autoTurn(state, who, attacking) {
  let guard = 0;
  while (!state.winner && state.active === who && guard++ < 30) {
    const side = state.players[who];
    let acted = false;
    // Wards first, dearest first; then any charm the autopilot likes.
    const order = side.hand
      .map((cardId, index) => ({ cardId, index, card: CARDS[cardId] }))
      .sort((a, b) => b.card.cost - a.card.cost);
    for (const entry of order) {
      if (!canPlay(state, who, entry.index)) continue;
      if (entry.card.kind === 'ward') {
        playCard(state, who, entry.index);
        acted = true;
        break;
      }
      const target = autoCharm(state, who, entry.index);
      if (target !== null && legalTarget(state, who, entry.cardId, target.face || target.side ? target : null)) {
        playCard(state, who, entry.index, target.face || target.side ? target : null);
        acted = true;
        break;
      }
    }
    if (acted) continue;
    if (attacking) {
      let struck = false;
      for (const ward of side.board.slice()) {
        if (!canAttack(state, who, ward.uid)) continue;
        const foe = other(who);
        const guards = state.players[foe].board.filter((w) => w.bulwark);
        const target = guards.length > 0
          ? { side: foe, uid: guards[0].uid }
          : { face: foe };
        if (legalAttackTarget(state, who, target)) {
          attack(state, who, ward.uid, target);
          struck = true;
          break;
        }
      }
      if (struck) continue;
    }
    break;
  }
  if (!state.winner && state.active === who) endTurn(state);
}

function foeTurn(state) {
  let guard = 0;
  while (!state.winner && state.active === FOE && guard++ < 30) {
    const action = planAiAction(state);
    applyAction(state, action);
    if (action.type === 'end') break;
  }
}

/** Stage the named scene; returns the duel state and the screen to draw over it. */
export function stageShot(name, seed) {
  if (name === 'play') {
    const state = createDuel({ seed });
    let rounds = 0;
    while (rounds++ < 12) {
      autoTurn(state, YOU, true);
      foeTurn(state);
      const rich = state.players[YOU].board.length >= 2 && state.players[FOE].board.length >= 2;
      if (state.turn >= 4 && rich && state.active === YOU) break;
      if (state.winner) break;
    }
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    const state = createDuel({ seed, lives: { you: 22, foe: 5 } });
    let rounds = 0;
    while (!state.winner && rounds++ < 20) {
      autoTurn(state, YOU, true);
      if (!state.winner) foeTurn(state);
    }
    return { state, screen: state.winner === YOU ? SCREEN_WIN : SCREEN_PLAY };
  }
  if (name === 'loss') {
    const state = createDuel({ seed, lives: { you: 5, foe: 24 } });
    let rounds = 0;
    while (!state.winner && rounds++ < 20) {
      autoTurn(state, YOU, false);
      if (!state.winner) foeTurn(state);
    }
    return { state, screen: state.winner === FOE ? SCREEN_LOSS : SCREEN_PLAY };
  }
  return { state: createDuel({ seed }), screen: SCREEN_TITLE };
}
