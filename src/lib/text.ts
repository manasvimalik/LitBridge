/** Text utilities shared by the search index, summariser and narrator. */

const STOPWORDS = new Set(
  ('a an and are as at be but by for from had has have he her his i in into is it its of on or she so ' +
    'that the their them then there they this to was were what when which who will with would you your ' +
    'not no all one up out him me my we our said did do does been very can could just than too')
    .split(' '),
);

/** Strip diacritics so "Tagore" matches "Tāgore" and "Premchand" matches "Premchānd". */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * A deliberately light English stemmer (a subset of Porter step 1).
 * Aggressive stemming hurts proper nouns, which dominate literary search.
 */
export function stem(w: string): string {
  if (w.length <= 4) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('ness')) return w.slice(0, -4);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 5) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
  return w;
}

/** Unicode-aware tokenizer: keeps Indic letters and combining marks together. */
export function tokenize(s: string, { keepStopwords = false } = {}): string[] {
  const words = fold(s).match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  return words
    .filter((w) => keepStopwords || !STOPWORDS.has(w))
    .map((w) => (/^[a-z]+$/.test(w) ? stem(w) : w));
}

/**
 * Sentence splitter that understands the Devanagari danda (।, ॥) as well as
 * Latin punctuation, and does not split on common abbreviations.
 */
export function splitSentences(text: string): string[] {
  const protectedText = text.replace(/\b(Mr|Mrs|Dr|St|Smt|Sri|Shri|vs)\./g, '$1\u0000');
  return (
    protectedText
      .match(/[^.!?।॥\n]+(?:[.!?।॥]+["'”’)]*|\n+|$)/g)
      ?.map((s) => s.replace(/\u0000/g, '.').trim())
      .filter((s) => s.length > 1) ?? []
  );
}

export function wordCount(s: string): number {
  return (s.match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).length;
}

/** Narration speed for an unhurried storyteller voice. */
export const WORDS_PER_MINUTE = 150;

export function readingMinutes(s: string): number {
  return Math.max(1, Math.round(wordCount(s) / WORDS_PER_MINUTE));
}

/** Optimal string alignment distance (Damerau–Levenshtein with adjacent swaps), with early exit. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  let prev2: number[] = [];
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      }
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[n];
}
