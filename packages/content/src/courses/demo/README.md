# content/src/courses/demo

The demonstration catalogue of paid courses. Each file exports one course with
`satisfies DemoCourse` and is named after the course `id`.

```text
demo/
├── index.ts                            DEMO_COURSES, in the order of the learning plan
├── ai-foundations.ts                   understand: every job
├── ai-for-office-work.ts               apply: clerical support workers (4)
├── ai-for-professionals.ts             apply: professionals (major group 2)
├── ai-for-managers.ts                  apply: managers (1)
├── ai-for-service-and-sales.ts         apply: service and sales workers (5)
├── ai-for-technicians-and-trades.ts    apply: technicians, trades, plant and elementary work (3, 6–9)
└── checking-ai-work.ts                 strengthen: every job
```

## Rules

- Lessons run from 120 to 260 words in plain English, with no brand names.
- Every quiz option says something real; the right one varies in position and is not always the
  longest. The package README explains how to add a course.
