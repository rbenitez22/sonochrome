// A seq is what a source's prepare() returns: the symbols at positions 0 .. length-1.
//   { length, base, at(i), slice(i, j) }
// `base` is the alphabet size of a digit source (symbols 0 .. base-1), or null for unbounded integers.
// at(i) throws a RangeError outside 0 .. length-1; slice(i, j) clamps like Array.prototype.slice
// (without negative indices) and returns an array of numbers.

function checkIndex(i, length) {
  if (!Number.isInteger(i) || i < 0 || i >= length) throw new RangeError(`position ${i} is outside 0..${length - 1}`);
}

function clampRange(i, j, length) {
  const from = Math.min(Math.max(0, i), length);
  const to = Math.min(Math.max(from, j === undefined ? length : j), length);
  return [from, to];
}

// Value of one digit character: '0'-'9' then 'a'-'z' (bases up to 36).
function digitValue(code) {
  return code < 58 ? code - 48 : code - 87;
}

// A seq over a string of digit characters, e.g. "31415..." for a constant computed from position 0.
export function digitStringSeq(text, base) {
  return {
    length: text.length,
    base,
    at(i) { checkIndex(i, text.length); return digitValue(text.charCodeAt(i)); },
    slice(i, j) {
      const [from, to] = clampRange(i, j, text.length);
      const out = new Array(to - from);
      for (let k = from; k < to; k++) out[k - from] = digitValue(text.charCodeAt(k));
      return out;
    },
  };
}

// A seq whose symbol at any position comes straight from a formula, term(i).
export function formulaSeq(length, base, term) {
  return {
    length,
    base,
    at(i) { checkIndex(i, length); return term(i); },
    slice(i, j) {
      const [from, to] = clampRange(i, j, length);
      const out = new Array(to - from);
      for (let k = from; k < to; k++) out[k - from] = term(k);
      return out;
    },
  };
}

// A seq over the first `length` entries of an array of numbers (e.g. a Float64Array a source fills as it
// computes). base is null for integer series.
export function arraySeq(values, length, base = null) {
  return {
    length,
    base,
    at(i) { checkIndex(i, length); return values[i]; },
    slice(i, j) {
      const [from, to] = clampRange(i, j, length);
      return Array.from(values.subarray ? values.subarray(from, to) : values.slice(from, to));
    },
  };
}
