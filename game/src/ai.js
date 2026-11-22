/* Ember Court — Duchess Vex, the AI rival. She reads the table and plays
   one card at a time, so her decisions are visible: she takes lethal when she
   sees it, heals when she is hurt, shields when you threaten her, and otherwise
   spends her mana on the biggest swing she can afford. */

import { MAX_LIFE, RESONANCE_BONUS } from './deck.js';

/** Score one candidate play for the AI. Higher is better. Damage is scored
    against the foe's shield first, because shield soaks it; healing is scored
    only up to the life actually missing. */
export function scoreAiPlay(card, ai, foe, playedSuits) {
  let score = 0;
  const resonance = playedSuits.has(card.suit) ? RESONANCE_BONUS : 0;
  const power = card.power + resonance;
  if (card.suit === 'ember') {
    // Damage is worth more the closer it gets to lethal.
    const damageAfterShield = Math.max(0, power - foe.shield);
    score += damageAfterShield * 3;
    if (damageAfterShield >= foe.life) score += 100;
    if (foe.life <= 8) score += 12;
  }
  if (card.suit === 'tide') {
    const missing = MAX_LIFE - ai.life;
    const usefulHeal = Math.min(power, missing);
    score += usefulHeal * 2;
    if (ai.life <= 10) score += 25;
    if (missing === 0) score -= 30;
  }
  if (card.suit === 'thorn') {
    score += power * 1.6;
    if (foe.hand.length >= 3) score += 6;
    if (ai.shield >= 12) score -= 18;
  }
  if (card.suit === 'gale') {
    score += power * 2 + (card.draw ?? 0) * 6 + (card.mana ?? 0) * 2;
    if (ai.hand.length <= 2) score += 10;
  }
  // Thorn Snare is both damage and shield: credit its shield too.
  if (card.id === 'thorn-snare') score += 3 * 1.6;
  // Cheap cards are efficient; never waste a big card on a nearly-dead foe.
  score -= card.cost * 1.5;
  return score;
}

/**
 * Pick the AI's next card, or null when she should stop. She plays while she
 * can afford a play worth more than holding the mana.
 */
export function chooseAiCard(ai, foe) {
  const playedSuits = new Set(ai.playedSuitsThisTurn);
  let best = null;
  let bestScore = 4;
  for (const card of ai.hand) {
    if (card.cost > ai.mana) continue;
    const score = scoreAiPlay(card, ai, foe, playedSuits);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/**
 * The autopilot that steers the human side in screenshot scenes: greedy and
 * simple — play the biggest affordable damage, heal under half life, shield
 * when the foe is about to hit hard. `cautious` plays nothing at all, so the
 * foe wins: that is how the loss scene is staged, a player who never answers.
 */
export function autopilotPick(hand, mana, myLife, foeLife, foeShield, playedSuits, cautious) {
  if (cautious) return null;
  const affordable = hand.filter((card) => card.cost <= mana);
  if (affordable.length === 0) return null;
  const resonance = (card) => (playedSuits.has(card.suit) ? RESONANCE_BONUS : 0);
  const lethal = affordable.find(
    (card) => card.suit === 'ember' && Math.max(0, card.power + resonance(card) - foeShield) >= foeLife,
  );
  if (lethal) return lethal;
  if (myLife <= 14) {
    const heal = affordable
      .filter((card) => card.suit === 'tide')
      .sort((a, b) => b.power - a.power)[0];
    if (heal) return heal;
  }
  const damage = affordable
    .filter((card) => card.suit === 'ember' || card.suit === 'gale')
    .sort((a, b) => b.power + resonance(b) - (a.power + resonance(a)))[0];
  if (damage && (damage.power > 0 || damage.draw)) return damage;
  const shield = affordable
    .filter((card) => card.suit === 'thorn')
    .sort((a, b) => b.power - a.power)[0];
  if (shield) return shield;
  return affordable.sort((a, b) => b.cost - a.cost)[0];
}
