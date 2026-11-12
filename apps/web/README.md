# @rewire/web

The Rewire web application: React 19, React Router, TanStack Query, AG Grid, AG Charts, AG Studio
and Bryntum Gantt, built with Vite.
It talks to the API only through `/api` and knows only `@rewire/contracts`.

```
index.html        the page shell
vite.config.ts    dev server on 127.0.0.1:5200, `/api` proxied to API_ORIGIN (default :8200), the
                  root `.env` for `VITE_*` variables, chunks and AG Studio's own copies
public/           favicon
src/              the application (see src/README.md)
tests/            unit tests (see tests/README.md)
```

## Run

```sh
npm run dev -w @rewire/api                       # API on 127.0.0.1:8200
npm run dev -w @rewire/web                       # web on 127.0.0.1:5200
API_ORIGIN=http://127.0.0.1:8210 npm run dev -w @rewire/web   # another API
```

## Screens

- `/` — the photograph and the name; on a first visit, the opening, individual or business choice, then region.
- `/start` — the question, the job title search, the region and the evidence behind it.
- `/:region/confirm` — the occupation found and the tasks of its international group.
- `/:region/report/:isco08` — the exposure report, weighted by the person's week. Its tasks are a
  list or an AG Grid table where "Your time" is edited in place; both change the same week.
- `/:region/plan/:isco08` — the learning plan: the tasks it is about, then three questions (budget,
  starting point, weekly time) after which Rex proposes three courses at the seller's fixed prices,
  paid from the wallet or with PayPal.
- `/courses` — the course catalogue of the region, with Rex to search it and filters to browse it.
- `/cart` — the courses chosen in the catalogue, paid for in one PayPal Sandbox order.
- `/:region/courses/:courseId` — a course of the demonstration catalogue, paid with PayPal or by the
  employer with a PayPal invoice.
- `/:region/sandbox-access` — the PayPal Sandbox buyer's details in a tab of their own, usable
  while PayPal covers the checkout tab; no payment starts there.
- `/learn/:courseId` — lessons, practice on the person's own tasks, quiz and certificate.
- `/certificates/:id` — a certificate anyone can verify, laid out to print.
- `/dashboard` — the learner’s occupation, wallet, courses, the roadmap with "Your plan in time" on
  a Bryntum Gantt chart, payments and calendar.
- `/business` — demo course pricing rules and sales from the same ledger.
- `/explore` — every occupation the ILO scores, in a table or, from 1,024 px, in "Analyse": an AG
  Studio dashboard of two pages, filtered by a click, with "Occupation in focus" (a widget of
  Rewire's own), a right-click drill-through, its layout editable with undo and kept in this
  browser, and, when the server has a model, Rewire's analyst, which explains and changes it.
- `/what-is-rewire` — what Rewire is, the journey, method, limits, sources, payments, the AI guide
  and privacy (`/how-it-works` redirects here).
- `/what-is-ai` — a plain guide to generative AI.
- `/library` — public readings about AI and work.

The header opens the menu, and changes the language and the theme; the menu holds the pages and,
at its foot, the region and the theme. When the server has a model, "Ask the guide" in the menu
opens the AI guide in a side panel.

The interface is in English and Spanish, in a light and a dark theme. Styles are CSS Modules
reading the custom properties of `src/theme/tokens.css`.

## Build

`vite build` splits the libraries into chunks of their own: `react` (with the router), `data` (Zod
and TanStack Query), `ag-grid`, `ag-charts`, `ag-studio` and `bryntum`. AG Grid and AG Charts load
only with the explorer, the task table of the report, the dashboard and "Analyse"; Bryntum Gantt only
with "Your plan in time", itself loaded only in the dashboard's roadmap; AG Studio and the Enterprise packages only
with "Analyse". AG Studio shares the open AG Grid and AG Charts packages with the other pages, which
makes `ag-grid` 1,032 kB (291 kB compressed) and `ag-charts` 1,442 kB (433 kB) instead of 902 kB and
1,089 kB; `ag-studio` weighs 4,224 kB (1,172 kB compressed). Every chunk of the first page is under
500 kB. The warning limit is raised to 4,300 kB for AG Studio.

`VITE_AG_STUDIO_LICENCE_KEY`, from the root `.env`, is AG Grid's licence key for AG Studio. It is
optional: without it "Analyse" runs as AG Grid's trial (see the Licence section of the root README).
