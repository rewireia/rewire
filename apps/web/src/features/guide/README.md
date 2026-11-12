# guide

Tempo, the plan agent (named "the guide" in code), when the server has a model. It answers from Rewire's data and cannot charge. Its
words hold no figure: every number the person reads is in a card, from the server's data, and the
panel always says that exposure is technical potential, not a prediction about anyone's job.

- `GuideLauncher.tsx` — the side panel, a native modal dialog (the whole screen on a phone),
  mounted once by the frame. It opens when another part of the page asks it something, such as Tempo's
  block on the roadmap.
- `ask-guide.ts` — `askGuide(text)` opens the panel and asks it that
  question, as Tempo's block on the roadmap does.
- `GuidePanel.tsx` — the conversation; each question goes with the region, the occupation in view
  and the language.
- `GuideCards.tsx` — what the guide found, with its numbers: occupations, a report (mean score,
  level and standing, with the source), courses with their prices, the plan in time (its start,
  pace and end) and an order it opened, paid with the same PayPal checkout.
- `use-guide-context.ts` — the region and the occupation in view.
- `GuidePrivacy.tsx`, `privacy.ts` — the small "Privacy" link under every field a person writes
  to the model in, and the sentences the privacy page says about who answers.
