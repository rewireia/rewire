# focus

"Occupation in focus", a widget of Rewire's own, registered with Studio's API for custom widgets
(`createWidgets({ additionalTypes })`) and offered in its widget palette with the brand's mark.

```
focus-widget.ts            the definition: data mapping, configuration form, sizes, AI description
OccupationFocus.tsx        the widget: title, mean score and level, the tasks with their probes,
                           "ILO, 2025" and "Open the report"
OccupationFocus.module.css its styles, from the tokens of the theme
focus-pick.ts              which occupation it shows, from the rows the dashboard's filters leave
```

## Rules

- It reads its rows with `widgetApi.getData`, so it follows the page filters, the drill-through and
  the cross-filters: the only occupation left, or the first by the mapped figure (in the shipped
  dashboard, the most exposed). Its tasks come from `GET /api/unit-groups/:isco08`.
- Tasks are drawn as the report draws them: the probe of each score in the colour of its band, the
  figure beside it in the monospaced face.
