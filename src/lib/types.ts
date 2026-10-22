export type LanguageCode =
  | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'ur' | 'as' | 'sa' | 'ne';

export interface Language {
  code: LanguageCode;
  name: string;
  native: string;
  script: ScriptName;
  speakersMillions: number;
  region: string;
}

export type ScriptName =
  | 'Devanagari' | 'Bengali' | 'Gurmukhi' | 'Gujarati' | 'Oriya'
  | 'Tamil' | 'Telugu' | 'Kannada' | 'Malayalam' | 'Arabic' | 'Latin';

export type Genre =
  | 'Folk Tale' | 'Short Story' | 'Fable' | 'Poetry' | 'Legend' | 'Novel Excerpt' | 'Moral Story';

export interface Contributor {
  id: string;
  name: string;
  role: 'author' | 'translator' | 'narrator' | 'curator';
  languages: LanguageCode[];
  bio: string;
  lifespan?: string;
}

export interface Work {
  id: string;
  title: string;
  originalTitle: string;
  authorId: string;
  translatorId: string;
  language: LanguageCode;
  region: string;
  genre: Genre;
  themes: string[];
  era: string;
  /** One-paragraph English summary. */
  summary: string;
  /** English retelling, paragraphs separated by blank lines. */
  body: string;
  /** Rights status shown on the page; everything bundled is public domain or traditional. */
  rights: 'Public domain' | 'Traditional (oral)' | 'Community submission';
  featured?: boolean;
}

export interface SearchHit<T> {
  item: T;
  score: number;
  matched: string[];
}
