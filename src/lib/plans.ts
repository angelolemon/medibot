export type PlanId = 'free' | 'pro' | 'clinic'

export interface Plan {
  id: PlanId
  name: string
  price: number // USD per month
  description: string
  features: string[]
  highlighted?: boolean
  limits: {
    patients: number | null // null = unlimited
    whatsappEnabled: boolean
    whatsappMessages: number | null // null = unlimited
    organizationEnabled: boolean
    customBranding: boolean
    stats: boolean
  }
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Para probar la plataforma',
    features: [
      'Hasta 10 pacientes',
      'Agenda web completa',
      'Página pública de turnos',
      '1 profesional',
      'Soporte por email',
    ],
    limits: {
      patients: 10,
      whatsappEnabled: false,
      whatsappMessages: 0,
      organizationEnabled: false,
      customBranding: false,
      stats: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19,
    description: 'Para profesionales independientes',
    highlighted: true,
    features: [
      'Pacientes ilimitados',
      'Bot de WhatsApp con templates',
      'Hasta 500 mensajes WhatsApp/mes',
      'Página pública con marca propia',
      'Estadísticas completas',
      'Logo y colores personalizados',
      '1 profesional',
    ],
    limits: {
      patients: null,
      whatsappEnabled: true,
      whatsappMessages: 500,
      organizationEnabled: false,
      customBranding: true,
      stats: true,
    },
  },
  clinic: {
    id: 'clinic',
    name: 'Clinic',
    price: 49,
    description: 'Para consultorios y clínicas',
    features: [
      'Todo lo de Pro',
      'Hasta 10 profesionales',
      'Mensajes WhatsApp ilimitados',
      'Panel de administración',
      'Invitar y gestionar médicos',
      'Estadísticas por profesional y globales',
      'Soporte prioritario',
    ],
    limits: {
      patients: null,
      whatsappEnabled: true,
      whatsappMessages: null,
      organizationEnabled: true,
      customBranding: true,
      stats: true,
    },
  },
}

export function getPlan(planId: PlanId | string | null | undefined): Plan {
  if (planId && planId in PLANS) return PLANS[planId as PlanId]
  return PLANS.free
}

export function canAddPatient(planId: PlanId | string | null | undefined, currentCount: number): boolean {
  const plan = getPlan(planId)
  if (plan.limits.patients === null) return true
  return currentCount < plan.limits.patients
}

export function canUseBot(planId: PlanId | string | null | undefined): boolean {
  return getPlan(planId).limits.whatsappEnabled
}

export function canCreateOrg(planId: PlanId | string | null | undefined): boolean {
  return getPlan(planId).limits.organizationEnabled
}

export function canCustomBranding(planId: PlanId | string | null | undefined): boolean {
  return getPlan(planId).limits.customBranding
}
