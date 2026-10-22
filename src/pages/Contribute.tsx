import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { UpIcon } from '../components/Icons';
import { ScriptBar } from '../components/ScriptBar';
import { LANGUAGES, languageName } from '../data/languages';
import { submissionToWork } from '../lib/catalog';
import { detectScript } from '../lib/script';
import { APPROVAL_THRESHOLD, newId, statusForVotes, usePersistent, type Submission } from '../lib/store';
import { keywords, summarize } from '../lib/summarize';
import type { Genre, LanguageCode } from '../lib/types';
import { STUDIO_HANDOFF_KEY } from './Studio';

const GENRES: Genre[] = ['Folk Tale', 'Short Story', 'Fable', 'Poetry', 'Legend', 'Novel Excerpt', 'Moral Story'];
const REGIONS = ['North India', 'South India', 'East India', 'West India', 'Northeast India', 'Central India', 'Pan-Indian'];

interface Draft {
  title: string;
  originalTitle: string;
  author: string;
  language: LanguageCode | '';
  genre: Genre;
  region: string;
  translator: string;
  text: string;
  translation: string;
  themes: string;
  rightsConfirmed: boolean;
}

const EMPTY: Draft = {
  title: '', originalTitle: '', author: '', language: '', genre: 'Folk Tale', region: 'North India',
  translator: '', text: '', translation: '', themes: '', rightsConfirmed: false,
};

export function validate(d: Draft): Partial<Record<keyof Draft, string>> {
  const e: Partial<Record<keyof Draft, string>> = {};
  if (d.title.trim().length < 3) e.title = 'Give the work an English title (at least 3 characters).';
  if (!d.author.trim()) e.author = 'Name the author, or write "Traditional" for oral tales.';
  if (!d.language) e.language = 'Choose the original language.';
  if (!d.translator.trim()) e.translator = 'Who translated it? Your name is fine.';
  if (d.text.trim().length < 80) e.text = 'Paste at least a short passage (80+ characters) of the original.';
  if (d.translation && d.translation.trim().length < 80) e.translation = 'If you include a translation, make it at least 80 characters.';
  if (!d.rightsConfirmed) e.rightsConfirmed = 'Please confirm the work is public domain, traditional, or yours to share.';
  return e;
}

export default function Contribute() {
  const [subs, setSubs] = usePersistent<Submission[]>('submissions', []);
  const [voted, setVoted] = usePersistent<string[]>('voted', []);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState<string | null>(null);

  // Pick up a draft handed over from the studio.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STUDIO_HANDOFF_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STUDIO_HANDOFF_KEY);
      const h = JSON.parse(raw);
      setDraft((d) => ({ ...d, text: h.text ?? '', language: h.language ?? '', translation: h.translation ?? '', themes: (h.themes ?? []).join(', ') }));
    } catch {
      /* ignore */
    }
  }, []);

  const report = useMemo(() => detectScript(draft.text), [draft.text]);
  useEffect(() => {
    if (!draft.language && report.language && report.language !== 'en' && report.confidence > 0.3) {
      setDraft((d) => ({ ...d, language: report.language as LanguageCode }));
    }
  }, [report, draft.language]);

  const errors = validate(draft);
  const valid = Object.keys(errors).length === 0;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const suggestThemes = () => set('themes', keywords(draft.translation || draft.text, 5).join(', '));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const english = draft.translation.trim();
    const s: Submission = {
      id: newId(),
      title: draft.title.trim(),
      originalTitle: draft.originalTitle.trim() || undefined,
      author: draft.author.trim(),
      language: draft.language as LanguageCode,
      genre: draft.genre,
      region: draft.region,
      translator: draft.translator.trim(),
      text: draft.text.trim(),
      translation: english || undefined,
      summary: summarize(english || draft.text, { ratio: 0.5, maxSentences: 3 }).summary,
      themes: draft.themes.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 6),
      createdAt: Date.now(),
      votes: 0,
      status: 'pending',
      rightsConfirmed: true,
    };
    setSubs((prev) => [s, ...prev]);
    setDraft(EMPTY);
    setTouched(false);
    setJustSubmitted(s.title);
  };

  const vote = (id: string) => {
    const already = voted.includes(id);
    setVoted(already ? voted.filter((v) => v !== id) : [...voted, id]);
    setSubs((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const votes = Math.max(0, s.votes + (already ? -1 : 1));
        return { ...s, votes, status: statusForVotes(votes) };
      }),
    );
  };

  const curatorApprove = (id: string) =>
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'approved', votes: Math.max(s.votes, APPROVAL_THRESHOLD) } : s)));
  const remove = (id: string) => setSubs((prev) => prev.filter((s) => s.id !== id));

  // Rank the queue by a "hot" score: votes decayed by age, like a news aggregator.
  const queue = [...subs].sort((a, b) => hot(b) - hot(a));

  const err = (k: keyof Draft) => touched && errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-bold">Contribute</h1>
      <p className="muted mt-1 max-w-2xl">
        Submit a regional work and your English rendering. Others review and upvote it, and at {APPROVAL_THRESHOLD} votes it joins the library with full search, summary and narration.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <form className="card space-y-4 p-6" onSubmit={submit} noValidate>
          {justSubmitted && (
            <div className="rounded-lg bg-gold-300/30 p-3 text-sm" role="status">
              <strong>{justSubmitted}</strong> is in the curation queue. Share it so others can vote.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">English title *</span><input className="input" value={draft.title} onChange={(e) => set('title', e.target.value)} />{err('title')}</label>
            <label><span className="label">Original title</span><input className="input indic" value={draft.originalTitle} onChange={(e) => set('originalTitle', e.target.value)} placeholder="In the original script" /></label>
            <label><span className="label">Author *</span><input className="input" value={draft.author} onChange={(e) => set('author', e.target.value)} placeholder="or “Traditional”" />{err('author')}</label>
            <label><span className="label">Translator *</span><input className="input" value={draft.translator} onChange={(e) => set('translator', e.target.value)} placeholder="Your name" />{err('translator')}</label>
            <label>
              <span className="label">Language *</span>
              <select className="input" value={draft.language} onChange={(e) => set('language', e.target.value as LanguageCode)}>
                <option value="">Select…</option>
                {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.name} · {l.native}</option>))}
              </select>
              {err('language')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Genre</span><select className="input" value={draft.genre} onChange={(e) => set('genre', e.target.value as Genre)}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></label>
              <label><span className="label">Region</span><select className="input" value={draft.region} onChange={(e) => set('region', e.target.value)}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></label>
            </div>
          </div>
          <label className="block">
            <span className="label">Original text *</span>
            <textarea className="input indic h-36 leading-7" value={draft.text} onChange={(e) => set('text', e.target.value)} />
            {err('text')}
          </label>
          {draft.text && <ScriptBar report={report} />}
          <label className="block">
            <span className="label">English translation</span>
            <textarea className="input h-36 font-serif leading-7" value={draft.translation} onChange={(e) => set('translation', e.target.value)} placeholder="Optional. Use the studio to draft one." />
            {err('translation')}
          </label>
          <label className="block">
            <span className="label flex items-center justify-between">
              Themes <button type="button" onClick={suggestThemes} className="text-xs font-normal text-maroon-600 hover:underline dark:text-gold-300">Suggest from text</button>
            </span>
            <input className="input" value={draft.themes} onChange={(e) => set('themes', e.target.value)} placeholder="comma separated, e.g. courage, family" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={draft.rightsConfirmed} onChange={(e) => set('rightsConfirmed', e.target.checked)} />
            <span>This work is in the public domain, a traditional oral tale, or I hold the rights to share it and my translation.</span>
          </label>
          {err('rightsConfirmed')}
          <div className="flex items-center gap-3">
            <button className="btn-primary" type="submit">Add to curation queue</button>
            <Link to="/studio" className="text-sm muted hover:text-maroon-600">Need a translation? Open the studio</Link>
          </div>
          <p className="text-xs muted">Submissions are saved in this browser for now. A shared backend is on the roadmap.</p>
        </form>

        <aside>
          <h2 className="text-xl font-bold">Curation queue</h2>
          <p className="text-sm muted">Ranked by votes with time decay</p>
          <div className="mt-4 space-y-3">
            {queue.length === 0 && <div className="card p-6 text-center text-sm muted">No submissions yet. Be the first.</div>}
            {queue.map((s) => {
              const mine = voted.includes(s.id);
              const work = s.status === 'approved' ? submissionToWork(s) : null;
              return (
                <div key={s.id} className="card flex gap-3 p-4">
                  <button onClick={() => vote(s.id)} className={`flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-sm font-bold transition ${mine ? 'border-maroon-600 bg-maroon-600 text-paper-50' : 'border-paper-200 hover:border-maroon-600 dark:border-ink-700'}`} aria-pressed={mine} aria-label={`Upvote ${s.title}`}>
                    <UpIcon /> {s.votes}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{work ? <Link className="hover:underline" to={`/work/${work.id}`}>{s.title}</Link> : s.title}</p>
                    <p className="text-xs muted">{languageName(s.language)} · {s.genre} · by {s.author} · tr. {s.translator}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`chip ${s.status === 'approved' ? '!bg-green-100 !text-green-800' : s.status === 'in-review' ? '!bg-gold-300/40' : ''}`}>{s.status}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-paper-100 dark:bg-ink-700">
                        <div className="h-1.5 rounded-full bg-gold-400" style={{ width: `${Math.min(100, (s.votes / APPROVAL_THRESHOLD) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs">
                      {s.status !== 'approved' && (
                        <button onClick={() => curatorApprove(s.id)} className="text-maroon-600 hover:underline dark:text-gold-300">Approve as curator</button>
                      )}
                      <button onClick={() => remove(s.id)} className="muted hover:text-red-600">Withdraw</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Votes decayed by age (gravity 1.5, in hours), as in Hacker News ranking. */
function hot(s: Submission): number {
  const hours = (Date.now() - s.createdAt) / 3_600_000;
  return (s.votes + 1) / Math.pow(hours + 2, 1.5);
}
