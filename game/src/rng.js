/* Ember Court — seeded random numbers (mulberry32). One seed drives a whole duel,
// so a screenshot seed always replays the same hands, and play stays fair. */

/** Create a deterministic PRNG from an integer seed. */
export function createRng(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle of `array` in place, using `rng`. Returns the array.
    The same seed always shuffles the same way, which is what makes a
    screenshot seed replay the same duel. */
export function shuffleDeck(array, rng) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    const held = array[index];
    array[index] = array[other];
    array[other] = held;
  }
  return array;
}

/** Pick an integer in [0, count) from `rng`. */
export function pickIndex(rng, count) {
  return Math.floor(rng() * count);
}
