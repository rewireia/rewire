import type {
  LinkBasis,
  OccupationDetail,
  OccupationMatch,
  UnitGroupLink,
} from '@rewire/contracts';
import type { RegionalOccupation } from '@rewire/data';
import { resolveUnitGroup, type Engine, type OccupationMatch as EngineMatch } from '@rewire/engine';

/** A unit group as the API answers it, with its title when the ILO has scored it. */
function linkOf(engine: Engine, isco08: string, basis: LinkBasis): UnitGroupLink {
  const profile = engine.exposureProfile(isco08);
  return { isco08, title: profile?.title ?? null, basis, scored: profile !== undefined };
}

/** Shapes a match of the engine as the API answers it, with the titles of its unit groups. */
export function presentMatch(engine: Engine, match: EngineMatch): OccupationMatch {
  const { occupation, matchedTitle, unitGroup } = match;
  return {
    occupation: {
      code: occupation.code,
      title: occupation.title,
      description: occupation.description ?? null,
    },
    matchedTitle: {
      text: matchedTitle.text,
      language: matchedTitle.language,
      qualifier: matchedTitle.qualifier ?? null,
      official: matchedTitle.official,
    },
    score: Math.min(1, match.score),
    strength: match.strength,
    unitGroup: unitGroup === undefined ? null : linkOf(engine, unitGroup.isco08, unitGroup.basis),
    alternatives: (unitGroup?.alternatives ?? []).map((other) =>
      linkOf(engine, other.isco08, other.basis),
    ),
  };
}

/**
 * Every unit group an occupation can be read through: its own links and the groups its
 * job titles are coded to.
 */
export function unitGroupsOf(occupation: RegionalOccupation): ReadonlySet<string> {
  return new Set([
    ...occupation.iscoLinks.map((link) => link.isco08),
    ...occupation.titles.flatMap((title) => (title.isco08 === undefined ? [] : [title.isco08])),
  ]);
}

/**
 * An occupation with the unit group to read it through. When the person arrived with the
 * group of a job title, that group is proposed; otherwise the occupation's own first link.
 * Returns `undefined` for a group the occupation has nothing to do with.
 */
export function presentDetail(
  engine: Engine,
  occupation: RegionalOccupation,
  isco08: string | undefined,
): OccupationDetail | undefined {
  if (isco08 !== undefined && !unitGroupsOf(occupation).has(isco08)) {
    return undefined;
  }
  const titleCarriesGroup = occupation.titles.some((title) => title.isco08 === isco08);
  const unitGroup = resolveUnitGroup(occupation, titleCarriesGroup ? { isco08 } : {});
  const chosen =
    isco08 !== undefined && !titleCarriesGroup
      ? occupation.iscoLinks.find((link) => link.isco08 === isco08)
      : undefined;
  const proposed = chosen ?? unitGroup;
  return {
    occupation: {
      code: occupation.code,
      title: occupation.title,
      description: occupation.description ?? null,
    },
    unitGroup: proposed === undefined ? null : linkOf(engine, proposed.isco08, proposed.basis),
    alternatives: occupation.iscoLinks
      .filter((link) => link.isco08 !== proposed?.isco08)
      .map((link) => linkOf(engine, link.isco08, link.basis)),
  };
}
