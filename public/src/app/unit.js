// The words for one position of a source: "digit(s)" for digit series, "term(s)" for integer series.
export const unitWord = (source) => (source?.kind === 'int' ? 'term' : 'digit');
export const unitWords = (source) => unitWord(source) + 's';
// "Digits" / "Terms", for the start of a sentence or a heading.
export const UnitWords = (source) => { const w = unitWords(source); return w[0].toUpperCase() + w.slice(1); };
