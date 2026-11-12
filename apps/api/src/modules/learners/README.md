# learners

A signed cookie holds a visitor learner id. A learner signing in with the shared demo credentials
adopts the first learner identity once; later demo logins use that persisted identity.

```text
routes.ts            the session, starting one, and the occupation the learner confirmed
session.ts           reads the cookie of every request; creates a learner when needed
current-learner.ts   the learner of a request, or 401 `no_session`
learner-store.ts     learners: profile and the name for certificates
```

## Rules

- Reading the site leaves no cookie. Only saving something, or `POST /session`, starts a session.
  The web asks for one only when the person uses the analyst of "Analyse", which needs one; the
  learner it creates holds nothing until something is saved.
- What the learner typed to find their job is never stored, only the occupation they confirmed.
- A profile is saved only for an occupation of the region's classification, read through one of
  its own unit groups (`unitGroupsOf`), scored by the ILO, with time given only to its tasks.
  Anything else is a 400 that names the field.

## Demo workspace access

`access-routes.ts` validates the documented Demo credentials and a learner or business role.
`dashboard-access.ts` issues an eight-hour signed HttpOnly grant bound to the browser's learner,
checks expiry on the server, and requires the appropriate role for private collections and marketplace
operations. A shared learner identity is hidden without its learner grant; business uses a separate
session identity. Earlier visitor data is neither merged nor deleted. Signing out clears that grant without deleting the learner's progress. The public demo
credentials are not production user authentication. API session responses are private and not cached.
