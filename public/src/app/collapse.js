/* Collapsible settings cards on phones and narrow windows (under 900 px; wider, nothing changes).
   A card's <h2> becomes a button with the title, a one-line summary and a chevron; it hides or shows the
   card's body. Children marked data-collapse-keep (progress, actions, status) stay outside the body, so
   they show even when the card is collapsed. Cards start collapsed; each card's state is remembered. */

const NARROW = matchMedia('(max-width: 899px)');
const STORE = 'sonochrome.collapsed.';

const CHEVRON = '<svg class="card-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let cards = [];

function loadCollapsed(key) {
  try { return localStorage.getItem(STORE + key) !== 'open'; } catch (e) { return true; }
}

function saveCollapsed(key, collapsed) {
  try { localStorage.setItem(STORE + key, collapsed ? 'closed' : 'open'); } catch (e) {}
}

// Move the card's children after its <h2> (except the kept ones) into a body element.
function wrapBody(card, key) {
  const body = document.createElement('div');
  body.className = 'card-body';
  body.id = key + '-body';
  const h2 = card.querySelector(':scope > h2');
  for (const el of [...card.children]) if (el !== h2 && !el.hasAttribute('data-collapse-keep')) body.appendChild(el);
  h2.after(body);
  return body;
}

function makeToggle(title, bodyId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card-toggle';
  button.setAttribute('aria-controls', bodyId);
  button.innerHTML = '<span class="card-title"></span><span class="card-summary"></span>' + CHEVRON;
  button.querySelector('.card-title').textContent = title;
  return button;
}

// Show one card as its state and the screen width say.
function render(c) {
  const narrow = NARROW.matches;
  c.h2.replaceChildren(narrow ? c.button : c.title);
  c.card.classList.toggle('collapsed', narrow && c.collapsed);
  c.body.hidden = narrow && c.collapsed;
  c.button.setAttribute('aria-expanded', String(!c.collapsed));
}

/* Make each card collapsible. summaries maps a card's key (one of its classes) to a function giving its
   summary text. */
export function initCollapsible(cardEls, summaries) {
  cards = cardEls.map((card) => {
    const key = Object.keys(summaries).find((k) => card.classList.contains(k));
    const h2 = card.querySelector(':scope > h2'), title = h2.textContent;
    const body = wrapBody(card, key);
    const c = { card, key, h2, title, body, button: makeToggle(title, body.id), summary: summaries[key], collapsed: loadCollapsed(key) };
    c.button.addEventListener('click', () => {
      c.collapsed = !c.collapsed;
      saveCollapsed(key, c.collapsed);
      render(c);
    });
    return c;
  });
  cards.forEach(render);
  NARROW.addEventListener('change', () => cards.forEach(render));
  refreshSummaries();
}

// Rewrite every card's summary from its fields.
export function refreshSummaries() {
  for (const c of cards) c.button.querySelector('.card-summary').textContent = c.summary();
}
