# learn

Studying a course the learner is enrolled in.

- `LearnPage.tsx` — loads the course; without an enrolment, says so and links to the plan.
- `ListedCourseView.tsx` — a listed course the learner bought: it has no
  lessons, quiz or certificate in Rewire, so the page says it is a sandbox enrolment and links to
  the course at its provider.
- `LearnView.tsx` — the contents and the part in view, named in the address (`?part=`).
- `LessonView.tsx` — a lesson's blocks and "Mark as completed".
- `Practice.tsx` — the practice, on the real tasks of the learner's occupation.
- `Quiz.tsx`, `QuizQuestion.tsx` — the quiz on one page, as native radio groups, and its result
  with the explanation of every question.
- `ClaimCertificate.tsx` — the name to print, then the certificate: the learner is taken to it as
  soon as it exists, even if the course has already swapped the form for its link.
- `certificate-destination.ts` — where the learner goes then: to the certificate, unless they
  already left the course.
