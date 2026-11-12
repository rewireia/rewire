# timeline

"Your plan in time": the learning plan laid out at the learner's pace, on a Bryntum Gantt chart
(Community tier, MIT licence) or as a list. Rewire's server works out every date; the chart and
the list show them and turn each choice into a change of the plan, which is saved and drawn again
from the answer. The same section is "My plan in time" on the dashboard.

```
GuideSuggestions.tsx  Tempo on the roadmap: a change said in words, or a ready one, sent to its panel
AddToCalendar.tsx     "Add to my calendar": the plan as an iCalendar file
PlanInTime.tsx        saving each change; the controls, the sentence and the "Timeline | List"
                      switch, offered from 720 px; a narrower screen shows the list only
use-plan-view.ts      the view the person chose last, kept in the preferences, or the default
PlanControls.tsx      hours a week, the first day and "Reset" when there is something to undo
PlanList.tsx          the list: the three stages and their courses
ListCourse.tsx        a course of the list: title and link, days, length, progress, "In plan"
ListFields.tsx        "Start no earlier than" and "Days booked", kept on Enter or on leaving them
PlanList.module.css   the styles of the list, down to 390 px
PlanSummaryText.tsx   "At 4 hours a week you finish on …", with what that date is made of
StudyGantt.tsx        the chart, loaded only when shown: unique widget identity, rows and gestures
gantt-scale.ts        the width of a week, so that the whole plan fills the room beside the table
use-width.ts          the width the chart has, measured before it is painted
gantt-config.ts       its columns and the features it uses or turns off
gantt-cells.ts        the cells of the table: a course, its payment, a stage and its count, the end
gantt-bars.ts         the inside of a bar: progress and marks; a payment's state by its diamond
gantt-today.ts        the weeks of the time axis, with today marked in its week
gantt-tooltip.ts      the tooltip of a bar, as escaped HTML
gantt-gestures.ts     drop, stretch and "In plan" as changes of the plan, read through the box
                      that holds the last render for Bryntum's callbacks
gantt-locale.ts       Bryntum's own texts and date formats in the language of the interface
gantt-theme.css       Bryntum's Svalbard theme redrawn with the tokens of Rewire, light and dark; each stage
                      in its colour (bracket, row and bars), payments by state, today marked
Timeline.module.css   the styles of the section around the chart
calendar.ts           days written as `YYYY-MM-DD`, read as local dates; the server's last day of a
                      booking against the chart's end of a task, the next midnight
gantt-data.ts         the server's plan as the rows, arrows and time axis of the chart: a milestone
                      for each payment, joined to its course, and one at the end of the plan
payment.ts            where a payment stands, the day its milestone stands on, where to act on it
ics.ts                the plan as an iCalendar file: one all-day event per course in the plan
plan-changes.ts       each gesture as a new plan: pace, start, move, stretch, in or out, reset
summary.ts            the sentence of the plan and its details
course-lines.ts       what the tooltip and the list say about a course
```

## Rules

- Every course is `manuallyScheduled` with the dates the server gave it: the chart never moves a
  course on its own. After every answer, saved or refused, the chart is drawn again from the last
  plan the server sent, so a refused change goes back.
- Dragging a course saves the day it may not start before; only a course whose provider publishes
  no length can be stretched, and only at its end (1 to 180 days). Stages do not move.
- Unticking "In plan" leaves a course out: its row stays, quieter and without a bar, to bring it
  back. The box changes when the server answers.
- A bar shows the real progress of a paid course, with "Demo" and, once completed, "Done" just
  before it; a free course is drawn in the colour of "Free". The tooltip says all of it in words.
- The time axis runs from the first day of the plan to two weeks after its end; a day is 8 to 28
  px wide, so the whole plan fills the chart when it fits and scrolls inside it when it does not.
- Everything the chart does with the mouse, the list does with the keyboard: "In plan", "Start no
  earlier than" (empty lets the course follow the one before it) and, for a course whose length
  is not published, "Days booked".
- A paid course cannot start before it is paid for (the server decides). Its payment is a
  milestone row just before it, joined to it by an arrow, on the day it was paid or the day it is
  needed: hollow while due, held, invoiced or refunded, filled once paid, and its state always in
  words ("To be paid", "Invoice sent to your employer", "Paid on …"). Its name links to where the
  learner acts: the course's page to pay, the dashboard for an invoice or a payment PayPal holds,
  the course once paid. A course its payment holds is hatched and says "Waiting for payment"; the
  tooltip and the list say why, and the sentence of the plan counts them.
- While a payment is out (`held-by-paypal`, `invoice-sent`), the plan is read again every 15
  seconds and when the page comes back into view, after asking Rewire to check those payments
  with PayPal, as "Check again" does; so a course unlocks on screen when it is paid for.
- Today is a fine line in the header of its week: Bryntum Community has no time ranges, so the
  header renderer draws it. The end of the plan is a milestone, "You finish here".
- Bryntum's icons are served with the app; nothing is fetched from another site.
