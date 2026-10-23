/**
 * Voice catalogue, chosen from the ElevenLabs Voice Library (Indian English).
 * Library voices are used directly by id; they don't need adding to the account.
 *
 * Narrators are the selectable "storyteller" voices; character voices are
 * matched to cast members by archetype in the director script's descriptions,
 * or pinned per work in WORK_CASTING.
 */

export interface VoiceSpec {
  id: string;
  name: string;
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
  'boy-2': { id: 'nwXBqbMKJWkQdYCbhxqZ', name: 'Benne', note: 'Bright, high-energy young male' },
  'man-2': { id: 'qr9D67rNgxf5xNgv46nx', name: 'Tarun', note: 'Rich, warm, lively adult man' },
  'young-woman': { id: 'L2s8m9SlLFEtvsBA4vSf', name: 'Kiara', note: 'Young adult woman, bright and expressive' },
  'villainess': { id: '6aO1exAR9bDruq155LzQ', name: 'Monika', note: 'Slow, sinister female' },
  'trickster': { id: 'pt0Iailp6NXMdRw1n3c5', name: 'Adik M', note: 'Playful, bouncy cartoon character' },
};

/** Per-work overrides: cast id → character voice key. */
export const WORK_CASTING: Record<string, Record<string, keyof typeof CHARACTER_VOICES>> = {
  kabuliwala: { mini: 'young-girl', rahamat: 'old-man', father: 'man' },
  idgah: { hamid: 'young-boy', amina: 'old-woman', mahmood: 'boy-2' },
  'akbar-birbal-for-good': { akbar: 'man', birbal: 'old-man', priest: 'villain' },
  'farmer-sage-treasure': { ramdin: 'man-2', sage: 'old-man' },
  'shatranj-ke-khiladi': { mirza: 'man', mir: 'man-2' },
  'lalkamal-neelkamal': { neelkamal: 'man', demons: 'villain' },
  tejimola: { tejimola: 'young-girl', stepmother: 'villainess', merchant: 'man' },
  'monkey-crocodile': { monkey: 'boy-2', crocodile: 'man-2', wife: 'villainess' },
  'avvaiyar-jamun': { avvaiyar: 'old-woman', boy: 'young-boy' },
  'tenali-thieves': { tenali: 'man-2', wife: 'woman', thief: 'villain' },
  punyakoti: { punyakoti: 'woman', tiger: 'villain' },
  'chimni-kavla': { chimni: 'woman', kavla: 'trickster' },
  'narsinh-hundi': { narsinh: 'old-man', merchant: 'man-2', shamalsha: 'man' },
  'heer-ranjha': { heer: 'young-woman', ranjha: 'man-2', kaido: 'villain' },
  'mahabali-onam': { mahabali: 'man', vamana: 'young-boy', shukracharya: 'old-man' },
  'dharmapada-konark': { dharmapada: 'young-boy', king: 'villain', artisan: 'man-2' },
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
