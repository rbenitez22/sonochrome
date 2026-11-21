// Start positions typed or rolled by the user. Limits come from the source (its maxLength).

// "4M", "250k", "4,000,000" → integer, or null when it is not a number.
export function parseStart(text) {
  const m = /^(\d+(?:\.\d+)?)\s*([kKmM]?)$/.exec(String(text).replace(/[,_\s]/g, ''));
  if (!m) return null;
  const mult = { '': 1, k: 1e3, m: 1e6 }[m[2].toLowerCase()];
  return Math.floor(parseFloat(m[1]) * mult + 1e-6);
}

// Uniform random start in [0, max]; rnd is injectable for tests.
export function randomStart(max, rnd = Math.random) {
  return Math.floor(rnd() * (max + 1));
}
