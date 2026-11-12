import type { IscoLink, IscoLinkBasis, JobTitle, RegionalOccupation } from '@rewire/data';

/**
 * The ISCO-08 unit group proposed for an occupation, and why.
 *
 * `job-title` means the source codes the matched title itself, which is more precise than
 * any link of the occupation it belongs to.
 */
export interface UnitGroupResolution {
  readonly isco08: string;
  readonly basis: IscoLinkBasis | 'job-title';
  /** The other unit groups the occupation is linked to, strongest first. */
  readonly alternatives: readonly IscoLink[];
}

/**
 * Chooses the unit group for an occupation reached through one of its titles.
 *
 * Returns `undefined` when the occupation has no bridge to ISCO-08: the product then says
 * so instead of guessing.
 */
export function resolveUnitGroup(
  occupation: RegionalOccupation,
  title?: Pick<JobTitle, 'isco08'>,
): UnitGroupResolution | undefined {
  if (title?.isco08 !== undefined) {
    return {
      isco08: title.isco08,
      basis: 'job-title',
      alternatives: occupation.iscoLinks.filter((link) => link.isco08 !== title.isco08),
    };
  }
  const [proposed, ...alternatives] = occupation.iscoLinks;
  return proposed === undefined
    ? undefined
    : { isco08: proposed.isco08, basis: proposed.basis, alternatives };
}
