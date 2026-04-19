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
    description: 'Para empezar.',
    features: [
      'Hasta 10 pacientes',
      'Agenda web completa',
      'Link público de reservas',
      'Recordatorios manuales por WhatsApp',
      '1 profesional',
      'Soporte por email',
    ],
    limits: {
      patients: 10,
      organizationEnabled: false,
      customBranding: false,
      stats: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19,
    description: 'Para profesionales independientes.',
    highlighted: true,
    features: [
      'Todo lo de Free',
      'Pacientes ilimitados',
      'Marca propia: logo y colores',
      'Link público con tu identidad',
      'Estadísticas completas',
      'Soporte prioritario',
    ],
    limits: {
      patients: null,
      organizationEnabled: false,
      customBranding: true,
      stats: true,
    },
  },
  clinic: {
    id: 'clinic',
    name: 'Clinic',
    price: 49,
    description: 'Para consultorios y clínicas.',
    features: [
      'Todo lo de Pro',
      'Hasta 10 profesionales',
      'Agenda centralizada del consultorio',
      'Panel de administración',
      'Invitar y gestionar médicos',
      'Estadísticas por profesional y globales',
      'Soporte prioritario',
    ],
    limits: {
      patients: null,
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

export function canCreateOrg(planId: PlanId | string | null | undefined): boolean {
  return getPlan(planId).limits.organizationEnabled
}

export function canCustomBranding(planId: PlanId | string | null | undefined): boolean {
  return getPlan(planId).limits.customBranding
}
