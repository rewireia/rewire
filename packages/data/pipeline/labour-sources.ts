import type { ApiSource, FileSource } from './sources.ts';

const OPEN_GOVERNMENT_LICENCE = {
  name: 'Open Government Licence v3.0',
  url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
} as const;

const EUROSTAT_LICENCE = {
  name: 'CC BY 4.0',
  url: 'https://ec.europa.eu/eurostat/web/main/help/copyright-notice',
} as const;

const EUROSTAT_API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const ASHE_TABLE_14 =
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/' +
  'datasets/occupation4digitsoc2010ashetable14';

export const BLS_OEWS = {
  kind: 'files',
  id: 'bls-oews',
  title: 'Occupational Employment and Wage Statistics: national estimates',
  publisher: 'U.S. Bureau of Labor Statistics',
  version: 'May 2025',
  url: 'https://www.bls.gov/oes/tables.htm',
  licence: {
    name: 'Public domain (U.S. Government work)',
    url: 'https://www.bls.gov/opub/copyright-information.htm',
  },
  attribution:
    'Source: U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics, May 2025',
  files: [
    {
      name: 'oesm25nat.zip',
      url: 'https://www.bls.gov/oes/special-requests/oesm25nat.zip',
      sha256: 'b5855a37f3e03e779f6fbf173d3bbc94aeeff33426aef32fa95ce6d025bab1af',
    },
  ],
} as const satisfies FileSource;

export const NOMIS_EMPLOYMENT = {
  kind: 'queries',
  id: 'ons-aps-employment',
  title: 'Annual Population Survey: employment by occupation (SOC 2020 unit groups)',
  publisher: 'Office for National Statistics',
  version: 'July 2025 to June 2026',
  url: 'https://www.nomisweb.co.uk/datasets/apsnew',
  licence: OPEN_GOVERNMENT_LICENCE,
  attribution:
    'Source: Office for National Statistics, Annual Population Survey, via Nomis. Contains public ' +
    'sector information licensed under the Open Government Licence v3.0.',
  queries: [
    {
      name: 'employment.csv',
      // United Kingdom, every four-digit unit group, all persons in employment, count only.
      url:
        'https://www.nomisweb.co.uk/api/v01/dataset/NM_218_1.data.csv?geography=2092957697' +
        '&soc2020_full=TYPE4000&c_sex=0&etype=0&ftpt=0&jtype=0&measure=1&measures=20100' +
        '&time=2026-06&select=date_name,soc2020_full_name,obs_value,obs_status',
      minimumRecords: 400,
    },
  ],
} as const satisfies ApiSource;

export const ONS_EARNINGS = {
  kind: 'files',
  id: 'ons-ashe-table-14',
  title: 'Annual Survey of Hours and Earnings: occupation by four-digit SOC 2020 (table 14)',
  publisher: 'Office for National Statistics',
  version: '2026 provisional',
  url: ASHE_TABLE_14,
  licence: OPEN_GOVERNMENT_LICENCE,
  attribution:
    'Source: Office for National Statistics, Annual Survey of Hours and Earnings. Contains ' +
    'public sector information licensed under the Open Government Licence v3.0.',
  files: [
    {
      name: 'ashe-table-14.zip',
      url:
        'https://www.ons.gov.uk/file?uri=/employmentandlabourmarket/peopleinwork/' +
        'earningsandworkinghours/datasets/occupation4digitsoc2010ashetable14/2026provisional/' +
        'ashetable142026provisional.zip',
      sha256: '4719f364d596739679d1bb492a1fc42e4c8e980a5b93ffc791e350f4ba8f4f1d',
    },
  ],
} as const satisfies FileSource;

export const EUROSTAT_EMPLOYMENT = {
  kind: 'queries',
  id: 'eurostat-lfsa-egai2d',
  title: 'Employed persons by detailed occupation (ISCO-08 two digit level)',
  publisher: 'Eurostat',
  version: 'lfsa_egai2d, 2025',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/lfsa_egai2d/default/table',
  licence: EUROSTAT_LICENCE,
  attribution: 'Source: Eurostat (lfsa_egai2d)',
  queries: [
    {
      name: 'lfsa_egai2d.json',
      url:
        `${EUROSTAT_API}/lfsa_egai2d?format=JSON&lang=EN&unit=THS_PER&age=Y_GE15&sex=T` +
        '&geo=EU27_2020&time=2025',
      // The 43 sub-major groups of ISCO-08; a few may be published without a value.
      minimumRecords: 43,
    },
  ],
} as const satisfies ApiSource;

export const EUROSTAT_EARNINGS = {
  kind: 'queries',
  id: 'eurostat-earn-ses22-48',
  title: 'Mean monthly earnings by sex, occupation and economic activity (2022)',
  publisher: 'Eurostat',
  version: 'earn_ses22_48, Structure of Earnings Survey 2022',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/earn_ses22_48/default/table',
  licence: EUROSTAT_LICENCE,
  attribution: 'Source: Eurostat (earn_ses22_48)',
  queries: [
    {
      name: 'earn_ses22_48.json',
      url:
        `${EUROSTAT_API}/earn_ses22_48?format=JSON&lang=EN&geo=EU27_2020&sex=T&nace_r2=B-S_X_O` +
        '&indic_se=ERN&unit=EUR&sizeclas=GE10&time=2022',
      // The ten major groups of ISCO-08.
      minimumRecords: 10,
    },
  ],
} as const satisfies ApiSource;
