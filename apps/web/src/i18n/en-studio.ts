/** English messages of the explorer's "Analyse" view, built with AG Studio. */
export const studioEn = {
  'explore.view': 'Show the occupations as',
  'explore.view.table': 'Table',
  'explore.view.analyse': 'Analyse',

  'studio.label': 'The ILO index as a dashboard',
  'studio.lede':
    'Click a bar or a major group to filter every figure. Edit the layout to move, resize or add widgets: it stays in this browser until you reset it.',
  'studio.edit': 'Edit layout',
  'studio.done': 'Done',
  'studio.reset': 'Reset',
  'studio.status.saved': 'Your layout is kept in this browser.',
  'studio.status.reset': 'Back to the dashboard {brand} ships.',

  'studio.table.occupations': 'Occupations',
  'studio.table.occupations.description':
    'The 427 ISCO-08 unit groups of the ILO index of exposure to generative AI (2025), one row each.',
  'studio.table.majorGroups': 'Major groups',
  'studio.table.majorGroups.description': 'The ISCO-08 major groups the occupations belong to.',
  'studio.field.exposure.description':
    'The mean score of the occupation’s tasks, from 0 to 100, as the ILO gives it.',
  'studio.field.highLevel': 'High or very high level',
  'studio.field.levelOrder': 'Level order',

  'studio.kpi.scored': 'Occupations scored',
  'studio.kpi.mean': 'Mean exposure (0-100)',
  'studio.kpi.high': 'At a high or very high level',
  'studio.kpi.tasks': 'Tasks scored',
  'studio.widget.groups': 'Major group',
  'studio.widget.byLevel': 'Occupations by level',
  'studio.widget.byGroup': 'Mean exposure by major group',
  'studio.widget.most': 'Most exposed occupations',
  'studio.widget.least': 'Least exposed occupations',
  'studio.widget.levelsByGroup': 'Levels within each major group',
  'studio.widget.groupTable': 'Occupations by major group and level',

  'studio.page': 'Page of the dashboard',
  'studio.page.overview': 'Overview',
  'studio.page.groups': 'Groups and levels',
  'studio.undo': 'Undo',
  'studio.redo': 'Redo',
  'studio.ask': 'Ask the analyst',
  'studio.drill.showing': 'Drilled through to: {what}.',
  'studio.drill.clear': 'Show everything',
  'studio.menu.report': 'Open the report of this occupation',
  'studio.menu.drill': 'Drill through to this',

  'studio.focus.label': 'Occupation in focus',
  'studio.focus.one': 'The occupation you chose',
  'studio.focus.top': 'The most exposed of {count} occupations',
  'studio.focus.none': 'No occupation matches these filters.',
  'studio.focus.open': 'Open the report',
  'studio.focus.occupation': 'Occupation code',
  'studio.focus.rankBy': 'Ranked by',

  'studio.analyst.name': '{brand} analyst',
  'studio.analyst.starter.groups': 'Which groups are most exposed?',
  'studio.analyst.starter.groups.prompt':
    'Which major groups have the highest mean exposure? Add a chart that shows it.',
  'studio.analyst.starter.why': 'Why do data entry clerks score so high?',
  'studio.analyst.starter.why.prompt':
    'Why do Data Entry Clerks (4132) score so high? Read their tasks and name the most exposed ones.',
  'studio.analyst.starter.clerks': 'Focus on clerical work',
  'studio.analyst.starter.clerks.prompt':
    'Filter the page to clerical support workers and tell me what changes in the key figures.',
} as const;

export type StudioCatalogue = Readonly<Record<keyof typeof studioEn, string>>;
