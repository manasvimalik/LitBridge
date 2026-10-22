import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HeartIcon } from '../components/Icons';
import { Player } from '../components/Player';
import { WorkCard } from '../components/WorkCard';
import { CONTRIBUTOR_BY_ID } from '../data/contributors';
import { LANGUAGE_BY_CODE } from '../data/languages';
import { useCatalog } from '../lib/catalog';
import { usePersistent } from '../lib/store';
import { readingMinutes, wordCount } from '../lib/text';
import NotFound from './NotFound';

export default function WorkPage() {
  const { id } = useParams();
  const { byId, recommender, authorName, translatorName } = useCatalog();
  const work = id ? byId.get(id) : undefined;
  const [, setHistory] = usePersistent<string[]>('history', []);
  const [favs, setFavs] = usePersistent<string[]>('favourites', []);

  const source = useMemo(
    () =>
      work && {
        title: work.title,
        author: authorName(work),
        language: LANGUAGE_BY_CODE[work.language]?.name ?? work.language,
        translator: translatorName(work),
        summary: work.summary,
        body: work.body,
        themes: work.themes,
      },
    [work, authorName, translatorName],
  );
  const similar = useMemo(() => (work ? recommender.similar(work.id, 3) : []), [work, recommender]);

  if (!work || !source) return <NotFound />;
  const lang = LANGUAGE_BY_CODE[work.language];
  const author = CONTRIBUTOR_BY_ID[work.authorId];
  const fav = favs.includes(work.id);

  return (
    <article className="container-page py-10">
      <Link to="/library" className="text-sm muted hover:text-maroon-600">← Library</Link>
      <header className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap gap-1.5">
            <Link to={`/library?lang=${work.language}`} className="chip hover:bg-paper-200">{lang?.name}</Link>
            <Link to={`/library?genre=${encodeURIComponent(work.genre)}`} className="chip hover:bg-paper-200">{work.genre}</Link>
            <span className="chip">{work.region}</span>
            <span className="chip">{work.era}</span>
          </div>
          <p className="indic mt-4 text-2xl text-maroon-600 dark:text-gold-300" lang={work.language}>{work.originalTitle}</p>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">{work.title}</h1>
          <p className="mt-3 muted">
            by <span className="font-medium text-ink-800 dark:text-paper-100">{authorName(work)}</span>
            {author?.lifespan && ` (${author.lifespan})`} · English rendering by {translatorName(work)}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setFavs(fav ? favs.filter((f) => f !== work.id) : [...favs, work.id])} aria-pressed={fav}>
            <HeartIcon filled={fav} className={fav ? 'text-maroon-600' : ''} /> {fav ? 'Saved' : 'Save'}
          </button>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <section className="card border-l-4 !border-l-gold-400 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-maroon-600 dark:text-gold-300">Summary</p>
            <p className="mt-2 leading-7">{work.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {work.themes.map((t) => (<Link key={t} to={`/library?theme=${encodeURIComponent(t)}`} className="chip hover:bg-paper-200">#{t}</Link>))}
            </div>
          </section>

          <section className="prose-story mt-8 font-serif">
            {work.body.split(/\n\s*\n/).map((p, i) => (<p key={i}>{p}</p>))}
          </section>

          <p className="mt-6 text-xs muted">
            {wordCount(work.body)} words · about {readingMinutes(work.body)} min read · {work.rights}
          </p>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Player
            source={source}
            onPlay={() => setHistory((h) => [work.id, ...h.filter((x) => x !== work.id)].slice(0, 20))}
          />
          {author && (
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest muted">About the author</p>
              <p className="mt-1 font-serif text-lg font-bold">{author.name}</p>
              <p className="mt-1 text-sm muted">{author.bio}</p>
              <Link to="/voices" className="mt-2 inline-block text-sm text-maroon-600 hover:underline dark:text-gold-300">All voices →</Link>
            </div>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold">If you liked this</h2>
          <p className="text-sm muted">Ranked by cosine similarity of theme, genre and vocabulary vectors</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map(({ work: w, similarity }) => (
              <div key={w.id} className="relative">
                <WorkCard work={w} />
                <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 font-mono text-[11px] text-paper-50">{(similarity * 100).toFixed(0)}% match</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
