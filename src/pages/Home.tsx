import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeadphonesIcon, LanguagesIcon, SearchIcon, SparkIcon, BookIcon } from '../components/Icons';
import { WorkCard } from '../components/WorkCard';
import { LANGUAGES } from '../data/languages';
import { useCatalog } from '../lib/catalog';
import { usePersistent } from '../lib/store';
import { readingMinutes } from '../lib/text';

const PIPELINE = [
  { icon: LanguagesIcon, title: 'Detect', body: 'Unicode script analysis identifies the language, and function-word scoring tells Hindi, Marathi and Nepali apart.' },
  { icon: BookIcon, title: 'Translate', body: 'Claude produces a literary English rendering that keeps culturally specific terms, with notes explaining them.' },
  { icon: SparkIcon, title: 'Summarise', body: 'TextRank picks the most central sentences, so every work gets an accurate summary even offline.' },
  { icon: HeadphonesIcon, title: 'Narrate', body: 'The episode builder splits each story into chapters and sentence cues, then narrates them with synced highlighting.' },
];

export default function Home() {
  const { works, recommender } = useCatalog();
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const [history] = usePersistent<string[]>('history', []);
  const featured = works.filter((w) => w.featured);
  const forYou = useMemo(() => recommender.forHistory(history, 3), [recommender, history]);

  const stats = useMemo(() => {
    const langs = new Set(works.map((w) => w.language));
    const minutes = works.reduce((s, w) => s + readingMinutes(w.summary + ' ' + w.body), 0);
    const speakers = LANGUAGES.filter((l) => langs.has(l.code)).reduce((s, l) => s + l.speakersMillions, 0);
    return [
      { value: works.length, label: 'Stories' },
      { value: langs.size, label: 'Languages' },
      { value: `${minutes}`, label: 'Minutes of audio' },
      { value: `${Math.round(speakers)}M`, label: 'Native speakers reached' },
    ];
  }, [works]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of works) m.set(w.language, (m.get(w.language) ?? 0) + 1);
    return m;
  }, [works]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-maroon-900 via-maroon-700 to-maroon-600 text-paper-50">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #e8bd4f 0, transparent 35%), radial-gradient(circle at 10% 90%, #e8bd4f 0, transparent 25%)' }} />
        <div className="container-page relative py-20 sm:py-28">
          <p className="indic text-sm tracking-wide text-gold-300">कथा · কথা · கதை · ಕಥೆ · કથા · ਕਥਾ</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-tight sm:text-6xl">
            LitBridge<br /><span className="text-paper-50">From Page to </span><span className="text-gold-400">Podcast</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-paper-200/90">
            Regional Indian literature, translated into English, summarised and narrated, so a story told in one language can be heard in many.
          </p>
          <form className="mt-8 flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); navigate(`/library?q=${encodeURIComponent(q)}`); }}>
            <label className="relative flex-1">
              <span className="sr-only">Search the library</span>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/60" />
              <input className="input !py-3 !pl-10 text-ink-800" placeholder="Search stories, authors, themes… try “friendship”" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <button className="btn-gold !py-3">Explore</button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/library" className="btn bg-white/10 text-paper-50 hover:bg-white/20"><BookIcon /> Browse library</Link>
            <Link to="/studio" className="btn bg-white/10 text-paper-50 hover:bg-white/20"><SparkIcon /> Try the studio</Link>
          </div>
        </div>
      </section>

      <section className="container-page -mt-8 relative">
        <div className="card grid grid-cols-2 divide-paper-200 p-2 sm:grid-cols-4 sm:divide-x dark:divide-ink-700">
          {stats.map((s) => (
            <div key={s.label} className="p-4 text-center">
              <p className="font-serif text-3xl font-bold text-maroon-600 dark:text-gold-300">{s.value}</p>
              <p className="text-xs muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {forYou.length > 0 && (
        <section className="container-page mt-16">
          <h2 className="text-2xl font-bold">Because you listened</h2>
          <p className="muted text-sm">Content-based recommendations from your listening history, computed with cosine similarity over themes and vocabulary.</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{forYou.map((w) => <WorkCard key={w.id} work={w} />)}</div>
        </section>
      )}

      <section className="container-page mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Featured stories</h2>
            <p className="muted">A first selection from across India's languages</p>
          </div>
          <Link to="/library" className="btn-ghost">View all</Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{featured.map((w) => <WorkCard key={w.id} work={w} />)}</div>
      </section>

      <section className="container-page mt-20">
        <h2 className="text-3xl font-bold">How a story crosses over</h2>
        <p className="muted">The pipeline behind every page in the library</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((p, i) => (
            <li key={p.title} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-maroon-600 text-gold-300"><p.icon /></span>
                <span className="font-mono text-xs muted">0{i + 1}</span>
              </div>
              <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
              <p className="mt-1 text-sm muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page mt-20">
        <h2 className="text-3xl font-bold">Browse by language</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {LANGUAGES.map((l) => {
            const c = counts.get(l.code) ?? 0;
            return (
              <Link key={l.code} to={c ? `/library?lang=${l.code}` : '/contribute'} className={`card p-4 text-center transition hover:border-gold-400 ${c ? '' : 'opacity-60'}`}>
                <p className="indic text-2xl text-maroon-600 dark:text-gold-300" lang={l.code}>{l.native}</p>
                <p className="mt-1 text-sm font-medium">{l.name}</p>
                <p className="text-xs muted">{c ? `${c} ${c === 1 ? 'story' : 'stories'}` : 'Contribute the first'}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page mt-20">
        <div className="card flex flex-col items-start gap-4 bg-gradient-to-r from-paper-100 to-white p-8 sm:flex-row sm:items-center sm:justify-between dark:from-ink-800 dark:to-ink-800">
          <div>
            <h2 className="text-2xl font-bold">Know a story we're missing?</h2>
            <p className="muted mt-1 max-w-xl">Submit a regional work with your translation. The community reviews and votes on it, and approved works join the library with your name on them.</p>
          </div>
          <Link to="/contribute" className="btn-primary">Submit a story</Link>
        </div>
      </section>
    </>
  );
}
