// Small DOM and formatting helpers shared by the pages.

export const $ = (id) => document.getElementById(id);

// 1234567 → "1,234,567".
export const fmtN = (n) => n.toLocaleString('en-US');

// Fill a <select> with [value, label] pairs.
export function fillSelect(select, options) {
  select.innerHTML = '';
  for (const [value, label] of options) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    select.appendChild(o);
  }
}
