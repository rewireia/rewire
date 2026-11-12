import type { SourceRecord } from '../src/index.ts';

import {
  BLS_OEWS,
  EUROSTAT_EARNINGS,
  EUROSTAT_EMPLOYMENT,
  NOMIS_EMPLOYMENT,
  ONS_EARNINGS,
} from './labour-sources.ts';

/** What a source says about itself. The download adds the day and the digest. */
type SourceIdentity = Omit<SourceRecord, 'retrievedOn' | 'sha256'>;

/** A file published at a stable address, pinned by its digest. */
export interface SourceFile {
  readonly name: string;
  readonly url: string;
  readonly sha256: string;
}

export interface FileSource extends SourceIdentity {
  readonly kind: 'files';
  readonly files: readonly SourceFile[];
}

/** A collection served page by page. It cannot be pinned by digest, so its size is. */
export interface PagedSource extends SourceIdentity {
  readonly kind: 'pages';
  readonly pageSize: number;
  readonly expectedTotal: number;
  /** Address of a page, counted from zero. */
  readonly pageUrl: (page: number) => string;
}

/** One request to a statistics API, for a fixed period. */
export interface ApiQuery {
  readonly name: string;
  readonly url: string;
  /** Fewest records a complete response holds; fewer means the API returned something else. */
  readonly minimumRecords: number;
}

/**
 * Responses of a statistics API. A publisher may revise the figures of a period, so a response
 * cannot be pinned by digest: its step checks its shape and size, and the manifest records the
 * digest of what arrived.
 */
export interface ApiSource extends SourceIdentity {
  readonly kind: 'queries';
  readonly queries: readonly ApiQuery[];
}

export type Source = FileSource | PagedSource | ApiSource;

const ILO_REVISION = 'ce5fc25c2a0db2757c5bfa797c4cfc8b408431ea';
const ONET_FILES = 'https://www.onetcenter.org/dl_files/database/db_31_0_csv';
const ONS_SOC2020 =
  'https://www.ons.gov.uk/file?uri=/methodology/classificationsandstandards/' +
  'standardoccupationalclassificationsoc/soc2020';

export const ILO_EXPOSURE = {
  kind: 'files',
  id: 'ilo-genai-exposure',
  title: 'Generative AI and Jobs: A Refined Global Index of Occupational Exposure',
  publisher: 'International Labour Organization',
  version: 'ILO Working Paper 140 (2025)',
  url: 'https://github.com/pgmyrek/2025_GenAI_scores_ISCO08',
  licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  attribution:
    'Gmyrek, P., Berg, J., Kamiński, K., Konopczyński, F., Ładna, A., Nafradi, B., Rosłaniec, K., ' +
    'Troszyński, M. 2025. Generative AI and Jobs: A Refined Global Index of Occupational Exposure. ' +
    'ILO Working Paper 140. Geneva: International Labour Office. © ILO. ' +
    'https://doi.org/10.54394/HETP0387',
  adaptationNotice:
    'This is an adaptation of a copyrighted work of the International Labour Organization (ILO). ' +
    'This adaptation has not been prepared, reviewed or endorsed by the ILO and should not be ' +
    'considered an official ILO adaptation. The ILO disclaims all responsibility for its content ' +
    'and accuracy. Responsibility rests solely with the author(s) of the adaptation.',
  files: [
    {
      name: 'final-scores.xlsx',
      url:
        `https://raw.githubusercontent.com/pgmyrek/2025_GenAI_scores_ISCO08/${ILO_REVISION}/` +
        'Final_Scores_ISCO08_Gmyrek_et_al_2025.xlsx',
      sha256: 'c1940b87e7293b1eb95b530b6d3da7cd806b61d217c4bff1e69372b2cff5c90a',
    },
  ],
} as const satisfies FileSource;

export const ESCO_OCCUPATIONS = {
  kind: 'pages',
  id: 'esco-occupations',
  title: 'ESCO: European Skills, Competences, Qualifications and Occupations',
  publisher: 'European Commission',
  version: 'v1.2.1',
  url: 'https://esco.ec.europa.eu/en/use-esco/download',
  licence: { name: 'CC BY 4.0', url: 'https://commission.europa.eu/legal-notice_en' },
  attribution: 'This service uses the ESCO classification of the European Commission.',
  pageSize: 100,
  expectedTotal: 3039,
  // The ESCO API calls the page number "offset".
  pageUrl: (page) =>
    'https://ec.europa.eu/esco/api/search?type=occupation&language=en&selectedVersion=v1.2.1' +
    `&full=true&limit=100&offset=${page}`,
} as const satisfies PagedSource;

export const ONET_DATABASE = {
  kind: 'files',
  id: 'onet-database',
  title: 'O*NET 31.0 Database',
  publisher: 'U.S. Department of Labor, Employment and Training Administration',
  version: '31.0',
  url: 'https://www.onetcenter.org/database.html',
  licence: { name: 'CC BY 4.0', url: 'https://www.onetcenter.org/license_db.html' },
  attribution:
    'This service includes information from the O*NET 31.0 Database by the U.S. Department of ' +
    'Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. ' +
    'O*NET® is a trademark of USDOL/ETA. Rewire has modified all or some of this information. ' +
    'USDOL/ETA has not approved, endorsed, or tested these modifications.',
  files: [
    {
      name: 'occupation_data.csv',
      url: `${ONET_FILES}/occupation_data.csv`,
      sha256: 'a09eae1d6609686e44e05b7290993a1c8b523d8ca224bc0eedc194c855c3ee02',
    },
    {
      name: 'job_titles.csv',
      url: `${ONET_FILES}/job_titles.csv`,
      sha256: '75a3b46d6edc5996117c10c9ed488c9a06f7495d02969e9d12873ab14a21540c',
    },
  ],
} as const satisfies FileSource;

export const ESCO_ONET_CROSSWALK = {
  kind: 'files',
  id: 'esco-onet-crosswalk',
  title: 'ESCO–O*NET Crosswalk (occupations)',
  publisher:
    'European Commission, ESCO Secretariat, with the U.S. Department of Labor, ' +
    'Employment and Training Administration',
  version: 'Version 1 (September 2022)',
  url: 'https://esco.ec.europa.eu/en/use-esco/other-crosswalks',
  licence: { name: 'CC BY 4.0', url: 'https://commission.europa.eu/legal-notice_en' },
  attribution:
    'ESCO–O*NET Crosswalk, © European Union, with the U.S. Department of Labor, ' +
    'Employment and Training Administration.',
  files: [
    {
      name: 'esco-onet-crosswalk.csv',
      url: 'https://esco.ec.europa.eu/system/files/2023-08/ONET_%28Occupations%29_0_updated.csv',
      sha256: '82179a0a3340da97b63df90134d8d941ec3c2c478334d855b69e4dd57a91b620',
    },
  ],
} as const satisfies FileSource;

export const ONS_CODING_INDEX = {
  kind: 'files',
  id: 'ons-soc2020-coding-index',
  title: 'SOC 2020 Volume 2: the coding index',
  publisher: 'Office for National Statistics',
  version: 'Version 14 (27 August 2026)',
  url:
    'https://www.ons.gov.uk/methodology/classificationsandstandards/' +
    'standardoccupationalclassificationsoc/soc2020/soc2020volume2codingrulesandconventions',
  licence: {
    name: 'Open Government Licence v3.0',
    url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  },
  attribution:
    'Source: Office for National Statistics. Contains public sector information licensed under ' +
    'the Open Government Licence v3.0.',
  files: [
    {
      name: 'coding-index.zip',
      url: `${ONS_SOC2020}/soc2020volume2codingrulesandconventions/soc2020volume2thecodingindexzip20260827v3.zip`,
      sha256: '78086561111bafa21b63eca3bc176f4505110015aeb37919dc2912788368cde0',
    },
  ],
} as const satisfies FileSource;

/** Every source of the bundle, in the order they are documented. */
export const SOURCES: readonly Source[] = [
  ILO_EXPOSURE,
  ESCO_OCCUPATIONS,
  ONET_DATABASE,
  ESCO_ONET_CROSSWALK,
  ONS_CODING_INDEX,
  BLS_OEWS,
  NOMIS_EMPLOYMENT,
  ONS_EARNINGS,
  EUROSTAT_EMPLOYMENT,
  EUROSTAT_EARNINGS,
];
