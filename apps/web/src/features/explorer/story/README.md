# explorer/story

The data story of a region, at the top of the Explore page. Every figure comes from
`GET /api/regions/:region/insights`, worked out by the server from the data bundle; the web only
draws it, and says for each one what it measures and how fine the source is. Publishers, editions
and retrieval dates are on the page "Credits and sources" (`/credits`).

```text
story/
├── RegionBand.tsx       EU · US · UK as a band of three segments; it sets the region preference
├── RegionStory.tsx      the story of the region chosen: headlines, charts, table and the ends
├── Headlines.tsx        three figures: the exposure of the average worker as a radial gauge, the
│                        share in occupations scoring 50 or more, and the people or jobs counted
├── BandChart.tsx        employment by the band of its occupation's mean score (AG Charts)
├── GroupChart.tsx       the mean score of each ISCO-08 major group (AG Charts)
├── PayChart.tsx         pay against exposure, one point per occupation or group (AG Charts)
├── GroupGrid.tsx        the major groups in AG Grid: name, exposure and share, each with its bar
├── group-columns.tsx    the three columns of that table and their bar cells
├── Extremes.tsx         the five most and least exposed unit groups, each opening its report
├── StoryFigure.tsx      one chart: its conclusion as title, the figures in words, their level
├── chart-theme.ts       colours from the tokens, fonts, no animation; the horizontal bars
├── major-groups.ts      the names of the nine major groups in the person's language
├── story.ts             the sentences' arithmetic: shares at 50, the top group, the pay halves,
│                        the bands of a score and of the gauge
├── use-story-format.ts  percentages, compact numbers, and money in the language
└── Story.module.css     the band, the cards, the table bars and the rankings
```

## Rules

- Nothing is computed here that the server did not send, beyond sums of its shares for a title.
- A part the region does not publish is not drawn. The level of the source is said: the EU
  publishes employment by two-digit group and pay by one-digit group.
- Exposure is the technical potential of the tasks, not a forecast of job losses.
- Each chart has its title as a conclusion, units on its axes, the same figures in words for
  assistive technology, and no animation.
