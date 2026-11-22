/* Ember Court — the card catalogue and deck building.
   Four suits, each with its own shape and colour, never text alone:
   Ember (flame, red) deals damage; Tide (drop, blue) heals; Thorn (leaf, green)
   shields; Gale (star, gold) draws cards and frees mana. Playing two cards of
   one suit in a single turn triggers Resonance: +2 to the second card. */

export const SUITS = {
  ember: { key: 'ember', name: 'Ember', mark: '\u{1F525}', verb: 'damage', colour: '#e23b2e' },
  tide: { key: 'tide', name: 'Tide', mark: '\u{1F4A7}', verb: 'heal', colour: '#2b7de0' },
  thorn: { key: 'thorn', name: 'Thorn', mark: '\u{1F33F}', verb: 'shield', colour: '#2f9e4f' },
  gale: { key: 'gale', name: 'Gale', mark: '\u2726', verb: 'draw', colour: '#d9a400' },
};

/**
 * One card design. `power` is the headline number on the card face; `draw`
 * and `mana` are the Gale extras. `effect` is the plain-language text on the card.
 */
export const CARD_DESIGNS = [
  { id: 'ember-spark', name: 'Ember Spark', suit: 'ember', cost: 1, power: 3, effect: 'Deal 3 damage.' },
  { id: 'ember-blaze', name: 'Ember Blaze', suit: 'ember', cost: 3, power: 7, effect: 'Deal 7 damage.' },
  { id: 'ember-nova', name: 'Ember Nova', suit: 'ember', cost: 5, power: 12, effect: 'Deal 12 damage.' },
  { id: 'tide-mend', name: 'Tide Mend', suit: 'tide', cost: 1, power: 4, effect: 'Heal 4 life.' },
  { id: 'tide-surge', name: 'Tide Surge', suit: 'tide', cost: 2, power: 7, draw: 1, effect: 'Heal 7 life. Draw 1 card.' },
  { id: 'tide-flood', name: 'Tide Flood', suit: 'tide', cost: 4, power: 10, effect: 'Heal 10 life.' },
  { id: 'thorn-ward', name: 'Thorn Ward', suit: 'thorn', cost: 1, power: 4, effect: 'Gain 4 shield.' },
  { id: 'thorn-snare', name: 'Thorn Snare', suit: 'thorn', cost: 2, power: 3, effect: 'Deal 3 damage. Gain 3 shield.' },
  { id: 'thorn-wall', name: 'Thorn Wall', suit: 'thorn', cost: 3, power: 9, effect: 'Gain 9 shield.' },
  { id: 'gale-gust', name: 'Gale Gust', suit: 'gale', cost: 1, power: 2, draw: 1, effect: 'Deal 2 damage. Draw 1 card.' },
  { id: 'gale-focus', name: 'Gale Focus', suit: 'gale', cost: 2, power: 0, mana: 3, draw: 1, effect: 'Gain 3 mana. Draw 1 card.' },
  { id: 'gale-tempest', name: 'Gale Tempest', suit: 'gale', cost: 3, power: 5, draw: 2, effect: 'Deal 5 damage. Draw 2 cards.' },
];

export const MAX_LIFE = 30;
export const HAND_LIMIT = 7;
export const START_HAND = 5;
export const DRAW_PER_TURN = 2;
export const MAX_MANA = 8;
export const RESONANCE_BONUS = 2;
export const WIN_LIFE_SWING = 5;

/** A fresh 36-card deck: three copies of each of the twelve designs. */
export function buildDeck() {
  const deck = [];
  for (const design of CARD_DESIGNS) {
    for (let copy = 0; copy < 3; copy += 1) {
      deck.push({ ...design, uid: `${design.id}-${copy}` });
    }
  }
  return deck;
}

/** Look a card design up by id; returns undefined for an unknown id. */
export function findDesign(id) {
  return CARD_DESIGNS.find((design) => design.id === id);
}
