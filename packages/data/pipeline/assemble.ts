import { unzipSync } from 'fflate';

import {
  sha256Of,
  type ExposureDataset,
  type LabourContext,
  type Region,
  type RegionalClassification,
  type TaskRationales,
} from '../src/index.ts';

import { downloadFile, downloadPages, downloadQuery, type DownloadOptions } from './download.ts';
import {
  BLS_OEWS,
  EUROSTAT_EARNINGS,
  EUROSTAT_EMPLOYMENT,
  NOMIS_EMPLOYMENT,
  ONS_EARNINGS,
} from './labour-sources.ts';
import { parseCsvRecords } from './readers/csv.ts';
import { readSheetRecords } from './readers/spreadsheet.ts';
import {
  ESCO_OCCUPATIONS,
  ESCO_ONET_CROSSWALK,
  ILO_EXPOSURE,
  ONET_DATABASE,
  ONS_CODING_INDEX,
  type ApiSource,
  type FileSource,
} from './sources.ts';
import { buildUsLabour } from './steps/bls-oews.ts';
import { buildEuClassification } from './steps/esco-classification.ts';
import { buildEuEmployment, buildEuPay } from './steps/eurostat-labour.ts';
import { buildExposure } from './steps/ilo-exposure.ts';
import { buildUkEmployment } from './steps/ons-aps-employment.ts';
import { ASHE_TABLE, buildUkPay } from './steps/ons-ashe-earnings.ts';
import { buildUsClassification } from './steps/onet-classification.ts';
import { buildUkClassification, ONS_SHEETS } from './steps/ons-classification.ts';

/** Everything the bundle is written from. */
export interface BundleContents {
  readonly exposure: ExposureDataset;
  readonly rationales: TaskRationales;
  readonly classifications: Readonly<Record<Region, RegionalClassification>>;
  readonly labour: Readonly<Record<Region, LabourContext>>;
  /** Digest of what was downloaded from each source, by source id. */
  readonly sourceDigests: ReadonlyMap<string, string>;
  /** Facts about the build worth showing to whoever runs it. */
  readonly notes: readonly string[];
}

/** Downloads every source and runs the steps that turn them into the bundle contents. */
export async function assembleBundle(options: DownloadOptions): Promise<BundleContents> {
  const fileOf = (source: FileSource, name: string) => downloadFileNamed(source, name, options);

  const iloWorkbook = await fileOf(ILO_EXPOSURE, 'final-scores.xlsx');
  const { dataset: exposure, rationales } = buildExposure(await readSheetRecords(iloWorkbook));

  const esco = await downloadPages(ESCO_OCCUPATIONS, options);
  const eu = buildEuClassification(esco.pages, ESCO_OCCUPATIONS.expectedTotal);

  const us = buildUsClassification({
    occupations: parseCsvRecords(text(await fileOf(ONET_DATABASE, 'occupation_data.csv'))),
    jobTitles: parseCsvRecords(text(await fileOf(ONET_DATABASE, 'job_titles.csv'))),
    crosswalk: parseCsvRecords(
      text(await fileOf(ESCO_ONET_CROSSWALK, 'esco-onet-crosswalk.csv')),
      'O*NET Id,',
    ),
    iscoByEscoUri: eu.iscoByUri,
  });

  const onsWorkbook = workbookIn(await fileOf(ONS_CODING_INDEX, 'coding-index.zip'), '.xlsx');
  const uk = buildUkClassification({
    index: await readSheetRecords(onsWorkbook, ONS_SHEETS.index),
    framework: await readSheetRecords(onsWorkbook, ONS_SHEETS.framework),
  });

  const labour = await assembleLabour(options);
  return {
    exposure,
    rationales,
    classifications: { eu: eu.classification, us: us.classification, uk },
    labour: labour.contexts,
    sourceDigests: new Map([
      [ILO_EXPOSURE.id, digestOfFiles(ILO_EXPOSURE)],
      [ESCO_OCCUPATIONS.id, digestOfParts(esco.digests)],
      [ONET_DATABASE.id, digestOfFiles(ONET_DATABASE)],
      [ESCO_ONET_CROSSWALK.id, digestOfFiles(ESCO_ONET_CROSSWALK)],
      [ONS_CODING_INDEX.id, digestOfFiles(ONS_CODING_INDEX)],
      ...labour.sourceDigests,
    ]),
    notes: [
      `${us.unresolvedCrosswalkRows} ESCO–O*NET crosswalk rows point outside ESCO ` +
        `${ESCO_OCCUPATIONS.version} unit groups and were left out`,
      `${us.orphanCrosswalkRows} ESCO–O*NET crosswalk rows name an O*NET-SOC code that ` +
        `O*NET ${ONET_DATABASE.version} does not have and were left out`,
    ],
  };
}

/** Downloads the labour sources and runs their steps: employment and pay of each region. */
async function assembleLabour(options: DownloadOptions): Promise<{
  contexts: Record<Region, LabourContext>;
  sourceDigests: [string, string][];
}> {
  const oews = workbookIn(await downloadFileNamed(BLS_OEWS, 'oesm25nat.zip', options), '.xlsx');
  const us = buildUsLabour(await readSheetRecords(oews));

  const aps = await answerOf(NOMIS_EMPLOYMENT, 'employment.csv', options);
  const ashe = workbookIn(
    await downloadFileNamed(ONS_EARNINGS, 'ashe-table-14.zip', options),
    ASHE_TABLE.workbook,
  );
  const ukPay = buildUkPay(
    await readSheetRecords(ashe, ASHE_TABLE.sheet, ASHE_TABLE.headerStartsWith),
  );

  const lfs = await answerOf(EUROSTAT_EMPLOYMENT, 'lfsa_egai2d.json', options);
  const ses = await answerOf(EUROSTAT_EARNINGS, 'earn_ses22_48.json', options);

  return {
    contexts: {
      eu: {
        region: 'eu',
        employment: buildEuEmployment(JSON.parse(text(lfs.bytes)), lfs.minimumRecords),
        pay: buildEuPay(JSON.parse(text(ses.bytes)), ses.minimumRecords),
      },
      us: { region: 'us', employment: us.employment, pay: us.pay },
      uk: {
        region: 'uk',
        employment: buildUkEmployment(parseCsvRecords(text(aps.bytes)), aps.minimumRecords),
        pay: ukPay,
      },
    },
    sourceDigests: [
      [BLS_OEWS.id, digestOfFiles(BLS_OEWS)],
      [NOMIS_EMPLOYMENT.id, aps.sha256],
      [ONS_EARNINGS.id, digestOfFiles(ONS_EARNINGS)],
      [EUROSTAT_EMPLOYMENT.id, lfs.sha256],
      [EUROSTAT_EARNINGS.id, ses.sha256],
    ],
  };
}

function text(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('utf8');
}

function downloadFileNamed(
  source: FileSource,
  name: string,
  options: DownloadOptions,
): Promise<Uint8Array> {
  const file = source.files.find((candidate) => candidate.name === name);
  if (file === undefined) {
    throw new Error(`${source.id} has no file named ${name}`);
  }
  return downloadFile(source, file, options);
}

/** The response to a named query, with the size a complete response must reach. */
async function answerOf(source: ApiSource, name: string, options: DownloadOptions) {
  const query = source.queries.find((candidate) => candidate.name === name);
  if (query === undefined) {
    throw new Error(`${source.id} has no query named ${name}`);
  }
  return { ...(await downloadQuery(source, query, options)), minimumRecords: query.minimumRecords };
}

/** The only workbook inside an archive whose name contains `named`. */
function workbookIn(archive: Uint8Array, named: string): Uint8Array {
  const entries = Object.entries(unzipSync(archive));
  const workbooks = entries.filter(([name]) => name.endsWith('.xlsx') && name.includes(named));
  const [only] = workbooks;
  if (only === undefined || workbooks.length > 1) {
    throw new Error(`the archive holds ${workbooks.length} .xlsx workbooks named "${named}"`);
  }
  return only[1];
}

function digestOfFiles(source: FileSource): string {
  return digestOfParts(source.files.map((file) => file.sha256));
}

/** One part keeps its own digest, so it can be checked by hand; several are digested together. */
function digestOfParts(digests: readonly string[]): string {
  const [only] = digests;
  return digests.length === 1 && only !== undefined
    ? only
    : sha256Of(Buffer.from(digests.join('')));
}
