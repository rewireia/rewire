import type { OccupationMatch, Region } from '@rewire/contracts';

/** The confirmation page of an occupation found by the search. */
export function confirmPath(region: Region, match: OccupationMatch): string {
  const params = new URLSearchParams({
    code: match.occupation.code,
    title: match.matchedTitle.text,
  });
  if (match.unitGroup !== null) {
    params.set('isco', match.unitGroup.isco08);
  }
  return `/${region}/confirm?${params}`;
}

/** The report of an international group, read for the occupation the person chose. */
export function reportPath(
  region: Region,
  isco08: string,
  chosen?: { readonly code: string; readonly title: string },
): string {
  const params = chosen === undefined ? '' : `?${new URLSearchParams(chosen)}`;
  return `/${region}/report/${isco08}${params}`;
}
