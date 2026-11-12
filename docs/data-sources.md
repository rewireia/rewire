# Data sources

Every figure Rewire shows comes from the official sources below, downloaded from their
publishers and pinned by digest. This page is generated from the bundle manifest by
`tools/data-sources.ts`; change the data pipeline, not this file.

## Summary

| Source                                                                            | Publisher                                                                                                        | Version                                            | Licence                              | Retrieved on |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------ | ------------ |
| Generative AI and Jobs: A Refined Global Index of Occupational Exposure           | International Labour Organization                                                                                | ILO Working Paper 140 (2025)                       | CC BY 4.0                            | 2026-11-11   |
| ESCO: European Skills, Competences, Qualifications and Occupations                | European Commission                                                                                              | v1.2.1                                             | CC BY 4.0                            | 2026-11-11   |
| O\*NET 31.0 Database                                                              | U.S. Department of Labor, Employment and Training Administration                                                 | 31.0                                               | CC BY 4.0                            | 2026-11-11   |
| ESCO–O\*NET Crosswalk (occupations)                                               | European Commission, ESCO Secretariat, with the U.S. Department of Labor, Employment and Training Administration | Version 1 (September 2022)                         | CC BY 4.0                            | 2026-11-11   |
| SOC 2020 Volume 2: the coding index                                               | Office for National Statistics                                                                                   | Version 14 (27 August 2026)                        | Open Government Licence v3.0         | 2026-11-11   |
| Occupational Employment and Wage Statistics: national estimates                   | U.S. Bureau of Labor Statistics                                                                                  | May 2025                                           | Public domain (U.S. Government work) | 2026-11-11   |
| Annual Population Survey: employment by occupation (SOC 2020 unit groups)         | Office for National Statistics                                                                                   | July 2025 to June 2026                             | Open Government Licence v3.0         | 2026-11-11   |
| Annual Survey of Hours and Earnings: occupation by four-digit SOC 2020 (table 14) | Office for National Statistics                                                                                   | 2026 provisional                                   | Open Government Licence v3.0         | 2026-11-11   |
| Employed persons by detailed occupation (ISCO-08 two digit level)                 | Eurostat                                                                                                         | lfsa\_egai2d, 2025                                 | CC BY 4.0                            | 2026-11-11   |
| Mean monthly earnings by sex, occupation and economic activity (2022)             | Eurostat                                                                                                         | earn\_ses22\_48, Structure of Earnings Survey 2022 | CC BY 4.0                            | 2026-11-11   |

## Generative AI and Jobs: A Refined Global Index of Occupational Exposure

- Publisher: International Labour Organization
- Version: ILO Working Paper 140 (2025)
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Link: <https://github.com/pgmyrek/2025_GenAI_scores_ISCO08>
- Retrieved on: 2026-11-11
- SHA-256: `c1940b87e7293b1eb95b530b6d3da7cd806b61d217c4bff1e69372b2cff5c90a`

Attribution:

> Gmyrek, P., Berg, J., Kamiński, K., Konopczyński, F., Ładna, A., Nafradi, B., Rosłaniec, K., Troszyński, M. 2025. Generative AI and Jobs: A Refined Global Index of Occupational Exposure. ILO Working Paper 140. Geneva: International Labour Office. © ILO. https://doi.org/10.54394/HETP0387

Adaptation notice:

> This is an adaptation of a copyrighted work of the International Labour Organization (ILO). This adaptation has not been prepared, reviewed or endorsed by the ILO and should not be considered an official ILO adaptation. The ILO disclaims all responsibility for its content and accuracy. Responsibility rests solely with the author(s) of the adaptation.

Bundle files derived from it:

- `exposure-rationales.json`
- `exposure.json`

## ESCO: European Skills, Competences, Qualifications and Occupations

- Publisher: European Commission
- Version: v1.2.1
- Licence: [CC BY 4.0](https://commission.europa.eu/legal-notice_en)
- Link: <https://esco.ec.europa.eu/en/use-esco/download>
- Retrieved on: 2026-11-11
- SHA-256: `20d937df3e4e17dae9e790003f016759629452119962e92b253fd4f670b8eb0f`

Attribution:

> This service uses the ESCO classification of the European Commission.

Bundle files derived from it:

- `classification.eu.json`
- `classification.us.json`

## O\*NET 31.0 Database

- Publisher: U.S. Department of Labor, Employment and Training Administration
- Version: 31.0
- Licence: [CC BY 4.0](https://www.onetcenter.org/license_db.html)
- Link: <https://www.onetcenter.org/database.html>
- Retrieved on: 2026-11-11
- SHA-256: `c1cbd3f993e5567640bd18665131cf7be2384addf4d40e2e9130934877827fc7`

Attribution:

> This service includes information from the O\*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O\*NET® is a trademark of USDOL/ETA. Rewire has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.

Bundle files derived from it:

- `classification.us.json`

## ESCO–O\*NET Crosswalk (occupations)

- Publisher: European Commission, ESCO Secretariat, with the U.S. Department of Labor, Employment and Training Administration
- Version: Version 1 (September 2022)
- Licence: [CC BY 4.0](https://commission.europa.eu/legal-notice_en)
- Link: <https://esco.ec.europa.eu/en/use-esco/other-crosswalks>
- Retrieved on: 2026-11-11
- SHA-256: `82179a0a3340da97b63df90134d8d941ec3c2c478334d855b69e4dd57a91b620`

Attribution:

> ESCO–O\*NET Crosswalk, © European Union, with the U.S. Department of Labor, Employment and Training Administration.

Bundle files derived from it:

- `classification.us.json`

## SOC 2020 Volume 2: the coding index

- Publisher: Office for National Statistics
- Version: Version 14 (27 August 2026)
- Licence: [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)
- Link: <https://www.ons.gov.uk/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020/soc2020volume2codingrulesandconventions>
- Retrieved on: 2026-11-11
- SHA-256: `78086561111bafa21b63eca3bc176f4505110015aeb37919dc2912788368cde0`

Attribution:

> Source: Office for National Statistics. Contains public sector information licensed under the Open Government Licence v3.0.

Bundle files derived from it:

- `classification.uk.json`

## Occupational Employment and Wage Statistics: national estimates

- Publisher: U.S. Bureau of Labor Statistics
- Version: May 2025
- Licence: [Public domain (U.S. Government work)](https://www.bls.gov/opub/copyright-information.htm)
- Link: <https://www.bls.gov/oes/tables.htm>
- Retrieved on: 2026-11-11
- SHA-256: `b5855a37f3e03e779f6fbf173d3bbc94aeeff33426aef32fa95ce6d025bab1af`

Attribution:

> Source: U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics, May 2025

Bundle files derived from it:

- `labour.us.json`

## Annual Population Survey: employment by occupation (SOC 2020 unit groups)

- Publisher: Office for National Statistics
- Version: July 2025 to June 2026
- Licence: [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)
- Link: <https://www.nomisweb.co.uk/datasets/apsnew>
- Retrieved on: 2026-11-11
- SHA-256: `9e836c5b237b138521f7d4934ffd72c3a5dd2b5cdc18e8d44eef455d17115bb8`

Attribution:

> Source: Office for National Statistics, Annual Population Survey, via Nomis. Contains public sector information licensed under the Open Government Licence v3.0.

Bundle files derived from it:

- `labour.uk.json`

## Annual Survey of Hours and Earnings: occupation by four-digit SOC 2020 (table 14)

- Publisher: Office for National Statistics
- Version: 2026 provisional
- Licence: [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)
- Link: <https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/occupation4digitsoc2010ashetable14>
- Retrieved on: 2026-11-11
- SHA-256: `4719f364d596739679d1bb492a1fc42e4c8e980a5b93ffc791e350f4ba8f4f1d`

Attribution:

> Source: Office for National Statistics, Annual Survey of Hours and Earnings. Contains public sector information licensed under the Open Government Licence v3.0.

Bundle files derived from it:

- `labour.uk.json`

## Employed persons by detailed occupation (ISCO-08 two digit level)

- Publisher: Eurostat
- Version: lfsa\_egai2d, 2025
- Licence: [CC BY 4.0](https://ec.europa.eu/eurostat/web/main/help/copyright-notice)
- Link: <https://ec.europa.eu/eurostat/databrowser/view/lfsa_egai2d/default/table>
- Retrieved on: 2026-11-11
- SHA-256: `181450c938b1a374c0b40705fda17ba185204de1a04f1668bfe0bdcc5afdf3a2`

Attribution:

> Source: Eurostat (lfsa\_egai2d)

Bundle files derived from it:

- `labour.eu.json`

## Mean monthly earnings by sex, occupation and economic activity (2022)

- Publisher: Eurostat
- Version: earn\_ses22\_48, Structure of Earnings Survey 2022
- Licence: [CC BY 4.0](https://ec.europa.eu/eurostat/web/main/help/copyright-notice)
- Link: <https://ec.europa.eu/eurostat/databrowser/view/earn_ses22_48/default/table>
- Retrieved on: 2026-11-11
- SHA-256: `2079f5b462f8893c077d1e944977c7e4580f2f2e606e325b5a7d994fc08b3924`

Attribution:

> Source: Eurostat (earn\_ses22\_48)

Bundle files derived from it:

- `labour.eu.json`
