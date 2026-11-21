// Without score.key: C, no mode, flats (the prototype's output).
const NO_KEY = { fifths: 0, mode: null };

/* ---- MusicXML export ----
   score = { title, subtitle, bpm, parts: [{ name, program, clef: 'treble'|'bass', bars }], key? },
   key = { fifths, mode } from keySignature (optional: without it, C and flats as in the prototype),
   bars as from toMeasures()/measuresInRange(). One quarter = 4 divisions (sixteenth grid). */
import { spell } from './keys.js';

export const XML_DIVISIONS = 4;
// beats -> [MusicXML note type, dots]
const XML_TYPES = { 4:['whole',0], 3:['half',1], 2:['half',0], 1.5:['quarter',1], 1:['quarter',0], 0.75:['eighth',1], 0.5:['eighth',0], 0.25:['16th',0] };
export function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Pad every part with whole-bar rests to the longest part's bar count.
export function padBars(partsBars) {
  const n = Math.max(0, ...partsBars.map((b) => b.length));
  return partsBars.map((b) => b.concat(Array.from({ length: n - b.length }, () => [{ ei: -1, rest: true, midi: null, beats: 4, tie: false }])));
}
// MIDI number -> <pitch>, spelled in the key with `fifths` sharps or flats, like the on-screen score
// (with fifths 0: flats, as the prototype wrote them).
function pitchXML(midi, fifths) {
  const { step, alter, octave } = spell(midi, fifths);
  return '<pitch><step>' + step + '</step>' + (alter ? '<alter>' + alter + '</alter>' : '') +
    '<octave>' + octave + '</octave></pitch>';
}
// One bar piece -> <note>. tieStop: the previous piece of this part was tied into this one.
function noteXML(p, tieStop, wholeBarRest, fifths) {
  const [type, dots] = XML_TYPES[p.beats];
  const ties = p.rest ? [] : [tieStop && 'stop', p.tie && 'start'].filter(Boolean);
  return '<note>' +
    (p.rest ? (wholeBarRest ? '<rest measure="yes"/>' : '<rest/>') : pitchXML(p.midi, fifths)) +
    '<duration>' + p.beats * XML_DIVISIONS + '</duration>' +
    ties.map((t) => '<tie type="' + t + '"/>').join('') +
    '<voice>1</voice>' +
    (wholeBarRest ? '' : '<type>' + type + '</type>' + '<dot/>'.repeat(dots)) +
    (ties.length ? '<notations>' + ties.map((t) => '<tied type="' + t + '"/>').join('') + '</notations>' : '') +
    '</note>';
}
// <attributes> and tempo mark for a part's first bar.
function firstBarXML(part, bpm, key) {
  const clef = part.clef === 'bass' ? '<sign>F</sign><line>4</line>' : '<sign>G</sign><line>2</line>';
  return '<attributes><divisions>' + XML_DIVISIONS + '</divisions><key><fifths>' + key.fifths + '</fifths>' + (key.mode ? '<mode>' + key.mode + '</mode>' : '') + '</key>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time><clef>' + clef + '</clef></attributes>' +
    '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>' + bpm +
    '</per-minute></metronome></direction-type><sound tempo="' + bpm + '"/></direction>';
}
// One part's bars -> <part>; tie state carries across barlines.
function partXML(part, k, bpm, key) {
  let tied = false;
  const measures = part.bars.map((bar, i) => {
    const whole = bar.length === 1 && bar[0].rest && bar[0].beats === 4;
    const notes = bar.map((p) => { const x = noteXML(p, tied, whole, key.fifths); if (!p.rest) tied = p.tie; return x; }).join('');
    return '<measure number="' + (i + 1) + '">' + (i === 0 ? firstBarXML(part, bpm, key) : '') + notes + '</measure>';
  });
  return '<part id="P' + (k + 1) + '">' + measures.join('\n') + '</part>';
}
// <part-list> with a General MIDI program per part.
function partListXML(parts) {
  return '<part-list>' + parts.map((p, k) => {
    const id = 'P' + (k + 1), name = xmlEscape(p.name);
    return '<score-part id="' + id + '"><part-name>' + name + '</part-name>' +
      '<score-instrument id="' + id + '-I1"><instrument-name>' + name + '</instrument-name></score-instrument>' +
      '<midi-instrument id="' + id + '-I1"><midi-channel>' + (k + 1) + '</midi-channel><midi-program>' + p.program +
      '</midi-program></midi-instrument></score-part>';
  }).join('') + '</part-list>';
}
export function toMusicXML(score) {
  return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n' +
    '<score-partwise version="4.0">\n' +
    '<work><work-title>' + xmlEscape(score.title) + '</work-title></work>\n' +
    '<movement-title>' + xmlEscape(score.subtitle) + '</movement-title>\n' +
    '<identification><encoding><software>Sonochrome</software></encoding></identification>\n' +
    partListXML(score.parts) + '\n' +
    score.parts.map((p, k) => partXML(p, k, score.bpm, score.key ?? NO_KEY)).join('\n') + '\n' +
    '</score-partwise>\n';
}
