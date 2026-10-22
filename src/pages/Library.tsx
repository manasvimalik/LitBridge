import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchIcon, XIcon } from '../components/Icons';
import { WorkCard } from '../components/WorkCard';
import { languageName } from '../data/languages';
import { useCatalog } from '../lib/catalog';
import { facetCounts } from '../lib/search';
import { readingMinutes } from '../lib/text';
import type { LanguageCode, Work } from '../lib/types';

type FacetKey = 'lang' | 'genre' | 'theme' | 'region';
const FACETS: { key: FacetKey; label: string; get: (w: Work) => string | string[]; display?: (v: string) => string }[] = [
  { key: 'lang', label: 'Language', get: (w) => w.language, display: (v) => languageName(v as LanguageCode) },
  { key: 'genre', label: 'Genre', get: (w) => w.genre },
  { key: 'theme', label: 'Theme', get: (w) => w.themes },
  { key: 'region', label: 'Region', get: (w) => w.region },
];

type Sort = 'relevance' | 'title' | 'shortest' | 'longest';

export default function Library() {
  const { works, index } = useCatalog();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sort = (params.get('sort') as Sort) ?? 'relevance';
  const selected = (k: FacetKey) => params.getAll(k);

  const update = (fn: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    fn(next);
    setParams(next, { replace: true });
  };
  const toggleFacet = (k: FacetKey, v: string) =>
    update((p) => {
      const cur = p.getAll(k);
      p.delete(k);
      (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).forEach((x) => p.append(k, x));
    });

  const { hits, elapsed } = useMemo(() => {
    const t0 = performance.now();
    const base = q.trim()
      ? index.search(q)
      : works.map((item) => ({ item, score: 0, matched: [] as string[] }));
    return { hits: base, elapsed: performance.now() - t0 };
  }, [q, index, works]);

  // Facets are disjunctive within a group and conjunctive across groups.
  // Each group's counts are computed with every *other* group's filter applied,
  // so selecting "Hindi" still shows how many Bengali works would match.
  const matchesFacets = (w: Work, except?: FacetKey) =>
    FACETS.every((f) => {
      if (f.key === except) return true;
      const sel = selected(f.key);
      if (!sel.length) return true;
      const v = f.get(w);
      return (Array.isArray(v) ? v : [v]).some((x) => sel.includes(x));
    });

  const filtered = hits.filter((h) => matchesFacets(h.item));
  const minutes = (w: Work) => readingMinutes(w.summary + ' ' + w.body);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'title') return a.item.title.localeCompare(b.item.title);
    if (sort === 'shortest') return minutes(a.item) - minutes(b.item);
    if (sort === 'longest') return minutes(b.item) - minutes(a.item);
    return q ? b.score - a.score : 0;
  });
  const anyFilter = FACETS.some((f) => selected(f.key).length);

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-bold">Library</h1>
      <p className="muted mt-1">Search with typo tolerance and prefix matching, ranked by BM25 across titles, authors, themes and full text.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
          <input
            autoFocus
            className="input !py-2.5 !pl-10"
            placeholder="Try “tagore”, “courage”, “birbaal” or “কাবুলি”"
            value={q}
            onChange={(e) => update((p) => (e.target.value ? p.set('q', e.target.value) : p.delete('q')))}
          />
        </label>
        <select className="input sm:w-48" value={sort} onChange={(e) => update((p) => p.set('sort', e.target.value))} aria-label="Sort">
          <option value="relevance">Sort: relevance</option>
          <option value="title">Sort: title A–Z</option>
          <option value="shortest">Sort: shortest listen</option>
          <option value="longest">Sort: longest listen</option>
        </select>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="space-y-6" aria-label="Filters">
          {FACETS.map((f) => {
            const counts = facetCounts(hits.filter((h) => matchesFacets(h.item, f.key)).map((h) => h.item), f.get);
            const sel = selected(f.key);
            return (
              <fieldset key={f.key}>
                <legend className="mb-2 text-sm font-semibold uppercase tracking-wide muted">{f.label}</legend>
                <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
                  {[...counts].slice(0, f.key === 'theme' ? 12 : 20).map(([v, c]) => (
                    <label key={v} className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 text-sm transition ${sel.includes(v) ? 'bg-maroon-600 text-paper-50' : 'hover:bg-paper-100 dark:hover:bg-ink-800'}`}>
                      <span className="flex items-center gap-2">
                        <input type="checkbox" className="sr-only" checked={sel.includes(v)} onChange={() => toggleFacet(f.key, v)} />
                        {f.display ? f.display(v) : v}
                      </span>
                      <span className="font-mono text-xs opacity-70">{c}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm muted">
            <span>{sorted.length} {sorted.length === 1 ? 'result' : 'results'}{q && ` in ${elapsed.toFixed(1)} ms`}</span>
            {anyFilter && (
              <button className="inline-flex items-center gap-1 rounded-full bg-paper-100 px-2 py-0.5 text-xs hover:bg-paper-200 dark:bg-ink-800" onClick={() => update((p) => FACETS.forEach((f) => p.delete(f.key)))}>
                <XIcon width={12} height={12} /> Clear filters
              </button>
            )}
          </div>
          {sorted.length ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((h) => (<WorkCard key={h.item.id} work={h.item} terms={h.matched} score={q ? h.score : undefined} />))}
            </div>
          ) : (
            <div className="card p-10 text-center">
              <p className="font-serif text-xl">No stories match yet.</p>
              <p className="muted mt-1 text-sm">Try a broader search, or contribute this story yourself.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
