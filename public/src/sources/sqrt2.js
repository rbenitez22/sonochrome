// √2: a constant in any base (see constant.js and engines.js).
import { makeConstant } from './constant.js';

export default makeConstant({
  id: 'sqrt2',
  name: '√2',
  glyph: '√2',
  blurb: 'The diagonal of a unit square: 1.41421… The first number known to be irrational.',
});
