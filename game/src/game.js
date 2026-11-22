/* Ember Court — the duel itself: state, turns, card resolution and winning.
   Pure rules, no DOM: render.js draws this state, main.js times the AI,
   shots.js replays it headlessly for screenshots. One duel is a race to 0
   life; win a duel and the next one starts against a harder Duchess Vex. */

import { createRng, shuffleDeck } from './rng.js';
import {
  buildDeck, DRAW_PER_TURN, HAND_LIMIT, MAX_LIFE, MAX_MANA,
  RESONANCE_BONUS, START_HAND,
} from './deck.js';
import { chooseAiCard } from './ai.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAYING = 'playing';
export const PHASE_AI = 'ai-turn';
export const PHASE_OVER = 'over';

/** A fresh, empty duel state. Call startDuel to deal it in. */
export function createGame(seed) {
  return {
    seed,
    rng: createRng(seed),
    phase: PHASE_TITLE,
    duel: 1,
    duelsWon: 0,
    turn: 0,
    winner: null,
    turnOwner: 'you',
    log: [],
    you: null,
    foe: null,
  };
}

function makeSide(deck) {
  return {
    life: MAX_LIFE,
    shield: 0,
    mana: 0,
    maxMana: 0,
    hand: [],
    deck,
    discard: [],
    played: [],
    playedSuits: new Set(),
  };
}

/** Deal a new duel in: shuffled decks, five cards each, turn 1 begins. */
export function startDuel(game, seed) {
  game.rng = createRng(seed ?? game.seed);
  game.phase = PHASE_PLAYING;
  game.turn = 1;
  game.winner = null;
  game.turnOwner = 'you';
  game.you = makeSide(shuffleDeck(buildDeck(), game.rng));
  game.foe = makeSide(shuffleDeck(buildDeck(), game.rng));
  drawCards(game, game.you, START_HAND);
  drawCards(game, game.foe, START_HAND);
  beginTurn(game, game.you, 1);
  addLog(game, 'The duel begins. Duchess Vex draws her hand.');
  return game;
}

/** Draw `count` cards, reshuffling the discard pile when the deck runs dry. */
export function drawCards(game, side, count) {
  let drawn = 0;
  for (let index = 0; index < count; index += 1) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffleDeck(side.discard, game.rng);
      side.discard = [];
    }
    if (side.hand.length >= HAND_LIMIT) break;
    side.hand.push(side.deck.pop());
    drawn += 1;
  }
  return drawn;
}

/** Start a side's turn: mana refills and grows with the round, two cards drawn.
    A round is one human turn plus one AI turn, so mana grows once per round. */
export function beginTurn(game, side, roundNumber) {
  side.maxMana = Math.min(roundNumber, MAX_MANA);
  side.mana = side.maxMana;
  side.played = [];
  side.playedSuits = new Set();
  drawCards(game, side, DRAW_PER_TURN);
}

function describeCard(card, power) {
  return `${card.name} (${power})`;
}

function dealDamage(game, target, amount, sourceName) {
  if (amount <= 0) return 0;
  const soaked = Math.min(target.shield, amount);
  target.shield -= soaked;
  const through = amount - soaked;
  target.life = Math.max(0, target.life - through);
  if (soaked > 0) {
    addLog(game, `${sourceName} hits for ${amount} — ${soaked} soaked by shield.`, 'foe');
  }
  return through;
}

function healLife(game, side, amount, who) {
  const healed = Math.min(amount, MAX_LIFE - side.life);
  side.life += healed;
  return healed;
}

/**
 * Play one card from `side`'s hand. Returns { ok, reason?, resonance?, power? }.
 * Resonance: a second card of a suit already played this turn gets +2 power.
 * Effects resolve in order: damage, shield, heal, draw, mana.
 */
export function playCard(game, side, other, cardUid, whoLabel) {
  const index = side.hand.findIndex((card) => card.uid === cardUid);
  if (index === -1) return { ok: false, reason: 'card not in hand' };
  const card = side.hand[index];
  if (card.cost > side.mana) return { ok: false, reason: 'not enough mana' };
  const resonance = side.playedSuits.has(card.suit) ? RESONANCE_BONUS : 0;
  const power = card.power + resonance;
  side.hand.splice(index, 1);
  side.mana -= card.cost;
  side.played.push(card);
  side.playedSuits.add(card.suit);
  side.discard.push(card);

  let note = '';
  if (card.suit === 'ember' || card.id === 'thorn-snare' || card.id === 'gale-gust' || card.id === 'gale-tempest') {
    const damage = card.suit === 'ember' ? power : card.id === 'thorn-snare' ? 3 + resonance : power;
    dealDamage(game, other, damage, whoLabel);
    note += `deals ${damage} damage`;
  }
  if (card.suit === 'thorn') {
    const shield = card.id === 'thorn-snare' ? 3 + resonance : power;
    side.shield += shield;
    note += note ? ` and gains ${shield} shield` : `gains ${shield} shield`;
  }
  if (card.suit === 'tide') {
    const healed = healLife(game, side, power, whoLabel);
    note += note ? ` and heals ${healed}` : `heals ${healed} life`;
  }
  if (card.draw) {
    const drawn = drawCards(game, side, card.draw);
    note += note ? `, draws ${drawn}` : `draws ${drawn} card${drawn === 1 ? '' : 's'}`;
  }
  if (card.mana) {
    side.mana = Math.min(side.mana + card.mana, MAX_MANA + 3);
    note += note ? `, gains ${card.mana} mana` : `gains ${card.mana} mana`;
  }
  const resonanceNote = resonance > 0 ? ` — Resonance +${resonance}!` : '';
  addLog(game, `${whoLabel} plays ${describeCard(card, power)}: ${note}.${resonanceNote}`, whoLabel === 'You' ? 'good' : 'foe');
  checkEnd(game);
  return { ok: true, card, resonance, power };
}

/** True when either life total has hit zero; sets phase and winner. */
export function checkEnd(game) {
  if (game.phase === PHASE_OVER) return true;
  if (game.foe.life <= 0) {
    game.winner = 'you';
    game.phase = PHASE_OVER;
    game.duelsWon += 1;
    addLog(game, 'Duchess Vex falls. The court is yours!', 'good');
    return true;
  }
  if (game.you.life <= 0) {
    game.winner = 'foe';
    game.phase = PHASE_OVER;
    addLog(game, 'Your life reaches zero. Duchess Vex keeps the crown.', 'bad');
    return true;
  }
  return false;
}

/** End the human turn and hand the table to the AI. Returns false if not your turn. */
export function endPlayerTurn(game) {
  if (game.phase !== PHASE_PLAYING || game.turnOwner !== 'you') return false;
  game.turnOwner = 'foe';
  game.phase = PHASE_AI;
  game.turn += 1;
  beginTurn(game, game.foe, Math.ceil(game.turn / 2));
  addLog(game, `Round ${Math.ceil(game.turn / 2)}: Duchess Vex takes the table.`);
  return true;
}

/**
 * One AI step: she plays her best affordable card, or null when she is done.
 * main.js calls this on a timer so each of her plays is visible; shots.js
 * calls it in a loop for instant replays.
 */
export function aiStep(game) {
  if (game.phase !== PHASE_AI) return null;
  const card = chooseAiCard(game.foe, game.you);
  if (card === null) return null;
  const result = playCard(game, game.foe, game.you, card.uid, 'Duchess Vex');
  return result.ok ? result.card : null;
}

/** True when the AI has no more plays worth making this turn. */
export function aiIsDone(game) {
  return chooseAiCard(game.foe, game.you) === null;
}

/** Hand the table back to the human and start the next turn. */
export function endAiTurn(game) {
  if (game.phase !== PHASE_AI) return false;
  game.turnOwner = 'you';
  game.phase = PHASE_PLAYING;
  game.turn += 1;
  beginTurn(game, game.you, Math.ceil(game.turn / 2));
  addLog(game, `Round ${Math.ceil(game.turn / 2)}: your move.`);
  return true;
}

/** Start the next duel after a win: harder foe, fresh decks, score kept. */
export function nextDuel(game) {
  game.duel += 1;
  startDuel(game, game.seed + game.duel * 7919);
  return game;
}

/** Append one line to the duel log (newest kept last, capped at 60). */
export function addLog(game, text, kind) {
  game.log.push({ text, kind: kind ?? '' });
  if (game.log.length > 60) game.log.splice(0, game.log.length - 60);
}

/** A small plain snapshot of the state, for the debug hook and tests. */
export function snapshot(game) {
  return {
    phase: game.phase,
    duel: game.duel,
    duelsWon: game.duelsWon,
    turn: game.turn,
    turnOwner: game.turnOwner,
    winner: game.winner,
    youLife: game.you ? game.you.life : null,
    youShield: game.you ? game.you.shield : null,
    youMana: game.you ? game.you.mana : null,
    youHand: game.you ? game.you.hand.length : 0,
    foeLife: game.foe ? game.foe.life : null,
    foeShield: game.foe ? game.foe.shield : null,
    foeHand: game.foe ? game.foe.hand.length : 0,
  };
}
