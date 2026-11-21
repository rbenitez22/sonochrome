/* The explanation shown under the Scheme select, for the series' base (null for an integer series).
   For base 10 each note is the Pi Notes prototype's text. In other bases it names only the digits that
   occur: base 7 has no 7, 8 or 9, and base 12 adds a and b. */

const NOTES_BASE_10 = {
  codes: 'Digits are grouped into codes. A multiple of 9 is a rest. Otherwise the code divided by 9 picks a pitch in range, and the code modulo 7 picks the length. Pinned codes below override this rule; pinned chips have a dashed outline.',
  degrees: 'Each digit is a step on the scale: 0 is the key note, 7 is the key note one octave up (in a seven-note scale). Every note has the same length.',
  pairs: 'Digits are read in twos. The first picks the pitch (0 is a rest, 1 to 9 are scale steps). The second picks the length, from short (0) to long (9).',
  steps: 'Each digit moves the melody from the previous note: 0 repeats, 1 to 4 go up that many scale steps, 5 to 8 go down 1 to 4, and 9 is a rest.',
  values: 'Each term is a scale step counted from the middle of the range: 0 is the middle, 2 two steps up, −1 one step down. Steps past the range wrap around to the other end.',
  intervals: 'Each term moves the melody by its difference from the previous term, in scale steps. Moves past the range wrap around to the other end.',
};

// A range of numbers in words: "1 to 4", "1 and 2", or "1".
const range = (lo, hi) => (lo === hi ? `${lo}` : hi === lo + 1 ? `${lo} and ${hi}` : `${lo} to ${hi}`);
// "1 to 4 go" / "1 goes"; "1 to 9 are" / "1 is".
const span = (lo, hi, plural, singular) => (lo === hi ? `${lo} ${singular}` : `${range(lo, hi)} ${plural}`);
// ["a", "b", "c"] → "a, b, and c" (the notes' Oxford comma); ["a", "b"] → "a, and b" (the parts may
// contain "and" themselves, as in "1 and 2 go up").
const list = (parts) => parts.slice(0, -1).join(', ') + (parts.length > 1 ? ', and ' : '') + parts.at(-1);

function degrees(base) {
  // Below base 8 there is no digit 7, so no octave: say how far the digits reach instead.
  if (base < 8) {
    return `Each digit is a step on the scale: 0 is the key note, 1 the next step up, and so on. In base ${base} the digits run from 0 to ${base - 1}. Every note has the same length.`;
  }
  if (base < 10) {
    return `Each digit is a step on the scale: 0 is the key note, 7 is the key note one octave up (in a seven-note scale). In base ${base} the digits run from 0 to ${base - 1}. Every note has the same length.`;
  }
  const letters = (base - 1).toString(base) === 'a' ? 'the digit a is step 10'
    : base === 12 ? 'the digits a and b are steps 10 and 11'
    : `the digits a to ${(base - 1).toString(base)} are steps 10 to ${base - 1}`;
  return `Each digit is a step on the scale: 0 is the key note, 7 is the key note one octave up (in a seven-note scale), and ${letters}. Every note has the same length.`;
}

function pairs(base) {
  const hi = base - 1;
  return `Digits are read in twos. The first picks the pitch (0 is a rest, ${span(1, hi, 'are scale steps', 'is a scale step')}). The second picks the length, from short (0) to longer (${hi}).`;
}

function steps(base) {
  const parts = ['0 repeats'];
  const up = Math.min(4, base - 1), down = Math.min(8, base - 1) - 4;
  if (up >= 1) parts.push(span(1, up, 'go up that many scale steps', 'goes up one scale step'));
  if (down >= 1) parts.push(down === 1 ? '5 goes down 1' : `${range(5, 4 + down)} go down ${range(1, down)}`);
  if (base > 9) parts.push('9 is a rest');
  return 'Each digit moves the melody from the previous note: ' + list(parts) + '.';
}

const BY_BASE = { degrees, pairs, steps };

export function schemeNote(scheme, base) {
  if (base === 10 || base === null || base === undefined || !BY_BASE[scheme]) return NOTES_BASE_10[scheme];
  return BY_BASE[scheme](base);
}
