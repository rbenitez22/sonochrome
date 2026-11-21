// π: the ratio of a circle's circumference to its diameter, in any base (see constant.js).
// In base 10, up to 20,000 digits come from Machin's formula on the page, exactly as in the Pi Notes
// prototype; everything else is the Chudnovsky engine (engines.js).
import { makeConstant } from './constant.js';

const ON_PAGE_LIMIT = 20_000;
const ON_PAGE_MIN = 3_000;

// π by Machin's formula on BigInt: fast enough on the page for a few thousand digits.
export function machin(n) {
  const one = 10n ** BigInt(n + 12);
  const acot = (x) => {
    const X = BigInt(x), X2 = X * X;
    let term = one / X, sum = term, k = 1n, sign = -1n;
    while (term > 0n) { term /= X2; k += 2n; sum += sign * (term / k); sign = -sign; }
    return sum;
  };
  return (4n * (4n * acot(5) - acot(239))).toString().slice(0, n);
}

export default makeConstant({
  id: 'pi',
  name: 'π',
  glyph: 'π',
  blurb: 'The ratio of a circle’s circumference to its diameter: 3.14159… Its digits never repeat.',
  quick: (upTo, base) => (base === 10 && upTo <= ON_PAGE_LIMIT ? machin(Math.max(upTo, ON_PAGE_MIN)) : null),
});
