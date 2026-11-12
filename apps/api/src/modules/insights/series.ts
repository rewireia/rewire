import type { LabourSeries, RegionalClassification } from '@rewire/data';

/** One code of a labour series, with the scored unit groups it is read through. */
export interface SeriesItem {
  readonly code: string;
  readonly title: string;
  readonly value: number;
  /** Mean of the mean scores of its unit groups. */
  readonly meanScore: number;
  /** The ISCO-08 major group, when all its unit groups share one. */
  readonly majorGroup: string | null;
}

/** What a series needs to know about the unit groups the ILO has scored. */
export interface ScoredUnitGroups {
  readonly scoreOf: ReadonlyMap<string, number>;
  readonly titleOfMajorGroup: ReadonlyMap<string, string>;
}

interface Link {
  readonly title: string;
  readonly unitGroups: readonly string[];
}

/**
 * Reads every code of a series through the scored ISCO-08 unit groups behind it. A code of an
 * ISCO-08 group stands for every unit group inside it; a regional occupation for the unit group
 * the classification proposes for it (for O*NET-SOC, for each occupation its SOC code covers).
 * A code that reaches no scored unit group is left out.
 */
export function readSeries(
  series: LabourSeries,
  classification: RegionalClassification,
  scored: ScoredUnitGroups,
): SeriesItem[] {
  const links =
    series.level === 'regional-occupation'
      ? regionalLinks(classification, scored)
      : groupLinks(series, scored);
  return Object.entries(series.byCode).flatMap(([code, value]) => {
    const link = links.get(code);
    if (link === undefined || link.unitGroups.length === 0) {
      return [];
    }
    return [itemOf(code, value, link, scored)];
  });
}

function itemOf(code: string, value: number, link: Link, scored: ScoredUnitGroups): SeriesItem {
  const scores = link.unitGroups.map((isco08) => scored.scoreOf.get(isco08) ?? 0);
  const majors = new Set(link.unitGroups.map((isco08) => isco08.charAt(0)));
  return {
    code,
    title: link.title,
    value,
    meanScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    majorGroup: majors.size === 1 ? (link.unitGroups[0]?.charAt(0) ?? null) : null,
  };
}

/** ISCO-08 groups: every scored unit group whose code begins with the group's code. */
function groupLinks(series: LabourSeries, scored: ScoredUnitGroups): Map<string, Link> {
  const codes = [...scored.scoreOf.keys()];
  return new Map(
    Object.keys(series.byCode).map((code) => [
      code,
      {
        title: series.titles?.[code] ?? scored.titleOfMajorGroup.get(code) ?? code,
        unitGroups: codes.filter((isco08) => isco08.startsWith(code)),
      },
    ]),
  );
}

/**
 * Regional occupations, keyed as the labour series publishes them: an O*NET-SOC code by its
 * first seven characters (the SOC occupation), any other code as it is.
 */
function regionalLinks(
  classification: RegionalClassification,
  scored: ScoredUnitGroups,
): Map<string, Link> {
  const isOnet = classification.region === 'us';
  const links = new Map<string, { title: string; unitGroups: Set<string> }>();
  for (const occupation of classification.occupations) {
    const key = isOnet ? occupation.code.slice(0, 7) : occupation.code;
    const entry = links.get(key) ?? { title: occupation.title, unitGroups: new Set<string>() };
    if (isOnet && occupation.code === `${key}.00`) {
      entry.title = occupation.title;
    }
    const proposed = occupation.iscoLinks[0]?.isco08;
    if (proposed !== undefined && scored.scoreOf.has(proposed)) {
      entry.unitGroups.add(proposed);
    }
    links.set(key, entry);
  }
  return new Map(
    [...links].map(([key, entry]) => [
      key,
      { title: entry.title, unitGroups: [...entry.unitGroups] },
    ]),
  );
}
