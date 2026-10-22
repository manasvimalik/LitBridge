import type { LanguageCode, ScriptName } from './types';

/**
 * Unicode block ranges for the scripts used by major Indian languages.
 * Detection counts code points per block, which is fast (O(n)), needs no
 * model, and is reliable for any text longer than a few words.
 */
export const SCRIPT_RANGES: { script: ScriptName; from: number; to: number }[] = [
  { script: 'Devanagari', from: 0x0900, to: 0x097f },
  { script: 'Bengali', from: 0x0980, to: 0x09ff },
  { script: 'Gurmukhi', from: 0x0a00, to: 0x0a7f },
  { script: 'Gujarati', from: 0x0a80, to: 0x0aff },
  { script: 'Oriya', from: 0x0b00, to: 0x0b7f },
  { script: 'Tamil', from: 0x0b80, to: 0x0bff },
  { script: 'Telugu', from: 0x0c00, to: 0x0c7f },
  { script: 'Kannada', from: 0x0c80, to: 0x0cff },
  { script: 'Malayalam', from: 0x0d00, to: 0x0d7f },
  { script: 'Arabic', from: 0x0600, to: 0x06ff },
];

const SCRIPT_TO_LANGUAGE: Partial<Record<ScriptName, LanguageCode>> = {
  Bengali: 'bn', Gurmukhi: 'pa', Gujarati: 'gu', Oriya: 'or', Tamil: 'ta',
  Telugu: 'te', Kannada: 'kn', Malayalam: 'ml', Arabic: 'ur',
};

/**
 * Devanagari is shared by Hindi, Marathi, Nepali and Sanskrit, so script alone
 * is ambiguous. We score high-frequency function words that are distinctive
 * to each language and pick the best match.
 */
const DEVANAGARI_MARKERS: Record<'hi' | 'mr' | 'ne' | 'sa', string[]> = {
  hi: ['है', 'और', 'का', 'की', 'के', 'में', 'से', 'था', 'थी', 'नहीं', 'यह', 'वह', 'को', 'पर', 'भी'],
  mr: ['आहे', 'आणि', 'होता', 'होती', 'नाही', 'मध्ये', 'च्या', 'ला', 'तो', 'ती', 'हे', 'त्या', 'केले'],
  ne: ['छ', 'र', 'हो', 'थियो', 'गर्न', 'मा', 'लाई', 'पनि', 'छैन', 'हुन्छ'],
  sa: ['अस्ति', 'च', 'सः', 'तत्', 'इति', 'एव', 'अपि', 'भवति', 'तस्य', 'कृत्वा'],
};

/** Bengali script is also used for Assamese; ৰ and ৱ only occur in Assamese. */
const ASSAMESE_LETTERS = /[ৰৱ]/;

export interface ScriptReport {
  /** Fraction of letters belonging to each script, sorted descending. */
  distribution: { script: ScriptName; share: number; count: number }[];
  dominant: ScriptName | null;
  language: LanguageCode | 'en' | null;
  confidence: number;
}

export function scriptOf(codePoint: number): ScriptName | null {
  for (const r of SCRIPT_RANGES) if (codePoint >= r.from && codePoint <= r.to) return r.script;
  if ((codePoint >= 0x41 && codePoint <= 0x5a) || (codePoint >= 0x61 && codePoint <= 0x7a)) return 'Latin';
  return null;
}

function scoreDevanagari(text: string): { language: LanguageCode; confidence: number } {
  const words = text.split(/[\s।॥,.!?;:"'()\-]+/).filter(Boolean);
  const counts = { hi: 0, mr: 0, ne: 0, sa: 0 } as Record<keyof typeof DEVANAGARI_MARKERS, number>;
  const sets = Object.fromEntries(
    Object.entries(DEVANAGARI_MARKERS).map(([k, v]) => [k, new Set(v)]),
  ) as Record<keyof typeof DEVANAGARI_MARKERS, Set<string>>;
  for (const w of words) {
    for (const lang of Object.keys(sets) as (keyof typeof sets)[]) if (sets[lang].has(w)) counts[lang]++;
    // Marathi genitive suffixes attach to nouns, so check endings too.
    if (/(च्या|चा|ची|चे)$/.test(w) && w.length > 3) counts.mr += 0.5;
  }
  const ranked = (Object.entries(counts) as [LanguageCode, number][]).sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((s, [, c]) => s + c, 0);
  if (total === 0) return { language: 'hi', confidence: 0.5 };
  return { language: ranked[0][0], confidence: ranked[0][1] / total };
}

export function detectScript(text: string): ScriptReport {
  const counts = new Map<ScriptName, number>();
  let letters = 0;
  for (const ch of text) {
    const s = scriptOf(ch.codePointAt(0)!);
    if (!s) continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
    letters++;
  }
  const distribution = [...counts.entries()]
    .map(([script, count]) => ({ script, count, share: letters ? count / letters : 0 }))
    .sort((a, b) => b.count - a.count);
  const top = distribution[0];
  if (!top) return { distribution, dominant: null, language: null, confidence: 0 };

  let language: ScriptReport['language'];
  let confidence = top.share;
  if (top.script === 'Latin') language = 'en';
  else if (top.script === 'Devanagari') {
    const d = scoreDevanagari(text);
    language = d.language;
    confidence = top.share * d.confidence;
  } else if (top.script === 'Bengali' && ASSAMESE_LETTERS.test(text)) language = 'as';
  else language = SCRIPT_TO_LANGUAGE[top.script] ?? null;

  return { distribution, dominant: top.script, language, confidence: Math.round(confidence * 100) / 100 };
}
