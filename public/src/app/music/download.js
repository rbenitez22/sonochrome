/* The MusicXML download. Notes and Time export the whole piece; Infinite exports the bars played so
   far, so its button waits until something has played. */
import { $, fmtN } from '../dom.js';
import { toMeasures, chooseClef } from '../../mappings/music/measures.js';
import { toMusicXML, padBars } from '../../mappings/music/musicxml.js';
import { exportEvents, symbolSpan } from './piece.js';

const TITLE = 'Save the score as MusicXML (opens in MuseScore and other notation programs)';
const MIME = 'application/vnd.recordare.musicxml+xml';

// Enable the button when there is something to save, and say what it saves. Infinite needs a playback
// running or stopped after playedBeats > 0.
export function updateDownload(piece, playing, playedBeats) {
  const infinite = piece && piece.s.mode === 'infinite';
  $('dlXml').disabled = !piece || !piece.voices.length || (infinite && !playing && playedBeats <= 0);
  $('dlXml').title = infinite ? 'Save the bars played so far as MusicXML (press Play first)' : TITLE;
}

/* Per-voice event lists → the score object for toMusicXML. parts[k] = { name, program } for voice k;
   clefSetting is 'auto', 'treble' or 'bass'. */
export function collectScore(evs, { sourceName, start, bpm, parts, clefSetting }) {
  const span = symbolSpan(start, evs);
  const bars = padBars(evs.map((list) => toMeasures(list)));
  return {
    title: sourceName, subtitle: 'Sonochrome: digits ' + fmtN(span.start) + '–' + fmtN(span.end), bpm,
    start: span.start, end: span.end,
    parts: evs.map((list, k) => ({ ...parts[k], clef: chooseClef(list, clefSetting), bars: bars[k] })),
  };
}

// Save text as a file through a temporary link.
function downloadText(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Build and save the piece's MusicXML as <sourceId>-<start>-<end>.musicxml. Returns false (and saves
   nothing) when the seq is too short to rebuild the piece. */
export function downloadMusicXML(piece, seq, beatsPlayed, { sourceId, ...meta }) {
  const evs = exportEvents(piece, seq, beatsPlayed);
  if (!evs) return false;
  const score = collectScore(evs, { ...meta, start: piece.s.start });
  downloadText(sourceId + '-' + score.start + '-' + score.end + '.musicxml', toMusicXML(score), MIME);
  return true;
}
