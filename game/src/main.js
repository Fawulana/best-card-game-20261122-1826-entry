/* Ember Court — bootstrap, input and the AI's visible turn.
   Mouse: click a card to play it, click End Turn to pass. Keyboard: 1-5 play
   a card, Enter ends the turn or presses the overlay button, M toggles sound,
   arrows move a focus ring across the hand. ?shot=title|play|win|loss&seed=N
   stages a screenshot scene; without it, the title screen opens. */

import { aiStep, createGame, endAiTurn, endPlayerTurn, nextDuel, playCard, snapshot, startDuel } from './game.js';
import { PHASE_AI, PHASE_OVER, PHASE_PLAYING } from './game.js';
import { renderAll, showLoss, showTitle, showWin, hideOverlay, announce } from './render.js';
import { stageShot } from './shots.js';
import {
  ensureAudio, isSoundEnabled, playCardSound, playDrawSound, playHealSound,
  playHitSound, playLoseSound, playResonanceSound, playTurnSound, playWinSound,
  toggleSound,
} from './audio.js';

const DEFAULT_SEED = 20261122;
const AI_STEP_MS = 650;

let game = createGame(DEFAULT_SEED);
let aiTimer = null;
let keyboardFocus = 0;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : DEFAULT_SEED;

function playSoundFor(result) {
  if (!result || !result.ok) return;
  const card = result.card;
  playCardSound();
  if (result.resonance > 0) playResonanceSound();
  if (card.suit === 'ember' || card.id === 'thorn-snare') playHitSound();
  if (card.suit === 'tide') playHealSound();
  if (card.draw) playDrawSound();
}

function afterChange() {
  renderAll(game, onPlayCard);
  if (game.phase === PHASE_OVER) {
    stopAiTimer();
    if (game.winner === 'you') {
      playWinSound();
      showWin(game);
      announce('Victory! Duchess Vex is beaten. Press Enter for the next duel.');
    } else {
      playLoseSound();
      showLoss(game);
      announce('Defeat. Duchess Vex keeps the crown. Press Enter to challenge her again.');
    }
  }
}

function onPlayCard(cardUid) {
  if (game.phase !== PHASE_PLAYING || game.turnOwner !== 'you') return;
  ensureAudio();
  const result = playCard(game, game.you, game.foe, cardUid, 'You');
  if (!result.ok) {
    announce(result.reason === 'not enough mana' ? 'Not enough mana for that card.' : 'That card cannot be played.');
    return;
  }
  playSoundFor(result);
  afterChange();
}

function onEndTurn() {
  if (game.phase !== PHASE_PLAYING) return;
  ensureAudio();
  if (!endPlayerTurn(game)) return;
  renderAll(game, onPlayCard);
  runAiTurn();
}

function runAiTurn() {
  stopAiTimer();
  aiTimer = window.setInterval(() => {
    if (game.phase !== PHASE_AI) {
      stopAiTimer();
      return;
    }
    const playedCard = aiStep(game);
    if (playedCard !== null) {
      playSoundFor({ ok: true, card: playedCard, resonance: 0 });
      renderAll(game, onPlayCard);
      if (game.phase === PHASE_OVER) afterChange();
      return;
    }
    stopAiTimer();
    endAiTurn(game);
    playTurnSound();
    afterChange();
  }, AI_STEP_MS);
}

function stopAiTimer() {
  if (aiTimer !== null) {
    window.clearInterval(aiTimer);
    aiTimer = null;
  }
}

function beginDuel() {
  stopAiTimer();
  hideOverlay();
  startDuel(game, game.seed + game.duel * 131);
  playTurnSound();
  afterChange();
  announce('Duel begins. Your turn: play a card, then end your turn.');
}

function onOverlayButton() {
  ensureAudio();
  if (game.phase === PHASE_OVER) {
    if (game.winner === 'you') {
      nextDuel(game);
      beginDuel();
    } else {
      beginDuel();
    }
    return;
  }
  beginDuel();
}

function focusCard(index) {
  const cards = document.querySelectorAll('#my-hand .card');
  if (cards.length === 0) return;
  keyboardFocus = Math.max(0, Math.min(cards.length - 1, index));
  cards.forEach((element) => element.classList.remove('keyboard-focus'));
  const focused = cards[keyboardFocus];
  focused.classList.add('keyboard-focus');
  focused.focus();
}

function bindInput() {
  document.getElementById('end-turn').addEventListener('click', onEndTurn);
  document.getElementById('new-duel').addEventListener('click', () => {
    if (game.phase === PHASE_OVER && game.winner === 'you') {
      nextDuel(game);
      beginDuel();
    }
  });
  document.getElementById('overlay-button').addEventListener('click', onOverlayButton);
  document.getElementById('sound-toggle').addEventListener('click', (event) => {
    const on = toggleSound();
    event.currentTarget.textContent = `♪ Sound: ${on ? 'On' : 'Off'}`;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key >= '1' && event.key <= '9') {
      const index = Number(event.key) - 1;
      const card = game.you && game.you.hand[index];
      if (card) onPlayCard(card.uid);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (!document.getElementById('overlay').hidden) {
        event.preventDefault();
        onOverlayButton();
        return;
      }
      if (game.phase === PHASE_PLAYING) {
        event.preventDefault();
        onEndTurn();
      }
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusCard(keyboardFocus + (event.key === 'ArrowRight' ? 1 : -1));
      return;
    }
    if (event.key === 'm' || event.key === 'M') {
      const on = toggleSound();
      document.getElementById('sound-toggle').textContent = `♪ Sound: ${on ? 'On' : 'Off'}`;
    }
  });
}

function boot() {
  bindInput();
  if (shotName) {
    const staged = stageShot(shotName, game, seed);
    renderAll(game, onPlayCard);
    if (staged.overlay === 'title') showTitle(game);
    else if (staged.overlay === 'win') showWin(game);
    else if (staged.overlay === 'loss') showLoss(game);
    document.getElementById('sound-toggle').textContent = '♪ Sound: On';
    return;
  }
  startDuel(game, seed);
  renderAll(game, onPlayCard);
  showTitle(game);
}

// A tiny debug hook for play-testing: state and the same functions the UI
// calls. It never touches the network and ships in the game.
window.__ember = {
  snapshot: () => snapshot(game),
  playCard: (uid) => onPlayCard(uid),
  endTurn: () => onEndTurn(),
  state: () => game,
};

boot();
