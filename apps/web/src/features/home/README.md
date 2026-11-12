# home

The opening, region and role selection, authenticated welcome and conversational Start.

- `HomePage.tsx` — `/`: the photograph and the name; the opening on the first visit of a session,
  then region, individual or business, server-checked demo access and a welcome with an explicit next action.
- `Cover.tsx` — one full-window photograph and centered brand, shared by the opening and home;
  the introductory line and brand fade away, with no new crop or layout.
- `RegionGate.tsx` — "Choose your region", a compact, fading dialog showing only the three region names.
- `RoleChoice.tsx` — the individual and business paths over the same photograph.
- `intro/` — the opening (see its README).
- `WelcomeHome.tsx` — a welcome and Start action fading in over 1.6 seconds on the unchanged home photograph.
- `DemoEntry.tsx` — fills public demo credentials once, validates server access and restores account-bound state. Success stays visible for 1.2 seconds before a 0.9-second fade into the welcome; reduced motion skips these delays.
- `StartPage.tsx` — `/start`: the conversational work, occupation and task journey.
- `RegionFacts.tsx` — what the classification of the chosen region holds, from the API, shown only on the method page.
