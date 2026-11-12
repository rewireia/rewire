/** English messages of the data story of a region, at the top of the Explore page. */
export const insightsEn = {
  'insights.regions': 'Region of the data',
  'insights.eyebrow': '01 / The region in data',
  'insights.title.eu': 'The European Union in data',
  'insights.title.us': 'The United States in data',
  'insights.title.uk': 'The United Kingdom in data',
  'insights.lede':
    'What the ILO index of exposure to generative AI says about the work of this region, weighted by how many people do each job. Exposure is the technical potential of the tasks, not a forecast of job losses.',

  'insights.counts.people': 'people in work',
  'insights.counts.jobs': 'jobs',
  'insights.figure.mean.label': 'Exposure of the average worker',
  'insights.figure.mean.body':
    'The mean task score of the occupations, out of 100, weighted by the {counts} in each.',
  'insights.figure.medium.label': 'In occupations scoring 50 or more',
  'insights.figure.medium.body':
    'Share of {counts} in occupations whose mean task score is 50 out of 100 or more.',
  'insights.figure.medium.noHigh': 'No occupation averages 75 or more.',
  'insights.figure.counted.label.people': 'People in work counted',
  'insights.figure.counted.label.jobs': 'Jobs counted',
  'insights.figure.counted.body':
    '{matched} of {total} are in an occupation the ILO scores; the shares on this page cover them.',

  'insights.level.isco-2-digit':
    'Published by ISCO-08 sub-major group (two digits): each group is read with the mean score of the occupations inside it.',
  'insights.level.isco-1-digit':
    'Published by ISCO-08 major group (one digit): each point is a whole major group.',
  'insights.level.regional-occupation':
    'Published for each occupation of the regional classification, read through the ISCO-08 group it is linked to.',

  'insights.bands.title': '{share} of {counts} are in occupations of low or very low exposure',
  'insights.bands.caption':
    'Share of {counts} by the band of their occupation’s mean task score, out of 100: very low below 25, low from 25, medium from 50, high from 75.',
  'insights.bands.axis': 'Share of {counts} (%)',
  'insights.bands.row': '{band}: {share} ({employed}, {groups} groups)',

  'insights.groups.title': 'The most exposed major group is {group}, at {points} out of 100',
  'insights.groups.caption':
    'Mean task score of the occupations in each ISCO-08 major group, out of 100. It is the ILO index itself, the same in every region.',
  'insights.groups.axis': 'Mean task score (0–100)',
  'insights.groups.row': '{group}: {points} out of 100',

  'insights.major.1': 'Managers',
  'insights.major.1.short': 'Managers',
  'insights.major.2': 'Professionals',
  'insights.major.2.short': 'Professionals',
  'insights.major.3': 'Technicians and associate professionals',
  'insights.major.3.short': 'Technicians',
  'insights.major.4': 'Clerical support workers',
  'insights.major.4.short': 'Clerical support',
  'insights.major.5': 'Service and sales workers',
  'insights.major.5.short': 'Service and sales',
  'insights.major.6': 'Skilled agricultural, forestry and fishery workers',
  'insights.major.6.short': 'Agriculture',
  'insights.major.7': 'Craft and related trades workers',
  'insights.major.7.short': 'Crafts and trades',
  'insights.major.8': 'Plant and machine operators, and assemblers',
  'insights.major.8.short': 'Machine operators',
  'insights.major.9': 'Elementary occupations',
  'insights.major.9.short': 'Elementary',

  'insights.grid.title': 'Where the region works, and how exposed that work is',
  'insights.grid.caption':
    'Each major group with its mean score and its share of the region’s {counts}. An occupation linked to groups of different major groups is left out of these shares.',
  'insights.grid.label': 'Major groups, their exposure and their share of employment',
  'insights.grid.col.group': 'Major group',
  'insights.grid.col.exposure': 'Exposure',
  'insights.grid.col.employed': 'Share of employment',
  'insights.grid.col.share': 'Share',
  'insights.grid.col.score': 'Score',
  'insights.grid.notPublished': 'Not told apart',

  'insights.pay.title.higher': 'Better-paid occupations score higher',
  'insights.pay.title.lower': 'Better-paid occupations score lower',
  'insights.pay.title.equal': 'Pay and exposure do not move together',
  'insights.pay.body':
    'Above the median pay of {median}, the mean score is {above} out of 100; at or below it, {below}.',
  'insights.pay.measure.median-annual': 'median annual pay',
  'insights.pay.measure.mean-monthly': 'mean monthly earnings',
  'insights.pay.caption':
    'Each point is an occupation or a group: its {measure} and its mean task score.',
  'insights.pay.axis.score': 'Mean task score (0–100)',
  'insights.pay.axis.pay': 'Pay ({currency})',
  'insights.pay.axis.payLog': 'Pay ({currency}, log scale)',

  'insights.extremes.title': 'The ends of the index',
  'insights.extremes.most': 'Most exposed occupations',
  'insights.extremes.least': 'Least exposed occupations',
  'insights.extremes.caption':
    'ISCO-08 unit groups of the ILO index, the same everywhere. Mean task score out of 100.',

  'insights.yourself.eyebrow': '02 / Explore it yourself',
  'insights.yourself.title': 'Explore it yourself',
  'insights.yourself.lede':
    'All 427 occupation groups of the ILO index: filter, sort and open any report, or analyse them in a dashboard.',
} as const;
