import { useEffect, useState } from 'react'
import { useProfile, type ProfileRow } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import { getPlan, type PlanId } from '../../lib/plans'
import PageHeader from '../PageHeader'
import Btn from '../Btn'

interface DoctorData {
  firstName: string
  lastName: string
  specialty: string
  license: string
  phone: string
  email: string
  address: string
  city: string
  sessionDuration: string
  priceParticular: string
  bankAlias: string
  bio: string
  workDays: string[]
  workFrom: string
  workTo: string
}

function profileToData(p: ProfileRow): DoctorData {
  return {
    firstName: p.first_name || '',
    lastName: p.last_name || '',
    specialty: p.specialty || '',
    license: p.license || '',
    phone: p.phone || '',
    email: p.email || '',
    address: p.address || '',
    city: p.city || '',
    sessionDuration: String(p.session_duration || 50),
    priceParticular: String(p.price_particular || ''),
    bankAlias: p.bank_alias || '',
    bio: p.bio || '',
    workDays: p.work_days || [],
    workFrom: p.work_from?.slice(0, 5) || '09:00',
    workTo: p.work_to?.slice(0, 5) || '18:00',
  }
}

const allDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface Props {
  onLogout?: () => void
  onOpenPlans?: () => void
}

export default function DoctorProfileView({ onLogout, onOpenPlans }: Props) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const { profile, loading, update: updateProfile } = useProfile(userId)

  const [data, setData] = useState<DoctorData | null>(null)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync profile data when loaded
  useEffect(() => {
    if (profile && !data) {
      setData(profileToData(profile))
    }
  }, [profile, data])

  const updateField = (field: keyof DoctorData, value: string) => {
    setData((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  const toggleDay = (day: string) => {
    setData((prev) => prev ? {
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day],
    } : prev)
  }

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    await updateProfile({
      first_name: data.firstName,
      last_name: data.lastName,
      specialty: data.specialty,
      license: data.license,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      bio: data.bio,
      work_days: data.workDays,
      work_from: data.workFrom,
      work_to: data.workTo,
      session_duration: parseInt(data.sessionDuration) || 50,
      price_particular: parseInt(data.priceParticular) || 0,
      bank_alias: data.bankAlias,
    })
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCancelEdit = () => {
    if (profile) setData(profileToData(profile))
    setEditing(false)
  }

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-text-hint">Cargando perfil...</div>
      </div>
    )
  }

  const initials = `${(data.firstName || 'M')[0]}${(data.lastName || 'B')[0]}`

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg">
      <div className="px-8 sm:px-10 pt-8 pb-10 overflow-y-auto flex-1 pb-20 lg:pb-10">
        <PageHeader
          title="Mi perfil."
          subtitle="Datos profesionales y configuración de consultorio."
          right={
            <>
              {saved && <span className="text-xs text-teal font-medium mr-1">Guardado</span>}
              {editing ? (
                <>
                  <Btn onClick={handleCancelEdit}>Cancelar</Btn>
                  <Btn variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </Btn>
                </>
              ) : (
                <>
                  {onLogout && <Btn onClick={onLogout}>Cerrar sesión</Btn>}
                  <Btn variant="primary" onClick={() => setEditing(true)}>Editar perfil</Btn>
                </>
              )}
            </>
          }
        />
        {/* Avatar + Name header */}
        <div className="flex items-center gap-4 mb-6">
          <AvatarUpload
            avatarUrl={profile?.avatar_url || null}
            initials={initials}
            userId={userId}
            onUploaded={(url) => updateProfile({ avatar_url: url } as any)}
          />
          <div>
            <div className="text-lg font-semibold">{data.firstName} {data.lastName}</div>
            <div className="text-sm text-text-muted">{data.specialty}{data.license ? ` · Mat. ${data.license}` : ''}</div>
          </div>
        </div>

        {/* Plan section */}
        {profile && (
          <PlanCard plan={(profile.plan || 'free') as PlanId} onOpenPlans={onOpenPlans} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Personal info */}
          <div className="bg-white border border-gray-border rounded-[10px] p-5">
            <div className="text-[13px] font-semibold mb-4">Datos personales</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" value={data.firstName} field="firstName" editing={editing} onChange={updateField} />
              <Field label="Apellido" value={data.lastName} field="lastName" editing={editing} onChange={updateField} />
              <Field label="Especialidad" value={data.specialty} field="specialty" editing={editing} onChange={updateField} />
              <Field label="Matrícula" value={data.license} field="license" editing={editing} onChange={updateField} />
              <Field label="Teléfono" value={data.phone} field="phone" editing={editing} onChange={updateField} />
              <Field label="Email" value={data.email} field="email" editing={editing} onChange={updateField} />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white border border-gray-border rounded-[10px] p-5">
            <div className="text-[13px] font-semibold mb-4">Consultorio</div>
            <div className="space-y-3">
              <Field label="Dirección" value={data.address} field="address" editing={editing} onChange={updateField} />
              <Field label="Ciudad" value={data.city} field="city" editing={editing} onChange={updateField} />
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white border border-gray-border rounded-[10px] p-5">
            <div className="text-[13px] font-semibold mb-4">Horario de atención</div>
            <div className="mb-3">
              <div className="text-[11px] text-text-hint uppercase tracking-wide mb-2">Días de atención</div>
              <div className="flex flex-wrap gap-1.5">
                {allDays.map((day) => (
                  <button
                    key={day}
                    onClick={() => editing && toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      data.workDays.includes(day)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-text-hint border-gray-border'
                    } ${editing ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-text-hint uppercase tracking-wide mb-1">Desde</div>
                {editing ? (
                  <input type="time" value={data.workFrom} onChange={(e) => updateField('workFrom', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid" />
                ) : (
                  <div className="text-sm text-text">{data.workFrom} hs</div>
                )}
              </div>
              <div>
                <div className="text-[11px] text-text-hint uppercase tracking-wide mb-1">Hasta</div>
                {editing ? (
                  <input type="time" value={data.workTo} onChange={(e) => updateField('workTo', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid" />
                ) : (
                  <div className="text-sm text-text">{data.workTo} hs</div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <Field label="Duración de sesión (min)" value={data.sessionDuration} field="sessionDuration" editing={editing} onChange={updateField} />
            </div>
          </div>

          {/* Billing */}
          <div className="bg-white border border-gray-border rounded-[10px] p-5">
            <div className="text-[13px] font-semibold mb-4">Facturación</div>
            <div className="space-y-3">
              <Field label="Valor sesión particular" value={data.priceParticular} field="priceParticular" editing={editing} onChange={updateField} prefix="$" />
              <Field label="Alias de pago" value={data.bankAlias} field="bankAlias" editing={editing} onChange={updateField} />
            </div>
          </div>

          {/* Booking link */}
          <div className="bg-white border border-gray-border rounded-[10px] p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔗</span>
              <div className="text-[13px] font-semibold">Link para agendar turnos</div>
            </div>
            <div className="text-xs text-text-muted mb-4">Compartí este link con tus pacientes. Pueden ver tu perfil, disponibilidad y sacar turno directamente desde el link, sin registrarse.</div>
            <BookingLink bookingCode={profile?.booking_code || null} />
          </div>
        </div>
      </div>
    </div>
  )
}

function AvatarUpload({ avatarUrl, initials, userId, onUploaded }: {
  avatarUrl: string | null
  initials: string
  userId: string | null
  onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe pesar menos de 2MB')
      return
    }
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/avatar.${ext}`

    setUploading(true)
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) {
      alert('Error al subir: ' + uploadError.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = urlData.publicUrl + '?t=' + Date.now()
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    onUploaded(url)
    setUploading(false)
  }

  return (
    <div className="relative">
      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-xl font-semibold text-primary shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-border shadow-sm flex items-center justify-center cursor-pointer hover:bg-gray-bg transition-colors" title="Cambiar foto">
        {uploading ? (
          <span className="text-[10px]">...</span>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        )}
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  )
}

function PlanCard({ plan, onOpenPlans }: { plan: PlanId; onOpenPlans?: () => void }) {
  const p = getPlan(plan)
  const isFree = plan === 'free'

  return (
    <div className={`rounded-[10px] p-5 mb-4 ${
      isFree ? 'bg-white border border-gray-border' : 'bg-gradient-to-br from-primary to-[#534AB7] text-white'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] uppercase tracking-wide mb-1 ${isFree ? 'text-text-hint' : 'opacity-80'}`}>
            Tu plan actual
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[18px] font-semibold">{p.name}</span>
            {p.price > 0 && (
              <span className={`text-xs ${isFree ? 'text-text-hint' : 'opacity-80'}`}>
                ${p.price} USD/mes
              </span>
            )}
          </div>
          <div className={`text-xs mt-1 ${isFree ? 'text-text-muted' : 'opacity-90'}`}>
            {p.description}
          </div>
        </div>
        <button
          onClick={onOpenPlans}
          className={`shrink-0 px-3.5 py-2 rounded-md text-xs font-medium cursor-pointer transition-colors ${
            isFree
              ? 'bg-primary text-white hover:bg-[#534AB7]'
              : 'bg-white text-primary hover:bg-gray-bg'
          }`}
        >
          {isFree ? 'Mejorar plan' : 'Cambiar plan'}
        </button>
      </div>
    </div>
  )
}

function BookingLink({ bookingCode }: { bookingCode: string | null }) {
  const [copied, setCopied] = useState(false)

  if (!bookingCode) {
    return (
      <div className="text-xs text-text-hint bg-gray-bg rounded-md px-3 py-2.5">
        El código se genera automáticamente. Recargá la página si no aparece.
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/p/${bookingCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareText = encodeURIComponent(`Hola! Podés sacar turno conmigo desde acá: ${publicUrl}`)

  return (
    <div className="space-y-3">
      <div className="bg-gray-bg rounded-lg px-3 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-text-hint uppercase tracking-wide mb-0.5">Tu link de turnos</div>
          <div className="text-xs font-mono text-text truncate">{publicUrl}</div>
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-md text-xs cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors shrink-0"
        >
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs cursor-pointer border border-gray-border bg-white text-text-muted hover:bg-gray-bg transition-colors"
        >
          💬 Compartir por WhatsApp
        </a>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs cursor-pointer border border-gray-border bg-white text-text-muted hover:bg-gray-bg transition-colors"
        >
          🔗 Ver mi página pública
        </a>
      </div>

      <div className="text-[10px] text-text-hint">
        Código único: <span className="font-mono">{bookingCode}</span>
      </div>
    </div>
  )
}

function Field({ label, value, field, editing, onChange, prefix }: {
  label: string; value: string; field: string; editing: boolean; onChange: (field: any, value: string) => void; prefix?: string
}) {
  return (
    <div>
      <div className="text-[11px] text-text-hint uppercase tracking-wide mb-1">{label}</div>
      {editing ? (
        <div className="flex items-center">
          {prefix && <span className="text-sm text-text-muted mr-1">{prefix}</span>}
          <input type="text" value={value} onChange={(e) => onChange(field, e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid" />
        </div>
      ) : (
        <div className="text-sm text-text">{prefix}{value || '—'}</div>
      )}
    </div>
  )
}
