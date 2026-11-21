/* The MusicXML and MIDI downloads. Notes and Time export the whole piece; Infinite exports the bars
   played so far, so its buttons wait until something has played. */
import { $, fmtN } from '../dom.js';
import { toMeasures, chooseClef } from '../../mappings/music/measures.js';
import { toMusicXML, padBars } from '../../mappings/music/musicxml.js';
import { toMidi } from '../../mappings/music/midi.js';
import { exportEvents, symbolSpan } from './piece.js';

const XML_TITLE = 'Save the score as MusicXML (opens in MuseScore and other notation programs)';
const XML_MIME = 'application/vnd.recordare.musicxml+xml';
const MIDI_TITLE = 'Save the piece as a MIDI file (opens in music software and MIDI players)';
const MIDI_MIME = 'audio/midi';

// Enable the buttons when there is something to save, and say what they save. Infinite needs a playback
// running or stopped after playedBeats > 0.
export function updateDownload(piece, playing, playedBeats) {
  const infinite = piece && piece.s.mode === 'infinite';
  const disabled = !piece || !piece.voices.length || (infinite && !playing && playedBeats <= 0);
  $('dlXml').disabled = $('dlMidi').disabled = disabled;
  $('dlXml').title = infinite ? 'Save the bars played so far as MusicXML (press Play first)' : XML_TITLE;
  $('dlMidi').title = infinite ? 'Save the bars played so far as a MIDI file (press Play first)' : MIDI_TITLE;
}

/* Per-voice event lists → the score object for toMusicXML. parts[k] = { name, program } for voice k;
   clefSetting is 'auto', 'treble' or 'bass'; units names the positions in the subtitle ('digits' or 'terms'). */
export function collectScore(evs, { sourceName, units = 'digits', start, bpm, parts, clefSetting, key }) {
  const span = symbolSpan(start, evs);
  const bars = padBars(evs.map((list) => toMeasures(list)));
  return {
    key, title: sourceName, subtitle: 'Sonochrome: ' + units + ' ' + fmtN(span.start) + '–' + fmtN(span.end), bpm,
    start: span.start, end: span.end,
    parts: evs.map((list, k) => ({ ...parts[k], clef: chooseClef(list, clefSetting), bars: bars[k] })),
  };
}

// Save text or bytes as a file through a temporary link.
function downloadFile(name, data, mime) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
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
  downloadFile(sourceId + '-' + score.start + '-' + score.end + '.musicxml', toMusicXML(score), XML_MIME);
  return true;
}

/* Build and save the piece as a MIDI file, <sourceId>-<start>-<end>.mid: the same events and span as the
   MusicXML, one track per voice (parts[k] = { name, program }). Returns false when the seq is too short. */
export function downloadMidi(piece, seq, beatsPlayed, { sourceId, sourceName, units = 'digits', bpm, key, parts }) {
  const evs = exportEvents(piece, seq, beatsPlayed);
  if (!evs) return false;
  const span = symbolSpan(piece.s.start, evs);
  const bytes = toMidi({
    title: sourceName + ': ' + units + ' ' + fmtN(span.start) + '–' + fmtN(span.end), bpm, key,
    tracks: evs.map((events, k) => ({ ...parts[k], events })),
  });
  downloadFile(sourceId + '-' + span.start + '-' + span.end + '.mid', bytes, MIDI_MIME);
  return true;
}
