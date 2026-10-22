/**
 * Shared types for the narration pipeline.
 *
 *   Work ──director (Claude)──▶ DirectorScript ──render (ElevenLabs)──▶ mp3 + EpisodeManifest
 *
 * The director script is human-reviewable JSON in content/scripts/. The
 * renderer turns it into one MP3 per narrator plus a manifest with word-level
 * timings, which the AudioPlayer uses for synced transcripts.
 */

export interface CastMember {
  /** Stable id used by lines, e.g. "narrator", "mini". */
  id: string;
  name: string;
  /** Casting note: age, gender, temperament, accent. */
  description: string;
}

export interface ScriptLine {
  speaker: string;
  /** Text with Eleven v4 audio tags, e.g. "[softly] She was five." */
  text: string;
}

export interface ScriptChapter {
  title: string;
  lines: ScriptLine[];
}

export interface DirectorScript {
  workId: string;
  title: string;
  cast: CastMember[];
  chapters: ScriptChapter[];
  /** Who wrote it: "claude-opus-5-5" when generated through the API. */
  director: string;
}

export interface ManifestWord {
  /** Word as displayed, punctuation attached. */
  t: string;
  /** Start and end in seconds. */
  s: number;
  e: number;
}

export interface ManifestLine {
  speaker: string;
  chapter: number;
  start: number;
  end: number;
  words: ManifestWord[];
}

export interface EpisodeManifest {
  workId: string;
  title: string;
  narrator: { key: string; name: string };
  cast: { id: string; name: string; voice: string }[];
  audio: string;
  duration: number;
  chapters: { title: string; start: number }[];
  lines: ManifestLine[];
  model: string;
  renderedAt: string;
}

/** Which works have rendered audio, and with which narrators. Written by the renderer. */
export type AudioIndex = Record<string, { key: string; name: string; manifest: string }[]>;

/** Matches audio tags such as [whispers] or [long pause]. */
export const AUDIO_TAG = /\[[^\]]*\]/g;

export function stripTags(text: string): string {
  return text.replace(AUDIO_TAG, '').replace(/\s+/g, ' ').trim();
}

/** Index of the word playing at time t in a flat, time-sorted list (binary search). */
export function wordAt(words: { s: number }[], t: number): number {
  let lo = 0;
  let hi = words.length - 1;
  if (hi < 0 || t < words[0].s) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (words[mid].s <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
