import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface ProfileData {
  specialty: string
  license: string
  phone: string
  bio: string
  address: string
  city: string
  workDays: string[]
  workFrom: string
  workTo: string
  sessionDuration: string
  priceParticular: string
  bankAlias: string
}

interface Props {
  firstName: string
  lastName: string
  onComplete: (profile: ProfileData) => void
}

const allDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const steps = [
  { label: 'Bienvenida', icon: '👋' },
  { label: 'Profesional', icon: '🩺' },
  { label: 'Consultorio', icon: '🏥' },
  { label: 'Facturación', icon: '💳' },
]

export default function OnboardingWizard({ firstName, lastName, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<ProfileData>({
    specialty: '',
    license: '',
    phone: '',
    bio: '',
    address: '',
    city: '',
    workDays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
    workFrom: '09:00',
    workTo: '18:00',
    sessionDuration: '50',
    priceParticular: '',
    bankAlias: '',
  })
  const [error, setError] = useState('')

  const update = (field: keyof ProfileData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const toggleDay = (day: string) => {
    setData((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day],
    }))
  }

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!data.specialty || !data.license) {
        setError('Completá especialidad y matrícula')
        return false
      }
    }
    if (step === 2) {
      if (!data.address || !data.city) {
        setError('Completá dirección y ciudad')
        return false
      }
      if (data.workDays.length === 0) {
        setError('Seleccioná al menos un día de atención')
        return false
      }
    }
    return true
  }

  const [saving, setSaving] = useState(false)

  const handleNext = async () => {
    if (!validateStep()) return
    setError('')
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase.from('profiles').update({
          specialty: data.specialty,
          license: data.license,
          phone: data.phone,
          bio: data.bio,
          address: data.address,
          city: data.city,
          work_days: data.workDays,
          work_from: data.workFrom,
          work_to: data.workTo,
          session_duration: parseInt(data.sessionDuration) || 50,
          price_particular: parseInt(data.priceParticular) || 0,
          bank_alias: data.bankAlias,
          needs_onboarding: false,
        }).eq('id', user.id)
        setSaving(false)
        if (error) {
          setError('Error al guardar: ' + error.message)
          return
        }
      }
      onComplete(data)
    }
  }

  const handleBack = () => {
    setError('')
    if (step > 0) setStep(step - 1)
  }

  const progress = ((step + 1) / steps.length) * 100
  const initials = `${firstName[0]}${lastName[0]}`

  return (
    <div className="min-h-screen bg-gray-bg flex flex-col">
      {/* Progress bar */}
      <div className="bg-white border-b border-gray-border px-6 py-4 shrink-0">
        <div className="max-w-[600px] mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-primary">MediBot</div>
            <div className="text-xs text-text-hint">Paso {step + 1} de {steps.length}</div>
          </div>
          {/* Step indicators */}
          <div className="flex gap-2 mb-2">
            {steps.map((s, i) => (
              <div key={i} className="flex-1 flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                  i <= step ? 'bg-primary text-white' : 'bg-gray-bg text-text-hint'
                }`}>
                  {i < step ? '✓' : s.icon}
                </div>
                <div className={`text-[11px] hidden sm:block ${i <= step ? 'text-primary font-medium' : 'text-text-hint'}`}>
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full ${i < step ? 'bg-primary' : 'bg-gray-border'}`} />
                )}
              </div>
            ))}
          </div>
          {/* Bar */}
          <div className="w-full bg-gray-bg rounded-full h-1">
            <div className="bg-primary h-1 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[520px]">
          <div className="bg-white border border-gray-border rounded-[10px] p-6 sm:p-8">

            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-xl font-semibold text-primary mx-auto mb-4">
                  {initials}
                </div>
                <div className="text-xl font-semibold mb-2">Hola, {firstName}!</div>
                <div className="text-sm text-text-muted mb-6 max-w-[360px] mx-auto">
                  Vamos a configurar tu perfil profesional para que puedas empezar a usar MediBot. Solo toma unos minutos.
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6 max-w-[340px] mx-auto">
                  <div className="bg-gray-bg rounded-lg p-3 text-center">
                    <div className="text-lg mb-1">📅</div>
                    <div className="text-[10px] text-text-hint">Agenda inteligente</div>
                  </div>
                  <div className="bg-gray-bg rounded-lg p-3 text-center">
                    <div className="text-lg mb-1">🤖</div>
                    <div className="text-[10px] text-text-hint">Bot de WhatsApp</div>
                  </div>
                  <div className="bg-gray-bg rounded-lg p-3 text-center">
                    <div className="text-lg mb-1">📊</div>
                    <div className="text-[10px] text-text-hint">Estadísticas</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Professional data */}
            {step === 1 && (
              <div>
                <div className="text-lg font-semibold mb-1">Datos profesionales</div>
                <div className="text-sm text-text-muted mb-6">Contanos sobre tu práctica</div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <FormField label="Especialidad *" value={data.specialty} placeholder="Ej: Psicóloga" onChange={(v) => update('specialty', v)} />
                  <FormField label="Matrícula *" value={data.license} placeholder="Ej: 12.847" onChange={(v) => update('license', v)} />
                </div>
                <div className="mb-4">
                  <FormField label="Teléfono del consultorio" value={data.phone} placeholder="+54 9 11 5555-0001" onChange={(v) => update('phone', v)} />
                </div>
                <div>
                  <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Presentación profesional</label>
                  <textarea
                    value={data.bio}
                    onChange={(e) => update('bio', e.target.value)}
                    rows={3}
                    placeholder="Contá brevemente tu especialización y enfoque terapéutico..."
                    className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid resize-none"
                  />
                  <div className="text-[10px] text-text-hint mt-1">Se muestra a pacientes nuevos que contactan por WhatsApp</div>
                </div>
              </div>
            )}

            {/* Step 2: Office & schedule */}
            {step === 2 && (
              <div>
                <div className="text-lg font-semibold mb-1">Consultorio y horarios</div>
                <div className="text-sm text-text-muted mb-6">Configurá tu lugar y horario de atención</div>

                <div className="mb-4">
                  <FormField label="Dirección *" value={data.address} placeholder="Av. Santa Fe 2340, Piso 5" onChange={(v) => update('address', v)} />
                </div>
                <div className="mb-4">
                  <FormField label="Ciudad *" value={data.city} placeholder="CABA, Buenos Aires" onChange={(v) => update('city', v)} />
                </div>

                <div className="mb-4">
                  <label className="text-[11px] text-text-hint uppercase tracking-wide mb-2 block">Días de atención *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {allDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition-colors ${
                          data.workDays.includes(day)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-text-hint border-gray-border hover:bg-gray-bg'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Desde</label>
                    <input
                      type="time"
                      value={data.workFrom}
                      onChange={(e) => update('workFrom', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Hasta</label>
                    <input
                      type="time"
                      value={data.workTo}
                      onChange={(e) => update('workTo', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
                    />
                  </div>
                  <div>
                    <FormField label="Duración (min)" value={data.sessionDuration} placeholder="50" onChange={(v) => update('sessionDuration', v)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Billing */}
            {step === 3 && (
              <div>
                <div className="text-lg font-semibold mb-1">Facturación</div>
                <div className="text-sm text-text-muted mb-6">Datos de cobro para pacientes particulares</div>

                <div className="mb-4">
                  <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Valor sesión particular</label>
                  <div className="flex items-center">
                    <span className="text-sm text-text-muted mr-2">$</span>
                    <input
                      type="text"
                      value={data.priceParticular}
                      onChange={(e) => update('priceParticular', e.target.value)}
                      placeholder="15000"
                      className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
                    />
                  </div>
                </div>
                <div className="mb-6">
                  <FormField label="Alias de pago (CBU/Alias)" value={data.bankAlias} placeholder="dra.perez.psi" onChange={(v) => update('bankAlias', v)} />
                </div>

                <div className="bg-teal-light rounded-[10px] p-4 text-center">
                  <div className="text-lg mb-2">🎉</div>
                  <div className="text-sm font-medium text-teal mb-1">Todo listo!</div>
                  <div className="text-xs text-teal/80">Tu perfil está casi completo. Podés modificar estos datos en cualquier momento desde la configuración.</div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-xs text-coral mt-4 bg-coral-light rounded-md px-3 py-2">{error}</div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              {step > 0 ? (
                <button
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-md text-sm cursor-pointer border border-gray-border bg-white text-text-muted hover:bg-gray-bg transition-colors"
                >
                  Anterior
                </button>
              ) : <div />}
              <button
                onClick={handleNext}
                disabled={saving}
                className="px-6 py-2.5 rounded-md text-sm font-medium cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : step === 0 ? 'Empezar' : step === steps.length - 1 ? 'Completar perfil' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
      />
    </div>
  )
}
