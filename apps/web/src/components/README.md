# components

Shared pieces, each with one job and its own CSS Module.

- `Mark.tsx`, `Mark.module.css` — the folded violet triangle, adapted to the colour scheme,
  with a single drawing animation for the opening.
- `brand-mark.ts` — the three faces shared by the mark and the Studio widget palette.
- `Icon.tsx` — the fine line icons: close, arrow, sun and moon.
- `Button.tsx` — the button and the link styled as one, as pills; `primary` uses the accent, and
  an arrow that steps on under the pointer marks a way forward.
- `LoadingBar.tsx` — the one-shot thinking bar shown while a request is on its way.
- `ErrorNotice.tsx` — what went wrong, said by the problem's code in the person's language, and a
  retry button.
- `task-text.ts` — a task as a sentence on screen, without the semicolon of a list item.
- `task-translations.tsx` — cached occupation-level translations, original text and status note.
- `QueryState.tsx` — loading, error and success of a request, the same on every screen.
- `Probe.tsx` — a task score as a sounding line from 0 to 100, with the model range.
- `BigFigure.tsx` — a large report figure with its label and the sentence that explains it.
- `RadialGauge.tsx`, `RadialGaugeArc.ts` — a half-circle gauge: coloured bands, the reached part
  lit once, a needle and the figure in the centre; a `meter` with its value in words, and an empty
  state instead of a false zero. The arc geometry and the reading are pure functions.
- `Capsule.tsx` — a choice among a few options as a pill whose thumb slides to the chosen one,
  built on native radio buttons.
- `RegionSwitch.tsx` — the region (EU · US · UK), and with it the classification used.
- `Switches.tsx` — the language capsule (EN · ES) and the theme's sun or moon of the header, and
  the theme capsule of the menu (Auto · Light · Dark).
- `Notes.tsx` — the "ILO, 2025" source tag and the note on official English titles.
- `use-debounced-value.ts`, `use-media-query.ts` — small hooks for timing and media queries;
  `NARROW_SCREEN` is the one phone breakpoint of the tables and the report.
- `grid-locale.ts` — AG Grid's own texts (empty table, sort hint, export, select editor) in the
  person's language, through `getLocaleText`.
- `grid-columns.ts` — `shownAs`: a column whose quick filter searches the words the cell shows.
- `grid-keyboard.ts` — Enter on a cell uses its action; Tab goes through the actions of a cell.
- `use-token-color.ts` — resolves colour tokens for canvas drawing (the explorer chart).
- `cx.ts` — joins class names.
