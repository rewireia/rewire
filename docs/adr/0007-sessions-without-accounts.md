# 0007. Sessions without accounts

## Situation

A person should see their report without creating an account, and a judge should reach the checkout in a
minute. Yet a purchase, a course in progress and a certificate must belong to someone.

## Decision

There are no accounts. The browser holds an HTTP-only cookie with a learner id, signed with HMAC so that it
cannot be forged. A visitor has no cookie and no row in the database until they save something: reading
the site leaves no trace. Requests that change state are accepted only from the site's own origin.

## Consequences

- Nothing to sign up for, and no password or email address to protect.
- A learner is tied to one browser. Moving to another device would need an account, which this version
  does not have.
- Rewire stores the occupation a learner confirmed and the time they give to each task, never the free
  text they typed. The name on a certificate is the one they write for it.
