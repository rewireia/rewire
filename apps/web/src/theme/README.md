# theme

The visual language of the product, after the art direction: a cool light page, deep blue and
brass, cards with soft shadows and navy panels for what matters.

- `tokens.css` — colours, type families, radii, shadows and measures as CSS custom properties,
  light and dark. The dark palette applies when the system asks for it, unless the person chose a
  theme; a navy panel or the cover photograph reads the dark values whatever the theme.
- `base.css` — element defaults built only from the tokens, the `navy` panel, focus ring, reduced
  motion and print.
- `fonts.ts` — the self-hosted typefaces.
- `typefaces.ts` — the type families for what draws on a canvas: AG Charts and AG Studio's charts.
- `grid-theme.ts` — the AG Grid theme, made from the same tokens: rows pinned at the foot are set
  apart as totals. A table laid out to fit its rows is at least one row tall, so a short one ends
  with its last row and an empty one has room to say why.
