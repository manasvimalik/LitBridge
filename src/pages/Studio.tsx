import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparkIcon } from '../components/Icons';
import { Player } from '../components/Player';
import { ScriptBar } from '../components/ScriptBar';
import { LANGUAGES, languageName } from '../data/languages';
import { SAMPLES } from '../data/samples';
import { detectScript } from '../lib/script';
import { keywords, summarize } from '../lib/summarize';
import { translate, type TranslationResult } from '../lib/translate';
import type { LanguageCode } from '../lib/types';

export const STUDIO_HANDOFF_KEY = 'litbridge:studio-handoff';

export default function Studio() {
  const [text, setText] = useState(SAMPLES[0].text);
  const [override, setOverride] = useState<LanguageCode | ''>('');
  const [style, setStyle] = useState<'literary' | 'faithful'>('literary');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [ratio, setRatio] = useState(0.4);
  const abort = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const report = useMemo(() => detectScript(text), [text]);
  const detected = report.language && report.language !== 'en' ? (report.language as LanguageCode) : null;
  const source = override || detected;

  // Summarise the English translation when we have one, otherwise the source text itself.
  const summaryInput = result?.translation ?? text;
  const tr = useMemo(() => summarize(summaryInput, { ratio }), [summaryInput, ratio]);
  const kw = useMemo(() => keywords(summaryInput, 6), [summaryInput]);
  const maxScore = tr.ranking[0]?.score ?? 1;

  const run = async () => {
    if (!source || !text.trim()) return;
    abort.current?.abort();
    abort.current = new AbortController();
    setStatus('loading');
    setMessage('');
    try {
      const r = await translate(
        { text, source, style },
        { signal: abort.current.signal, onFallback: () => setMessage('The Claude service is not available on this deployment, so the free MyMemory engine was used instead. Translation quality will be lower.') },
      );
      setResult(r);
      setStatus('idle');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Translation failed');
    }
  };

  const episodeSource = useMemo(
    () =>
      result && {
        title: 'Studio draft',
        author: 'a community contributor',
        language: source ? languageName(source) : 'regional',
        translator: result.provider === 'claude' ? 'Claude, reviewed by you' : 'machine translation',
        summary: result.summary ?? tr.summary,
        body: result.translation,
        themes: result.themes ?? kw,
      },
    [result, source, tr.summary, kw],
  );

  const handOff = () => {
    try {
      sessionStorage.setItem(
        STUDIO_HANDOFF_KEY,
        JSON.stringify({ text, language: source, translation: result?.translation, summary: result?.summary ?? tr.summary, themes: result?.themes ?? kw }),
      );
    } catch {
      /* storage unavailable: the form simply starts empty */
    }
    navigate('/contribute');
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-bold">Translation studio</h1>
      <p className="muted mt-1 max-w-2xl">Paste a passage in any Indian language. The studio detects the script, translates it, ranks its sentences with TextRank, and turns the result into a narrated episode.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">1 · Source text</h2>
            <div className="flex flex-wrap gap-1">
              {SAMPLES.map((s) => (
                <button key={s.label} className="chip hover:bg-paper-200" onClick={() => { setText(s.text); setResult(null); setOverride(''); }}>{s.label}</button>
              ))}
            </div>
          </div>
          <textarea
            className="input indic mt-3 h-56 resize-y text-base leading-7"
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); }}
            aria-label="Source text"
            maxLength={12000}
          />
          <div className="mt-3"><ScriptBar report={report} /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label>
              <span className="label">Language</span>
              <select className="input" value={override} onChange={(e) => setOverride(e.target.value as LanguageCode | '')}>
                <option value="">Auto ({detected ? languageName(detected) : '—'})</option>
                {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.name}</option>))}
              </select>
            </label>
            <label>
              <span className="label">Style</span>
              <select className="input" value={style} onChange={(e) => setStyle(e.target.value as 'literary' | 'faithful')}>
                <option value="literary">Literary</option>
                <option value="faithful">Faithful</option>
              </select>
            </label>
            <div className="flex items-end">
              <button className="btn-primary w-full" onClick={run} disabled={!source || status === 'loading'}>
                <SparkIcon /> {status === 'loading' ? 'Translating…' : 'Translate'}
              </button>
            </div>
          </div>
          {message && <p className={`mt-3 text-sm ${status === 'error' ? 'text-red-600' : 'text-gold-600'}`}>{message}</p>}
          <p className="mt-3 text-xs muted">Text is sent to the translation service only when you press Translate.</p>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">2 · English rendering</h2>
            {result && <span className="chip">{result.provider === 'claude' ? 'Claude Opus 5.5' : 'MyMemory'}</span>}
          </div>
          {result ? (
            <>
              <p className="mt-3 whitespace-pre-line font-serif leading-8">{result.translation}</p>
              {result.notes && (
                <div className="mt-4 rounded-lg bg-paper-100 p-3 text-sm dark:bg-ink-700">
                  <p className="font-semibold">Translator's notes</p>
                  <p className="mt-1 muted">{result.notes}</p>
                </div>
              )}
              <button className="btn-gold mt-5" onClick={handOff}>Submit this to the library →</button>
            </>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-paper-200 p-8 text-center text-sm muted dark:border-ink-700">
              {status === 'loading' ? 'Working on it…' : 'Your translation will appear here.'}
            </div>
          )}
        </section>
      </div>

      <section className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">3 · Extractive summary (TextRank)</h2>
            <p className="text-sm muted">
              {tr.ranking.length} sentences, {tr.iterations ? `PageRank converged in ${tr.iterations} iterations` : 'too short to rank'}. Running on the {result ? 'English translation' : 'source text'}.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm">
            Keep {Math.round(ratio * 100)}%
            <input type="range" min={0.1} max={0.9} step={0.05} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
          </label>
        </div>
        <p className="mt-4 rounded-lg bg-gold-300/20 p-4 font-serif leading-7 indic">{tr.summary || '—'}</p>
        <div className="mt-4 space-y-1.5">
          {[...tr.ranking].sort((a, b) => a.index - b.index).map((s) => {
            const picked = tr.sentences.some((x) => x.index === s.index);
            return (
              <div key={s.index} className="grid grid-cols-[3rem_1fr] items-center gap-3 text-sm">
                <div className="h-2 rounded-full bg-paper-100 dark:bg-ink-700">
                  <div className={`h-2 rounded-full ${picked ? 'bg-maroon-600' : 'bg-paper-200 dark:bg-ink-700'}`} style={{ width: `${(s.score / maxScore) * 100}%` }} />
                </div>
                <p className={`indic truncate ${picked ? '' : 'muted'}`} title={s.text}>{s.text}</p>
              </div>
            );
          })}
        </div>
        {kw.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="muted">TF-IDF keywords:</span>
            {kw.map((k) => (<span key={k} className="chip indic">{k}</span>))}
          </div>
        )}
      </section>

      {episodeSource && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">4 · Podcast preview</h2>
          <Player source={episodeSource} />
        </section>
      )}
    </div>
  );
}
