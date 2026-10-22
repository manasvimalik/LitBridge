import { editDistance, fold, tokenize } from './text';
import type { SearchHit } from './types';

/**
 * In-memory full-text search with BM25 ranking over weighted fields.
 *
 * - Inverted index: term -> postings (doc id -> per-field term frequency).
 * - Ranking: BM25 per field, combined with field boosts (a simplified BM25F).
 * - Query expansion: each query term also matches indexed terms that share
 *   its prefix (type-ahead) or are within edit distance 1–2 (typo tolerance).
 *   Expanded matches are discounted so exact hits always rank first.
 *
 * Everything runs client-side; for a few thousand works an index build takes
 * a few milliseconds, so there is no need for a search server.
 */

export interface FieldSpec<T> {
  name: string;
  boost: number;
  get: (item: T) => string | string[];
}

interface Posting {
  /** term frequency per field index */
  tf: number[];
}

const K1 = 1.2;
const B = 0.75;
const PREFIX_WEIGHT = 0.6;
const FUZZY_WEIGHT = 0.4;

export class SearchIndex<T> {
  private docs: T[] = [];
  private fieldLengths: number[][] = []; // [doc][field]
  private avgFieldLength: number[] = [];
  private postings = new Map<string, Map<number, Posting>>();
  private sortedTerms: string[] = [];

  constructor(private fields: FieldSpec<T>[]) {}

  static build<T>(items: T[], fields: FieldSpec<T>[]): SearchIndex<T> {
    const idx = new SearchIndex(fields);
    items.forEach((item) => idx.add(item));
    idx.finalize();
    return idx;
  }

  get size(): number {
    return this.docs.length;
  }

  add(item: T): void {
    const id = this.docs.push(item) - 1;
    const lengths: number[] = [];
    this.fields.forEach((field, f) => {
      const raw = field.get(item);
      const tokens = tokenize(Array.isArray(raw) ? raw.join(' ') : raw);
      lengths.push(tokens.length);
      for (const t of tokens) {
        let byDoc = this.postings.get(t);
        if (!byDoc) this.postings.set(t, (byDoc = new Map()));
        let p = byDoc.get(id);
        if (!p) byDoc.set(id, (p = { tf: new Array(this.fields.length).fill(0) }));
        p.tf[f]++;
      }
    });
    this.fieldLengths.push(lengths);
  }

  finalize(): void {
    this.avgFieldLength = this.fields.map(
      (_, f) => this.fieldLengths.reduce((s, l) => s + l[f], 0) / Math.max(1, this.docs.length),
    );
    this.sortedTerms = [...this.postings.keys()].sort();
  }

  private idf(term: string): number {
    const df = this.postings.get(term)?.size ?? 0;
    const n = this.docs.length;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  /** Binary search the sorted vocabulary for all terms starting with `prefix`. */
  private termsWithPrefix(prefix: string): string[] {
    let lo = 0;
    let hi = this.sortedTerms.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedTerms[mid] < prefix) lo = mid + 1;
      else hi = mid;
    }
    const out: string[] = [];
    for (let i = lo; i < this.sortedTerms.length && this.sortedTerms[i].startsWith(prefix); i++) {
      out.push(this.sortedTerms[i]);
    }
    return out;
  }

  /** Expand a query term into weighted index terms. */
  expand(term: string): Map<string, number> {
    const out = new Map<string, number>();
    if (this.postings.has(term)) out.set(term, 1);
    if (term.length >= 2) {
      for (const t of this.termsWithPrefix(term)) if (!out.has(t)) out.set(t, PREFIX_WEIGHT);
    }
    if (term.length >= 4) {
      const maxEdits = term.length >= 8 ? 2 : 1;
      for (const t of this.sortedTerms) {
        if (out.has(t) || Math.abs(t.length - term.length) > maxEdits) continue;
        const d = editDistance(term, t, maxEdits);
        if (d <= maxEdits) out.set(t, FUZZY_WEIGHT / d);
      }
    }
    return out;
  }

  search(query: string, filter?: (item: T) => boolean): SearchHit<T>[] {
    const terms = tokenize(query);
    const scores = new Map<number, { score: number; matched: Set<string>; termsHit: Set<string> }>();

    for (const qt of terms) {
      for (const [term, weight] of this.expand(qt)) {
        const idf = this.idf(term);
        for (const [doc, posting] of this.postings.get(term)!) {
          let s = 0;
          posting.tf.forEach((tf, f) => {
            if (!tf) return;
            const len = this.fieldLengths[doc][f];
            const norm = tf + K1 * (1 - B + (B * len) / (this.avgFieldLength[f] || 1));
            s += this.fields[f].boost * idf * ((tf * (K1 + 1)) / norm);
          });
          const entry = scores.get(doc) ?? { score: 0, matched: new Set(), termsHit: new Set() };
          entry.score += s * weight;
          entry.matched.add(term);
          entry.termsHit.add(qt);
          scores.set(doc, entry);
        }
      }
    }

    const hits: SearchHit<T>[] = [];
    for (const [doc, { score, matched, termsHit }] of scores) {
      const item = this.docs[doc];
      if (filter && !filter(item)) continue;
      // Reward documents that cover more of the query (soft AND).
      const coverage = termsHit.size / terms.length;
      hits.push({ item, score: score * coverage * coverage, matched: [...matched] });
    }
    return hits.sort((a, b) => b.score - a.score);
  }
}

/** Count facet values across a result set, e.g. how many hits per language. */
export function facetCounts<T>(items: T[], get: (item: T) => string | string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const v = get(item);
    for (const key of Array.isArray(v) ? v : [v]) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

/**
 * Split `text` into segments marking which parts match the given index terms,
 * for highlighting. Matching is done on folded, stemmed tokens so "friends"
 * highlights when the index term is "friend".
 */
export function highlight(text: string, matchedTerms: string[]): { text: string; hit: boolean }[] {
  if (!matchedTerms.length) return [{ text, hit: false }];
  const set = new Set(matchedTerms);
  const parts: { text: string; hit: boolean }[] = [];
  const re = /[\p{L}\p{M}\p{N}]+/gu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const tok = tokenize(m[0], { keepStopwords: true })[0] ?? fold(m[0]);
    if (set.has(tok)) {
      if (m.index! > last) parts.push({ text: text.slice(last, m.index), hit: false });
      parts.push({ text: m[0], hit: true });
      last = m.index! + m[0].length;
    }
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts;
}
