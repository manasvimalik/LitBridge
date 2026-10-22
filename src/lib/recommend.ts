import { tokenize } from './text';
import type { Work } from './types';

/**
 * Content-based recommendations. Each work is represented by a sparse feature
 * vector (themes, genre, language, region, and body vocabulary weighted by
 * TF-IDF); similar works are ranked by cosine similarity.
 */

type Vec = Map<string, number>;

const WEIGHTS = { theme: 3, genre: 2, region: 1, language: 1.5, author: 2, word: 1 };

function features(w: Work, idf: Map<string, number>): Vec {
  const v: Vec = new Map();
  const add = (k: string, x: number) => v.set(k, (v.get(k) ?? 0) + x);
  for (const t of w.themes) add(`theme:${t.toLowerCase()}`, WEIGHTS.theme);
  add(`genre:${w.genre}`, WEIGHTS.genre);
  add(`region:${w.region}`, WEIGHTS.region);
  add(`lang:${w.language}`, WEIGHTS.language);
  add(`author:${w.authorId}`, WEIGHTS.author);
  const toks = tokenize(`${w.summary} ${w.body}`);
  const tf = new Map<string, number>();
  for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
  for (const [t, c] of tf) add(`w:${t}`, WEIGHTS.word * (c / toks.length) * (idf.get(t) ?? 0) * 10);
  return v;
}

function cosine(a: Vec, b: Vec): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, x] of a) {
    na += x * x;
    const y = b.get(k);
    if (y) dot += x * y;
  }
  for (const y of b.values()) nb += y * y;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export class Recommender {
  private vectors = new Map<string, Vec>();

  constructor(private works: Work[]) {
    const df = new Map<string, number>();
    for (const w of works) for (const t of new Set(tokenize(`${w.summary} ${w.body}`))) df.set(t, (df.get(t) ?? 0) + 1);
    const idf = new Map([...df].map(([t, d]) => [t, Math.log(works.length / d)]));
    for (const w of works) this.vectors.set(w.id, features(w, idf));
  }

  similar(id: string, k = 3): { work: Work; similarity: number }[] {
    const target = this.vectors.get(id);
    if (!target) return [];
    return this.works
      .filter((w) => w.id !== id)
      .map((work) => ({ work, similarity: cosine(target, this.vectors.get(work.id)!) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /** Recommend from a listening history: sum the vectors of works already played. */
  forHistory(ids: string[], k = 4): Work[] {
    if (!ids.length) return [];
    const profile: Vec = new Map();
    for (const id of ids) for (const [f, x] of this.vectors.get(id) ?? []) profile.set(f, (profile.get(f) ?? 0) + x);
    const seen = new Set(ids);
    return this.works
      .filter((w) => !seen.has(w.id))
      .map((w) => ({ w, s: cosine(profile, this.vectors.get(w.id)!) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, k)
      .map((x) => x.w);
  }
}
