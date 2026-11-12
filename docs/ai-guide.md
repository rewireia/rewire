# The AI guide

"The guide" is the name of the server module. A person meets it as two named agents: **Rex**, who
understands a job, explains a report and searches the course shop, and **Tempo**, the plan agent on
the roadmap of the dashboard, who changes the study plan when told what changed in plain words.

Rewire uses a language model for what language models are good at, understanding free text and
explaining in plain words, and keeps it away from what they are bad at: being a source of facts.

**The engine knows; the model chooses and explains.** No score, occupation code, course or price is
taken from the model: they come from the engine and the catalogue, through tools. **The model writes
words; the numbers are drawn by the application from the engine's data**, each with its label and its
unit: beside the task tags of an explanation, and in the cards of a conversation. The
model's words are checked by rules in code that refuse any figure in them and the known ways of
predicting that someone will lose their job. Those rules read words, not meaning, and can miss: the
section below says where they stop.

| Job                          | What the model does                                                                                                  | What the person reads, and what is checked                                                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Understand a job description | Searches the official classification with its own wordings and proposes up to three results.                         | `propose_occupations` accepts only codes that `search_occupations` returned in the same request; any other code is refused. Its note passes the two checks below or is left out.                                                                                                         |
| Explain a report             | Writes two or three paragraphs about the person's report, in words, naming tasks by their tags (`[T2]`).             | The page draws each tag as a link to the task with its score from the report, then the tasks mentioned with score, band and source. The text may hold no figure, every tag must point at a task of the report and no clause may forecast job loss. Sent back once, then refused.         |
| Converse                     | Answers questions, reads the report and the learning plan, changes the plan in time when asked, prepares a purchase. | Every number is in a card the server fills: the report (mean score, level, standing), the courses and prices, the plan (start, pace, end), the order and its amount. The words may hold no figure and no forecast of job loss. Written again once, without tools; then a fixed sentence. |

## What the checks catch, and what they do not

- **No figure in the model's words.** Checking that a figure belongs to the data does not check what
  it is said of: "The score for checking records [T1] is 100 out of 100" uses a figure of every
  report about a task that scores 20. So the model writes no figure at all, and `figures.ts` refuses
  any it finds: a digit outside a task tag, a number word, a fraction or a multiple ("half",
  "twice", "la mitad"), an ordinal that ranks ("the second most exposed"), a month, a weekday or a
  day counted from today. "One", "ten", "un" and "una" count only before a unit ("one hour", "una
  hora"), so "one of the most exposed" and "una tarea" pass. The numbers the person reads are drawn
  by the page from the engine's data, so a number of the model never reaches them as a fact.
- **The forecast the scores do not make.** `claims.ts` reads each clause for job loss built from its
  parts, in English and Spanish: a dismissal ("fire you", "let you go", "te despedirán"), a
  replacement ("replace you", "take your job", "te sustituirá"), a job that disappears ("your role is
  likely to disappear", "tu puesto desaparecerá") or unemployment ("out of work", "en el paro"), said
  of the person or of their job, whoever does it. Parts of a job are not the job: "parts of your job
  could be automated" is what the scores do say. A forecast counts as denied only when a negation
  bears on its verb ("will not", "does not mean", "no one can say", "no significa", "nunca"), stands
  right before it ("not job loss", "sin perder tu trabajo"), right after a clause it opens ("Job loss
  is not what this measures"), under a condition ("if", "whether", "si") or in a question. A negation
  that strengthens it denies nothing: "There is no doubt that you will lose your job" is refused.
- **Measured, and where it fails.** These are rules on words, not a reading of meaning, and no rule
  can guarantee that a forecast is never said. `apps/api/tests/corpus/` holds sentences the rules
  must block or let through, with the exact sentences of past reviews, paraphrases, negations and
  both languages; the tests report the share each check gets right and keep in view, with the
  reason, the sentences it gets wrong. Among them: an occupation named by its title ("AI will
  replace accountants"), a forecast without the words of loss ("your employer won't need you
  anymore"), a reassurance ("your job is safe"), a task about dismissals in human resources, which
  is refused, and "a couple of tasks", which passes as no figure.
- **Beside every text of the model.** The page says, fixed and written by Rewire, that exposure is
  technical potential and not a prediction about anyone's job: under an explanation and at the top
  of the guide's panel.
- **A second try, then silence.** A text that fails goes back to the model once with what was wrong.
  If it fails again, the explanation is refused with a problem the page explains, the conversation
  answers with a fixed sentence of Rewire's own and keeps the cards of what its tools found, and an
  interpreted description shows its occupations without a note.

## Agentic commerce, with the person in charge

When someone tells the guide they want a course, it calls `prepare_course_purchase`. That opens a PayPal
order for the price the server reads from the catalogue, and the conversation shows a PayPal button.
**Nothing is charged until the person approves the payment in PayPal.** The guide has no tool that
captures a payment, and it is never given one: preparing is the model's job, paying is the person's.

## A plan you change by saying so

"I only have two hours a week and I cannot start until January. Skip the second course." The guide
calls `change_study_plan` with just that: the pace, the day and the course. The server checks the
change against the same rules as a change made by hand, works the dates out again and saves the plan;
the timeline on the page moves to match. The model writes no date: the card under its answer shows
the plan's start, pace and end from the server, and a change the plan cannot take is told to the
model instead of applied.

## How it is built

```text
modules/guide/
├── model.ts            the model as the guide needs it: instructions, a conversation and tools in, text out
├── openai-model.ts     an OpenAI model behind that interface, through the Responses API
├── plain-text.ts       the model's words as the page prints them, without marks of emphasis
├── tools.ts            the tools: search, propose, read a report, read a plan, prepare a purchase
├── plan-tools.ts       the tools of the plan in time: read it, and change it as the person asks
├── figures.ts          the check: no figure in the model's words, and tags of tasks the report has
├── claims.ts           the check: no clause may forecast that a job will be lost
├── checked-answer.ts   an answer that passes both checks, written again once if it does not
├── explain.ts          the fact sheet of a report and the checked explanation
├── guide-service.ts    the three jobs, within a daily token budget
├── token-budget.ts     the budget
└── routes.ts           the HTTP routes
```

- **Model.** The guide needs one thing of a model: instructions, a conversation and tools in, text
  out. That is the `GuideModel` interface, and the adapter behind it talks to OpenAI's Responses API:
  `gpt-6.1-terra` by default (`OPENAI_MODEL`), reasoning at high effort (`OPENAI_REASONING_EFFORT`).
  Nothing is kept at OpenAI between requests: every round of tool calls sends the turn again, with the
  model's reasoning passed back to it encrypted. Another provider is another adapter; nothing else in
  the guide would change.
- **Tools.** Defined once as a name, a description, a Zod schema and a function. The adapter validates
  the model's input against the schema before running a tool; an input that fails is told to the
  model and never run.
- **What the person writes is data.** Their words are the thing to classify or the question to answer,
  and the instructions say so.
- **What the tools change.** Two tools have effects that last. `prepare_course_purchase` opens a
  PayPal order, which moves no money until the person approves it in PayPal. `change_study_plan`
  saves a change to the person's plan in time, checked by the same rules as a change made by hand,
  and creates a learner if the browser had none; the reply shows a card that says the plan changed.
  The model is told to change the plan only when the person asks, but nothing in code asks the person
  to confirm the change before it is saved. Every other tool only reads.
- **Budget.** A daily ceiling of tokens (`GUIDE_DAILY_TOKEN_BUDGET`) protects a public demo. A call
  sets its limit aside before it starts: 40,000 tokens for a call of the guide, 20,000 for a turn of
  the analyst, or the whole day if the day is smaller. It is admitted only if what was spent, what is
  set aside and its own limit fit in the day (otherwise 429 `guide_budget_spent`), and at most four
  run at once (otherwise 429 `guide_busy`). The call is told its limit: no round asks for more output
  than what is left of it, and no round starts once it is spent, which ends the call as
  `guide_truncated`. Whatever ends a call, what OpenAI reported for its rounds is counted: an answer
  a check then discards, one cut off or refused, a failure after its tools, a failure of Rewire's
  own code after the model answered. Only a failure with no answer at all, such as a network error
  on the first round, counts nothing, since nothing is known.
- **How far past the ceiling.** A round's input is only known once it is answered, so a call can end
  above its limit by the input of its last round, and the day above its ceiling by the input of the
  last round of each call in flight: at most four rounds' input. A round of the guide sends its
  instructions, the conversation (up to 30 messages of 4,000 characters), what its tools returned
  and its reasoning; a turn of the analyst carries up to 1 MB.
- **What the budget is not.** The count is kept in memory: it holds within one process, and a
  restart starts the day again. It is no substitute for a spending limit set at the provider's
  account, which the server cannot set or see.
- **The analyst's budget.** The analyst of "Analyse" has a ceiling of its own
  (`ANALYST_DAILY_TOKEN_BUDGET`). AG Studio's agents work in many small turns: a question that
  rebuilds a dashboard took dozens of them and a few hundred thousand tokens when we measured it,
  while one that explains an occupation took two turns. With its own budget, reserved in the same way,
  the analyst cannot leave the guide without any.

## The analyst in Explore

The explorer's "Analyse" view (an AG Studio dashboard) has an analyst of its own, built on AG Studio's
agent framework. Studio runs the agents and every tool in the browser; the server only carries each
turn to the same model as the guide and back, so the key stays on the server.

- **Rewire's agent.** `rewire-analyst` is told what the data is and is not (technical potential,
  not job losses), to state only figures a query or its own tool returned, and to cite the ILO, 2025.
  Its own tool, `read_occupation_tasks`, reads an occupation's tasks and scores from Rewire, which
  Studio's tables do not hold. To query, add or change a widget, or filter the page, it delegates to
  Studio's own data, widget and page agents (`delegate_to`).
- **The route.** `POST /api/studio/turn` takes one turn (instructions, conversation, tool schemas,
  format), validated by `studioTurnRequestSchema`, and answers the model's text and tool calls whole;
  the browser replays them as the events Studio's chat panel expects. Its body limit is 1 MB, since a
  turn carries Studio's tool schemas and query results (up to about 60 kB measured); the rest of the
  API keeps 64 kB.
- **What the server bounds.** The page writes each turn, so the server cannot; it bounds it. Only a
  browser with a session is answered (401 `no_session`; the web starts one with `POST /api/session`),
  one turn at a time per session (429 `analyst_busy`). The server's purpose, to analyse this data set
  and arrange its dashboard and to decline anything else, is the first item of every turn and its
  only system message; the page's instructions and any system message it sends go in after it as
  developer messages, which rank below it. A turn may offer, replay or force only the tools of the
  dashboard, named on the server, each once and within a size (400 `analyst_tool_not_allowed`, 400
  `analyst_tools_too_large`). The analyst's own tool, `read_occupation_tasks`, is defined on the
  server: the model receives that definition whatever the page sent with its name. Studio's tools
  are built in the page from the dashboard's live state (its pages, widgets and fields), so the
  server bounds their definitions by name and size and does not fix their descriptions or schemas:
  a page can still send one of those names with other words.
- **Budget and key.** It has its own daily budget, reserved per turn as the guide's is, and without a
  key it is not offered. A question that changes the dashboard takes about twenty turns and a few
  hundred thousand tokens.
- **Its limits.** These bounds say who may ask (any browser can start a session), how much and for
  what; they do not make the model harmless or right. A person can still word a request so that the
  model strays.
- **Its figures are the model's.** Unlike the guide, the analyst writes figures: it reads them from
  the data agent's queries and from its own tool and repeats them in its answers. Neither the rule
  against figures nor the check for forecasts of job loss applies to it, and what this document
  promises of the guide's words does not cover it. That it cites only what a query returned, with
  its source, is asked in its instructions and not checked in code.

## Where a person's words go

Rewire keeps no conversation: the browser holds it and sends it with each question. To be answered,
the words go to the company that runs the model, which `GET /api/guide/status` names. Whether that
company may also learn from them depends on the account, which the server cannot see: whoever sets it
up says so with `GUIDE_PROVIDER_TRAINS_ON_DATA`, and the guide tells the person before they write.

## Without a key

With no `OPENAI_API_KEY`, `GET /api/guide/status` returns `available: false`. Interpreting a job
description falls back to the plain search, and the explanation and the conversation respond with 503. The
report, the plan, the payments and the courses do not depend on the model at all.

## Testing

`GuideModel` is an interface, so the tests drive the guide with a scripted model: one that proposes a code
it was never shown, one that writes a figure, one that forecasts a dismissal, one that asks to buy. The
rules above are tested without the network and without spending a token, and measured against the
corpus in `apps/api/tests/corpus/`. The OpenAI adapter has its own tests against an OpenAI kept in
memory: rounds of tools, refusals, cut-off answers, failures, the limit of a call and what each
failure spent.
