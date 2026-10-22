import { useEffect, useMemo, useRef } from 'react';
import { buildEpisode, formatTime, type EpisodeSource } from '../lib/podcast';
import { useNarrator, toWebVTT } from '../lib/useNarrator';
import { DownloadIcon, PauseIcon, PlayIcon, SkipBackIcon, SkipFwdIcon } from './Icons';

const RATES = [0.75, 1, 1.25, 1.5];

export function Player({ source, onPlay }: { source: EpisodeSource; onPlay?: () => void }) {
  const episode = useMemo(() => buildEpisode(source), [source]);
  const n = useNarrator(episode);
  const current = episode.cues[n.cue];
  const elapsed = current ? current.start / n.rate : 0;
  const total = episode.duration / n.rate;
  const activeRef = useRef<HTMLButtonElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (n.playing) onPlay?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n.playing]);

  // Keep the active sentence visible inside the transcript box without scrolling the page.
  useEffect(() => {
    const box = transcriptRef.current;
    const el = activeRef.current;
    if (!box || !el || !n.playing) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 60) box.scrollTo({ top: top - 40, behavior: 'smooth' });
  }, [n.cue, n.playing]);

  const chapterIdx = current?.chapter ?? 0;
  const downloadVTT = () => {
    const blob = new Blob([toWebVTT(episode)], { type: 'text/vtt' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${source.title.replace(/[^\w]+/g, '-').toLowerCase()}.vtt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="card overflow-hidden" aria-label="Podcast player">
      <div className="bg-gradient-to-br from-maroon-700 to-maroon-900 p-5 text-paper-50">
        <p className="text-xs uppercase tracking-widest text-gold-300">LitBridge podcast · AI narration</p>
        <p className="mt-1 font-serif text-xl font-bold">{episode.title}</p>
        <p className="mt-1 text-sm text-paper-200/80">{episode.chapters[chapterIdx]?.title}</p>

        <div
          className="mt-4 h-2 cursor-pointer rounded-full bg-white/20"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(elapsed)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') n.seek(n.cue + 1);
            if (e.key === 'ArrowLeft') n.seek(n.cue - 1);
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const t = ((e.clientX - rect.left) / rect.width) * episode.duration;
            const idx = episode.cues.findIndex((c) => c.start + c.duration > t);
            n.seek(idx === -1 ? episode.cues.length - 1 : idx);
          }}
        >
          <div className="relative h-full">
            <div className="h-full rounded-full bg-gold-400" style={{ width: `${(elapsed / total) * 100}%` }} />
            {episode.chapters.map((c, i) => i > 0 && (
              <span key={i} className="absolute top-0 h-2 w-0.5 bg-maroon-900/70" style={{ left: `${(c.start / episode.duration) * 100}%` }} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-paper-200/80">
          <span>{formatTime(elapsed)}</span><span>{formatTime(total)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="rounded-full p-2 hover:bg-white/10" onClick={() => n.seek(episode.chapters[Math.max(0, chapterIdx - (current && current.id === episode.chapters[chapterIdx].cues[0].id ? 1 : 0))].cues[0].id)} aria-label="Previous chapter"><SkipBackIcon /></button>
          <button
            className="grid h-12 w-12 place-items-center rounded-full bg-gold-400 text-ink-900 shadow hover:bg-gold-300 disabled:opacity-50"
            onClick={n.toggle}
            disabled={!n.supported}
            aria-label={n.playing ? 'Pause' : 'Play'}
          >
            {n.playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="rounded-full p-2 hover:bg-white/10" onClick={() => n.seek(episode.chapters[Math.min(episode.chapters.length - 1, chapterIdx + 1)].cues[0].id)} aria-label="Next chapter"><SkipFwdIcon /></button>
          <div className="ml-auto flex items-center gap-2">
            <select
              className="rounded-md bg-white/10 px-2 py-1 text-sm text-paper-50 [&>option]:text-ink-900"
              value={n.rate}
              onChange={(e) => n.setRate(Number(e.target.value))}
              aria-label="Playback speed"
            >
              {RATES.map((r) => (<option key={r} value={r}>{r}×</option>))}
            </select>
            {n.voices.length > 1 && (
              <select
                className="max-w-[9rem] rounded-md bg-white/10 px-2 py-1 text-sm text-paper-50 [&>option]:text-ink-900"
                value={n.voiceURI ?? ''}
                onChange={(e) => n.setVoiceURI(e.target.value)}
                aria-label="Narrator voice"
              >
                {n.voices.map((v) => (<option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>))}
              </select>
            )}
          </div>
        </div>
        {n.error && <p className="mt-3 text-sm text-gold-300">{n.error}. Try another voice from the menu.</p>}
        {!n.supported && <p className="mt-3 text-sm text-gold-300">Your browser does not support speech synthesis. You can still read the transcript below.</p>}
      </div>

      <div className="flex items-center justify-between border-b border-paper-200 px-5 py-2 dark:border-ink-700">
        <div className="flex flex-wrap gap-1">
          {episode.chapters.map((c, i) => (
            <button key={i} onClick={() => n.seek(c.cues[0].id)} className={`rounded px-2 py-1 text-xs ${i === chapterIdx ? 'bg-maroon-600 text-paper-50' : 'muted hover:bg-paper-100 dark:hover:bg-ink-700'}`}>
              {c.title}
            </button>
          ))}
        </div>
        <button onClick={downloadVTT} className="inline-flex shrink-0 items-center gap-1 text-xs muted hover:text-maroon-600" title="Download timed transcript (WebVTT)">
          <DownloadIcon width={14} height={14} /> .vtt
        </button>
      </div>
      <div ref={transcriptRef} className="max-h-72 overflow-y-auto p-5 text-sm leading-7">
        {episode.chapters.map((c, ci) => (
          <p key={ci} className="mb-3">
            {c.cues.map((cue) => (
              <button
                key={cue.id}
                ref={cue.id === n.cue ? activeRef : undefined}
                onClick={() => n.seek(cue.id)}
                className={`mr-1 inline rounded text-left transition ${cue.id === n.cue && n.playing ? 'bg-gold-300/70 text-ink-900' : 'hover:bg-paper-100 dark:hover:bg-ink-700'}`}
              >
                {cue.text}
              </button>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}
