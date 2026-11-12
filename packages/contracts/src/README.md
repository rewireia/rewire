# contracts/src

One file per area of the API, each exporting its schemas and the types inferred from them.

```text
src/
├── index.ts         the only entry other packages import; it re-exports every file whole
├── region.ts        regions, money and what changes from one region to another
├── occupation.ts    searching for an occupation and its ISCO-08 unit group
├── exposure.ts      the exposure report, task by task, and a person's own week
├── labour.ts        employment and pay, with the level and period of each figure
├── catalogue.ts     the learning plan: free courses and the demonstration catalogue
├── courses.ts       the course catalogue of a region: hosted and listed courses, levels and subjects
├── marketplace.ts   the seller's terms and sales, the roadmap and Rex's three courses
├── seller-courses.ts  the courses the seller publishes from its dashboard
├── offers.ts        the seller's discount beacons, and the offer a learner is told of
├── wallet.ts        the wallet: top-ups with PayPal, payments from the balance and movements
├── library.ts       the readings of the library: kind, level, topic and scope
├── insights.ts      the data story of a region, with the source of each aggregate
├── session.ts       who the browser is and the occupation they confirmed
├── checkout.ts      buying a course with PayPal, and the payment history
├── sponsorship.ts   asking an employer to pay with a PayPal invoice
├── learning.ts      lessons, the quiz and certificates
├── study-plan.ts    the learning plan in time: the learner's pace and the dates it gives
├── guide.ts         the AI guide
├── studio-turn.ts   a turn of the analyst in "Analyse": conversation, tools and the model's answer
├── source.ts        the official sources behind the data
└── problem.ts       the body of every error answer (RFC 9457)
```
