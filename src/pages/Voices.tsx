import { Link } from 'react-router-dom';
import { CONTRIBUTORS } from '../data/contributors';
import { languageName } from '../data/languages';
import { useCatalog } from '../lib/catalog';

export default function Voices() {
  const { works } = useCatalog();
  const worksBy = (id: string) => works.filter((w) => w.authorId === id || w.translatorId === id);
  const community = [...new Set(works.filter((w) => w.translatorId.startsWith('name:')).map((w) => w.translatorId.slice(5)))];

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-bold">Voices</h1>
      <p className="muted mt-1 max-w-2xl">The authors who wrote these stories, and the translators and curators who carry them across languages.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {CONTRIBUTORS.map((c) => {
          const list = worksBy(c.id);
          return (
            <section key={c.id} className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{c.name}</h2>
                  <p className="text-sm muted capitalize">{c.role}{c.lifespan && ` · ${c.lifespan}`}</p>
                </div>
                <span className="chip">{list.length} {list.length === 1 ? 'work' : 'works'}</span>
              </div>
              <p className="mt-3 text-sm leading-6">{c.bio}</p>
              <p className="mt-3 text-xs muted">{c.languages.map(languageName).join(' · ')}</p>
              {list.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {list.slice(0, 8).map((w) => (<li key={w.id}><Link to={`/work/${w.id}`} className="chip hover:bg-paper-200">{w.title}</Link></li>))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Community translators</h2>
        {community.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">{community.map((n) => (<li key={n} className="chip !text-sm">{n}</li>))}</ul>
        ) : (
          <p className="muted mt-2 text-sm">Translators whose submissions get approved are listed here. <Link to="/contribute" className="text-maroon-600 hover:underline dark:text-gold-300">Be the first →</Link></p>
        )}
      </section>
    </div>
  );
}
