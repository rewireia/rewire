# 0006. A merchant per region

## Situation

Rewire sells in dollars, pounds and euros. PayPal offers its pay-later products only when the merchant is
based in the buyer's country and charges in its currency, and a merchant paid in a currency it does not
hold may see the capture held as pending.

## Decision

The configuration accepts one PayPal merchant per region, with the default merchant as a fallback. Each
merchant has its own gateway and its own webhook subscription. The price list has a price per currency,
set per region rather than converted.

## Consequences

- With a single sandbox merchant everything works, with pay-later in that merchant's country only.
- With three merchants, each region sells natively, as a real launch would.
- The checkout never gives access for a pending capture, so a held payment is safe by construction.
