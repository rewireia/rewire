# app

The frame of the application.

- `Providers.tsx` — the query client and the router.
- `router.tsx` — the routes and the page each one shows, and the error page: inside the frame when
  a page fails, on its own when the frame itself does.
- `Layout.tsx`, `Layout.module.css` — the skip link, the header, the page, the minimal footer (credits and sources,
  privacy, copyright) and the guide's panel. Header and footer are left out when printing.
- `SiteHeader.tsx`, `SiteHeader.module.css` — the one header, kept at the top: the menu button on the left, the mark and the
  name in the middle, and role-aware account access, language and theme controls on the right.
- `Drawer.tsx`, `Drawer.module.css` — the eight destinations in a modal dialog (Home, Start,
  Dashboard, What is AI, How it works, Explore, Library, Courses), with role-aware start and
  dashboard links, region and theme controls, and keyboard focus kept inside.
- `access.ts` — the event that reopens sign-in from the header on a protected page.
- `RouteError.tsx`, `RouteError.module.css` — what a page that failed to show says, in the person's language: what happened
  and what to do, with no technical detail.
- `brand.ts` — the name of the product, in one place; the texts read it as `{brand}`.
- `seller.ts` — the name of the one demonstration seller that sells every course of the marketplace.
- `Page.module.css` — the shared page measures: width, sections and small labels.
- `NotFoundPage.tsx` — what an unknown address shows.
- `preferences.ts` — region (and whether the person chose it), journey role, language, theme, chosen occupation and the views the person chose:
  the plan in time (timeline or list) and the explorer (table
  or "Analyse"), kept in `localStorage` behind a small typed store. Where the browser refuses
  storage they live in memory and hold for the visit, the chosen region included.
- `storage.ts` — the one way to `localStorage` and `sessionStorage`: no storage where reaching it
  throws, `null` for a refused read and `false` for a refused write, so a browser that denies
  storage never stops the site.
