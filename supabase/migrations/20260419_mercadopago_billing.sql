-- MercadoPago subscription billing.
--
-- Adds the fields to `profiles` that link a doctor to their MP subscription,
-- plus a `billing_events` audit table that mirrors every webhook we receive.
--
-- Applied in Supabase via the dashboard SQL editor (or `supabase db push` in CI).

-- 1. New columns on profiles.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text,
  ADD COLUMN IF NOT EXISTS mp_payer_id text,
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS plan_trial_ends_at timestamptz;

-- plan_status values:
--   'active'     — subscription authorized & paid through plan_valid_until
--   'trialing'   — free trial, no charge yet; valid_until = trial_ends_at
--   'past_due'   — charge failed; retry window open; we keep benefits for N days
--   'cancelled'  — user cancelled; benefits held until plan_valid_until, then downgraded
--   'expired'    — plan_valid_until elapsed while past_due → demoted to free

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_status_check
  CHECK (plan_status IN ('active','trialing','past_due','cancelled','expired'));

-- Quick lookup by MP preapproval id (webhook handler hits this)
CREATE INDEX IF NOT EXISTS idx_profiles_mp_preapproval ON profiles(mp_preapproval_id);

-- 2. Audit log of every MP webhook / admin action.
CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,           -- 'preapproval.authorized', 'payment.approved', etc.
  mp_resource_id text,                -- preapproval_id or payment_id
  mp_resource_type text,              -- 'preapproval' | 'payment'
  amount numeric(12, 2),
  currency text DEFAULT 'ARS',
  status text,                        -- mirrored MP status
  raw_payload jsonb,
  source text DEFAULT 'webhook',      -- 'webhook' | 'manual' | 'api'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_resource ON billing_events(mp_resource_id);

-- 3. RLS: a doctor can read their own billing events. Webhook function uses the
-- service-role key so RLS does not apply to it.
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_events_self_read" ON billing_events
  FOR SELECT
  USING (auth.uid() = user_id);
