/* Ember Court — all sound is synthesized with WebAudio. No audio files, no
   network: short oscillator envelopes for play, hit, heal, draw, win and loss. */

let audioContext = null;
let soundEnabled = true;

/** True while sound effects are switched on. */
export function isSoundEnabled() {
  return soundEnabled;
}

/** Flip the sound switch and report the new state. */
export function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

/** Lazily create (or resume) the shared AudioContext after a user gesture. */
export function ensureAudio() {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  if (audioContext === null) {
    audioContext = new window.AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playTone(frequency, startAt, duration, type, volume) {
  if (!soundEnabled) return;
  const context = ensureAudio();
  if (context === null) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime + startAt);
  gain.gain.setValueAtTime(0.0001, context.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(context.currentTime + startAt);
  oscillator.stop(context.currentTime + startAt + duration + 0.05);
}

function playNotes(notes, type, volume) {
  notes.forEach(([frequency, startAt, duration]) => {
    playTone(frequency, startAt, duration, type, volume);
  });
}

/** A card snapping onto the table: a soft wooden tick. */
export function playCardSound() {
  playTone(520, 0, 0.09, 'triangle', 0.16);
  playTone(780, 0.05, 0.08, 'triangle', 0.1);
}

/** Damage landing: a low thud. */
export function playHitSound() {
  playTone(160, 0, 0.18, 'sawtooth', 0.14);
  playTone(90, 0.02, 0.22, 'sine', 0.2);
}

/** Healing: a rising warm chime. */
export function playHealSound() {
  playNotes([[523, 0, 0.22], [659, 0.09, 0.22], [784, 0.18, 0.3]], 'sine', 0.12);
}

/** Drawing a card: a quick paper flick. */
export function playDrawSound() {
  playTone(880, 0, 0.06, 'square', 0.05);
  playTone(1174, 0.05, 0.08, 'square', 0.05);
}

/** Resonance combo: a bright two-note sparkle. */
export function playResonanceSound() {
  playNotes([[1046, 0, 0.16], [1568, 0.08, 0.26]], 'sine', 0.13);
}

/** Your turn beginning: a short call to attention. */
export function playTurnSound() {
  playNotes([[392, 0, 0.12], [523, 0.1, 0.18]], 'triangle', 0.1);
}

/** Victory fanfare: a rising major arpeggio. Four notes, each a little longer,
    so the win lands with a flourish. */
export function playWinSound() {
  playNotes([[523, 0, 0.22], [659, 0.14, 0.22], [784, 0.28, 0.22], [1046, 0.42, 0.5]], 'triangle', 0.16);
}

/** Defeat: a slow falling line. */
export function playLoseSound() {
  playNotes([[392, 0, 0.3], [330, 0.24, 0.3], [262, 0.48, 0.5]], 'sine', 0.14);
}
