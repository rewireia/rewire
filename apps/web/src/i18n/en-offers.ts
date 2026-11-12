/** English messages of the seller's discount: the catalogue, the cart and the dashboard notice. */
export const offersEn = {
  'offers.until.today': 'until {time}',
  'offers.until.day': 'until {date} at {time}',
  'offers.tag': '−{percent}%',
  'offers.card.label': 'Offer price',
  'offers.card.until': 'Offer {until}',
  'offers.price.spoken': 'Price with discount {price}, before {list}, {until}.',

  'offers.band.eyebrow': 'Offer',
  'offers.band.text': '{seller} has {count} courses at {percent}% off {until}.',
  'offers.band.text.one': '{seller} has one course at {percent}% off {until}.',
  'offers.band.cta': 'See the courses on offer',
  'offers.filter': 'On offer',

  'offers.alert.eyebrow': 'Offer of {seller}',
  'offers.alert.title': 'There are courses on offer. Interested?',
  'offers.alert.body': '{percent}% off {count} courses of the catalogue, {until}.',
  'offers.alert.body.one': '{percent}% off one course of the catalogue, {until}.',
  'offers.alert.see': 'See the offers',
  'offers.alert.later': 'Not now',

  'offers.cart.saving': 'You save {amount} with the offer of {seller}',
  'offers.cart.server':
    'The amount that counts is the one the server sets when it opens the order. If the offer ends before you pay, the server charges the price in force at that moment, and this page shows it before you approve in PayPal.',
  'offers.cart.differs':
    'It differs from the total above because the offer changed before the order was opened.',
} as const;

export type OffersCatalogue = Readonly<Record<keyof typeof offersEn, string>>;
