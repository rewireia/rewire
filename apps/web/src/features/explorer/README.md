# explorer

The Explore page, in three parts: a band of regions (EU · US · UK), the data story of the region
chosen (see `story/README.md`), and "Explore it yourself": every occupation the ILO scores, in an
AG Grid table or, on a screen 1,024 px wide or more, in an AG Studio dashboard ("Table |
Analyse", "Analyse" by default; see `studio/README.md`).

- `ExplorerPage.tsx` — the page: the band of regions, the story of the region, then the 427
  international groups with the switch between table and dashboard.
- `use-explore-view.ts` — the view the person chose last, kept in the preferences, or the
  default; a narrower screen gets the table only and never downloads AG Studio.
- `studio/` — the "Analyse" dashboard, loaded only when it is shown.
- `ExplorerView.tsx` — the text filter, the count of the rows shown, as AG Grid counts them after
  both filters, the person's own row and the way to reach it.
- `OccupationGrid.tsx` — the AG Grid table: the title links to the report, and a click on the row
  or Enter on any of its cells opens it too.
- `Histogram.tsx`, `histogram.ts` — the spread of the 427 mean scores, with the person's bar.
- `MajorGroupFilter.tsx` — the major group checkboxes.
- `columns.tsx` — the column definitions, the title link and the probe cell of the exposure
  column; the quick filter searches what the cells show.
- `grid-modules.ts` — the AG Grid modules the table needs, and no others.
