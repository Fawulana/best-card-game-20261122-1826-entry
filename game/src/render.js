/* Ember Court — everything the player sees: hands, table, HUD, log and the
   title / win / loss overlays. Rendering is a pure function of game state;
   main.js calls renderAll after every change. */

import { SUITS } from './deck.js';
import { PHASE_AI, PHASE_OVER, PHASE_PLAYING, PHASE_TITLE } from './game.js';

const $ = (id) => document.getElementById(id);

/** Build one face-up card element. `index` is its keyboard number (1-based). */
export function buildCardElement(card, power, index, playable, onPlay) {
  const suit = SUITS[card.suit];
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `card suit-${card.suit}`;
  element.dataset.uid = card.uid;
  element.setAttribute('aria-label', `${card.name}, ${suit.name}, cost ${card.cost}, ${suit.verb} ${power}. ${card.effect}`);
  // The power number already includes Resonance +2 when it applies; the
  // effect text stays short so it never overflows the card face.
  element.innerHTML =
    `<span class="suit-band"></span>` +
    `<span class="cost">${card.cost}</span>` +
    `<span class="suit-mark">${suit.mark}</span>` +
    `<span class="power">${power}</span>` +
    `<span class="power-label">${suit.verb}</span>` +
    `<span class="name">${card.name}</span>` +
    `<span class="effect">${card.effect}</span>` +
    (index ? `<span class="key-hint">${index}</span>` : '');
  if (!playable) element.classList.add('unplayable');
  element.addEventListener('click', () => onPlay(card.uid));
  return element;
}

/** One face-down card back for the opponent's hidden hand. */
function buildCardBack() {
  const element = document.createElement('div');
  element.className = 'card-back';
  element.setAttribute('aria-hidden', 'true');
  return element;
}

/** Render one side's played-this-turn cards into its row on the table.
    Only the most recent three are shown, so the row never overflows the arena. */
function renderPlayed(row, cards, playedSuits) {
  row.replaceChildren();
  if (cards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card-slot-empty';
    empty.textContent = 'No cards played yet';
    row.appendChild(empty);
    return;
  }
  for (const card of cards.slice(-3)) {
    const element = buildCardElement(card, card.power, 0, true, () => {});
    element.classList.add('played-card');
    element.disabled = true;
    row.appendChild(element);
  }
}

/** Render both hands: yours face-up and clickable, hers face-down.
    A full hand of seven gets the compact card size, so every name stays
    readable instead of sliding under its neighbour. */
export function renderHands(game, onPlay) {
  const myHand = $('my-hand');
  myHand.replaceChildren();
  const myTurn = game.phase === PHASE_PLAYING && game.turnOwner === 'you';
  const compact = game.you.hand.length >= 6;
  game.you.hand.forEach((card, index) => {
    const resonance = game.you.playedSuits.has(card.suit) ? 2 : 0;
    const playable = myTurn && card.cost <= game.you.mana;
    const element = buildCardElement(card, card.power + resonance, index + 1, playable, onPlay);
    if (compact) element.classList.add('compact');
    myHand.appendChild(element);
  });
  const foeHand = $('foe-hand');
  foeHand.replaceChildren();
  for (let index = 0; index < game.foe.hand.length; index += 1) {
    foeHand.appendChild(buildCardBack());
  }
}

/** Render life, shield, mana, deck counts and the match score. */
export function renderStats(game) {
  $('my-life').textContent = game.you.life;
  $('my-shield').textContent = game.you.shield;
  $('my-mana').textContent = game.you.mana;
  document.querySelector('#my-stats .mana-max').textContent = `/ ${game.you.maxMana} mana`;
  $('my-deck').textContent = game.you.deck.length;
  $('foe-life').textContent = game.foe.life;
  $('foe-shield').textContent = game.foe.shield;
  $('foe-deck').textContent = game.foe.deck.length;
  $('duel-label').textContent = `Duel ${game.duel}`;
  $('score-label').textContent = `Duels won ${game.duelsWon}`;
  $('my-shield-wrap').style.visibility = game.you.shield > 0 ? 'visible' : 'hidden';
  $('foe-shield-wrap').style.visibility = game.foe.shield > 0 ? 'visible' : 'hidden';
}

/** Render the turn banner, combo banner and the End Turn button state. */
export function renderTurn(game) {
  const banner = $('turn-banner');
  if (game.phase === PHASE_PLAYING) banner.textContent = `Your turn — Turn ${Math.ceil(game.turn / 2)}`;
  else if (game.phase === PHASE_AI) banner.textContent = 'Duchess Vex is thinking…';
  else if (game.phase === PHASE_OVER) banner.textContent = game.winner === 'you' ? 'Victory!' : 'Defeat';
  else banner.textContent = 'Welcome to the Court';
  const combo = $('combo-banner');
  const resonanceReady = game.you.playedSuits.size > 0 && game.phase === PHASE_PLAYING;
  combo.hidden = !resonanceReady;
  if (resonanceReady) {
    combo.textContent = `Resonance ready: ${[...game.you.playedSuits].map((key) => SUITS[key].name).join(', ')} +2`;
  }
  $('end-turn').disabled = game.phase !== PHASE_PLAYING;
  $('new-duel').hidden = !(game.phase === PHASE_OVER && game.winner === 'you');
  $('arena-hint').textContent =
    game.phase === PHASE_PLAYING
      ? 'Play a card, then end your turn'
      : game.phase === PHASE_AI
        ? 'Watch what she plays — then answer it'
        : '';
}

/** Render the duel log, newest at the bottom, scrolled into view. */
export function renderLog(game) {
  const list = $('log');
  list.replaceChildren();
  for (const entry of game.log) {
    const item = document.createElement('li');
    if (entry.kind) item.className = entry.kind;
    item.textContent = entry.text;
    list.appendChild(item);
  }
  list.scrollTop = list.scrollHeight;
}

/** Render one full frame: hands, played rows, stats, turn and log. */
export function renderAll(game, onPlay) {
  renderPlayed($('foe-played'), game.foe.played, game.foe.playedSuits);
  renderPlayed($('my-played'), game.you.played, game.you.playedSuits);
  renderHands(game, onPlay);
  renderStats(game);
  renderTurn(game);
  renderLog(game);
}

/** Show an overlay screen. `tone` is '' (title), 'win' or 'loss'. */
export function showOverlay({ kicker, title, text, score, button, tone }) {
  const overlay = $('overlay');
  const card = $('overlay-card');
  card.className = tone ?? '';
  $('overlay-kicker').textContent = kicker;
  $('overlay-title').textContent = title;
  $('overlay-text').textContent = text;
  $('overlay-score').innerHTML = score;
  const buttonElement = $('overlay-button');
  buttonElement.textContent = button;
  overlay.hidden = false;
  buttonElement.focus();
}

/** Hide the overlay and return to the table. */
export function hideOverlay() {
  $('overlay').hidden = true;
}

/** The title screen: the game's name, rules and the call to begin. */
export function showTitle(game) {
  showOverlay({
    kicker: 'A duel of suits · best of the court',
    title: 'EMBER COURT',
    text: 'Duchess Vex holds the crown. Build your hand, spend your mana, and strike: ' +
      'Ember burns, Tide heals, Thorn shields, Gale draws. Two cards of one suit in a turn ' +
      'resonate for +2. First to 0 life loses the duel — win three duels to take the crown.',
    score: `Duels won: <b>${game.duelsWon}</b> &nbsp;·&nbsp; First to 0 life loses`,
    button: 'Begin the Duel',
    tone: '',
  });
}

/** The win screen, shown the moment the foe's life hits zero. */
export function showWin(game) {
  showOverlay({
    kicker: `Duel ${game.duel} won`,
    title: 'VICTORY!',
    text: 'Duchess Vex bows, her crown slides across the felt, and the court erupts. ' +
      'The Ember Court is yours — take the next duel and defend it.',
    score: `Duels won: <b>${game.duelsWon}</b> &nbsp;·&nbsp; Your life: <b>${game.you.life}</b>`,
    button: 'Next Duel',
    tone: 'win',
  });
}

/** The loss screen, shown the moment your life hits zero. */
export function showLoss(game) {
  showOverlay({
    kicker: `Duel ${game.duel} lost`,
    title: 'DEFEAT',
    text: 'Duchess Vex keeps the crown — this time. Your cards scatter across the felt. ' +
      'Shuffle up, read her tells, and challenge her again.',
    score: `Duels won: <b>${game.duelsWon}</b> &nbsp;·&nbsp; Her life: <b>${game.foe.life}</b>`,
    button: 'Challenge Again',
    tone: 'loss',
  });
}

/** Announce a line to screen readers through the status paragraph. */
export function announce(text) {
  $('status').textContent = text;
}
