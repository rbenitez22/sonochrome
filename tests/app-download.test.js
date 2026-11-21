// Piece 4d: the score object the MusicXML download builds (app/music/download.js, collectScore).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceById } from '../public/src/sources/index.js';
import { notesPiece, streamPiece, fillStream, trimPlayed, exportEvents } from '../public/src/app/music/piece.js';
import { collectScore } from '../public/src/app/music/download.js';
import { toMusicXML } from '../public/src/mappings/music/musicxml.js';
import { assertMusicXML } from './musicxml-checks.js';

const OCTS = [4, 2];
const parts = [{ name: 'Piano', program: 1 }, { name: 'Bass', program: 33 }];
const settings = (over = {}) => ({
  scheme: 'degrees', codeLen: 4, fixedLen: 0.5, range: 2, root: 0, scale: 'Major', count: 24, start: 500,
  mode: 'notes', durSec: 10, bpm: 120, ...over,
});

for (const id of ['pi', 'thue-morse']) {
  test(`${id}: every mode exports a sound score named after the source, with the digits it read`, async () => {
    const source = sourceById(id), seq = await source.prepare({}, 20_000);
    const meta = { sourceName: source.name, start: 500, bpm: 120, parts, clefSetting: 'auto' };
    const notes = notesPiece(settings(), seq, {}, OCTS);
    const infinite = streamPiece(settings({ mode: 'infinite' }), seq, {}, OCTS);
    fillStream(infinite, seq, 200);
    trimPlayed(infinite, 150, infinite.voices.map((vo) => vo.events.length));
    const cases = [
      [notes, 0],
      [streamPiece(settings({ mode: 'time' }), seq, {}, OCTS), 0],
      [infinite, 150],
    ];
    for (const [piece, played] of cases) {
      const evs = exportEvents(piece, seq, played);
      const score = collectScore(evs, meta);
      assert.equal(score.title, source.name);
      assert.match(score.subtitle, /^Sonochrome: digits 500–[\d,]+$/);
      assert.equal(score.start, 500);
      assert.ok(score.end > 500);
      assert.deepEqual(score.parts.map((p) => [p.name, p.program]), [['Piano', 1], ['Bass', 33]]);
      assert.deepEqual(score.parts.map((p) => p.clef), ['treble', 'bass'], 'auto clefs by register');
      assertMusicXML(toMusicXML(score), score.parts.map((p) => p.bars));
    }
  });
}
