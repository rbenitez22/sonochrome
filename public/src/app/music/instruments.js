// The instruments a voice can play. (The synthesis itself arrives with playback.)

// [id, label] in menu order.
export const INSTRUMENTS = [
  ['piano','Piano'], ['organ','Organ'], ['harp','Harp'], ['marimba','Marimba'], ['bells','Bells'],
  ['flute','Flute'], ['strings','Strings'], ['guitar','Guitar'], ['euphonium','Euphonium'], ['bass','Bass'], ['lead','Square lead'], ['sine','Pure sine']
];

// General MIDI program (1-based) per instrument, for MusicXML export; nearest patch where GM has none.
export const GM_PROGRAM = { piano:1, organ:20, harp:47, marimba:13, bells:15, flute:74, strings:49, guitar:25, euphonium:59, bass:33, lead:81, sine:80 };

export const instrumentLabel = (id) => (INSTRUMENTS.find((i) => i[0] === id) || [0, ''])[1];
