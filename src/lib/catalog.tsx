import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { CONTRIBUTOR_BY_ID } from '../data/contributors';
import { languageName } from '../data/languages';
import { WORKS } from '../data/works';
import { Recommender } from './recommend';
import { SearchIndex } from './search';
import { usePersistent, type Submission } from './store';
import type { Work } from './types';

/**
 * The catalogue is the bundled seed works plus community submissions that
 * reached the approval threshold. The search index and recommender are
 * rebuilt whenever that set changes (cheap at this scale: a few ms).
 */

interface Catalog {
  works: Work[];
  byId: Map<string, Work>;
  index: SearchIndex<Work>;
  recommender: Recommender;
  authorName: (w: Work) => string;
  translatorName: (w: Work) => string;
}

const CatalogContext = createContext<Catalog | null>(null);

export function submissionToWork(s: Submission): Work {
  return {
    id: `community-${s.id}`,
    title: s.title,
    originalTitle: s.originalTitle || s.title,
    authorId: `name:${s.author}`,
    translatorId: `name:${s.translator}`,
    language: s.language,
    region: s.region,
    genre: s.genre,
    themes: s.themes,
    era: new Date(s.createdAt).getFullYear().toString(),
    summary: s.summary || s.text.slice(0, 280),
    body: s.translation || s.text,
    rights: 'Community submission',
  };
}

const nameOf = (id: string) => (id.startsWith('name:') ? id.slice(5) : CONTRIBUTOR_BY_ID[id]?.name ?? id);

export function buildIndex(works: Work[]): SearchIndex<Work> {
  return SearchIndex.build(works, [
    { name: 'title', boost: 4, get: (w) => [w.title, w.originalTitle] },
    { name: 'author', boost: 3, get: (w) => nameOf(w.authorId) },
    { name: 'themes', boost: 2, get: (w) => w.themes },
    { name: 'meta', boost: 1.5, get: (w) => [w.genre, w.region, languageName(w.language), w.era] },
    { name: 'summary', boost: 1.2, get: (w) => w.summary },
    { name: 'body', boost: 0.6, get: (w) => w.body },
  ]);
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [submissions] = usePersistent<Submission[]>('submissions', []);
  const value = useMemo<Catalog>(() => {
    const approved = submissions.filter((s) => s.status === 'approved').map(submissionToWork);
    const works = [...WORKS, ...approved];
    return {
      works,
      byId: new Map(works.map((w) => [w.id, w])),
      index: buildIndex(works),
      recommender: new Recommender(works),
      authorName: (w) => nameOf(w.authorId),
      translatorName: (w) => nameOf(w.translatorId),
    };
  }, [submissions]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): Catalog {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return ctx;
}
