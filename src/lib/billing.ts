// Billing config — manual WhatsApp flow (Fase 1).
// Cambialo acá cuando cambie tu número, o movelo a una env var cuando quieras.

/** Tu número de WhatsApp donde llegan los pedidos de contratación. */
export const BILLING_WHATSAPP = '5492325400851'    // sin +, sin 15, solo dígitos con 549

/** Nombre del negocio que aparece en el mensaje. */
export const BUSINESS_NAME = 'MediBot'

/**
 * Genera el link wa.me para contratar un plan.
 * El mensaje viene pre-cargado con el plan, el período y el precio.
 */
export function billingWhatsappLink({
  planName,
  planPrice,
  period,
  doctorName,
  doctorEmail,
}: {
  planName: string
  planPrice: number
  period: 'monthly' | 'yearly'
  doctorName?: string
  doctorEmail?: string
}): string {
  const periodLabel = period === 'yearly' ? 'anual' : 'mensual'
  const effectivePrice = period === 'yearly' ? Math.round(planPrice * 0.8) : planPrice
  const billingLabel = period === 'yearly' ? `USD ${effectivePrice}/mes · facturación anual` : `USD ${effectivePrice}/mes`

  const identity = doctorName
    ? `Hola ${BUSINESS_NAME}, soy *${doctorName}*${doctorEmail ? ` (${doctorEmail})` : ''}`
    : `Hola ${BUSINESS_NAME}`

  const message = [
    identity + '.',
    '',
    `Quiero contratar el plan *${planName} ${periodLabel}* (${billingLabel}).`,
    '',
    '¿Me pasan los pasos y el medio de pago?',
  ].join('\n')

  return `https://wa.me/${BILLING_WHATSAPP}?text=${encodeURIComponent(message)}`
}
