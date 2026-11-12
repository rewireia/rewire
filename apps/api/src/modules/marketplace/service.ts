import { roadmap, saveRoadmap } from './roadmap.ts';
import type { CourseSearchInput, MarketCourse, Region } from '@rewire/contracts';
import { recommendCourses } from './recommendations.ts';
import type { Engine } from '@rewire/engine';
import type { Clock } from '../../platform/clock.ts';
import type { Database } from '../../platform/database.ts';
import { walletBalance } from '../wallet/balance.ts';
import type { GuideModel } from '../guide/model.ts';
import { catalogue, setTerms } from './catalogue.ts';
import { sales } from './sales.ts';
import { eligibleCourses } from './training.ts';

interface Dependencies {
  database: Database;
  clock: Clock;
  engine: Engine;
  model: GuideModel | undefined;
}

function wallet({ database }: Dependencies, learnerId: string, region: Region) {
  return walletBalance(database, learnerId, region);
}
export function createMarketplace(
  database: Database,
  clock: Clock,
  engine: Engine,
  model?: GuideModel,
) {
  const deps = { database, clock, engine, model };
  return {
    roadmap: (learnerId: string, region: Region, language: string) =>
      roadmap(database, learnerId, region, language, clock()),
    saveRoadmap: (learnerId: string, region: Region, ids: string[]) =>
      saveRoadmap(database, learnerId, region, ids, clock()),
    catalogue: (region: Region) => catalogue(database, region, clock()),
    wallet: (learnerId: string, region: Region) => wallet(deps, learnerId, region),
    setTerms: (terms: MarketCourse) => setTerms(database, terms),
    async recommendations(learnerId: string, input: CourseSearchInput) {
      const eligible = await eligibleCourses(
        database,
        engine,
        learnerId,
        input.region,
        input.isco08,
        clock(),
      );
      const budget =
        input.budgetMinor ?? (await wallet(deps, learnerId, input.region)).availableMinor;
      return recommendCourses(model, eligible.terms, budget, eligible.occupation, input);
    },
    sales: () => sales(database),
  };
}
export type Marketplace = ReturnType<typeof createMarketplace>;
