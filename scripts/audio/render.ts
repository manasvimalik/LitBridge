/**
 * Render a director script into narrated episodes with ElevenLabs Eleven v4.
 *
 *   npm run audio:render -- <workId> [--narrators ranbir,riya] [--dry-run]
 *
 * For each narrator: lines are packed into Text-to-Dialogue requests of at
 * most ~1,800 characters (the API's reliable limit is 2,000), never splitting a
 * chapter boundary mid-request when it can be avoided. Each request is chained
 * to the previous ones with previous_request_ids so prosody stays continuous.
 * The MP3 chunks are stitched frame by frame, and character alignments are
 * turned into word timings offset by each chunk's exact duration.
 *
 * Writes public/audio/<workId>/<narrator>.mp3 + .json and updates src/data/audioIndex.json.
 */
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { AudioIndex, DirectorScript, EpisodeManifest, ManifestLine, ManifestWord } from '../../src/lib/audio';
import { AUDIO_TAG } from '../../src/lib/audio';
import { archetypeFor, CHARACTER_VOICES, NARRATORS, WORK_CASTING, type VoiceSpec } from './cast';
import { concatFrames, parseMp3 } from './mp3';

const MODEL = 'eleven_v4';
const OUTPUT_FORMAT = 'mp3_44100_64';
const MAX_CHARS = 1800;
const INDEX_PATH = 'src/data/audioIndex.json';

interface Alignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

interface PlannedLine {
  speaker: string;
  voiceId: string;
  text: string;
  chapter: number;
}

/** Pack lines into requests under MAX_CHARS; prefer to break at chapter boundaries. */
export function packRequests(lines: PlannedLine[], max = MAX_CHARS): PlannedLine[][] {
  const out: PlannedLine[][] = [];
  let cur: PlannedLine[] = [];
  let size = 0;
  for (const line of lines) {
    const startsChapter = cur.length > 0 && line.chapter !== cur[cur.length - 1].chapter;
    const wouldOverflow = size + line.text.length > max;
    // Break at a new chapter once the request is reasonably full, to keep chunks meaningful.
    if (cur.length && (wouldOverflow || (startsChapter && size > max * 0.6))) {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(line);
    size += line.text.length;
  }
  if (cur.length) out.push(cur);
  // A short trailing request (often just the afterword) reads better merged into the previous one.
  const total = (b: PlannedLine[]) => b.reduce((n, l) => n + l.text.length, 0);
  if (out.length > 1 && total(out[out.length - 2]) + total(out[out.length - 1]) <= max) {
    const last = out.pop()!;
    out[out.length - 1].push(...last);
  }
  return out;
}

/**
 * Group aligned characters into displayable words with timings, skipping
 * [audio tags]. Characters belong to [from, to) of the alignment arrays.
 */
export function wordsFromAlignment(a: Alignment, from: number, to: number, offset: number): ManifestWord[] {
  const words: ManifestWord[] = [];
  let inTag = false;
  let cur: { t: string; s: number; e: number } | null = null;
  const flush = () => {
    if (cur && /[\p{L}\p{N}]/u.test(cur.t)) words.push({ t: cur.t, s: round(cur.s + offset), e: round(cur.e + offset) });
    else if (cur && words.length) words[words.length - 1].t += cur.t; // stray punctuation
    cur = null;
  };
  for (let i = from; i < to; i++) {
    const ch = a.characters[i];
    if (ch === '[') {
      flush();
      inTag = true;
      continue;
    }
    if (inTag) {
      if (ch === ']') inTag = false;
      continue;
    }
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    if (!cur) cur = { t: '', s: a.characterStartTimesSeconds[i], e: a.characterEndTimesSeconds[i] };
    cur.t += ch;
    cur.e = a.characterEndTimesSeconds[i];
  }
  flush();
  return words;
}

const round = (x: number) => Math.round(x * 1000) / 1000;

function castVoices(script: DirectorScript, narrator: VoiceSpec): Map<string, VoiceSpec> {
  const pinned = WORK_CASTING[script.workId] ?? {};
  const voices = new Map<string, VoiceSpec>();
  for (const member of script.cast) {
    if (member.id === 'narrator') voices.set(member.id, narrator);
    else voices.set(member.id, CHARACTER_VOICES[pinned[member.id] ?? archetypeFor(member.description)]);
  }
  return voices;
}

async function ensureVoices(client: ElevenLabsClient, specs: VoiceSpec[]) {
  const mine = new Set<string>();
  for (let page: string | undefined, guard = 0; guard < 20; guard++) {
    const res = await client.voices.search({ pageSize: 100, nextPageToken: page });
    res.voices.forEach((v) => mine.add(v.voiceId));
    if (!res.hasMore || !res.nextPageToken) break;
    page = res.nextPageToken;
  }
  for (const spec of specs) {
    if (mine.has(spec.id)) continue;
    // Shared library voices must be added to the account before use.
    const found = await client.voices.getShared({ search: spec.name, pageSize: 50 });
    const match = found.voices.find((v) => v.voiceId === spec.id);
    if (!match) throw new Error(`Voice ${spec.name} (${spec.id}) not found in the Voice Library.`);
    await client.voices.share(match.publicOwnerId, spec.id, { newName: `LitBridge ${spec.name}` });
    console.log(`  added library voice ${spec.name}`);
  }
}

async function renderNarrator(client: ElevenLabsClient, script: DirectorScript, key: string): Promise<EpisodeManifest> {
  const narrator = NARRATORS[key];
  const voices = castVoices(script, narrator);
  await ensureVoices(client, [...new Map([...voices.values()].map((v) => [v.id, v])).values()]);

  const planned: PlannedLine[] = script.chapters.flatMap((ch, c) =>
    ch.lines.map((l) => {
      const v = voices.get(l.speaker);
      if (!v) throw new Error(`Line speaker "${l.speaker}" is not in the cast.`);
      return { speaker: l.speaker, voiceId: v.id, text: l.text, chapter: c };
    }),
  );
  const requests = packRequests(planned);

  const frames: Uint8Array[][] = [];
  const lines: ManifestLine[] = [];
  const chapterStart = new Map<number, number>();
  const requestIds: string[] = [];
  let offset = 0;

  for (const [r, batch] of requests.entries()) {
    process.stdout.write(`  [${key}] request ${r + 1}/${requests.length} (${batch.reduce((n, l) => n + l.text.length, 0)} chars)… `);
    const { data, rawResponse } = await client.textToDialogue
      .convertWithTimestamps({
        modelId: MODEL,
        outputFormat: OUTPUT_FORMAT,
        languageCode: 'en',
        inputs: batch.map((l) => ({ text: l.text, voiceId: l.voiceId })),
        previousRequestIds: requestIds.slice(-3),
      })
      .withRawResponse();
    const reqId = rawResponse.headers.get('request-id');
    if (reqId) requestIds.push(reqId);

    const mp3 = parseMp3(Buffer.from(data.audioBase64, 'base64'));
    frames.push(mp3.frames);
    const align = (data.alignment ?? data.normalizedAlignment) as Alignment | undefined;
    if (!align) throw new Error('Response had no alignment data.');

    batch.forEach((line, i) => {
      const segs = data.voiceSegments.filter((s) => s.dialogueInputIndex === i);
      if (!segs.length) return;
      const from = Math.min(...segs.map((s) => s.characterStartIndex));
      const to = Math.max(...segs.map((s) => s.characterEndIndex));
      const words = wordsFromAlignment(align, from, to, offset);
      if (!words.length) return;
      if (!chapterStart.has(line.chapter)) chapterStart.set(line.chapter, words[0].s);
      lines.push({ speaker: line.speaker, chapter: line.chapter, start: words[0].s, end: words[words.length - 1].e, words });
    });
    offset += mp3.duration;
    console.log(`${mp3.duration.toFixed(1)}s`);
  }

  const dir = `public/audio/${script.workId}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${key}.mp3`, concatFrames(frames));
  const manifest: EpisodeManifest = {
    workId: script.workId,
    title: script.title,
    narrator: { key, name: narrator.name },
    cast: script.cast.map((c) => ({ id: c.id, name: c.name, voice: voices.get(c.id)!.name })),
    audio: `/audio/${script.workId}/${key}.mp3`,
    duration: round(offset),
    chapters: script.chapters.map((c, i) => ({ title: c.title, start: chapterStart.get(i) ?? 0 })),
    lines,
    model: MODEL,
    renderedAt: new Date().toISOString(),
  };
  writeFileSync(`${dir}/${key}.json`, JSON.stringify(manifest) + '\n');
  return manifest;
}

function updateIndex(manifest: EpisodeManifest) {
  const index: AudioIndex = existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH, 'utf8')) : {};
  const list = (index[manifest.workId] ?? []).filter((n) => n.key !== manifest.narrator.key);
  list.push({ key: manifest.narrator.key, name: manifest.narrator.name, manifest: `/audio/${manifest.workId}/${manifest.narrator.key}.json` });
  index[manifest.workId] = list.sort((a, b) => Object.keys(NARRATORS).indexOf(a.key) - Object.keys(NARRATORS).indexOf(b.key));
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  const workId = args.find((a) => !a.startsWith('--'));
  const narratorArg = args[args.indexOf('--narrators') + 1];
  const keys = args.includes('--narrators') ? narratorArg.split(',') : Object.keys(NARRATORS);
  const path = `content/scripts/${workId}.json`;
  if (!workId || !existsSync(path)) throw new Error(`Usage: npm run audio:render -- <workId>. Missing ${path}; run audio:direct first.`);
  for (const k of keys) if (!NARRATORS[k]) throw new Error(`Unknown narrator "${k}". Options: ${Object.keys(NARRATORS).join(', ')}`);

  const script: DirectorScript = JSON.parse(readFileSync(path, 'utf8'));
  const chars = script.chapters.flatMap((c) => c.lines).reduce((n, l) => n + l.text.length, 0);
  const tags = script.chapters.flatMap((c) => c.lines).reduce((n, l) => n + (l.text.match(AUDIO_TAG)?.length ?? 0), 0);
  console.log(`${script.title}: ${chars} characters, ${tags} audio tags, ${keys.length} narrator(s) ≈ ${chars * keys.length} credits`);
  if (args.includes('--dry-run')) {
    const planned = script.chapters.flatMap((ch, c) => ch.lines.map((l) => ({ ...l, voiceId: '', chapter: c })));
    packRequests(planned).forEach((b, i) => console.log(`  request ${i + 1}: ${b.length} lines, ${b.reduce((n, l) => n + l.text.length, 0)} chars`));
    return;
  }

  const client = new ElevenLabsClient();
  for (const key of keys) {
    const manifest = await renderNarrator(client, script, key);
    updateIndex(manifest);
    console.log(`  → ${manifest.audio} (${manifest.duration.toFixed(1)}s, ${manifest.lines.length} lines)`);
  }
  const sub = await client.user.subscription.get();
  console.log(`Credits used this period: ${sub.characterCount} of ${sub.characterLimit}`);
}

// Run only when executed as a script, not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
