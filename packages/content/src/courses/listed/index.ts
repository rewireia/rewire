import { z } from 'zod';

import {
  catalogueSnapshotSchema,
  curatedCourseSchema,
  type CatalogueSnapshot,
  type CuratedCourse,
  type ListedCourse,
} from '../../schema/listed-course.ts';

import curatedFile from './curated.json' with { type: 'json' };
import microsoftLearnFile from './microsoft-learn.json' with { type: 'json' };
import sepeFile from './sepe.json' with { type: 'json' };

/** Every course of a provider snapshot, with what the snapshot says once for all of them. */
function coursesOf(snapshot: CatalogueSnapshot): ListedCourse[] {
  return snapshot.courses.map((course) => ({
    ...course,
    provider: snapshot.provider,
    providerAccess: snapshot.providerAccess,
    regions: snapshot.regions,
    checkedOn: snapshot.capturedOn,
  }));
}

const SNAPSHOTS: readonly CatalogueSnapshot[] = [microsoftLearnFile, sepeFile].map((file) =>
  catalogueSnapshotSchema.parse(file),
);

/** Real courses chosen by hand from several providers, described in English and Spanish. */
export const CURATED_COURSES: readonly CuratedCourse[] = z
  .array(curatedCourseSchema)
  .parse(curatedFile);

/** Where each provider catalogue was read, on which day, and how it asks to be cited. */
export const LISTED_SOURCES = SNAPSHOTS.map(({ provider, source, citation, capturedOn }) => ({
  provider,
  source,
  citation,
  capturedOn,
}));

/** Every course Rewire lists from its provider: the curated ones first, then the snapshots. */
export const LISTED_COURSES: readonly ListedCourse[] = [
  ...CURATED_COURSES,
  ...SNAPSHOTS.flatMap(coursesOf),
];
