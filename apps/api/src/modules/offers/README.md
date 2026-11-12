# offers

Discount beacons: the seller takes a percentage off every published course of a region between two
instants.

```text
offers/
├── beacons.ts  kept in `discount_beacons`; state worked out from the server's clock; one live beacon
│               per region; `discounted` is the one rule for a discounted price
└── routes.ts   /business/beacons for the business role, and GET /regions/:region/offer for anyone
```

The marketplace's catalogue applies the running beacon to every price it quotes, so the shop,
checkout, the wallet and the plan all charge the same amount.
