# guide

The AI guide. It understands a job described in free words, explains a report in plain language
and helps choose and buy a course. The engine knows; the model chooses and explains.

```text
routes.ts           status, interpreting a description, explaining a report, the conversation
guide-service.ts    the three jobs, each within the daily budget, and their problem answers
description-search.ts  bilingual workplace descriptions and ESCO-to-regional title candidates
instructions.ts     the standing instructions of the interpreter and of the conversation
tools.ts            the tools: search, propose, read a report, read a plan, prepare a purchase
plan-tools.ts       the tools of the plan in time: read it, and change it as the person asks
explain.ts          the fact sheet of a report and the explanation, checked before it is shown
figures.ts          the figure detector: any figure in prose, and task tags that point at no task
claims.ts           the check: no clause may forecast, without denying it, that a job will be lost
checked-answer.ts   an answer that passes both checks, written again once if it does not
token-budget.ts     a daily ceiling of tokens: each call's limit set aside before it starts and
                    settled with what it spent, also when it fails; kept in memory
model.ts            the model as the guide needs it: instructions, turns and tools in, text out
openai-model.ts     an OpenAI model behind that interface, through the Responses API
plain-text.ts       the model's words as the page prints them: plain text, no marks of emphasis
```

## Rules

- No score, occupation code, course or price comes from the model. `propose_occupations` accepts
  only what `search_occupations` returned in the same request; any other code is refused and
  never reaches the person.
- **The model writes words; the page draws the numbers.** No text of the model may hold a figure:
  a digit outside a task tag, a number word, a fraction, a rank or a date (`figures.ts`). An
  explanation names tasks by their tags (`[T2]`), which must point at tasks of the report, and the
  web draws each with its score from the report. In a conversation every number is in a card
  (`GuideCard`): the report with its mean score, level and standing, the courses with their prices,
  the plan in time with its start, pace and end, an order with its amount.
- No clause may forecast that a job will be lost (`claims.ts`): a dismissal, a replacement, a job
  that disappears or unemployment, said of the person or their job. It counts as denied only when
  a negation bears on its verb or stands right before it, under a condition or in a question; "no
  doubt" denies nothing.
- A text that fails is sent back once with what was wrong. An explanation that fails again is
  502 `explanation_failed_check`; a conversation answers a fixed sentence of Rewire's own, and an
  interpreted description shows its occupations without a note. These are rules on words, not a
  reading of meaning: `apps/api/tests/corpus/` measures them and lists what they get wrong (see
  `docs/ai-guide.md`).
- A plain search that is already sure (score of 0.75 or more) is answered without the model,
  except for Spanish ESCO titles, which can be ambiguous. Common bar, bakery and pizzeria
  descriptions offer possible roles and ask about duties. Spanish baker titles resolve locally. Without a model, Spanish ESCO titles can be used to
  find US and UK candidates through the same ISCO group; this is a suggestion, not an assertion
  that occupations in a group are equivalent. If a job and duties are supplied on separate lines,
  local fallback searches the first line as a title; it does not interpret the duties. Free
  descriptions outside these cases still need a matching title or the model.
- The guide prepares purchases and never completes them: `prepare_course_purchase` opens an order
  at the catalogue price and moves no money. The person approves it in PayPal. A purchase the
  checkout refuses is told to the model, not failed.
- Without a model, `GET /guide/status` says `available: false`, interpreting falls back to the
  local search or the Spanish title bridge and the other two jobs answer 503 `guide_unavailable`.
  If the model fails or is busy, interpreting also falls back locally. For other guide jobs a refusal
  or a cut-off answer is 502 `guide_refused` or `guide_truncated`; a spent budget is 429 `guide_budget_spent` until
  the next day, and four calls already at the model are 429 `guide_busy`.
- A call sets its limit aside before it starts (40,000 tokens for the guide), and is admitted only
  if what was spent, what is set aside and its limit fit in the day. It is told its limit: no round
  writes more than what is left of it, and no round starts once it is spent (`guide_truncated`).
  What it spent is counted whatever ends it, also an answer cut off or refused, a failure after
  its tools or a failure of Rewire's own code. A call can pass its limit by the input of its last
  round, so the day can end above its ceiling by that much for each call in flight, four at most.
- When the model proposes no occupation, a single brief question passing the text checks can
  accompany local search results. These checks enforce form and known unsafe claims, not the
  semantic truth of a question or immunity to prompt injection.
- What the person writes is data to classify or answer, never instructions.

Interpretation uses a request-scoped low reasoning effort on the same configured model. A workplace-only description asks for duties immediately without speculative tool searches. A checked question without proposals stays a question, not a list of lexical guesses. Report explanations and the purchasing guide retain the configured effort.
