import type { Language, LanguageCode } from '../lib/types';

/** Speaker counts are first-language speakers from the 2011 Census of India (Nepali: India only). */
export const LANGUAGES: Language[] = [
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', script: 'Devanagari', speakersMillions: 528, region: 'North India' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', script: 'Bengali', speakersMillions: 97, region: 'East India' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', script: 'Devanagari', speakersMillions: 83, region: 'West India' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', script: 'Telugu', speakersMillions: 81, region: 'South India' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'Tamil', speakersMillions: 69, region: 'South India' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati', speakersMillions: 55, region: 'West India' },
  { code: 'ur', name: 'Urdu', native: 'اردو', script: 'Arabic', speakersMillions: 51, region: 'North India' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada', speakersMillions: 44, region: 'South India' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'Oriya', speakersMillions: 38, region: 'East India' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam', speakersMillions: 35, region: 'South India' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', speakersMillions: 33, region: 'North India' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', script: 'Bengali', speakersMillions: 15, region: 'Northeast India' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', script: 'Devanagari', speakersMillions: 2.9, region: 'Northeast India' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', script: 'Devanagari', speakersMillions: 0.02, region: 'Pan-Indian' },
];

export const LANGUAGE_BY_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.code, l])) as Record<LanguageCode, Language>;

export const languageName = (code: LanguageCode) => LANGUAGE_BY_CODE[code]?.name ?? code;
