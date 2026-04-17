# MediBot

SaaS platform for medical professionals to manage appointments, patients, and a WhatsApp booking bot.

**Live demo:** https://panel-medico-pied.vercel.app

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4 (via `@theme` CSS custom properties in `src/index.css`)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **WhatsApp Bot:** Supabase Edge Function (Deno) handling Twilio + Meta webhooks
- **Hosting:** Vercel
- **State:** State-based routing, no React Router. `activeView` state switches between main sections.

## Local setup

```bash
npm install
# Create .env.local with:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
npm run dev
```

## Project structure

```
src/
├── App.tsx                          # Main app: auth flow + Dashboard with all views
├── index.css                        # Tailwind @theme tokens (colors, etc.)
├── lib/
│   ├── supabase.ts                  # Supabase client
│   ├── hooks.ts                     # Data hooks (useProfile, useAppointments, etc.)
│   ├── plans.ts                     # Plan tiers (Free/Pro/Clinic) + feature gates
│   ├── theme.ts                     # Org branding: applyOrgTheme / clearOrgTheme
│   └── publicBooking.ts             # Public booking page logic
├── components/
│   ├── layout/Sidebar.tsx           # Left nav
│   ├── patient/PatientPanel.tsx     # Right panel (patient detail / day summary)
│   ├── agenda/                      # Agenda components (DayNav, AppointmentList, StatsGrid, MonthCalendar)
│   ├── patients/PatientsView.tsx
│   ├── blocks/BlocksView.tsx        # Vacations / blocked dates
│   ├── stats/StatsView.tsx          # Practice statistics
│   ├── config/BotConfigView.tsx     # WhatsApp bot templates
│   ├── profile/DoctorProfileView.tsx
│   ├── org/OrgAdminView.tsx         # Multi-tenant org management
│   ├── plans/                       # Pricing + paywall
│   └── public/                      # Public booking page (/p/:code)
└── data/appointments.ts             # TypeScript types
supabase/functions/whatsapp-bot/     # Edge Function for WhatsApp bot
```

## Design system (current)

Defined in `src/index.css` under `@theme`:

```css
--color-primary: #3C3489;      /* purple */
--color-primary-light: #EEEDFE;
--color-primary-mid: #AFA9EC;
--color-teal: #0F6E56;
--color-teal-light: #E1F5EE;
--color-coral: #993C1D;
--color-coral-light: #FAECE7;
--color-amber: #633806;
--color-amber-light: #FAEEDA;
--color-gray-bg: #F7F7F5;
--color-gray-border: rgba(0,0,0,0.1);
--color-text: #1a1a1a;
--color-text-muted: #666666;
--color-text-hint: #999999;
```

Base font: system font stack, 14px body.

**Component conventions:**
- Cards: `bg-white border border-gray-border rounded-[16px]`
- Big stat cards: `rounded-[16px]` with `text-[30px] font-bold`
- Hero titles: `text-[44px] font-bold tracking-tight`
- Pill buttons: `rounded-full px-5 py-2.5`
- Page background: `bg-gray-bg`

Orgs can override `--color-primary` and `--color-accent` at runtime via `applyOrgTheme()`.

## Main views

All views follow a Donezo-inspired layout:
- Gray background (`bg-gray-bg`)
- Large hero header (44px bold title + muted subtitle)
- Content as rounded-[16px] white cards

**Views:**
1. **Agenda** — week/month view, stat cards, day nav, appointment list
2. **Pacientes** — searchable patient list
3. **Bloqueos** — vacation/blocked date management
4. **Estadísticas** — KPIs, charts, insurance breakdown
5. **WhatsApp Bot** — customizable message templates (3 tabs: turnos / recordatorios / respuestas)
6. **Mi perfil** — doctor profile, avatar upload, shareable booking link
7. **Organización** — multi-tenant admin (members / invites / branding)

## Key features

- **Multi-tenant orgs** — doctors can join organizations, data stays per-doctor but grouped by org
- **Public booking page** — `/p/:code` for each doctor, no registration required for patients
- **WhatsApp bot** — patients book, reschedule, cancel via WhatsApp (Twilio sandbox)
- **Plans & paywall** — Free (10 patients) / Pro (unlimited + bot) / Clinic (multi-pro)
- **Org branding** — upload logo + custom colors, applied at runtime

## What's pending / open to redesign

- Overall visual hierarchy — current style is a rough Donezo imitation
- Mobile experience (currently desktop-first)
- Empty states
- Micro-interactions / animations
- Dark mode (not implemented)
- Icon system (using emojis as placeholders)
