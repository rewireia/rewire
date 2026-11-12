import type { OffersCatalogue } from './en-offers.ts';

/** Spanish messages of the seller's discount: the catalogue, the cart and the dashboard notice. */
export const offersEs: OffersCatalogue = {
  'offers.until.today': 'hasta las {time}',
  'offers.until.day': 'hasta el {date} a las {time}',
  'offers.tag': '−{percent} %',
  'offers.card.label': 'Precio de oferta',
  'offers.card.until': 'Oferta {until}',
  'offers.price.spoken': 'Precio con descuento {price}, antes {list}, {until}.',

  'offers.band.eyebrow': 'Oferta',
  'offers.band.text': '{seller} tiene {count} cursos con un {percent} % de descuento {until}.',
  'offers.band.text.one': '{seller} tiene un curso con un {percent} % de descuento {until}.',
  'offers.band.cta': 'Ver cursos en oferta',
  'offers.filter': 'En oferta',

  'offers.alert.eyebrow': 'Oferta de {seller}',
  'offers.alert.title': 'Hay cursos en oferta, ¿te interesa?',
  'offers.alert.body': 'Un {percent} % de descuento en {count} cursos del catálogo, {until}.',
  'offers.alert.body.one': 'Un {percent} % de descuento en un curso del catálogo, {until}.',
  'offers.alert.see': 'Ver las ofertas',
  'offers.alert.later': 'Ahora no',

  'offers.cart.saving': 'Ahorras {amount} con la oferta de {seller}',
  'offers.cart.server':
    'El importe que cuenta es el que fija el servidor al abrir el pedido. Si la oferta acaba antes de que pagues, el servidor cobrará el precio vigente en ese momento, y esta página lo muestra antes de que apruebes en PayPal.',
  'offers.cart.differs':
    'No coincide con el total de arriba porque la oferta cambió antes de abrir el pedido.',
};
