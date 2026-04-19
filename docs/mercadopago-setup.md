# MercadoPago — setup y go-live

Integración que reemplaza el flujo manual por WhatsApp. El médico hace clic
en un plan → redirige a MercadoPago → autoriza la tarjeta → MP nos avisa
vía webhook → activamos el plan automáticamente.

## Arquitectura

```
Navegador ── POST ──► Supabase Edge Function `mp-create-subscription`
                      │
                      └── POST /preapproval (access_token MP)
                          MP ─── 302 ──► init_point (checkout MP)
                                        │
                                        └── Usuario autoriza tarjeta
                                            │
                                            MP ── webhook ──► `mp-webhook`
                                                              │
                                                              └── UPDATE profiles
                                                                  INSERT billing_events
```

## 1. Correr la migración SQL

Desde el SQL editor de Supabase (Dashboard → SQL Editor) copiá y corré el
contenido de `supabase/migrations/20260419_mercadopago_billing.sql`.

Hace:

- Agrega `mp_preapproval_id`, `mp_payer_id`, `plan_status`, `plan_valid_until`,
  `plan_trial_ends_at` a `profiles`.
- Crea la tabla `billing_events` con RLS (el médico puede leer sus propios
  eventos).

Verifica que corrió:

```sql
select column_name from information_schema.columns
 where table_name = 'profiles' and column_name like 'mp_%';
-- debe devolver mp_preapproval_id y mp_payer_id
```

## 2. Crear la app en MercadoPago Developers

1. Entrá a <https://www.mercadopago.com.ar/developers/panel>.
2. Click en **Tus integraciones** → **Crear aplicación**.
3. Nombre: `MediBot · Suscripciones`.
4. En "¿Qué solución vas a integrar?" elegí **Pagos online / Suscripciones**.
5. Modelo de integración: **Pagos avanzados con Checkout Pro + Preapproval**.
6. Guardá.

Ahora entrá a la app creada y copiá dos valores de la pestaña **Credenciales
de producción**:

- **Access Token** (empieza con `APP_USR-...`)
- **Public Key** (no la usamos del lado del servidor, pero guardala)

Para desarrollo también anotá las **Credenciales de prueba** (mismo formato,
prefijo `TEST-`).

## 3. Crear los planes de suscripción

Hay dos formas: via UI o via API. Recomiendo API porque queda versionado.

### Opción A — via curl (recomendada)

Corré estos dos comandos reemplazando `$ACCESS_TOKEN`:

```bash
# Plan Pro — $18.000 ARS/mes, 14 días de trial
curl -X POST https://api.mercadopago.com/preapproval_plan \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "MediBot Pro",
    "auto_recurring": {
      "frequency": 1,
      "frequency_type": "months",
      "transaction_amount": 18000,
      "currency_id": "ARS",
      "free_trial": { "frequency": 14, "frequency_type": "days" }
    },
    "back_url": "https://panel-medico-pied.vercel.app/planes?upgrade=success",
    "payment_methods_allowed": {
      "payment_types": [{"id": "credit_card"}],
      "payment_methods": []
    }
  }'

# Plan Clinic — $45.000 ARS/mes, 14 días de trial
curl -X POST https://api.mercadopago.com/preapproval_plan \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "MediBot Clinic",
    "auto_recurring": {
      "frequency": 1,
      "frequency_type": "months",
      "transaction_amount": 45000,
      "currency_id": "ARS",
      "free_trial": { "frequency": 14, "frequency_type": "days" }
    },
    "back_url": "https://panel-medico-pied.vercel.app/planes?upgrade=success",
    "payment_methods_allowed": {
      "payment_types": [{"id": "credit_card"}],
      "payment_methods": []
    }
  }'
```

Cada respuesta incluye un `id` (formato `2c9380848a...`). Guardalos: los vas
a necesitar para las env vars del Edge Function.

> **Por qué solo `credit_card`**: débito no renueva automático en MP (es un
> pago único, no recurrente). Forzando crédito evitás que la suscripción
> muera después del primer mes.

### Opción B — via UI

Dashboard → Suscripciones → Crear plan. Completá los mismos valores a mano.
No recomendada.

## 4. Configurar el webhook en MP

1. En la app MP, pestaña **Notificaciones** → **Webhooks**.
2. URL de producción: `https://<tu-proyecto-ref>.supabase.co/functions/v1/mp-webhook`.
3. Eventos a escuchar (marcá los tres):
   - `subscription_preapproval`
   - `subscription_authorized_payment`
   - `payment`
4. MP te genera una **Secret key**. Copiala — es `MP_WEBHOOK_SECRET`.

## 5. Setear las env vars

### En Supabase (Functions → Secrets)

```
MP_ACCESS_TOKEN          = APP_USR-... (prod) / TEST-... (dev)
MP_WEBHOOK_SECRET        = <la Secret key del paso 4>
MP_PLAN_ID_PRO           = <id del plan Pro que creaste>
MP_PLAN_ID_CLINIC        = <id del plan Clinic que creaste>
PUBLIC_SITE_URL          = https://panel-medico-pied.vercel.app
SUPABASE_SERVICE_ROLE_KEY = <ya debería estar, pero verificá>
```

Supabase CLI:

```bash
supabase secrets set \
  MP_ACCESS_TOKEN="APP_USR-..." \
  MP_WEBHOOK_SECRET="..." \
  MP_PLAN_ID_PRO="..." \
  MP_PLAN_ID_CLINIC="..." \
  PUBLIC_SITE_URL="https://panel-medico-pied.vercel.app"
```

### En Vercel

No hacen falta nuevas vars en Vercel — todo el access token vive en las
Functions de Supabase, nunca en el navegador.

## 6. Deployar las Edge Functions

Desde la raíz del repo, con `supabase` CLI y `supabase login` hecho:

```bash
supabase functions deploy mp-webhook --no-verify-jwt
supabase functions deploy mp-create-subscription --no-verify-jwt
supabase functions deploy mp-cancel-subscription --no-verify-jwt
```

`--no-verify-jwt` porque el auth lo hacemos adentro de cada función (nuestro
webhook no tiene JWT; las otras dos validan el token contra auth.users).

## 7. Probar en sandbox

MP tiene dos cuentas de test: un **vendedor** y un **comprador**. Las tenés
que crear desde <https://www.mercadopago.com.ar/developers/panel/test-users>:

```bash
# Crear test user (vendedor) — usá el access token de prueba
curl -X POST https://api.mercadopago.com/users/test_user \
  -H "Authorization: Bearer $TEST_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"site_id": "MLA"}'
# devuelve { email, password, user_id }

# Crear test user (comprador) — otro ejecutar igual
```

Con las credenciales del vendedor, re-generás los planes Pro/Clinic en modo
test y seteás sus ids + el access token de test en Supabase (puedes tener
una app separada o usar la misma).

Entrás a `/planes` como médico, hacés click en Pro → te redirige a MP
checkout. Iniciá sesión con el comprador de test, pagá con una tarjeta de
prueba:

| Tarjeta                    | Resultado   |
| -------------------------- | ----------- |
| `5031 7557 3453 0604` 123  | Aprobada    |
| `5031 1111 1111 6000` 123  | Rechazada   |
| `4509 9535 6623 3704` 123  | Aprobada Visa |

CVV: `123`, fecha: cualquier futura, titular: `APRO`.

Al volver a la app, el webhook tiene que haber disparado y tu `plan` ser `pro`.
Verificalo con:

```sql
select plan, plan_status, mp_preapproval_id, plan_valid_until
  from profiles where id = '<tu-user-id>';

select event_type, status, amount, created_at
  from billing_events where user_id = '<tu-user-id>'
  order by created_at desc;
```

## 8. Go-live

Cuando todo funcione en test:

1. En Supabase, reemplazá el `MP_ACCESS_TOKEN` y los `MP_PLAN_ID_*` por los
   de producción.
2. Asegurate que el webhook en MP apunta al Edge Function real de tu
   proyecto prod (no uno de desarrollo).
3. Borrá los test users si no los vas a usar más.

## 9. Mantenimiento — a tener en cuenta

### Cron de downgrade automático

Cuando el médico cancela, queda con `plan_status = 'cancelled'` pero
mantiene los beneficios hasta `plan_valid_until`. Después hay que demoter
a Free. Tenés dos opciones:

**Simple**: agregar un check en el client que lee `plan_valid_until` y
trata al doctor como Free si ya pasó. Funciona pero el row en DB queda
desactualizado.

**Correcto**: crear un Scheduled Function en Supabase (Dashboard → Database
→ Cron Jobs):

```sql
select cron.schedule(
  'demote-expired-plans',
  '0 3 * * *',  -- 3 AM diario
  $$
    update profiles
       set plan = 'free', plan_status = 'expired'
     where plan_status in ('cancelled', 'past_due')
       and plan_valid_until < now()
  $$
);
```

### Ajuste de precios por inflación

Cuando necesites subir el precio:

1. Crear **nuevos** planes en MP (no podés editar los auto_recurring de un plan
   ya autorizado por usuarios).
2. Actualizar `MP_PLAN_ID_PRO` / `MP_PLAN_ID_CLINIC` en Supabase secrets.
3. Los usuarios viejos quedan en el precio viejo (bueno para retención).
4. Los usuarios nuevos agarran el precio nuevo.

### Reembolsos y disputas

Por ahora manuales. Entrás al dashboard MP, buscás la transacción, reembolsás.
El webhook `payment.refunded` te actualiza el status automáticamente.

## 10. Cosas que quedan para después

- **Dashboard de MRR / churn** en `/planes` con reporting propio (sobre
  `billing_events`).
- **Dunning**: email/WA al médico cuando MP rebota una tarjeta (hoy solo
  marcamos `past_due` pero no avisamos).
- **Factura AFIP automática** (integrar Afipsdk o Facturante).
- **Plan anual con 20% off** (crear un tercer plan, UI con toggle mensual/anual).
- **Cupones / descuentos** (requiere planes distintos en MP por cada cupón).
