const GOALS = [
  ['Curate and translate', 'Regional works across multiple Indian languages, rendered in English that keeps their cultural texture.'],
  ['Make it audible', 'Every story becomes a narrated episode, for listeners who prefer or need audio.'],
  ['Make it findable', 'A searchable library with filters by language, genre, theme and region.'],
  ['Widen the audience', "India's diverse literary voices, for readers abroad and for Indians who read a different language from the story's."],
  ['Credit the people', 'Translators and regional authors are named on every page, with profiles of their work.'],
  ['Build it together', 'Open submissions and community voting decide what joins the library.'],
];

const FAQ = [
  ['Is the content copyrighted?', 'Everything bundled is in the public domain in India (the author died more than 60 years ago) or is a traditional oral tale. The English retellings are original to LitBridge. Community submissions must confirm their rights status.'],
  ['How does the narration work?', 'Each story becomes an episode: an introduction, a summary, the story in roughly three chapters, and a reflection. Each sentence is a cue, and your browser speaks them one by one with its speech engine, preferring an Indian English voice. You can also download the timed transcript as WebVTT.'],
  ['How are translations made?', 'The studio sends text to a serverless function that asks Claude for a literary translation, a short summary, themes and cultural notes, returned as a structured response. If that service is not configured, it falls back to the free MyMemory engine.'],
  ['How does search work?', 'A client-side inverted index ranks results with BM25 across weighted fields: title, author, themes, metadata, summary and body. Query terms are expanded with prefix and edit-distance matches, so "birbaal" still finds Birbal.'],
  ['How are summaries generated without AI?', 'TextRank: sentences are compared with TF-IDF cosine similarity, PageRank finds the most central ones, and those are kept in their original order. It works on Devanagari, Bengali and Tamil text as well as English.'],
  ['Where are my submissions stored?', 'In your browser for now, so they are not shared between devices. A shared database is the next milestone.'],
];

export default function About() {
  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-bold">About LitBridge</h1>
      <p className="mt-3 max-w-3xl text-lg leading-8">
        LitBridge is a multilingual platform that translates and summarises regional Indian literature into English, and produces AI-narrated podcasts so these stories can reach a wider audience. India has 22 scheduled languages and hundreds more. Most of their stories have never been heard outside the language they were told in.
      </p>

      <h2 className="mt-12 text-2xl font-bold">What we're building</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GOALS.map(([t, b]) => (
          <div key={t} className="card p-5"><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm muted">{b}</p></div>
        ))}
      </div>

      <h2 id="faq" className="mt-12 text-2xl font-bold">FAQ</h2>
      <div className="mt-4 space-y-3">
        {FAQ.map(([q, a]) => (
          <details key={q} className="card group p-5">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              <span className="mr-2 inline-block text-gold-500 transition group-open:rotate-90">›</span>{q}
            </summary>
            <p className="mt-2 pl-5 text-sm leading-6 muted">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
