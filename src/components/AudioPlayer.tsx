import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { wordAt, type AudioIndex, type EpisodeManifest } from '../lib/audio';
import { formatTime } from '../lib/podcast';
import { DownloadIcon, PauseIcon, PlayIcon, SkipBackIcon, SkipFwdIcon } from './Icons';

const RATES = [0.75, 1, 1.25, 1.5];
// Full literal class names so Tailwind's scanner picks them up.
const SPEAKER_COLORS = ['text-sky-700 dark:text-sky-300', 'text-rose-700 dark:text-rose-300', 'text-emerald-700 dark:text-emerald-300', 'text-violet-700 dark:text-violet-300'];

function vtt(m: EpisodeManifest): string {
  const ts = (s: number) => new Date(s * 1000).toISOString().slice(11, 23);
  const names = new Map(m.cast.map((c) => [c.id, c.name]));
  return 'WEBVTT\n\n' + m.lines.map((l, i) => `${i + 1}\n${ts(l.start)} --> ${ts(l.end)}\n<v ${names.get(l.speaker)}>${l.words.map((w) => w.t).join(' ')}\n`).join('\n');
}

/**
 * Player for pre-rendered ElevenLabs episodes. Word highlighting is driven by
 * requestAnimationFrame while playing (timeupdate only fires ~4 times a second,
 * which is too coarse for karaoke-style sync) and a binary search over the
 * flattened word list.
 */
export function AudioPlayer({ narrators, onPlay }: { narrators: AudioIndex[string]; onPlay?: () => void }) {
  const [narratorKey, setNarratorKey] = useState(narrators[0].key);
  const [manifest, setManifest] = useState<EpisodeManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const resumeAt = useRef<{ line: number; play: boolean } | null>(null);

  useEffect(() => {
    const entry = narrators.find((n) => n.key === narratorKey)!;
    let cancelled = false;
    fetch(entry.manifest)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m: EpisodeManifest) => !cancelled && setManifest(m))
      .catch((e) => !cancelled && setError(`Could not load episode (${e.message})`));
    return () => {
      cancelled = true;
    };
  }, [narratorKey, narrators]);

  const flat = useMemo(
    () => manifest?.lines.flatMap((l, li) => l.words.map((w, wi) => ({ ...w, li, wi }))) ?? [],
    [manifest],
  );
  const current = wordAt(flat, time);
  const currentLine = current >= 0 ? flat[current].li : -1;
  let chapterIdx = 0;
  manifest?.chapters.forEach((c, i) => {
    if (c.start <= time + 0.01) chapterIdx = i;
  });

  // Smooth time updates while playing.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (audioRef.current) setTime(audioRef.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate, manifest]);

  // Keep the active line in view inside the transcript box.
  useEffect(() => {
    const box = boxRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-line="${currentLine}"]`);
    if (!box || !el || !playing) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 20 || top > box.scrollTop + box.clientHeight - 80) box.scrollTo({ top: top - 60, behavior: 'smooth' });
  }, [currentLine, playing]);

  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a || !manifest) return;
    a.currentTime = Math.max(0, Math.min(manifest.duration, t));
    setTime(a.currentTime);
  }, [manifest]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch((e) => setError(e.message));
    else a.pause();
  };

  // Switching narrator keeps your place: resume from the same line in the new recording.
  const switchNarrator = (key: string) => {
    resumeAt.current = { line: Math.max(0, currentLine), play: playing };
    setNarratorKey(key);
  };
  const onLoaded = () => {
    const r = resumeAt.current;
    if (!r || !manifest) return;
    resumeAt.current = null;
    seek(manifest.lines[Math.min(r.line, manifest.lines.length - 1)]?.start ?? 0);
    if (r.play) audioRef.current?.play();
  };

  // Lock-screen / headphone controls.
  useEffect(() => {
    if (!manifest || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: manifest.title, artist: `LitBridge · narrated by ${manifest.narrator.name}`, album: 'LitBridge' });
    navigator.mediaSession.setActionHandler('seekbackward', () => seek((audioRef.current?.currentTime ?? 0) - 15));
    navigator.mediaSession.setActionHandler('seekforward', () => seek((audioRef.current?.currentTime ?? 0) + 15));
  }, [manifest, seek]);

  const download = () => {
    if (!manifest) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([vtt(manifest)], { type: 'text/vtt' }));
    a.download = `${manifest.workId}-${manifest.narrator.key}.vtt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const speakerColor = useMemo(() => {
    const m = new Map<string, string>();
    manifest?.cast.filter((c) => c.id !== 'narrator').forEach((c, i) => m.set(c.id, SPEAKER_COLORS[i % SPEAKER_COLORS.length]));
    return m;
  }, [manifest]);
  const castName = useMemo(() => new Map(manifest?.cast.map((c) => [c.id, c.name]) ?? []), [manifest]);

  const duration = manifest?.duration ?? 0;
  return (
    <section className="card overflow-hidden" aria-label="Podcast player">
      {manifest && (
        <audio
          ref={audioRef}
          src={manifest.audio}
          preload="metadata"
          onPlay={() => { setPlaying(true); onPlay?.(); }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={onLoaded}
          onError={() => setError('Audio failed to load')}
        />
      )}
      <div className="bg-gradient-to-br from-maroon-700 to-maroon-900 p-5 text-paper-50">
        <p className="text-xs uppercase tracking-widest text-gold-300">LitBridge podcast · full cast</p>
        <p className="mt-1 font-serif text-xl font-bold">{manifest?.title ?? 'Loading…'}</p>
        <p className="mt-1 text-sm text-paper-200/80">{manifest?.chapters[chapterIdx]?.title}</p>

        <div
          className="relative mt-4 h-2 cursor-pointer rounded-full bg-white/20"
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={formatTime(time)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') seek(time + 5);
            if (e.key === 'ArrowLeft') seek(time - 5);
            if (e.key === ' ') { e.preventDefault(); toggle(); }
          }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * duration);
          }}
        >
          <div className="h-full rounded-full bg-gold-400" style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
          {manifest?.chapters.slice(1).map((c, i) => (
            <span key={i} className="absolute top-0 h-2 w-0.5 bg-maroon-900/70" style={{ left: `${(c.start / duration) * 100}%` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-paper-200/80">
          <span>{formatTime(time)}</span><span>{formatTime(duration)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className="rounded-full p-2 hover:bg-white/10" onClick={() => seek(time - 15)} aria-label="Back 15 seconds"><SkipBackIcon /></button>
          <button className="grid h-12 w-12 place-items-center rounded-full bg-gold-400 text-ink-900 shadow hover:bg-gold-300 disabled:opacity-50" onClick={toggle} disabled={!manifest} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="rounded-full p-2 hover:bg-white/10" onClick={() => seek(time + 15)} aria-label="Forward 15 seconds"><SkipFwdIcon /></button>
          <select className="ml-auto rounded-md bg-white/10 px-2 py-1 text-sm text-paper-50 [&>option]:text-ink-900" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Playback speed">
            {RATES.map((r) => (<option key={r} value={r}>{r}×</option>))}
          </select>
        </div>

        {narrators.length > 1 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs uppercase tracking-widest text-paper-200/70">Narrator</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Narrator">
              {narrators.map((n) => (
                <button key={n.key} role="radio" aria-checked={n.key === narratorKey} onClick={() => switchNarrator(n.key)}
                  className={`rounded-full px-3 py-1 text-sm transition ${n.key === narratorKey ? 'bg-gold-400 text-ink-900' : 'bg-white/10 hover:bg-white/20'}`}>
                  {n.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {manifest && (
          <p className="mt-3 text-xs text-paper-200/70">
            Cast: {manifest.cast.map((c) => `${c.name} (${c.voice})`).join(' · ')}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-gold-300">{error}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-paper-200 px-5 py-2 dark:border-ink-700">
        <div className="flex flex-wrap gap-1">
          {manifest?.chapters.map((c, i) => (
            <button key={i} onClick={() => seek(c.start)} className={`rounded px-2 py-1 text-xs ${i === chapterIdx ? 'bg-maroon-600 text-paper-50' : 'muted hover:bg-paper-100 dark:hover:bg-ink-700'}`}>{c.title}</button>
          ))}
        </div>
        <button onClick={download} className="inline-flex shrink-0 items-center gap-1 text-xs muted hover:text-maroon-600" title="Download timed transcript (WebVTT)"><DownloadIcon width={14} height={14} /> .vtt</button>
      </div>

      <div ref={boxRef} className="max-h-80 overflow-y-auto p-5 text-sm leading-7">
        {manifest?.lines.map((l, li) => {
          const showChapter = li === 0 || manifest.lines[li - 1].chapter !== l.chapter;
          return (
            <div key={li}>
              {showChapter && <p className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-widest muted first:mt-0">{manifest.chapters[l.chapter]?.title}</p>}
              <p data-line={li} className={`mb-2 ${l.speaker !== 'narrator' ? 'border-l-2 border-gold-400 pl-3' : ''}`}>
                {l.speaker !== 'narrator' && <span className={`mr-1.5 text-xs font-bold uppercase ${speakerColor.get(l.speaker) ?? ''}`}>{castName.get(l.speaker)}</span>}
                {l.words.map((w, wi) => {
                  const active = current >= 0 && flat[current].li === li && flat[current].wi === wi;
                  const spoken = current >= 0 && (li < flat[current].li || (li === flat[current].li && wi < flat[current].wi));
                  return (
                    <span key={wi} onClick={() => seek(w.s)} className={`cursor-pointer rounded px-px transition-colors ${active ? 'bg-gold-300 text-ink-900' : spoken ? '' : 'muted'}`}>
                      {w.t}{' '}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
