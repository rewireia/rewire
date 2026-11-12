export { createEngine, type Engine, type UnitGroupSummary } from './engine.ts';
export { apportion } from './exposure/apportion.ts';
export { TASK_BANDS, taskBandOf, type TaskBand } from './exposure/bands.ts';
export { personalExposureOf, type PersonalExposure, type TimeShare } from './exposure/personal.ts';
export {
  exposureProfileOf,
  type ExposureProfile,
  type ProfiledTask,
  type ScoreRange,
} from './exposure/profile.ts';
export { standingOf, type Standing } from './exposure/standing.ts';
export {
  occupationLabourOf,
  type EmploymentFigure,
  type OccupationLabour,
  type PayFigure,
} from './labour/context.ts';
export { labourFigureFor, type LabourFigure, type OccupationKeys } from './labour/figure.ts';
export {
  searchOccupations,
  type MatchStrength,
  type OccupationMatch,
  type SearchOptions,
} from './occupation/search.ts';
export { buildTitleIndex, type IndexedTitle, type TitleIndex } from './occupation/title-index.ts';
export { resolveUnitGroup, type UnitGroupResolution } from './occupation/unit-group.ts';
export { fold, singular, tokensOf } from './text/tokens.ts';
