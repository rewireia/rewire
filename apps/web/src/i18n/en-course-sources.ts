/** English messages of the sources of the course catalogue. */
export const courseSourcesEn = {
  'courseSources.title': 'Course catalogue',
  'courseSources.lede':
    'The courses {brand} lists are run by their providers; {brand} links to each one and copies none of it. They come from three places.',
  'courseSources.catalogue-api':
    '{provider}: {courses} courses of its public catalogue, read through its catalogue API.',
  'courseSources.hand-checked':
    '{courses} courses of {providers} providers, each checked one by one on its provider’s page.',
  'courseSources.official-export':
    '{provider}: {courses} official training specialties that can be taken online, from its official export, sold in the EU only.',
  'courseSources.date': 'Data of {date}',
} as const;

export type CourseSourcesCatalogue = Readonly<Record<keyof typeof courseSourcesEn, string>>;
