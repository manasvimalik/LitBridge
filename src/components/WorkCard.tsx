import { Link } from 'react-router-dom';
import { languageName } from '../data/languages';
import { useCatalog } from '../lib/catalog';
import { highlight } from '../lib/search';
import { readingMinutes } from '../lib/text';
import type { Work } from '../lib/types';
import { HeadphonesIcon } from './Icons';

export function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {highlight(text, terms).map((p, i) =>
        p.hit ? (<mark key={i} className="rounded bg-gold-300/60 px-0.5 text-inherit dark:bg-gold-500/40">{p.text}</mark>) : (<span key={i}>{p.text}</span>),
      )}
    </>
  );
}

/** Deterministic warm gradient per work so cards are distinguishable without images. */
function coverStyle(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = 350 + (h % 50);
  return { background: `linear-gradient(135deg, hsl(${hue % 360} 55% 28%), hsl(${(hue + 25) % 360} 60% 42%))` };
}

export function WorkCard({ work, terms = [], score }: { work: Work; terms?: string[]; score?: number }) {
  const { authorName, translatorName } = useCatalog();
  const minutes = readingMinutes(work.summary + ' ' + work.body);
  return (
    <Link to={`/work/${work.id}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-28 p-4 text-paper-50" style={coverStyle(work.id)}>
        <p className="indic line-clamp-2 text-lg font-semibold opacity-90" lang={work.language}>{work.originalTitle}</p>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-xs">
          <HeadphonesIcon width={12} height={12} /> {minutes} min
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="chip">{languageName(work.language)}</span>
          <span className="chip">{work.genre}</span>
          {work.rights === 'Community submission' && <span className="chip !bg-gold-300/40">Community</span>}
        </div>
        <h3 className="text-lg font-bold leading-snug group-hover:text-maroon-600 dark:group-hover:text-gold-300">
          <Highlighted text={work.title} terms={terms} />
        </h3>
        <p className="mt-1 text-xs muted">by {authorName(work)} · translated by {translatorName(work)}</p>
        <p className="mt-2 line-clamp-3 text-sm muted"><Highlighted text={work.summary} terms={terms} /></p>
        {score !== undefined && <p className="mt-auto pt-3 font-mono text-[11px] muted">bm25 {score.toFixed(2)}</p>}
      </div>
    </Link>
  );
}
