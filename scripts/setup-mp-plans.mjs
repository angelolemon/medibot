// One-shot helper to create the MP preapproval_plans for MediBot.
//
// Usage:
//   ACCESS_TOKEN="APP_USR-..." node scripts/setup-mp-plans.mjs
//
// Or with the test token while setting up:
//   ACCESS_TOKEN="TEST-..." node scripts/setup-mp-plans.mjs
//
// Prints the plan ids you need to paste into Supabase secrets:
//   MP_PLAN_ID_PRO=...
//   MP_PLAN_ID_CLINIC=...

const ACCESS_TOKEN = process.env.ACCESS_TOKEN
if (!ACCESS_TOKEN) {
  console.error('✗ Falta ACCESS_TOKEN. Usá: ACCESS_TOKEN="APP_USR-..." node scripts/setup-mp-plans.mjs')
  process.exit(1)
}

const BACK_URL = 'https://panel-medico-pied.vercel.app/planes?upgrade=success'

async function createPlan({ reason, amount }) {
  const res = await fetch('https://api.mercadopago.com/preapproval_plan', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: 'ARS',
        free_trial: { frequency: 14, frequency_type: 'days' },
      },
      back_url: BACK_URL,
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }],
        payment_methods: [],
      },
    }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    console.error(`✗ MP respondió ${res.status} al crear "${reason}":`)
    console.error(JSON.stringify(body, null, 2))
    return null
  }
  return body
}

console.log('◇ Creando planes en MercadoPago…\n')

const pro = await createPlan({ reason: 'MediBot Pro', amount: 18000 })
if (!pro) process.exit(1)
console.log(`✓ Pro creado`)

const clinic = await createPlan({ reason: 'MediBot Clinic', amount: 45000 })
if (!clinic) process.exit(1)
console.log(`✓ Clinic creado\n`)

console.log('────────────────────────────────────────────────────')
console.log('Copiá estos valores a los Secrets de Supabase:')
console.log('────────────────────────────────────────────────────')
console.log(`MP_PLAN_ID_PRO    = ${pro.id}`)
console.log(`MP_PLAN_ID_CLINIC = ${clinic.id}`)
console.log('────────────────────────────────────────────────────')
