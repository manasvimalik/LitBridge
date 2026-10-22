/**
 * Voice catalogue, chosen from the ElevenLabs Voice Library (Indian English).
 * `owner` is the public owner id needed to add a shared voice to the account.
 *
 * Narrators are the selectable "storyteller" voices; character voices are
 * matched to cast members by archetype in the director script's descriptions,
 * or pinned per work in WORK_CASTING.
 */

export interface VoiceSpec {
  id: string;
  name: string;
  owner?: string;
  note: string;
}

export const NARRATORS: Record<string, VoiceSpec> = {
  ranbir: { id: '9PvnT6XRzlljoaDG6Knu', name: 'Ranbir', note: 'Warm, deep, friendly male storyteller' },
  riya: { id: 'vYENaCJHl4vFKNDYPr8y', name: 'Riya', note: 'Clear, confident female narrator' },
  jeevan: { id: 'mCQMfsqGDT6IDkEKR20a', name: 'Jeevan', note: 'Expressive, theatrical male narrator' },
};

export const CHARACTER_VOICES: Record<string, VoiceSpec> = {
  'young-girl': { id: 'Jr72SE8p9OcJmr8hyX0D', name: 'Chutki', note: 'Giggly five-year-old girl' },
  'young-boy': { id: 'S7IsvAvEoDfui6GSZK3A', name: 'Omar J', note: 'Young, innocent boy' },
  'old-man': { id: 'LrnwgcdTLxc99sutUxGU', name: 'Shiv', note: 'Mature, deep older man' },
  'old-woman': { id: '0m9IEyVwDrXpg93kwWrc', name: 'Maya J', note: 'Warm older storyteller woman' },
  'man': { id: '1GvuAC53XEPduXVWI2zk', name: 'Ramesh', note: 'Deep, steady adult man' },
  'woman': { id: 'kL06KYMvPY56NluIQ72m', name: 'Varsha', note: 'Warm, clear adult woman' },
  'villain': { id: 'tTZ0TVc9Q1bbWngiduLK', name: 'Rudra', note: 'Dark, mysterious male' },
};

/** Per-work overrides: cast id → character voice key. */
export const WORK_CASTING: Record<string, Record<string, keyof typeof CHARACTER_VOICES>> = {
  kabuliwala: { mini: 'young-girl', rahamat: 'old-man', father: 'man' },
  idgah: { hamid: 'young-boy', amina: 'old-woman' },
  'akbar-birbal-for-good': { akbar: 'man', birbal: 'old-man' },
};

/** Fallback casting from the director's free-text description. */
export function archetypeFor(description: string): keyof typeof CHARACTER_VOICES {
  const d = description.toLowerCase();
  const female = /\b(girl|woman|mother|grandmother|daughter|queen|wife|she|her|female|sparrow|cow)\b/.test(d);
  const child = /\b(child|girl|boy|kid|young|little|son|daughter|calf)\b/.test(d) && !/\b(young (man|woman))\b/.test(d);
  const old = /\b(old|elderly|grand(mother|father)|sage|aged)\b/.test(d);
  if (/\b(demon|villain|rakkhoshi|tiger|crocodile|wicked|stepmother)\b/.test(d)) return 'villain';
  if (child) return female ? 'young-girl' : 'young-boy';
  if (old) return female ? 'old-woman' : 'old-man';
  return female ? 'woman' : 'man';
}
