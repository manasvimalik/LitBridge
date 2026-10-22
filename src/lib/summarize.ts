import { splitSentences, tokenize } from './text';

/**
 * Extractive summarisation with TextRank (Mihalcea & Tarau, 2004).
 *
 * 1. Split into sentences and build TF-IDF vectors (sentences act as documents).
 * 2. Build a similarity graph with cosine similarity as edge weights.
 * 3. Run weighted PageRank by power iteration until the scores converge.
 * 4. Return the top-k sentences in their original order so the summary reads naturally.
 *
 * Language-agnostic: the tokenizer is Unicode-aware, so this works on Hindi,
 * Bengali or Tamil source text as well as on English translations, entirely offline.
 */

export interface RankedSentence {
  index: number;
  text: string;
  score: number;
}

export interface SummaryResult {
  sentences: RankedSentence[];
  summary: string;
  ranking: RankedSentence[];
  iterations: number;
}

const DAMPING = 0.85;
const EPSILON = 1e-6;
const MAX_ITER = 100;

type Vec = Map<string, number>;

function tfidfVectors(sentences: string[]): Vec[] {
  const tokenized = sentences.map((s) => tokenize(s));
  const df = new Map<string, number>();
  for (const toks of tokenized) for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = sentences.length;
  return tokenized.map((toks) => {
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    const v: Vec = new Map();
    for (const [t, c] of tf) v.set(t, (c / toks.length) * Math.log(1 + n / df.get(t)!));
    return v;
  });
}

export function cosine(a: Vec, b: Vec): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [t, x] of a) {
    na += x * x;
    const y = b.get(t);
    if (y) dot += x * y;
  }
  for (const y of b.values()) nb += y * y;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Weighted PageRank by power iteration. Returns scores and iteration count. */
export function pageRank(weights: number[][]): { scores: number[]; iterations: number } {
  const n = weights.length;
  if (n === 0) return { scores: [], iterations: 0 };
  const outSum = weights.map((row) => row.reduce((s, w) => s + w, 0));
  let scores = new Array(n).fill(1 / n);
  for (let iter = 1; iter <= MAX_ITER; iter++) {
    const next = new Array(n).fill((1 - DAMPING) / n);
    // Dangling nodes (no edges) spread their mass uniformly.
    let dangling = 0;
    for (let j = 0; j < n; j++) if (!outSum[j]) dangling += scores[j];
    for (let i = 0; i < n; i++) {
      let s = dangling / n;
      for (let j = 0; j < n; j++) if (weights[j][i] && outSum[j]) s += (weights[j][i] / outSum[j]) * scores[j];
      next[i] += DAMPING * s;
    }
    const delta = next.reduce((d, v, i) => d + Math.abs(v - scores[i]), 0);
    scores = next;
    if (delta < EPSILON) return { scores, iterations: iter };
  }
  return { scores, iterations: MAX_ITER };
}

export function summarize(text: string, opts: { ratio?: number; maxSentences?: number } = {}): SummaryResult {
  const all = splitSentences(text);
  const ratio = opts.ratio ?? 0.3;
  const k = Math.max(1, Math.min(opts.maxSentences ?? Infinity, Math.round(all.length * ratio)));
  if (all.length <= k) {
    const sentences = all.map((t, index) => ({ index, text: t, score: 1 / Math.max(1, all.length) }));
    return { sentences, summary: all.join(' '), ranking: sentences, iterations: 0 };
  }

  const vecs = tfidfVectors(all);
  const weights = vecs.map((a, i) => vecs.map((b, j) => (i === j ? 0 : cosine(a, b))));
  const { scores, iterations } = pageRank(weights);

  // Small positional prior: openings of folk tales usually establish the premise.
  const ranking = all
    .map((t, index) => ({ index, text: t, score: scores[index] * (index === 0 ? 1.15 : 1) }))
    .sort((a, b) => b.score - a.score);
  const sentences = ranking.slice(0, k).sort((a, b) => a.index - b.index);
  return { sentences, summary: sentences.map((s) => s.text).join(' '), ranking, iterations };
}

/** Narrative filler that scores well on TF-IDF but makes a poor theme. */
const FILLER = new Set(['lived', 'live', 'once', 'upon', 'every', 'went', 'came', 'said', 'told', 'took', 'made', 'there', 'after', 'before', 'about', 'little']);

/** Top keywords by aggregate TF-IDF weight — used to suggest themes for submissions. */
export function keywords(text: string, k = 6): string[] {
  const sentences = splitSentences(text);
  if (!sentences.length) return [];
  const totals = new Map<string, number>();
  for (const v of tfidfVectors(sentences)) for (const [t, w] of v) totals.set(t, (totals.get(t) ?? 0) + w);
  return [...totals.entries()]
    .filter(([t]) => t.length > 3 && !FILLER.has(t) && !/^\d+$/.test(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([t]) => t);
}
