# studio

The explorer's "Analyse" view: the ILO index as an AG Studio dashboard of two pages, with a widget
and an agent of Rewire's own, loaded only when it is shown, on a screen 1,024 px wide or more.
AG Studio is commercial software of AG Grid Ltd (see the Licence section of the root README).

```
ExploreStudio.tsx     the view: the tools, the drill-through line, the analyst's privacy note, the
                      right-click menu; a licence key from VITE_AG_STUDIO_LICENCE_KEY, if any
StudioTools.tsx       the pages, "Ask the analyst", "Edit layout" with undo and redo, "Reset"
Dashboard.tsx         one opened Studio: data, report, theme, widgets, panels, breakpoints, the
                      drill-through filter and, when the server has a model, the analyst
use-studio-controls.ts  undo and redo, the page shown and the drill-through, through Studio's API
use-saved-report.ts   the report a Studio opens with, every change kept as it happens, and "Reset"
report-store.ts       the saved report in this browser, one per language, safe where storage fails
report.ts             the shipped dashboard of two pages, and the fields it names
registry.ts           Studio's widget types and Rewire's own, for typed reports
studio-data.ts        the two tables, built from the API's list: occupations and their major groups
context-menu.ts       the occupation a right-clicked row is about, and a drill-through in words
responsive.ts         the layout on a narrower canvas, between a 1,024 and a 1,440 px screen
studio-theme.ts       Studio's Theming API fed with the tokens of the theme, light or dark
studio-locale.ts      Studio's own texts a reader meets, in Spanish; the editor stays in English
FigureCell.tsx        the figures of a grid widget in the monospaced face, through Studio's cell renderers
Studio.module.css     the tools above the dashboard and the room it fills
focus/                "Occupation in focus", Rewire's own widget (see its README)
analyst/              Rewire's analyst on Studio's agent framework (see its README)
```

## Rules

- Every value comes from `GET /api/unit-groups`, already validated; the major groups are derived
  from the same list, and "Occupation in focus" reads `GET /api/unit-groups/:isco08`. The levels
  carry the names the table writes.
- "Overview": four key figures, the major group filter, occupations by level, the occupation in
  focus, mean exposure by major group and the most and least exposed occupations. "Groups and
  levels": the levels within each major group, as bars and as a pivot table. The level is a page
  filter on both; clicking a bar, a group or a row filters every other widget.
- Right-clicking a row or a bar offers its occupation's report and a drill-through: Studio's
  inbound filter, which narrows every widget until "Show everything".
- The dashboard opens to read. "Edit layout" lets the reader drag, resize and add widgets, with
  undo and redo; "Ask the analyst" opens the editor with the analyst's panel, the only place Studio
  shows it. Every change, filters included, is kept in `localStorage` under a key of the language;
  nothing goes to the server. "Reset" forgets it and opens the shipped dashboard again.
- A bar's colour cannot be set per bar through Studio's public API, only through the theme's
  palette: single bars are drawn in one colour, and stacked series in the bands and the ink.
