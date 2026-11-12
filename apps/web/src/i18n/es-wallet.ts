import type { WalletCatalogue } from './en-wallet.ts';

/** El monedero: dinero añadido con PayPal, cursos pagados con el saldo y sus movimientos. */
export const walletEs: WalletCatalogue = {
  'wallet.eyebrow': 'MONEDERO · PAYPAL SANDBOX',
  'wallet.title': 'Tu monedero',
  'wallet.body':
    'Añade dinero con PayPal y paga tus cursos con el saldo. Rex busca cursos dentro de tu saldo; tú apruebas cada pago.',
  'wallet.sandbox': 'PayPal Sandbox: no se mueve dinero real.',
  'wallet.available': 'Disponible para gastar',
  'wallet.funded': 'Añadido con PayPal',
  'wallet.spent': 'Gastado en cursos',
  'wallet.add': 'Añadir fondos',
  'wallet.addBody': 'Elige un importe y apruébalo en PayPal. Cuenta en cuanto PayPal lo confirma.',
  'wallet.amount': 'Importe que añadir',
  'wallet.other': 'Otro',
  'wallet.otherAmount': 'Otro importe en {currency}',
  'wallet.limits': 'De {minimum} a {maximum}.',
  'wallet.added': '{amount} añadidos a tu monedero.',
  'wallet.movements': 'Movimientos',
  'wallet.noMovements': 'Todavía no hay movimientos. Aquí aparece el dinero que añadas con PayPal.',
  'wallet.kind.top-up': 'Añadido con PayPal',
  'wallet.kind.course-payment': 'Pagado con saldo',
  'wallet.kind.refund': 'Devuelto al saldo',
  'wallet.status.pending': 'Retenido por PayPal',
  'wallet.status.completed': 'Hecho',
  'wallet.status.failed': 'Rechazado',
  'wallet.status.mismatched': 'En devolución',
  'wallet.status.refunded': 'Devuelto a PayPal',
  'wallet.reference': 'Referencia de PayPal',
  'wallet.outcome.completed': 'Dinero recibido. Ya está en tu monedero.',
  'wallet.outcome.held':
    'PayPal está revisando este pago. Se añadirá a tu monedero en cuanto lo libere.',
  'wallet.outcome.review':
    'PayPal ha respondido, pero {brand} aún no ha podido confirmar este pago. No se añade nada hasta revisarlo. No vuelvas a pagar.',
  'wallet.outcome.failed': 'El pago no se ha completado. No se ha cobrado nada.',
  'wallet.outcome.mismatch':
    'El pago no coincidía con el importe pedido, así que no se ha añadido nada. El dinero vuelve a tu cuenta de PayPal.',
  'wallet.outcome.not-approved': 'PayPal aún no ha recibido tu aprobación. No se ha cobrado nada.',
  'wallet.outcome.refunded': 'Este pago ha vuelto a tu cuenta de PayPal. No se ha añadido nada.',
  'wallet.pay': 'Pagar {amount} con tu saldo',
  'wallet.payPlain': 'Pagar con tu saldo',
  'wallet.paying': 'Pagando con tu saldo',
  'wallet.paid': 'Pagado con tu saldo. Tus cursos están abiertos.',
  'wallet.short': 'Tu saldo de {available} no cubre {amount}.',
  'wallet.topUpLink': 'Añadir fondos a tu monedero',
  'wallet.orPayPal': 'O paga el importe completo con PayPal',
  'method.wallet': 'Saldo del monedero',
  'problem.insufficient_balance':
    'Tu monedero no tiene dinero suficiente para esto. Añade fondos con PayPal y vuelve a pagar.',
  'problem.sandbox_required': 'El monedero solo funciona con PayPal Sandbox.',
} as const;
