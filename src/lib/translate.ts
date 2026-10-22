import { splitSentences } from './text';
import type { LanguageCode } from './types';

/**
 * Translation providers behind one interface, tried in order:
 *
 * 1. `claude` — the `/api/translate` Vercel function (Claude, literary quality,
 *    also returns a summary and themes). Available when the server has
 *    ANTHROPIC_API_KEY set.
 * 2. `mymemory` — the free MyMemory API, called directly from the browser.
 *    Sentence-chunked to respect its 500-byte request limit.
 *
 * The UI shows which provider produced each result.
 */

export interface TranslationResult {
  provider: 'claude' | 'mymemory';
  translation: string;
  summary?: string;
  themes?: string[];
  notes?: string;
}

export interface TranslateRequest {
  text: string;
  source: LanguageCode;
  style?: 'faithful' | 'literary';
}

export class TranslationError extends Error {}

const MYMEMORY_LIMIT = 450;

/** Pack sentences into chunks no longer than `limit` UTF-8 bytes. */
export function chunkForLimit(text: string, limit = MYMEMORY_LIMIT): string[] {
  const enc = new TextEncoder();
  const chunks: string[] = [];
  let cur = '';
  for (const s of splitSentences(text)) {
    const candidate = cur ? `${cur} ${s}` : s;
    if (enc.encode(candidate).length <= limit) {
      cur = candidate;
      continue;
    }
    if (cur) chunks.push(cur);
    // A single over-long sentence: hard-split on word boundaries.
    if (enc.encode(s).length > limit) {
      let part = '';
      for (const w of s.split(/\s+/)) {
        const next = part ? `${part} ${w}` : w;
        if (enc.encode(next).length > limit && part) {
          chunks.push(part);
          part = w;
        } else part = next;
      }
      cur = part;
    } else cur = s;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function viaClaude(req: TranslateRequest, signal?: AbortSignal): Promise<TranslationResult> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) throw new TranslationError(`Claude endpoint returned ${res.status}`);
  const data = await res.json();
  return { provider: 'claude', ...data };
}

async function viaMyMemory(req: TranslateRequest, signal?: AbortSignal): Promise<TranslationResult> {
  const out: string[] = [];
  for (const chunk of chunkForLimit(req.text)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${req.source}|en`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new TranslationError(`MyMemory returned ${res.status}`);
    const data = await res.json();
    if (data.responseStatus !== 200) throw new TranslationError(data.responseDetails || 'MyMemory error');
    out.push(data.responseData.translatedText);
  }
  return { provider: 'mymemory', translation: out.join(' ') };
}

export async function translate(
  req: TranslateRequest,
  opts: { signal?: AbortSignal; onFallback?: (reason: string) => void } = {},
): Promise<TranslationResult> {
  try {
    return await viaClaude(req, opts.signal);
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    opts.onFallback?.(e instanceof Error ? e.message : String(e));
    return viaMyMemory(req, opts.signal);
  }
}
