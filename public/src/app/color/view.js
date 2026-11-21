/* The Colour view of the player page (see app/play.js). A placeholder until the colour view's
   modules arrive; it follows the view interface so the page can switch to it. */
import { $ } from '../dom.js';

export function createColorView() {
  return {
    name: 'color',
    computeVerb: 'Compute',
    setSource() {},
    refresh() {},
    show() {},
    hide() {},
    status(text) { $('colorStatus').textContent = text; },
  };
}
