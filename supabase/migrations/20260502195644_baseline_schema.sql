--
-- PostgreSQL database dump
--

\restrict hJBg9HppQ4kvH8bVKftyTk70eUpaluuRbvDoCznATNVbdiOFFSylYVpbD1UFQhJ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: accept_invite(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_invite(p_invite_code text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_invite RECORD;
  v_org RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error', 'No autenticado'); END IF;
  SELECT * INTO v_invite FROM organization_invites WHERE invite_code = p_invite_code;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Codigo invalido'); END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN json_build_object('error', 'Invitacion expirada');
  END IF;
  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN json_build_object('error', 'Invitacion agotada');
  END IF;
  IF EXISTS (SELECT 1 FROM organization_members WHERE organization_id = v_invite.organization_id AND user_id = auth.uid()) THEN
    SELECT name INTO v_org FROM organizations WHERE id = v_invite.organization_id;
    RETURN json_build_object('already_member', true, 'organization_name', v_org.name);
  END IF;
  INSERT INTO organization_members (organization_id, user_id, role) VALUES (v_invite.organization_id, auth.uid(), 'member');
  UPDATE organization_invites SET use_count = use_count + 1 WHERE id = v_invite.id;
  SELECT name INTO v_org FROM organizations WHERE id = v_invite.organization_id;
  RETURN json_build_object('success', true, 'organization_id', v_invite.organization_id, 'organization_name', v_org.name);
END;
$$;


--
-- Name: generate_booking_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_booking_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.booking_code IS NULL THEN
    NEW.booking_code := substring(gen_random_uuid()::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid,
    patient_id uuid,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    duration text DEFAULT '50 min'::text,
    patient_name text,
    detail text,
    status text DEFAULT 'libre'::text,
    created_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    location_id uuid
);


--
-- Name: billing_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    event_type text NOT NULL,
    mp_resource_id text,
    mp_resource_type text,
    amount numeric(12,2),
    currency text DEFAULT 'ARS'::text,
    status text,
    raw_payload jsonb,
    source text DEFAULT 'webhook'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bot_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_sessions (
    phone text NOT NULL,
    step text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: bot_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid,
    template_key text NOT NULL,
    message text NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: date_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.date_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid,
    from_date date NOT NULL,
    to_date date NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid,
    name text NOT NULL,
    address text NOT NULL,
    city text DEFAULT ''::text,
    notes text DEFAULT ''::text,
    work_days text[] DEFAULT ARRAY[]::text[],
    work_from time without time zone,
    work_to time without time zone,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: organization_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    invite_code text NOT NULL,
    created_by uuid NOT NULL,
    max_uses integer,
    use_count integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organization_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    logo_url text,
    primary_color text,
    accent_color text,
    address text,
    city text
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid,
    name text NOT NULL,
    phone text,
    email text,
    age text,
    since text,
    insurance text,
    last_visit text,
    total_sessions integer DEFAULT 0,
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    dni text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    specialty text,
    license text,
    phone text,
    email text,
    address text,
    city text,
    bio text,
    work_days text[],
    work_from time without time zone,
    work_to time without time zone,
    session_duration integer DEFAULT 50,
    price_particular integer,
    bank_alias text,
    needs_onboarding boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    booking_code text,
    plan text DEFAULT 'free'::text,
    avatar_url text,
    mp_preapproval_id text,
    mp_payer_id text,
    plan_status text DEFAULT 'active'::text NOT NULL,
    plan_valid_until timestamp with time zone,
    plan_trial_ends_at timestamp with time zone,
    CONSTRAINT profiles_plan_status_check CHECK ((plan_status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text, 'cancelled'::text, 'expired'::text])))
);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: billing_events billing_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_events
    ADD CONSTRAINT billing_events_pkey PRIMARY KEY (id);


--
-- Name: bot_sessions bot_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_sessions
    ADD CONSTRAINT bot_sessions_pkey PRIMARY KEY (phone);


--
-- Name: bot_templates bot_templates_doctor_id_template_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_templates
    ADD CONSTRAINT bot_templates_doctor_id_template_key_key UNIQUE (doctor_id, template_key);


--
-- Name: bot_templates bot_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_templates
    ADD CONSTRAINT bot_templates_pkey PRIMARY KEY (id);


--
-- Name: date_blocks date_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.date_blocks
    ADD CONSTRAINT date_blocks_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: organization_invites organization_invites_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_invite_code_key UNIQUE (invite_code);


--
-- Name: organization_invites organization_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_booking_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_booking_code_key UNIQUE (booking_code);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: idx_billing_events_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_events_resource ON public.billing_events USING btree (mp_resource_id);


--
-- Name: idx_billing_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_events_user ON public.billing_events USING btree (user_id, created_at DESC);


--
-- Name: idx_locations_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_doctor ON public.locations USING btree (doctor_id);


--
-- Name: idx_profiles_mp_preapproval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_mp_preapproval ON public.profiles USING btree (mp_preapproval_id);


--
-- Name: profiles auto_generate_booking_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_generate_booking_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.generate_booking_code();


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id);


--
-- Name: appointments appointments_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: billing_events billing_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_events
    ADD CONSTRAINT billing_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bot_templates bot_templates_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_templates
    ADD CONSTRAINT bot_templates_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id);


--
-- Name: date_blocks date_blocks_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.date_blocks
    ADD CONSTRAINT date_blocks_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id);


--
-- Name: organization_members fk_org_members_profile; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT fk_org_members_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: locations locations_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: organization_invites organization_invites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: organization_invites organization_invites_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: patients patients_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: organization_invites Admins can create invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create invites" ON public.organization_invites FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'admin'::text)))));


--
-- Name: organization_invites Admins can delete invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete invites" ON public.organization_invites FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = 'admin'::text)))));


--
-- Name: organization_invites Anyone can read invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read invites" ON public.organization_invites FOR SELECT USING (true);


--
-- Name: appointments Doctors manage own appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors manage own appointments" ON public.appointments USING ((auth.uid() = doctor_id));


--
-- Name: date_blocks Doctors manage own blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors manage own blocks" ON public.date_blocks USING ((auth.uid() = doctor_id));


--
-- Name: patients Doctors manage own patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors manage own patients" ON public.patients USING ((auth.uid() = doctor_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_events billing_events_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_events_self_read ON public.billing_events FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bot_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_sessions bot_sessions_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bot_sessions_all ON public.bot_sessions USING (true);


--
-- Name: bot_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_templates bot_templates_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bot_templates_all ON public.bot_templates USING (true);


--
-- Name: date_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.date_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: locations locations_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY locations_owner_all ON public.locations USING ((doctor_id = auth.uid())) WITH CHECK ((doctor_id = auth.uid()));


--
-- Name: locations locations_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY locations_public_read ON public.locations FOR SELECT USING (true);


--
-- Name: organization_members members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_delete ON public.organization_members FOR DELETE USING (true);


--
-- Name: organization_members members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_insert ON public.organization_members FOR INSERT WITH CHECK (true);


--
-- Name: organization_members members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_select ON public.organization_members FOR SELECT USING (true);


--
-- Name: organizations org_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_insert ON public.organizations FOR INSERT WITH CHECK (true);


--
-- Name: organizations org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_select ON public.organizations FOR SELECT USING (true);


--
-- Name: organizations org_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_update ON public.organizations FOR UPDATE USING (true);


--
-- Name: organization_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments public_appointment_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_appointment_insert ON public.appointments FOR INSERT WITH CHECK (true);


--
-- Name: appointments public_appointment_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_appointment_read ON public.appointments FOR SELECT USING (true);


--
-- Name: date_blocks public_date_blocks_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_date_blocks_read ON public.date_blocks FOR SELECT USING (true);


--
-- Name: patients public_patient_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_patient_insert ON public.patients FOR INSERT WITH CHECK (true);


--
-- Name: profiles public_profile_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_profile_read ON public.profiles FOR SELECT USING ((booking_code IS NOT NULL));


--
-- PostgreSQL database dump complete
--

\unrestrict hJBg9HppQ4kvH8bVKftyTk70eUpaluuRbvDoCznATNVbdiOFFSylYVpbD1UFQhJ

