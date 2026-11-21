// φ: a constant in any base (see constant.js and engines.js).
import { makeConstant } from './constant.js';

export default makeConstant({
  id: 'phi',
  name: 'φ',
  glyph: 'φ',
  blurb: 'The golden ratio, (1 + √5) / 2 = 1.61803… Its digits never repeat.',
});
