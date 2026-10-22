import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

/**
 * POST /api/translate — Vercel serverless function.
 *
 * Body: { text: string, source: string (ISO 639-1), style?: 'faithful' | 'literary' }
 * Returns: { translation, summary, themes, notes }
 *
 * Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
 * The key never reaches the browser.
 */

const MAX_CHARS = 12_000;

const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', gu: 'Gujarati',
  kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', or: 'Odia', ur: 'Urdu', as: 'Assamese',
  sa: 'Sanskrit', ne: 'Nepali',
};

const Body = z.object({
  text: z.string().min(1).max(MAX_CHARS),
  source: z.string().refine((s) => s in LANGUAGE_NAMES, 'unsupported language'),
  style: z.enum(['faithful', 'literary']).default('literary'),
});

const Output = z.object({
  translation: z.string(),
  summary: z.string(),
  themes: z.array(z.string()),
  notes: z.string(),
});

const SYSTEM = `You are a literary translator for LitBridge, a platform that brings regional Indian literature to English readers.
Translate the passage into natural, readable English. Keep culturally specific terms (foods, kinship terms, festivals, honorifics) in transliteration and explain them briefly in "notes" rather than flattening them into English equivalents.
"summary" is two or three sentences for a library listing. "themes" is three to five lowercase single words or short phrases.
If the passage is not in the stated source language, translate it anyway and mention the actual language in "notes".`;

let client: Anthropic | undefined;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: 'Translation service not configured' });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? 'invalid body' });
  const { text, source, style } = parsed.data;

  try {
    client ??= new Anthropic();
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      // If a safety classifier declines, the API re-runs the request on its recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: betaZodOutputFormat(Output) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Source language: ${LANGUAGE_NAMES[source]}\nStyle: ${
            style === 'faithful' ? 'stay close to the original sentence structure' : 'fluent literary English'
          }\n\n<passage>\n${text}\n</passage>`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') return json(422, { error: 'The model declined to translate this passage.' });
    if (!response.parsed_output) return json(502, { error: 'Could not parse model output' });
    return json(200, response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json(429, { error: 'Rate limited, try again shortly' });
    if (error instanceof Anthropic.AuthenticationError) return json(503, { error: 'Translation service misconfigured' });
    if (error instanceof Anthropic.APIError) return json(502, { error: `Upstream error ${error.status}` });
    throw error;
  }
}
