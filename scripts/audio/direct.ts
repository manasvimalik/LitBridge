/**
 * Director pass: Claude turns a story into a performance script with a cast,
 * chapters, speaker-attributed lines and Eleven v4 audio tags.
 *
 *   npm run audio:direct -- <workId> [--force]
 *
 * Needs ANTHROPIC_API_KEY (in .env.local). Writes content/scripts/<workId>.json,
 * which is meant to be reviewed and edited by a person before rendering.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { CONTRIBUTOR_BY_ID } from '../../src/data/contributors';
import { languageName } from '../../src/data/languages';
import { WORK_BY_ID } from '../../src/data/works';
import type { DirectorScript } from '../../src/lib/audio';

const Script = z.object({
  cast: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
  chapters: z.array(
    z.object({
      title: z.string(),
      lines: z.array(z.object({ speaker: z.string(), text: z.string() })),
    }),
  ),
});

export const DIRECTOR_SYSTEM = `You are the audio director for LitBridge, an audiobook-style podcast of regional Indian literature in English.
Turn the story you are given into a performance script for ElevenLabs Eleven v4, which reads inline audio tags in square brackets.

Cast
- Always include a cast member with id "narrator".
- Add a cast member for every character who speaks a quoted line. ids are lowercase single words. The description gives age, gender and temperament (e.g. "five-year-old girl, a fearless chatterbox") because it is used to pick a voice.

Lines
- Keep the story's wording. Do not add plot, remove events, or modernise language. You may split long sentences, and you may move a character's quoted words into that character's own line, leaving the narrator the attribution ("she called out").
- Never put quotation marks around a character's line.
- Mark delivery with audio tags placed before the words they affect: emotion ([warmly], [wistful], [amused], [afraid], [tender], [heartbroken], [teasing], [angry]), voice ([whispers], [softly], [loudly]), and non-verbal sounds ([laughs], [giggles], [sighs], [gasps], [clears throat]). Use [short pause] or [long pause] sparingly at dramatic turns. Use ellipses for hesitation and em dashes for interruptions.
- Use tags with restraint: on average one tag every one or two sentences in narration, more in dialogue. Do not tag every sentence.
- Never write stage directions as plain words; only inside brackets.

Chapters
1. "Introduction": the narrator welcomes the listener to LitBridge and introduces the story, its author and the language it comes from, in two or three warm sentences.
2. Three to five story chapters with short evocative titles, following the story's natural turns.
3. "Afterword": one or two reflective sentences on what the story is about, then thank the listener.

Keep every single line under 600 characters.`;

async function main() {
  const [workId, ...flags] = process.argv.slice(2);
  const work = workId ? WORK_BY_ID[workId] : undefined;
  if (!work) throw new Error(`Usage: npm run audio:direct -- <workId>. Unknown work "${workId}".`);
  const out = `content/scripts/${work.id}.json`;
  if (existsSync(out) && !flags.includes('--force')) throw new Error(`${out} exists; pass --force to overwrite it.`);

  const client = new Anthropic();
  const author = CONTRIBUTOR_BY_ID[work.authorId]?.name ?? 'a traditional storyteller';
  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    max_tokens: 16000,
    output_config: { effort: 'high', format: betaZodOutputFormat(Script) },
    system: DIRECTOR_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Title: ${work.title}\nAuthor: ${author}\nLanguage: ${languageName(work.language)}\nGenre: ${work.genre}\nThemes: ${work.themes.join(', ')}\n\n<story>\n${work.body}\n</story>`,
      },
    ],
  });
  if (response.stop_reason === 'refusal') throw new Error('The model declined to direct this story.');
  if (!response.parsed_output) throw new Error('Could not parse the director script.');

  const script: DirectorScript = { workId: work.id, title: work.title, director: 'claude-opus-5-5', ...response.parsed_output };
  if (!script.cast.some((c) => c.id === 'narrator')) throw new Error('Director script has no narrator.');
  mkdirSync('content/scripts', { recursive: true });
  writeFileSync(out, JSON.stringify(script, null, 2) + '\n');
  const chars = script.chapters.flatMap((c) => c.lines).reduce((n, l) => n + l.text.length, 0);
  console.log(`Wrote ${out}: ${script.cast.length} cast, ${script.chapters.length} chapters, ${chars} characters.`);
}

// Run only when executed as a script, not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
