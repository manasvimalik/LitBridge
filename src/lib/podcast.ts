import { splitSentences, wordCount, WORDS_PER_MINUTE } from './text';

/**
 * Turns a work into a podcast episode: a script made of chapters, each a list
 * of cues (one sentence each). Cue-level granularity lets the player highlight
 * the sentence being read, seek precisely, and avoid the Web Speech API's
 * habit of silently stopping on very long utterances.
 */

export interface Cue {
  id: number;
  chapter: number;
  text: string;
  /** Estimated start offset in seconds at 1x speed. */
  start: number;
  duration: number;
}

export interface Chapter {
  title: string;
  cues: Cue[];
  start: number;
}

export interface Episode {
  title: string;
  chapters: Chapter[];
  cues: Cue[];
  duration: number;
}

export interface EpisodeSource {
  title: string;
  author: string;
  language: string;
  translator: string;
  summary: string;
  body: string;
  themes: string[];
}

const PAUSE_AFTER_SENTENCE = 0.35;

export function estimateSeconds(text: string): number {
  return (wordCount(text) / WORDS_PER_MINUTE) * 60 + PAUSE_AFTER_SENTENCE;
}

export function buildEpisode(src: EpisodeSource): Episode {
  const sections: { title: string; text: string }[] = [
    {
      title: 'Introduction',
      text:
        `Welcome to LitBridge, where stories cross languages. ` +
        `Today's story is ${src.title}, from the ${src.language} tradition, by ${src.author}. ` +
        `This English rendering comes from ${src.translator}.`,
    },
    { title: 'In brief', text: src.summary },
    ...src.body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .reduce<{ title: string; text: string }[]>((acc, para, i, arr) => {
        // Group paragraphs into roughly three story chapters.
        const per = Math.max(1, Math.ceil(arr.length / 3));
        const n = Math.floor(i / per);
        if (!acc[n]) acc[n] = { title: ['The beginning', 'The turn', 'The ending'][n] ?? `Part ${n + 1}`, text: '' };
        acc[n].text += (acc[n].text ? '\n\n' : '') + para;
        return acc;
      }, []),
    {
      title: 'Reflection',
      text:
        `That was ${src.title}. ` +
        (src.themes.length ? `It is a story about ${joinList(src.themes.slice(0, 3))}. ` : '') +
        `If it moved you, share it with someone who has never heard it. Thank you for listening to LitBridge.`,
    },
  ];

  const cues: Cue[] = [];
  const chapters: Chapter[] = [];
  let t = 0;
  sections.forEach((sec, c) => {
    const chapter: Chapter = { title: sec.title, cues: [], start: t };
    for (const sentence of splitSentences(sec.text)) {
      const duration = estimateSeconds(sentence);
      const cue = { id: cues.length, chapter: c, text: sentence, start: t, duration };
      cues.push(cue);
      chapter.cues.push(cue);
      t += duration;
    }
    chapters.push(chapter);
  });
  return { title: src.title, chapters, cues, duration: t };
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Index of the cue playing at time `t` (binary search over start times). */
export function cueAt(episode: Episode, t: number): number {
  let lo = 0;
  let hi = episode.cues.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (episode.cues[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Rank speech-synthesis voices: Indian English first (it suits the material),
 * then other English voices, preferring higher-quality "natural"/"neural" ones.
 */
export function rankVoices(voices: Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService'>[]) {
  const score = (v: (typeof voices)[number]) =>
    (v.lang === 'en-IN' ? 100 : v.lang.startsWith('en') ? 50 : 0) +
    (/natural|neural|premium|enhanced/i.test(v.name) ? 20 : 0) +
    (/google/i.test(v.name) ? 5 : 0);
  return [...voices].filter((v) => score(v) > 0).sort((a, b) => score(b) - score(a));
}
