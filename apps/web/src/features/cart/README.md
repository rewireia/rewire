# cart

`/cart`: the courses chosen in the catalogue, paid for in one PayPal Sandbox order.

- `cart-store.ts` — the cart: course ids per region, each once, up to ten. It is kept in the
  browser's storage when there is one, and in memory for the visit when the storage is refused.
- `use-cart.ts` — the hook the catalogue, the site header and the cart page share.
- `CartPage.tsx`, `Cart.module.css` — the lines, the summary and the ways to pay. The total shown
  is the sum of the sandbox prices; the server opens the order with its own amount, which is shown
  once known. Courses already owned or being paid stay out of the order and say why. The demo
  sign-in appears when it is missing; problems of the server, such as a course already bought, are
  said in the person's words.
- `Enrolment.tsx`, `Enrolment.module.css` — after PayPal confirms the payment: one pass of colour
  through its three steps, about four seconds, then a card per course with the way to start it
  and to see it in the dashboard. With reduced motion, the cards at once. Only what was paid
  leaves the cart.
