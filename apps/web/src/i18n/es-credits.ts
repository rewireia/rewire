import type { creditsEn } from './en-credits.ts';

/** Spanish messages of the pages "Credits and sources" and "Privacy". */
export const creditsEs: Readonly<Record<keyof typeof creditsEn, string>> = {
  'credits.eyebrow': 'Créditos y fuentes',
  'credits.title': 'De dónde sale cada cifra',
  'credits.lede':
    'Cada fuente oficial que usa {brand}, con su editor, versión, licencia, día de consulta y el crédito que pide su licencia; después, de dónde salen los cursos de la lista y el crédito de la fotografía de portada.',
  'credits.data.title': 'Fuentes de datos',
  'credits.library.title': 'Biblioteca',
  'credits.library.body':
    'Cada documento de la biblioteca pertenece a quien lo publica, que responde de lo que dice. {brand} enlaza a él y nunca lo copia.',
  'privacy.eyebrow': 'Privacidad',
  'privacy.title': 'Qué guarda {brand} y qué no',
  'privacy.ai.title': 'Rex y Tempo',
  'privacy.payments.title': 'Pagos',
  'privacy.payments.body':
    'El correo de tu empresa va a PayPal con la factura y {brand} no lo conserva.',
  'privacy.link': 'Privacidad',
};
