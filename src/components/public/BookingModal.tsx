import { useState } from 'react'
import { createBooking, type PublicDoctor } from '../../lib/publicBooking'

interface Props {
  doctor: PublicDoctor
  slot: { date: string; time: string; dayLabel: string }
  onClose: () => void
  onSuccess: () => void
}

const insuranceOptions = [
  'Particular',
  'OSDE',
  'Swiss Medical',
  'Medife',
  'Galeno',
  'IOMA',
  'PAMI',
  'Otra',
]

export default function BookingModal({ doctor, slot, onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dni, setDni] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [insurance, setInsurance] = useState('Particular')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const fullAddress = doctor.address ? `${doctor.address}${doctor.city ? ', ' + doctor.city : ''}` : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim()) {
      setError('Ingresá nombre y apellido')
      return
    }
    if (dni.replace(/\D/g, '').length < 7) {
      setError('Ingresá un DNI válido')
      return
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Ingresá un teléfono válido')
      return
    }

    setLoading(true)
    const result = await createBooking({
      doctorId: doctor.id,
      date: slot.date,
      time: slot.time,
      duration: `${doctor.session_duration || 50} min`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dni: dni.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      insurance,
    })
    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Hubo un error al agendar. Intentá de nuevo.')
      return
    }
    setSuccess(true)
    setTimeout(() => {
      onSuccess()
    }, 3500)
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-md sm:rounded-[14px] rounded-t-[20px] p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center text-3xl mx-auto mb-4">
              ✅
            </div>
            <div className="text-lg font-semibold mb-2">¡Turno agendado!</div>
            <div className="text-sm text-text-muted mb-5">
              Te va a llegar un mensaje por WhatsApp al <strong>{phone}</strong> con los detalles.
            </div>

            <div className="bg-gray-bg rounded-[10px] p-4 text-left text-sm space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="text-text-muted">Profesional:</span>
                <span className="font-medium">{doctor.first_name} {doctor.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Día:</span>
                <span className="font-medium">{slot.dayLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Hora:</span>
                <span className="font-medium">{slot.time} hs</span>
              </div>
              {fullAddress && (
                <div className="pt-2 border-t border-gray-border">
                  <div className="text-text-muted text-xs mb-1">Dirección</div>
                  <div className="text-xs">{fullAddress}</div>
                </div>
              )}
            </div>

            <button
              onClick={onSuccess}
              className="w-full py-3 rounded-lg text-sm font-medium cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-[14px] rounded-t-[20px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-border px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Confirmar turno</div>
            <div className="text-xs text-text-muted">{slot.dayLabel} a las {slot.time}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-hint hover:bg-gray-bg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="px-5 py-4 bg-gray-bg/50 border-b border-gray-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
              {doctor.first_name[0]}{doctor.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{doctor.first_name} {doctor.last_name}</div>
              <div className="text-xs text-text-muted truncate">{doctor.specialty}</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="María"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="López"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">DNI</label>
            <input
              type="text"
              inputMode="numeric"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="35456789"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
            />
          </div>

          <div>
            <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Teléfono (WhatsApp)</label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 9 11 5555-0001"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
            />
            <div className="text-[10px] text-text-hint mt-1">Te enviamos la confirmación por acá</div>
          </div>

          <div>
            <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Email (opcional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
            />
          </div>

          <div>
            <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Obra social</label>
            <select
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-border text-sm bg-white focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
            >
              {insuranceOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-xs text-coral bg-coral-light rounded-md px-3 py-2">{error}</div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-medium cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Confirmando...' : 'Confirmar turno'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-2.5 rounded-lg text-sm cursor-pointer text-text-muted hover:text-text"
            >
              Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
