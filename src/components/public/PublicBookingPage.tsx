import { useEffect, useState } from 'react'
import { getDoctorByBookingCode, getAvailableSlotsRange, type PublicDoctor, type DaySlots } from '../../lib/publicBooking'
import BookingModal from './BookingModal'

interface Props {
  bookingCode: string
}

export default function PublicBookingPage({ bookingCode }: Props) {
  const [doctor, setDoctor] = useState<PublicDoctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [daysToShow, setDaysToShow] = useState(30)
  const [allSlots, setAllSlots] = useState<DaySlots[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string; dayLabel: string } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    (async () => {
      const doc = await getDoctorByBookingCode(bookingCode)
      if (!doc) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setDoctor(doc)
      // Start with 30 days; if empty, try up to max 60 (2 months)
      let slots = await getAvailableSlotsRange(doc.id, 30)
      if (slots.length === 0) {
        slots = await getAvailableSlotsRange(doc.id, 60)
        setDaysToShow(60)
      }
      setAllSlots(slots)
      setLoading(false)
    })()
  }, [bookingCode])

  const MAX_DAYS = 60

  const handleLoadMore = async () => {
    if (!doctor) return
    setLoadingMore(true)
    const newDaysToShow = Math.min(daysToShow + 30, MAX_DAYS)
    const slots = await getAvailableSlotsRange(doctor.id, newDaysToShow)
    setAllSlots(slots)
    setDaysToShow(newDaysToShow)
    setLoadingMore(false)
  }

  const canLoadMore = daysToShow < MAX_DAYS

  const handleBookingSuccess = async () => {
    setSelectedSlot(null)
    // Reload slots to remove the booked one
    if (doctor) {
      const slots = await getAvailableSlotsRange(doctor.id, daysToShow)
      setAllSlots(slots)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-bg flex items-center justify-center">
        <div className="text-sm text-text-hint">Cargando...</div>
      </div>
    )
  }

  if (notFound || !doctor) {
    return (
      <div className="min-h-screen bg-gray-bg flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🔍</div>
          <div className="text-lg font-semibold mb-2">Profesional no encontrado</div>
          <div className="text-sm text-text-muted">El link que estás usando no es válido o expiró. Verificá con el profesional.</div>
        </div>
      </div>
    )
  }

  const initials = `${doctor.first_name[0]}${doctor.last_name[0]}`.toUpperCase()
  const fullAddress = doctor.address ? `${doctor.address}${doctor.city ? ', ' + doctor.city : ''}` : ''
  const mapUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null

  return (
    <div className="min-h-screen bg-gray-bg">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-border px-4 sm:px-6 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-sm font-semibold text-primary">MediBot</div>
          <div className="text-xs text-text-hint">Reservá tu turno</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Hero */}
        <div className="bg-white border border-gray-border rounded-[14px] p-6 sm:p-8 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center text-2xl font-semibold text-primary shrink-0 mx-auto sm:mx-0 overflow-hidden">
              {doctor.avatar_url ? (
                <img src={doctor.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-[22px] sm:text-2xl font-semibold leading-tight">
                {doctor.first_name} {doctor.last_name}
              </div>
              {doctor.specialty && (
                <div className="text-sm text-text-muted mt-1">{doctor.specialty}</div>
              )}
              {doctor.bio && (
                <div className="text-sm text-text-muted mt-3 leading-relaxed">{doctor.bio}</div>
              )}

              <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                {doctor.session_duration && (
                  <span className="inline-flex items-center gap-1 text-xs bg-gray-bg px-2.5 py-1 rounded-full text-text-muted">
                    <span>⏱</span> {doctor.session_duration} min
                  </span>
                )}
                {doctor.price_particular > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs bg-gray-bg px-2.5 py-1 rounded-full text-text-muted">
                    <span>💵</span> ${doctor.price_particular.toLocaleString('es-AR')} particular
                  </span>
                )}
              </div>

              {fullAddress && (
                <div className="mt-4 pt-4 border-t border-gray-border text-sm">
                  <div className="flex items-start gap-2 text-text-muted">
                    <span className="shrink-0 mt-0.5">📍</span>
                    <div className="flex-1 min-w-0 text-left">
                      <div>{fullAddress}</div>
                      {mapUrl && (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">
                          Cómo llegar →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slots */}
        <div className="bg-white border border-gray-border rounded-[14px] p-6 sm:p-8">
          <div className="mb-5">
            <div className="text-base font-semibold">Horarios disponibles</div>
            <div className="text-xs text-text-hint mt-0.5">Elegí el día y la hora que prefieras</div>
          </div>

          {allSlots.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm text-text-muted">No hay horarios disponibles en los próximos 2 meses.</div>
              <div className="text-xs text-text-hint mt-1">Contactá al profesional para más opciones.</div>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {allSlots.map((day) => (
                  <div key={day.date}>
                    <div className="text-sm font-medium text-text mb-2">{day.dayLabel}</div>
                    <div className="flex flex-wrap gap-2">
                      {day.slots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedSlot({ date: day.date, time, dayLabel: day.dayLabel })}
                          className="px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer min-w-[72px]"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {canLoadMore ? (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="mt-6 w-full py-2.5 rounded-lg text-sm cursor-pointer border border-gray-border bg-white text-text-muted hover:bg-gray-bg transition-colors disabled:opacity-60"
                >
                  {loadingMore ? 'Cargando...' : 'Ver más días'}
                </button>
              ) : (
                <div className="mt-6 text-center text-[11px] text-text-hint">
                  Mostrando disponibilidad hasta 2 meses adelante
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center text-[11px] text-text-hint mt-8">
          Agendado con MediBot
        </div>
      </div>

      {/* Booking modal */}
      {selectedSlot && (
        <BookingModal
          doctor={doctor}
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  )
}
