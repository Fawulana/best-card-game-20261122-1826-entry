/* Ember Court — screenshot scenes behind ?shot=title|play|win|loss&seed=N.
   Each scene plays the real rules forward from a fresh duel with a fixed
   seed, steered by the autopilot in ai.js, so every frame is what a real game
   looks like and the same seed always gives the same frame. The title scene
   shows the dealt table behind the title overlay; the play scene is a live
   mid-game table; win and loss are the ends of full duels. */

import { autopilotPick } from './ai.js';
import {
  PHASE_OVER, aiStep, checkEnd, endAiTurn, endPlayerTurn, playCard, startDuel,
} from './game.js';

const MAX_TURNS = 60;

/** Play one full human turn with the autopilot, then the AI's whole turn. */
function playRound(game, cautious) {
  const you = game.you;
  const foe = game.foe;
  let guard = 0;
  while (game.phase !== PHASE_OVER && guard < 12) {
    guard += 1;
    const card = autopilotPick(you.hand, you.mana, you.life, foe.life, foe.shield, you.playedSuits, cautious);
    if (card === null) break;
    playCard(game, you, foe, card.uid, 'You');
  }
  if (game.phase === PHASE_OVER) return;
  endPlayerTurn(game);
  while (game.phase !== PHASE_OVER) {
    if (aiStep(game) === null) break;
  }
  if (game.phase === PHASE_OVER) return;
  endAiTurn(game);
}

/** Drive a duel to its end. Returns 'you', 'foe', or null if it ran long. */
function playDuelToEnd(game, cautious) {
  for (let round = 0; round < MAX_TURNS && game.phase !== PHASE_OVER; round += 1) {
    playRound(game, cautious);
  }
  checkEnd(game);
  return game.phase === PHASE_OVER ? game.winner : null;
}

/**
 * Set `game` to the named scene and return the overlay to show:
 * 'title' (table dealt, title overlay), 'play' (mid-game), 'win' or 'loss'.
 * Any other name is the title scene.
 */
export function stageShot(name, game, seed) {
  if (name === 'play') {
    startDuel(game, seed);
    for (let round = 0; round < 3 && game.phase !== PHASE_OVER; round += 1) {
      playRound(game, false);
    }
    // Mid-turn, not turn start: play two cards so the table shows both
    // sides' plays, a live resonance and real damage on the foe's life.
    let played = 0;
    while (game.phase !== PHASE_OVER && played < 2) {
      const card = autopilotPick(game.you.hand, game.you.mana, game.you.life, game.foe.life, game.foe.shield, game.you.playedSuits, false);
      if (card === null) break;
      playCard(game, game.you, game.foe, card.uid, 'You');
      played += 1;
    }
    return { overlay: 'none' };
  }
  if (name === 'win') {
    startDuel(game, seed);
    playDuelToEnd(game, false);
    // If the bold pilot somehow lost, replay with the foe weakened: the win
    // scene must show a real win, so stage it from a fresh duel where the
    // foe starts at 6 life and the pilot finishes her off.
    if (game.winner !== 'you') {
      startDuel(game, seed);
      game.foe.life = 6;
      playRound(game, false);
      if (game.phase !== PHASE_OVER) playDuelToEnd(game, false);
    }
    return { overlay: game.winner === 'you' ? 'win' : 'none' };
  }
  if (name === 'loss') {
    startDuel(game, seed);
    playDuelToEnd(game, true);
    // If the cautious pilot somehow survived, replay with the player at 4
    // life so the foe's next turn ends it for real.
    if (game.winner !== 'foe') {
      startDuel(game, seed);
      game.you.life = 4;
      playDuelToEnd(game, true);
      if (game.phase !== PHASE_OVER) {
        endPlayerTurn(game);
        while (game.phase !== PHASE_OVER && aiStep(game) !== null) { /* let her finish it */ }
        checkEnd(game);
      }
    }
    return { overlay: game.winner === 'foe' ? 'loss' : 'none' };
  }
  startDuel(game, seed);
  return { overlay: 'title' };
}
