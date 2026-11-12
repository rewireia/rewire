# learning

Studying a paid course, from the first lesson to a certificate anyone can verify.

```text
routes.ts             dashboard (hosted and listed lines), course, lessons, quiz, certificate, listed course and the public check
learning-service.ts   the rules: access, server-side marking, completion and certificates
listed-enrolment.ts   a listed course a learner is enrolled in, and where it is taken
enrolment-store.ts    enrolments, lesson progress, the passed quiz and certificates
certificate-id.ts     readable random ids such as RWR-7KQ2-M9XD
```

## Rules

- A listed course has no lessons, quiz or certificate in Rewire: `GET /learning/listed-courses/:id`
  says the learner is enrolled and links to the course at its provider. A course the seller
  published gives its access address there, and only there: never on its card.
- Only an `active` or `completed` enrolment opens a course; a refund revokes either, and the
  certificate already issued stays verifiable.
- The quiz is marked on the server: answers and explanations leave it only after an attempt.
- A passed quiz completes the course in one transaction, and a later failed attempt does not
  undo it.
- A certificate is issued once per enrolment and never changes; `GET /certificates/:id` needs
  no session. If no free id is drawn, the answer is 503 `certificate_unavailable` and the course
  stays completed.
