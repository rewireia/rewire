# ai-primer

The page `/what-is-ai`: a plain guide to generative AI for an adult who has just read their
report. Its text lives in the message catalogues (`i18n/en-pages.ts`, `i18n/es-pages.ts`); every
figure in it is one Rewire already shows, inside a sentence that links to its source.

- `AiPrimerPage.tsx` — the page: its reading time, a quiet table of contents beside the text on a
  wide screen, the sections in order and, at the end, the way on to Start, the library and the
  courses.
- `sections.ts` — the sections: anchor, title and paragraphs, and where the diagram goes.
- `primer-text.ts` — a paragraph's `[words](https://…)` links as stretches to draw, and the reading
  time worked out from the words.
- `TokenDiagram.tsx` — one still drawing of how a language model writes one piece at a time,
  coloured with the page's tokens so it reads in both themes.
- `AiPrimer.module.css` — the reading column, the table of contents and the diagram.
