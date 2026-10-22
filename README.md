# LitBridge — From Page to Podcast

A multilingual platform that translates and summarises regional Indian literature into English and turns each story into an AI-narrated podcast episode.

- **Library**: 16 public-domain and traditional works across 13 languages (Premchand, Tagore, Waris Shah, Bezbaroa, the Panchatantra, and folk tales from Kerala to Assam), searchable and filterable by language, genre, theme and region.
- **Podcasts**: every story is narrated in chapters with sentence-level highlighting, adjustable speed and voice, and a downloadable WebVTT transcript.
- **Translation studio**: paste text in any Indian script. The studio detects the language, translates it with Claude, summarises it with TextRank, and previews it as an episode.
- **Community curation**: open submissions with rights confirmation, voting, and curator approval. Approved works join the searchable catalogue.
- **Voices**: author and translator profiles that credit the people behind each work.

## Architecture

```
src/
  lib/            framework-free engine (unit-tested)
    script.ts       language detection from Unicode blocks + Devanagari function-word scoring
    search.ts       inverted index, BM25F ranking, prefix + edit-distance expansion, facets
    summarize.ts    TextRank: TF-IDF cosine graph + PageRank power iteration
    podcast.ts      episode builder: chapters → sentence cues with timings
    recommend.ts    content-based recommender (cosine similarity over sparse feature vectors)
    translate.ts    provider chain: Claude (/api/translate) → MyMemory fallback
    text.ts         Unicode tokenizer, danda-aware sentence splitter, OSA edit distance
    store.ts        localStorage-backed hooks with cross-tab sync and in-memory fallback
    useNarrator.ts  Web Speech API driver with generation-guarded cancellation
  data/           catalogue, languages, contributors
  pages/          route components (code-split with React.lazy)
  components/     Player, WorkCard, ScriptBar, Layout
api/
  translate.ts    Vercel serverless function: Claude Opus 5.5, structured JSON output (zod)
```

### Algorithms

| Feature | Technique | Notes |
| --- | --- | --- |
| Language detection | Code-point counting over Unicode script blocks | O(n). Devanagari is ambiguous, so Hindi, Marathi, Nepali and Sanskrit are separated by scoring distinctive function words; Assamese is detected by ৰ/ৱ. |
| Search ranking | BM25 per field with boosts (title 4, author 3, themes 2, …) | Soft-AND: scores are multiplied by coverage², so documents matching more query terms rank higher. |
| Typo tolerance | Optimal string alignment distance, max 1–2 edits | Discounted weight (0.4/d) so exact matches always win. |
| Type-ahead | Binary search over the sorted vocabulary | Prefix matches weighted at 0.6. |
| Facets | Disjunctive within a group, conjunctive across groups | Each group's counts exclude its own filter, as in e-commerce faceting. |
| Summaries | TextRank (Mihalcea & Tarau, 2004) | Weighted PageRank, d = 0.85, converges at ε = 1e-6; works on Indic scripts. |
| Recommendations | Cosine similarity on sparse vectors | Themes, genre, author, language, region and TF-IDF vocabulary. History-based recommendations sum the vectors of works already played. |
| Narration | Sentence-level cue queue | Avoids Chrome's long-utterance cutoff and enables highlighting and seeking. Cue lookup by time is a binary search. |
| Queue ranking | Hacker News "hot" score | (votes + 1) / (age_h + 2)^1.5 |

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the engine
npm run build      # type-check + production build
```

In local dev there is no `/api` route, so the studio uses the MyMemory fallback.

## Deploying to Vercel

1. Import the GitHub repo in Vercel. The framework preset (Vite) and settings come from `vercel.json`.
2. Under **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` to enable Claude translations.
3. Deploy. SPA routes are rewritten to `index.html`; `/api/translate` runs as a serverless function.

## Roadmap

- Shared database for submissions and votes (Supabase or Vercel Postgres) in place of localStorage
- Recorded neural TTS audio files per episode, cached in blob storage
- Original-script text alongside translations, with aligned sentence pairs
- Accounts for translators, with contribution history

## Content and rights

Bundled works are public domain in India (author deceased more than 60 years) or traditional oral tales. All English retellings and summaries are original to LitBridge. Community submissions must confirm their rights status.
