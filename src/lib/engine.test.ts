import { describe, expect, it } from 'vitest';
import { detectScript } from './script';
import { SearchIndex, facetCounts, highlight } from './search';
import { pageRank, summarize } from './summarize';
import { editDistance, splitSentences, tokenize } from './text';
import { buildEpisode, cueAt, rankVoices } from './podcast';
import { chunkForLimit } from './translate';

describe('script detection', () => {
  it('detects Bengali, Tamil and Telugu by Unicode block', () => {
    expect(detectScript('আমার সোনার বাংলা, আমি তোমায় ভালোবাসি').language).toBe('bn');
    expect(detectScript('யாதும் ஊரே யாவரும் கேளிர்').language).toBe('ta');
    expect(detectScript('తెలుగు భాష చాలా అందమైనది').language).toBe('te');
  });

  it('separates Hindi from Marathi within Devanagari', () => {
    expect(detectScript('एक गाँव में एक किसान रहता था और वह बहुत मेहनती था।').language).toBe('hi');
    expect(detectScript('एका गावात एक शेतकरी होता आणि तो खूप कष्टाळू होता. त्याच्या घरी गाय आहे.').language).toBe('mr');
  });

  it('recognises Assamese-only letters', () => {
    expect(detectScript('অসমীয়া ভাষা ৰাজ্যৰ ভাষা').language).toBe('as');
  });

  it('reports a distribution for mixed text', () => {
    const r = detectScript('Kabuliwala काबुलीवाला');
    expect(r.distribution.map((d) => d.script).sort()).toEqual(['Devanagari', 'Latin']);
  });

  it('returns null for text with no letters', () => {
    expect(detectScript('123 !!').language).toBeNull();
  });
});

describe('text utilities', () => {
  it('splits on danda and Latin punctuation, not abbreviations', () => {
    expect(splitSentences('राम घर गया। सीता बाज़ार गई।')).toHaveLength(2);
    expect(splitSentences('Dr. Rao arrived. He sat down!')).toEqual(['Dr. Rao arrived.', 'He sat down!']);
  });

  it('tokenizes with folding and light stemming', () => {
    expect(tokenize('The Friends were Running')).toEqual(['friend', 'runn']);
    expect(tokenize('Tāgore')).toEqual(['tagore']);
  });

  it('computes OSA edit distance including transpositions', () => {
    expect(editDistance('kitten', 'sitting', 3)).toBe(3);
    expect(editDistance('birbal', 'bribal', 2)).toBe(1);
    expect(editDistance('abc', 'abcdef', 1)).toBe(2);
  });
});

describe('search index', () => {
  const docs = [
    { id: 'a', title: 'Kabuliwala', body: 'a fruit seller from Kabul befriends a little girl' },
    { id: 'b', title: 'Idgah', body: 'a boy buys tongs for his grandmother at the fair' },
    { id: 'c', title: 'Akbar and Birbal', body: 'the emperor learns that whatever happens is for good' },
  ];
  const idx = SearchIndex.build(docs, [
    { name: 'title', boost: 3, get: (d) => d.title },
    { name: 'body', boost: 1, get: (d) => d.body },
  ]);

  it('ranks exact matches first', () => {
    expect(idx.search('grandmother')[0].item.id).toBe('b');
  });

  it('supports prefix (type-ahead) matching', () => {
    expect(idx.search('kabu')[0].item.id).toBe('a');
  });

  it('tolerates typos', () => {
    expect(idx.search('birbaal')[0].item.id).toBe('c');
    expect(idx.search('empror')[0].item.id).toBe('c');
  });

  it('boosts title over body', () => {
    const more = SearchIndex.build(
      [
        { id: 'x', title: 'Other', body: 'mentions fair once' },
        { id: 'y', title: 'Fair', body: 'unrelated text' },
      ],
      [
        { name: 'title', boost: 3, get: (d) => d.title },
        { name: 'body', boost: 1, get: (d) => d.body },
      ],
    );
    expect(more.search('fair')[0].item.id).toBe('y');
  });

  it('applies filters and counts facets', () => {
    expect(idx.search('a', (d) => d.id !== 'a').every((h) => h.item.id !== 'a')).toBe(true);
    expect(facetCounts([{ t: ['x', 'y'] }, { t: ['x'] }], (d) => d.t).get('x')).toBe(2);
  });

  it('highlights stemmed matches', () => {
    const parts = highlight('Two friends met', ['friend']);
    expect(parts.find((p) => p.hit)?.text).toBe('friends');
  });
});

describe('TextRank', () => {
  it('PageRank scores sum to 1 and favour the hub', () => {
    const { scores } = pageRank([
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
    ]);
    expect(scores.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(scores[0]).toBeGreaterThan(scores[1]);
  });

  it('picks central sentences and preserves order', () => {
    const text =
      'The farmer worked the field every day. The field gave the farmer a rich harvest. ' +
      'A bird sang nearby. The farmer shared the harvest of the field with the village. Clouds passed.';
    const r = summarize(text, { maxSentences: 2 });
    expect(r.sentences).toHaveLength(2);
    expect(r.summary).toMatch(/farmer/);
    expect(r.sentences[0].index).toBeLessThan(r.sentences[1].index);
  });

  it('works on Devanagari text', () => {
    const r = summarize('किसान खेत में काम करता था। खेत ने किसान को फसल दी। चिड़िया गाती थी।', { maxSentences: 1 });
    expect(r.sentences).toHaveLength(1);
  });
});

describe('podcast', () => {
  const ep = buildEpisode({
    title: 'Test', author: 'Anon', language: 'Hindi', translator: 'LitBridge',
    summary: 'A short story. It ends well.', body: 'Para one.\n\nPara two.\n\nPara three.', themes: ['courage'],
  });

  it('builds chapters with monotonic cue timings', () => {
    expect(ep.chapters[0].title).toBe('Introduction');
    expect(ep.chapters.at(-1)!.title).toBe('Reflection');
    for (let i = 1; i < ep.cues.length; i++) expect(ep.cues[i].start).toBeGreaterThan(ep.cues[i - 1].start);
  });

  it('finds the cue at a timestamp', () => {
    const c = ep.cues[3];
    expect(cueAt(ep, c.start + 0.01)).toBe(3);
    expect(cueAt(ep, 0)).toBe(0);
  });

  it('prefers Indian English voices', () => {
    const v = rankVoices([
      { name: 'Samantha', lang: 'en-US', localService: true },
      { name: 'Rishi', lang: 'en-IN', localService: true },
      { name: 'Thomas', lang: 'fr-FR', localService: true },
      { name: 'Bubbles', lang: 'en-US', localService: true },
    ]);
    expect(v.map((x) => x.name)).toEqual(['Rishi', 'Samantha']);
  });
});

describe('translation chunking', () => {
  it('keeps every chunk under the byte limit', () => {
    const text = 'यह एक वाक्य है। '.repeat(60);
    const chunks = chunkForLimit(text, 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(new TextEncoder().encode(c).length).toBeLessThanOrEqual(200);
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toBe(text.replace(/\s+/g, ' ').trim());
  });
});
