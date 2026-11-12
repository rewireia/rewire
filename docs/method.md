# The method

Rewire answers one question for a working person: **which parts of my job could generative AI do?**
It answers with published evidence and says where the evidence ends.

## 1. From a job title to an official occupation

People name their job in their own words. Each region has an official classification that lists the
ways a job is named:

| Region         | Classification | What is searched                                                                                |
| -------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| European Union | ESCO v1.2.1    | 3,039 occupations and their alternative titles, in English, Spanish, German, French and Italian |
| United States  | O\*NET 31.0    | 1,016 occupations and 54,000 job titles                                                         |
| United Kingdom | SOC 2020       | 412 unit groups and the 32,000 job titles of the ONS coding index                               |

The search compares the words of what the person wrote with the words of every title. Rarer words weigh
more, so "payroll" counts for more than "clerk". The score is the weighted share of words the two have
in common: 1 when the title says exactly what the person wrote. Rewire decides nothing on the person's
behalf: they see the candidates and the tasks of the one they pick, and confirm.

## 2. From the occupation to an international group

The ILO scores exposure for 427 of the 436 ISCO-08 unit groups, the most detailed level of the
international classification, so every regional occupation is bridged to a unit group. Each region does
it its own way, and the report says which:

- **EU.** An ESCO code starts with its ISCO-08 unit group.
- **UK.** The ONS codes every job title to ISCO-08 on its own, so the title carries its group.
- **US.** There is no current official table, so an O\*NET occupation reaches ISCO-08 through the ESCO
  occupations the official ESCO–O\*NET crosswalk relates it to. When they fall in several groups, a fixed
  rule orders them: the strongest relation first (exact, close, narrower, broader), then the most
  crosswalk rows, then the lowest code. The alternatives are shown, and the person can switch.

Measured on the whole data, 97.3% of ESCO occupations, 96.8% of SOC 2020 unit groups and 91.3% of O\*NET
occupations reach a group the ILO has scored. `npm run data:check` prints the figures.

## 3. The scores

For each of the 3,265 tasks of those groups, the ILO index gives a score from 0 (generative AI cannot do
the task) to 1 (it could do all of it). Rewire shows them from 0 to 100 and adds nothing to them:

- **Band of a task**: very low below 25, low from 25, medium from 50, high from 75, as the data
  dictionary of the index defines them.
- **Range of a task**: the lowest and the highest of the two model predictions and the published score;
  it shows how much the models disagreed and is not a confidence interval.
- **Category of the unit group**: the gradient the ILO publishes from the mean and the spread of the
  task scores. It is copied from the source, never recomputed.
- **Standing**: how many of the 427 scored unit groups have a higher mean score. It is a count and
  nothing more: Rewire adds no category of its own to the one the ILO publishes.

## 4. A person's own week

Two people with the same job title do not spend their week the same way. The person says how much time
each task takes (most, some, little or none, weighing 3, 2, 1 and 0) and the report gives the
time-weighted mean of the task scores, and the share of the week spent on tasks of each band. With no
answers, every task weighs the same.

## 5. Employment and pay

The report adds how many people work in the occupation and what they earn, from the official labour
statistics of the region. Each source publishes at its own level of detail, and the report says which:

| Region         | Employment                                                          | Pay                                                                           |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| United States  | BLS OEWS, May 2025: jobs in the SOC occupation                      | BLS OEWS: median annual wage of the SOC occupation                            |
| United Kingdom | ONS APS: people whose main job is in the SOC 2020 unit group        | ONS ASHE: median annual gross pay of employee jobs in the unit group          |
| European Union | Eurostat LFS, 2025: people in the ISCO-08 sub-major group (2-digit) | Eurostat SES 2022: mean monthly earnings in the ISCO-08 major group (1-digit) |

- **Level.** In the US and the UK the figures describe the occupation itself; O\*NET splits some SOC
  occupations further, and those share the figure of their SOC occupation. In the EU they describe the
  wider ISCO-08 group the occupation's unit group belongs to, for the 27 member states together, not
  for one country.
- **Median and mean.** The US and UK figures are annual medians; the EU figure is a monthly mean. The two
  are different statistics and are never compared or converted.
- **Jobs and people.** The BLS counts jobs, so a person with two jobs counts twice; the ONS and Eurostat
  count people.
- **Missing figures.** A figure the source does not publish, because it is withheld or unreliable, is
  not shown. It is never replaced by zero, an estimate or the figure of a broader group.

## 6. What the report does not say

- The scores measure **technical potential**. They do not predict that anyone will lose a job, or when.
- They describe **tasks**, not the person's ability.
- They cover **generative AI**, not robotics or other automation.
- Nine of the 436 unit groups, among them the armed forces, have no scores. Rewire says so instead of
  guessing.

## Sources

Every source, with its licence and the attribution it asks for, is in [data-sources.md](data-sources.md).
The exposure scores are from Gmyrek et al., _Generative AI and Jobs: A Refined Global Index of
Occupational Exposure_, ILO Working Paper 140 (2025), used under CC BY 4.0. Rewire is an adaptation of
that work and has not been prepared, reviewed or endorsed by the ILO.
