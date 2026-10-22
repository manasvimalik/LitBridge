import { describe, expect, it } from 'vitest';
import { stripTags, wordAt } from '../../src/lib/audio';
import { archetypeFor } from './cast';
import { concatFrames, parseMp3 } from './mp3';
import { packRequests, wordsFromAlignment } from './render';

/** Build a fake MPEG-1 Layer III 64 kbps / 44.1 kHz frame (208 bytes + padding). */
function frame(padding = 0, fill = 0): Uint8Array {
  const len = Math.floor((144 * 64000) / 44100) + padding;
  const f = new Uint8Array(len).fill(fill);
  f[0] = 0xff;
  f[1] = 0xfb; // MPEG1, Layer III, no CRC
  f[2] = (5 << 4) | (0 << 2) | (padding << 1); // 64 kbps, 44.1 kHz
  f[3] = 0xc4; // mono
  return f;
}

describe('mp3 parser', () => {
  it('counts frames and computes duration', () => {
    const buf = concatFrames([[frame(), frame(1), frame()]]);
    const info = parseMp3(buf);
    expect(info.frames).toHaveLength(3);
    expect(info.duration).toBeCloseTo((3 * 1152) / 44100, 6);
  });

  it('skips an ID3v2 tag and drops a leading Info frame', () => {
    const id3 = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 5, 1, 2, 3, 4, 5]);
    const info = frame();
    info.set(new TextEncoder().encode('Info'), 21);
    const buf = concatFrames([[id3, info, frame(), frame()]]);
    expect(parseMp3(buf).frames).toHaveLength(2);
  });
});

describe('request packing', () => {
  const line = (n: number, chapter: number) => ({ speaker: 'narrator', voiceId: 'v', text: 'x'.repeat(n), chapter });

  it('keeps every request under the limit', () => {
    const reqs = packRequests([line(700, 0), line(700, 0), line(700, 1), line(700, 1), line(700, 2)], 1800);
    for (const r of reqs) expect(r.reduce((n, l) => n + l.text.length, 0)).toBeLessThanOrEqual(1800);
    expect(reqs.flat()).toHaveLength(5);
  });

  it('merges a short trailing request', () => {
    const reqs = packRequests([line(1200, 0), line(400, 1), line(100, 2)], 1800);
    expect(reqs.at(-1)!.at(-1)!.text.length).toBe(100);
    expect(reqs.length).toBeLessThanOrEqual(2);
  });
});

describe('word timing', () => {
  const text = '[warmly] Hello, Mini! [laughs] Yes.';
  const chars = [...text];
  const a = {
    characters: chars,
    characterStartTimesSeconds: chars.map((_, i) => i * 0.1),
    characterEndTimesSeconds: chars.map((_, i) => i * 0.1 + 0.1),
  };

  it('skips audio tags and keeps punctuation on words', () => {
    const words = wordsFromAlignment(a, 0, chars.length, 10);
    expect(words.map((w) => w.t)).toEqual(['Hello,', 'Mini!', 'Yes.']);
    expect(words[0].s).toBeCloseTo(10 + text.indexOf('Hello') * 0.1, 3);
  });

  it('finds the word at a time', () => {
    const words = [{ s: 0 }, { s: 1 }, { s: 2.5 }];
    expect(wordAt(words, -1)).toBe(-1);
    expect(wordAt(words, 1.2)).toBe(1);
    expect(wordAt(words, 9)).toBe(2);
  });

  it('strips tags for display', () => {
    expect(stripTags(text)).toBe('Hello, Mini! Yes.');
  });
});

describe('casting', () => {
  it('maps descriptions to voice archetypes', () => {
    expect(archetypeFor('five-year-old girl, a chatterbox')).toBe('young-girl');
    expect(archetypeFor('an old grandmother')).toBe('old-woman');
    expect(archetypeFor('a cunning crocodile')).toBe('villain');
    expect(archetypeFor('the emperor, proud')).toBe('man');
  });
});
