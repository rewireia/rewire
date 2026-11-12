import type { EmploymentFigure } from '@rewire/contracts';
import type { BundleManifest } from '@rewire/data';
import type { LabourFigure } from '@rewire/engine';

/** The public details of a source, as every figure of the API carries them. */
type FigureSource = EmploymentFigure['source'];

/** Finds the public details of a source by its id in the bundle manifest. */
export type SourceLookup = (id: string) => FigureSource;

export function createSourceLookup(manifest: BundleManifest): SourceLookup {
  const sources = new Map(manifest.sources.map((source) => [source.id, source]));
  return (id) => {
    const source = sources.get(id);
    if (source === undefined) {
      throw new Error(`the bundle manifest has no source ${id}`);
    }
    return { id: source.id, title: source.title, publisher: source.publisher, url: source.url };
  };
}

/** The fields every labour figure shares, shaped as the API answers them. */
export function presentFigure(figure: LabourFigure, sourceOf: SourceLookup) {
  return {
    value: figure.value,
    level: figure.level,
    period: figure.period,
    population: figure.population,
    groupCode: figure.groupCode,
    groupTitle: figure.groupTitle ?? null,
    source: sourceOf(figure.source),
  };
}
