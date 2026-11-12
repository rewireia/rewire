# offers

The seller's discount beacons, as a learner sees them. The server decides every price: the page
only shows the offer it reports and stops showing it, on the browser's clock, when it ends.

- `offer-terms.ts` — pure rules: whether an offer runs, the price of a course at an instant (the
  list price the server gave once its offer is over), the total and the saving of some courses,
  "until 20:00" or "until 14 November at 20:00" in the browser's time zone, and the address of the
  catalogue on the courses on offer.
- `use-offer-now.ts`, `use-running.ts` — the instant offers are read at, moved on once by a timer
  when an offer ends; no polling.
- `offer-dismissal.ts` — the beacons whose dashboard notice was put aside with "Not now", kept in
  the browser's storage, or in memory for the visit when the storage is refused.
- `OfferPrice.tsx`, `OfferPrice.module.css` — a price on offer: price paid now, list price struck
  through, the discount and its end, read aloud as one sentence.
- `OfferBand.tsx` — the band above the catalogue of `/courses`.
- `OfferAlert.tsx` — the dashboard notice, "There are courses on offer. Interested?", with the way
  to them and "Not now". It appears once, without looping, and not at all with reduced motion.
- `Offer.module.css` — the band and the notice.
