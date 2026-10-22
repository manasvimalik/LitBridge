import { useCallback, useEffect, useRef, useState } from 'react';
import { rankVoices, type Episode } from './podcast';

/**
 * Drives the Web Speech API through an episode one cue at a time.
 *
 * Speaking sentence by sentence (instead of one long utterance) gives us
 * accurate "now playing" highlighting, cheap seeking, and works around
 * Chrome's bug where long utterances silently stop after ~15 seconds.
 * A generation counter discards `onend` events from cancelled utterances.
 */
export function useNarrator(episode: Episode) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [playing, setPlaying] = useState(false);
  const [cue, setCue] = useState(0);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const state = useRef({ cue, rate, voiceURI, playing });
  state.current = { cue, rate, voiceURI, playing };

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const ranked = rankVoices(speechSynthesis.getVoices()) as SpeechSynthesisVoice[];
      setVoices(ranked);
      setVoiceURI((v) => v ?? ranked[0]?.voiceURI ?? null);
    };
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, [supported]);

  const speakFrom = useCallback(
    (index: number) => {
      if (!supported) return;
      const gen = ++generation.current;
      let failures = 0;
      setError(null);
      speechSynthesis.cancel();
      const next = (i: number) => {
        if (gen !== generation.current) return;
        if (i >= episode.cues.length) {
          setPlaying(false);
          setCue(0);
          return;
        }
        setCue(i);
        const u = new SpeechSynthesisUtterance(episode.cues[i].text);
        u.rate = state.current.rate;
        u.lang = 'en-IN';
        const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === state.current.voiceURI);
        if (voice) u.voice = voice;
        u.onend = () => {
          failures = 0;
          next(i + 1);
        };
        u.onerror = (e) => {
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          // Skip a sentence the engine cannot voice, but stop if it keeps failing.
          if (++failures >= 3) {
            setError(`Speech engine error: ${e.error}`);
            setPlaying(false);
            return;
          }
          next(i + 1);
        };
        speechSynthesis.speak(u);
      };
      setPlaying(true);
      next(index);
    },
    [episode, supported],
  );

  const pause = useCallback(() => {
    generation.current++;
    if (supported) speechSynthesis.cancel();
    setPlaying(false);
  }, [supported]);

  const toggle = useCallback(() => (state.current.playing ? pause() : speakFrom(state.current.cue)), [pause, speakFrom]);
  const seek = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(episode.cues.length - 1, i));
      if (state.current.playing) speakFrom(clamped);
      else setCue(clamped);
    },
    [episode, speakFrom],
  );

  // Changing rate or voice mid-play restarts the current sentence with the new settings.
  useEffect(() => {
    if (state.current.playing) speakFrom(state.current.cue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, voiceURI]);

  // Stop speaking when the episode changes or the component unmounts.
  useEffect(() => {
    setCue(0);
    return () => {
      generation.current++;
      if (supported) speechSynthesis.cancel();
    };
  }, [episode, supported]);

  return { supported, error, playing, cue, rate, setRate, voices, voiceURI, setVoiceURI, toggle, pause, seek, speakFrom };
}

/** WebVTT captions for an episode, so the narration can be paired with recorded audio later. */
export function toWebVTT(episode: Episode): string {
  const ts = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0');
    const sec = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${sec}.${String(ms % 1000).padStart(3, '0')}`;
  };
  return (
    'WEBVTT\n\n' +
    episode.cues.map((c) => `${c.id + 1}\n${ts(c.start)} --> ${ts(c.start + c.duration)}\n${c.text}\n`).join('\n')
  );
}
