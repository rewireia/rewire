# seller-courses

The courses the demonstration seller publishes from its dashboard.

```text
seller-courses/
├── seller-courses.ts  kept in `seller_courses`; set in the marketplace's catalogue at start and after
│                      each change, so the shop, search, checkout and learning sell them as any other
└── routes.ts          GET, POST and PUT /business/courses, for the business role
```

A course is withdrawn from sale (`published: false`), never deleted: its sales keep it. Text is kept
as plain text. Its access address is given only to a learner enrolled in it.
