import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { initialAppointments, allPatients, getWeekForDate, shiftWeek, getDatesBetween, type Appointment, type Patient, type DateBlock } from './data/appointments'
import { useProfile, usePatients, useAppointments, useOrgAppointments, useOrgPatients, useDateBlocks, useOrgDateBlocks, useOrganizations, type Organization } from './lib/hooks'
import { applyOrgTheme, clearOrgTheme } from './lib/theme'
import Sidebar, { type View } from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import DayNav from './components/agenda/DayNav'
import AppointmentList from './components/agenda/AppointmentList'
import PatientPanel from './components/patient/PatientPanel'
import PatientsView from './components/patients/PatientsView'
import PatientDetailPanel from './components/patients/PatientDetailPanel'
import BlocksView from './components/blocks/BlocksView'
import MonthCalendar from './components/agenda/MonthCalendar'
import StatsView from './components/stats/StatsView'
import BotConfigView from './components/config/BotConfigView'
import DoctorProfileView from './components/profile/DoctorProfileView'
import PlansView from './components/plans/PlansView'
import PaywallModal from './components/plans/PaywallModal'
import { canUseBot, canCreateOrg, type PlanId } from './lib/plans'
import LoginView from './components/auth/LoginView'
import RegisterView from './components/auth/RegisterView'
import OrgAdminView from './components/org/OrgAdminView'
import JoinOrgView from './components/org/JoinOrgView'
import CreateOrgModal from './components/org/CreateOrgModal'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import PublicBookingPage from './components/public/PublicBookingPage'
import Icon from './components/Icon'
import Btn from './components/Btn'
import PageHeader from './components/PageHeader'

type AuthScreen = 'loading' | 'login' | 'register' | 'onboarding' | 'join-org' | 'app' | 'public-booking'
type AgendaMode = 'week' | 'month'

export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>('loading')
  const [userFirstName, setUserFirstName] = useState('')
  const [userLastName, setUserLastName] = useState('')
  const [pendingInvite, setPendingInvite] = useState<string | null>(null)
  const [publicBookingCode, setPublicBookingCode] = useState<string | null>(null)

  useEffect(() => {
    // Detect public booking URL: /p/:code
    const pathMatch = window.location.pathname.match(/^\/p\/([a-f0-9]{8})\/?$/)
    if (pathMatch) {
      setPublicBookingCode(pathMatch[1])
      setAuthScreen('public-booking')
      return
    }

    // Detect invite code in URL
    const params = new URLSearchParams(window.location.search)
    const inviteCode = params.get('invite')
    if (inviteCode) {
      localStorage.setItem('pending_invite', inviteCode)
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile(session.user.id)
      } else {
        setAuthScreen('login')
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadProfile(session.user.id)
      } else {
        setAuthScreen('login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, needs_onboarding')
      .eq('id', userId)
      .single()

    if (profile) {
      setUserFirstName(profile.first_name || '')
      setUserLastName(profile.last_name || '')
      if (profile.needs_onboarding) {
        setAuthScreen('onboarding')
      } else {
        const invite = localStorage.getItem('pending_invite')
        if (invite) {
          setPendingInvite(invite)
          setAuthScreen('join-org')
        } else {
          setAuthScreen('app')
        }
      }
    } else {
      setAuthScreen('onboarding')
    }
  }

  const handleLoginSuccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) loadProfile(user.id)
  }

  const handleRegisterSuccess = () => {
    setAuthScreen('login')
  }

  const handleOnboardingComplete = () => {
    setAuthScreen('app')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAuthScreen('login')
    setUserFirstName('')
    setUserLastName('')
  }

  if (authScreen === 'public-booking' && publicBookingCode) {
    return <PublicBookingPage bookingCode={publicBookingCode} />
  }

  if (authScreen === 'loading') {
    return (
      <div className="min-h-screen bg-gray-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-primary mb-2">MediBot</div>
          <div className="text-sm text-text-hint">Cargando...</div>
        </div>
      </div>
    )
  }

  if (authScreen === 'login') {
    return <LoginView onLoginSuccess={handleLoginSuccess} onGoToRegister={() => setAuthScreen('register')} />
  }

  if (authScreen === 'register') {
    return <RegisterView onRegisterSuccess={handleRegisterSuccess} onGoToLogin={() => setAuthScreen('login')} />
  }

  if (authScreen === 'onboarding') {
    return <OnboardingWizard firstName={userFirstName} lastName={userLastName} onComplete={handleOnboardingComplete} />
  }

  if (authScreen === 'join-org' && pendingInvite) {
    return (
      <JoinOrgView
        inviteCode={pendingInvite}
        onJoined={() => {
          localStorage.removeItem('pending_invite')
          setPendingInvite(null)
          setAuthScreen('app')
        }}
        onSkip={() => {
          localStorage.removeItem('pending_invite')
          setPendingInvite(null)
          setAuthScreen('app')
        }}
      />
    )
  }

  return <Dashboard onLogout={handleLogout} />
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<View>('agenda')
  const [agendaMode, setAgendaMode] = useState<AgendaMode>('week')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showPlans, setShowPlans] = useState(false)
  const [paywall, setPaywall] = useState<{ title: string; description: string; requiredPlan: 'pro' | 'clinic' } | null>(null)

  // Load user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Supabase data hooks
  const { profile } = useProfile(userId)
  const { organizations, memberships, create: createOrg } = useOrganizations(userId)
  const { patients: supaPatients, loading: patientsLoading } = usePatients(userId)
  const { appointments: supaAppointments, loading: apptsLoading, updateStatus: updateApptStatus, add: addAppointment } = useAppointments(userId)
  const { appointments: orgAppointments } = useOrgAppointments(currentOrg?.id ?? null)
  const { patients: orgPatients } = useOrgPatients(currentOrg?.id ?? null)
  const { blocks: orgBlocks } = useOrgDateBlocks(currentOrg?.id ?? null)
  const { blocks: supaBlocks, loading: blocksLoading, add: addBlock, remove: removeBlock } = useDateBlocks(userId)

  // Apply org theme
  useEffect(() => {
    if (currentOrg) {
      applyOrgTheme(currentOrg.primary_color, currentOrg.accent_color)
    } else {
      clearOrgTheme()
    }
    return () => clearOrgTheme()
  }, [currentOrg])

  // Fall back to mock data while Supabase is empty or loading
  const hasSupaData = supaAppointments.length > 0
  const personalAppointments = hasSupaData ? supaAppointments : initialAppointments
  const appointments = currentOrg ? orgAppointments : personalAppointments
  const personalPatients = supaPatients.length > 0 ? supaPatients : allPatients
  const patients = currentOrg ? orgPatients : personalPatients
  const personalBlocks = supaBlocks.length > 0 ? supaBlocks : []
  const blocks = currentOrg ? orgBlocks : personalBlocks

  const weekDays = getWeekForDate(selectedDate)
  const filteredAppointments = appointments.filter((a) => a.date === selectedDate)
  const selectedAppointment = appointments.find((a) => a.id === selectedId) ?? null
  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter((a) => a.date === today)

  const blockedDates = useMemo(() => {
    const set = new Set<string>()
    for (const block of blocks) {
      for (const date of getDatesBetween(block.from, block.to)) {
        set.add(date)
      }
    }
    return set
  }, [blocks])

  const isSelectedDateBlocked = blockedDates.has(selectedDate)
  const blockForSelectedDate = blocks.find((b) => selectedDate >= b.from && selectedDate <= b.to)

  const handleSelect = (appointment: Appointment) => {
    setSelectedId((prev) => (prev === appointment.id ? null : appointment.id))
  }

  const handleDaySelect = (date: string) => {
    setSelectedDate(date)
    setSelectedId(null)
  }

  const handleMonthDaySelect = (date: string) => {
    setSelectedDate(date)
    setSelectedId(null)
  }

  const handlePrevWeek = () => {
    setSelectedDate((prev) => shiftWeek(prev, -1))
    setSelectedId(null)
  }

  const handleNextWeek = () => {
    setSelectedDate((prev) => shiftWeek(prev, 1))
    setSelectedId(null)
  }

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) { setCalendarYear((y) => y - 1); return 11 }
      return prev - 1
    })
  }

  const handleNextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) { setCalendarYear((y) => y + 1); return 0 }
      return prev + 1
    })
  }

  const handleCancel = async (id: string) => {
    if (hasSupaData) {
      await updateApptStatus(id, 'cancelado')
    }
    // Also update local state for immediate feedback
    // (hook already updates via setAppointments in updateStatus)
  }

  const handleSendIndicaciones = (appointment: Appointment) => {
    alert(`Enviando indicaciones por WhatsApp a ${appointment.patientName}...`)
  }

  const handleRecordar = (appointment: Appointment) => {
    alert(`Enviando recordatorio por WhatsApp a ${appointment.patientName}...`)
  }

  const isOrgAdmin = currentOrg ? memberships[currentOrg.id] === 'admin' : false

  const currentPlan = (profile?.plan || 'free') as PlanId

  const handleNavigate = (view: View) => {
    // Paywall: bot config requires Pro
    if (view === 'config' && !canUseBot(currentPlan)) {
      setPaywall({
        title: 'Activá el bot de WhatsApp',
        description: 'El bot automatiza turnos, recordatorios y consultas por WhatsApp. Disponible en el plan Pro.',
        requiredPlan: 'pro',
      })
      return
    }
    setActiveView(view)
    setSelectedPatient(null)
  }

  const handleSwitchOrg = (org: Organization | null) => {
    setCurrentOrg(org)
    setActiveView('agenda')
  }

  const handleCreateOrgAttempt = () => {
    if (!canCreateOrg(currentPlan)) {
      setPaywall({
        title: 'Gestión multi-profesional',
        description: 'Para crear organizaciones y sumar médicos a tu consultorio necesitás el plan Clinic.',
        requiredPlan: 'clinic',
      })
      return
    }
    setShowCreateOrg(true)
  }

  const handleAddBlock = async (data: Omit<DateBlock, 'id' | 'createdAt'>) => {
    await addBlock({ from: data.from, to: data.to, reason: data.reason })
  }

  const handleRemoveBlock = async (id: string) => {
    await removeBlock(id)
  }

  const handleUnblockDate = () => {
    if (blockForSelectedDate) {
      handleRemoveBlock(blockForSelectedDate.id)
    }
  }

  const handleBlockHours = async (date: string, from: string, to: string) => {
    // Update affected appointments to bloqueado
    for (const a of appointments) {
      if (a.date === date && a.time >= from && a.time < to) {
        if (a.status !== 'libre' && a.status !== 'bloqueado') {
          await updateApptStatus(a.id, 'bloqueado', `Turno cancelado · ${a.detail}`)
        } else if (a.status === 'libre') {
          await updateApptStatus(a.id, 'bloqueado')
        }
      }
    }
    // Add blocked slot entries for times without existing appointments
    const existingTimes = new Set(appointments.filter((a) => a.date === date).map((a) => a.time))
    const [startH] = from.split(':').map(Number)
    const [endH] = to.split(':').map(Number)
    for (let h = startH; h < endH; h++) {
      const time = `${String(h).padStart(2, '0')}:00`
      if (!existingTimes.has(time)) {
        await addAppointment({
          patient_id: null,
          date,
          time,
          duration: '50 min',
          patient_name: null,
          detail: '',
          status: 'bloqueado',
        })
      }
    }
  }

  const handleToggleAgendaMode = () => {
    if (agendaMode === 'week') {
      const d = new Date(selectedDate + 'T12:00:00')
      setCalendarMonth(d.getMonth())
      setCalendarYear(d.getFullYear())
      setAgendaMode('month')
    } else {
      setAgendaMode('week')
    }
  }

  const currentDay = weekDays.find((d) => d.date === selectedDate)
  const dayLabel = currentDay ? currentDay.label.replace('Hoy ', '') : selectedDate.slice(5)
  const todayISO = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === todayISO
  const selectedDateObj = new Date(selectedDate + 'T12:00:00')
  const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const heroTitle = isToday ? 'Hoy' : weekdays[selectedDateObj.getDay()]
  const heroSubtitle = `${weekdays[selectedDateObj.getDay()]} ${selectedDateObj.getDate()} de ${months[selectedDateObj.getMonth()]}`
  const confirmadosCount = filteredAppointments.filter((a) => a.status === 'confirmado').length
  const pendientesCount = filteredAppointments.filter((a) => a.status === 'pendiente').length
  const canceladosCount = filteredAppointments.filter((a) => a.status === 'cancelado').length

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        agendaBadge={todayAppointments.length}
        onLogout={onLogout}
        doctorName={profile ? `${profile.first_name} ${profile.last_name}`.trim() : undefined}
        doctorSub={profile ? [profile.specialty, profile.license ? `Mat. ${profile.license}` : ''].filter(Boolean).join(' · ') : undefined}
        organizations={organizations}
        currentOrg={currentOrg}
        isOrgAdmin={isOrgAdmin}
        onSwitchOrg={handleSwitchOrg}
        onCreateOrg={handleCreateOrgAttempt}
        currentPlan={currentPlan}
      />

      {activeView === 'agenda' && (
        <>
          <div className="flex-1 flex flex-col h-screen overflow-hidden bg-bg">
            <div className="px-8 sm:px-10 pt-8 pb-10 overflow-y-auto flex-1 pb-20 lg:pb-10">
              <PageHeader
                title="Agenda."
                subtitle={<span className="capitalize">{heroSubtitle} · {filteredAppointments.length} {filteredAppointments.length === 1 ? 'turno programado' : 'turnos programados'}</span>}
                right={
                  <>
                    <Btn
                      variant={agendaMode === 'month' ? 'primary' : 'secondary'}
                      onClick={handleToggleAgendaMode}
                    >
                      <Icon name="cal2" size={13} /> {agendaMode === 'week' ? 'Mes' : 'Semana'}
                    </Btn>
                    <Btn variant="primary">
                      <Icon name="plus" size={13} /> Nuevo turno
                    </Btn>
                  </>
                }
              />

              {agendaMode === 'week' ? (
                <>
                  {/* Week nav */}
                  <div className="mb-5">
                    <DayNav
                      days={weekDays}
                      selectedDate={selectedDate}
                      blockedDates={blockedDates}
                      onSelect={handleDaySelect}
                      onPrevWeek={handlePrevWeek}
                      onNextWeek={handleNextWeek}
                      appointmentCounts={weekDays.reduce((acc, d) => {
                        acc[d.date] = appointments.filter((a) => a.date === d.date).length
                        return acc
                      }, {} as Record<string, number>)}
                    />
                  </div>

                  {/* Stat strip — 4 cols inside single card with dividers */}
                  <div className="bg-surface border border-gray-border rounded-[12px] overflow-hidden mb-5 grid grid-cols-4 divide-x divide-gray-border">
                    {[
                      { label: 'Total', value: filteredAppointments.length, dot: 'hint' as const },
                      { label: 'Confirmados', value: confirmadosCount, dot: 'teal' as const },
                      { label: 'Pendientes', value: pendientesCount, dot: 'amber' as const },
                      { label: 'Cancelados', value: canceladosCount, dot: 'coral' as const },
                    ].map((s) => (
                      <div key={s.label} className="px-5 py-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            s.dot === 'teal' ? 'bg-teal'
                              : s.dot === 'amber' ? 'bg-amber'
                                : s.dot === 'coral' ? 'bg-coral'
                                  : 'bg-text-dim'
                          }`} />
                          <span className="text-[10px] text-text-hint uppercase tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono)' }}>
                            {s.label}
                          </span>
                        </div>
                        <div className="text-[26px] leading-none tracking-[-0.02em] text-text" style={{ fontFamily: 'var(--font-serif)' }}>
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isSelectedDateBlocked && (
                    <div className="flex items-center gap-2 bg-coral-light border border-gray-border rounded-[12px] px-4 py-3 mb-5">
                      <Icon name="block" size={14} style={{ color: 'var(--color-coral)' }} />
                      <span className="text-[12px] text-coral font-medium flex-1">
                        Día bloqueado — {blockForSelectedDate?.reason ?? 'Bloqueado'}
                      </span>
                      <Btn size="sm" variant="danger" onClick={handleUnblockDate}>Desbloquear</Btn>
                    </div>
                  )}

                  {/* Appointment list */}
                  <AppointmentList
                    appointments={filteredAppointments}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    onCancel={handleCancel}
                    onSendIndicaciones={handleSendIndicaciones}
                    onRecordar={handleRecordar}
                    dayLabel={dayLabel}
                  />

                  {isSelectedDateBlocked && filteredAppointments.length === 0 && (
                    <div className="text-center py-10">
                      <div className="text-sm text-text-hint">Sin turnos asignados</div>
                    </div>
                  )}
                </>
              ) : (
                <MonthCalendar
                  appointments={appointments}
                  blockedDates={blockedDates}
                  currentMonth={calendarMonth}
                  currentYear={calendarYear}
                  selectedDate={selectedDate}
                  onSelectDay={handleMonthDaySelect}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                />
              )}
            </div>
          </div>

          <PatientPanel
            appointment={selectedAppointment}
            dayAppointments={filteredAppointments}
            dayLabel={currentDay?.label ?? selectedDate}
            selectedDate={selectedDate}
            isBlocked={isSelectedDateBlocked}
            blockReason={blockForSelectedDate?.reason}
            onUnblock={handleUnblockDate}
            onBlockHours={handleBlockHours}
          />
        </>
      )}

      {activeView === 'pacientes' && (
        <>
          <PatientsView
            patients={patients}
            onSelectPatient={setSelectedPatient}
            selectedPatient={selectedPatient}
          />
          <PatientDetailPanel patient={selectedPatient} />
        </>
      )}

      {activeView === 'bloqueos' && (
        <BlocksView
          blocks={blocks}
          onAdd={handleAddBlock}
          onRemove={handleRemoveBlock}
        />
      )}

      {activeView === 'estadisticas' && (
        <StatsView appointments={appointments} patients={patients} />
      )}

      {activeView === 'config' && (
        <BotConfigView />
      )}

      {activeView === 'perfil' && (
        <DoctorProfileView onLogout={onLogout} onOpenPlans={() => setShowPlans(true)} />
      )}

      {activeView === 'organizacion' && currentOrg && userId && (
        <OrgAdminView org={currentOrg} userId={userId} onOrgUpdated={(updated) => setCurrentOrg(updated)} />
      )}

      {showCreateOrg && (
        <CreateOrgModal
          onClose={() => setShowCreateOrg(false)}
          onCreate={async (name, slug) => {
            const err = await createOrg(name, slug)
            return err
          }}
        />
      )}

      {showPlans && userId && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <PlansView
            currentPlan={currentPlan}
            userId={userId}
            onClose={() => setShowPlans(false)}
            onPlanChanged={() => window.location.reload()}
          />
        </div>
      )}

      {paywall && (
        <PaywallModal
          title={paywall.title}
          description={paywall.description}
          requiredPlan={paywall.requiredPlan}
          currentPlan={currentPlan}
          onClose={() => setPaywall(null)}
          onSeeAllPlans={() => {
            setPaywall(null)
            setShowPlans(true)
          }}
        />
      )}

      <MobileNav activeView={activeView} onNavigate={handleNavigate} />
    </div>
  )
}
