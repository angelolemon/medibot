import { useEffect, useMemo, useRef, useState } from 'react'
import { getDoctorByBookingCode, getAvailableSlotsRange, getPublicDoctorLocations, type PublicDoctor, type PublicLocation, type DaySlots } from '../../lib/publicBooking'
import BookingModal from './BookingModal'
import Icon from '../Icon'

interface Props {
  bookingCode: string
}

const DOW_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDayChip(dateISO: string) {
  const d = new Date(dateISO + 'T12:00:00')
  const todayISO = new Date().toISOString().split('T')[0]
  const tomorrowISO = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const dow = DOW_SHORT[d.getDay()]
  const dayNum = d.getDate()
  const month = MONTHS_SHORT[d.getMonth()]
  let heading = dow
  if (dateISO === todayISO) heading = 'HOY'
  else if (dateISO === tomorrowISO) heading = 'MAÑ'
  return {
    heading,
    dayNum,
    month,
    dateISO,
  }
}

export default function PublicBookingPage({ bookingCode }: Props) {
  const [doctor, setDoctor] = useState<PublicDoctor | null>(null)
  const [locations, setLocations] = useState<PublicLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [daysToShow, setDaysToShow] = useState(30)
  const [allSlots, setAllSlots] = useState<DaySlots[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string; dayLabel: string } | null>(null)
  const [openBooking, setOpenBooking] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pickedTime, setPickedTime] = useState<string | null>(null)
  const [switchingLocation, setSwitchingLocation] = useState(false)
  const firstLocationRun = useRef(true)

  useEffect(() => {
    (async () => {
      const doc = await getDoctorByBookingCode(bookingCode)
      if (!doc) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setDoctor(doc)

      const locs = await getPublicDoctorLocations(doc.id)
      setLocations(locs)
      const primaryLocId = locs[0]?.id ?? null
      setSelectedLocationId(primaryLocId)

      let slots = await getAvailableSlotsRange(doc.id, 30, primaryLocId)
      if (slots.length === 0) {
        slots = await getAvailableSlotsRange(doc.id, 60, primaryLocId)
        setDaysToShow(60)
      }
      setAllSlots(slots)
      setSelectedDay(slots[0]?.date ?? null)
      setLoading(false)
    })()
  }, [bookingCode])

  // Refetch slots when the user switches location
  useEffect(() => {
    if (!doctor || !selectedLocationId) return
    if (firstLocationRun.current) {
      // Initial load already fetched slots in the main bootstrap effect.
      firstLocationRun.current = false
      return
    }
    setSwitchingLocation(true)
    setPickedTime(null)
    ;(async () => {
      const slots = await getAvailableSlotsRange(doctor.id, daysToShow, selectedLocationId)
      setAllSlots(slots)
      setSelectedDay(slots[0]?.date ?? null)
      setSwitchingLocation(false)
    })()
  }, [selectedLocationId, doctor?.id])

  const MAX_DAYS = 60

  const handleLoadMore = async () => {
    if (!doctor) return
    setLoadingMore(true)
    const newDaysToShow = Math.min(daysToShow + 30, MAX_DAYS)
    const slots = await getAvailableSlotsRange(doctor.id, newDaysToShow, selectedLocationId)
    setAllSlots(slots)
    setDaysToShow(newDaysToShow)
    setLoadingMore(false)
  }

  const canLoadMore = daysToShow < MAX_DAYS

  const handleBookingSuccess = async () => {
    if (doctor) {
      const slots = await getAvailableSlotsRange(doctor.id, daysToShow, selectedLocationId)
      setAllSlots(slots)
    }
  }

  const currentLocation = locations.find((l) => l.id === selectedLocationId) ?? locations[0] ?? null

  const currentDay = useMemo(
    () => allSlots.find((d) => d.date === selectedDay) ?? allSlots[0],
    [allSlots, selectedDay],
  )

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-sans)' }}
      >
        <div className="text-[13px] text-text-hint" style={{ fontFamily: 'var(--font-mono)' }}>
          CARGANDO…
        </div>
      </div>
    )
  }

  if (notFound || !doctor) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-sans)' }}
      >
        <div className="max-w-md text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-surface border border-gray-border grid place-items-center text-text-hint">
            <Icon name="search" size={20} />
          </div>
          <div
            className="text-[22px] font-normal text-text leading-[1.15] tracking-[-0.015em]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Profesional no encontrado.
          </div>
          <div className="text-[13px] text-text-muted mt-3 leading-[1.55]">
            El link que estás usando no es válido o expiró. Verificá con el profesional.
          </div>
        </div>
      </div>
    )
  }

  const initials = `${doctor.first_name[0]}${doctor.last_name[0]}`.toUpperCase()
  // Use the selected location's address if available, otherwise fallback to profile
  const addrSource = currentLocation ?? { address: doctor.address, city: doctor.city }
  const fullAddress = addrSource.address ? `${addrSource.address}${addrSource.city ? ', ' + addrSource.city : ''}` : ''
  const mapUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}
    >
      {/* Header */}
      <div className="bg-surface border-b border-gray-border">
        <div className="px-6 lg:px-10 py-3.5 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <div
              className="text-[16px] italic text-text font-medium"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              MediBot
            </div>
            <div
              className="hidden sm:block text-[11px] text-text-hint"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              medibot.ar/{doctor.last_name?.toLowerCase().replace(/\s+/g, '-') || bookingCode}
            </div>
          </div>
          <div
            className="text-[10px] text-text-hint uppercase tracking-[0.14em] flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <Icon name="check" size={10} /> Conexión segura
          </div>
        </div>
      </div>

      {/* Mobile: compact doctor header above accordion */}
      <div className="lg:hidden bg-surface border-b border-gray-border px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="w-[60px] h-[60px] rounded-full bg-primary-light text-primary grid place-items-center text-[18px] shrink-0 overflow-hidden"
            style={{ fontFamily: 'var(--font-serif)' }}>
            {doctor.avatar_url ? (
              <img src={doctor.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            {doctor.specialty && (
              <div
                className="text-[11px] text-text-hint uppercase tracking-[0.15em] mb-1"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {doctor.specialty}
              </div>
            )}
            <div
              className="text-[22px] font-normal text-text leading-[1.1] tracking-[-0.02em]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {doctor.first_name} {doctor.last_name}
            </div>
            {fullAddress && (
              <div className="text-[12px] text-text-muted mt-2 leading-[1.5]">
                {fullAddress}
                {mapUrl && (
                  <>
                    {' · '}
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium hover:underline"
                    >
                      Cómo llegar
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP — 3 column layout (sidebar · calendar · rail) */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr_380px] flex-1 min-h-0">
        <DoctorSidebar
          doctor={doctor}
          initials={initials}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
          currentLocation={currentLocation}
        />

        {allSlots.length === 0 ? (
          <div className="col-span-2 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface border border-gray-border grid place-items-center text-text-hint">
                <Icon name="calendar" size={20} />
              </div>
              <div className="text-[14px] text-text">No hay horarios disponibles.</div>
              <div className="text-[12px] text-text-hint mt-1.5 leading-[1.55]">
                Contactá al profesional para más opciones.
              </div>
            </div>
          </div>
        ) : (
          <>
            <CalendarGrid
              allSlots={allSlots}
              selectedDay={selectedDay}
              onSelectDay={(d) => { setSelectedDay(d); setPickedTime(null) }}
              daysToShow={daysToShow}
              canLoadMore={canLoadMore}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
              stepIndex={0}
              busy={switchingLocation}
            />
            <SlotRail
              currentDay={currentDay}
              selectedTime={pickedTime}
              onPickSlot={(time) => setPickedTime(time)}
              onConfirm={() => {
                if (!currentDay || !pickedTime) return
                setSelectedSlot({ date: currentDay.date, time: pickedTime, dayLabel: currentDay.dayLabel })
                setOpenBooking(true)
              }}
              busy={switchingLocation}
            />
          </>
        )}
      </div>

      {/* MOBILE — accordion list */}
      <div className="lg:hidden flex-1 flex flex-col">
        {/* Location picker if multi */}
        {locations.length > 1 && (
          <div className="px-4 pt-5">
            <div
              className="text-[10px] text-text-hint uppercase tracking-[0.12em] mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Consultorio
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => {
                const active = selectedLocationId === loc.id
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`text-left px-3.5 py-2.5 rounded-[10px] border cursor-pointer transition-colors flex-1 min-w-[160px] ${
                      active
                        ? 'bg-primary-light border-primary-mid'
                        : 'bg-surface border-gray-border hover:bg-surface-2'
                    }`}
                  >
                    <div className={`text-[13px] font-medium ${active ? 'text-primary' : 'text-text'}`}>
                      {loc.name}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5 truncate">
                      {loc.address}{loc.city && `, ${loc.city}`}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {allSlots.length === 0 ? (
          <div className="text-center py-16 px-6 flex-1">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface border border-gray-border grid place-items-center text-text-hint">
              <Icon name="calendar" size={20} />
            </div>
            <div className="text-[14px] text-text">No hay horarios disponibles.</div>
            <div className="text-[12px] text-text-hint mt-1.5 leading-[1.55]">
              Contactá al profesional para más opciones.
            </div>
          </div>
        ) : (
          <div className="flex-1 px-4 py-5">
            <div
              className="text-[10px] text-text-hint uppercase tracking-[0.12em] mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Elegí el día
            </div>
            <div className="flex flex-col gap-2">
              {allSlots.map((day) => {
                const open = selectedDay === day.date
                const chip = formatDayChip(day.date)
                return (
                  <div
                    key={day.date}
                    className={`bg-surface rounded-[12px] border overflow-hidden ${
                      open ? 'border-primary' : 'border-gray-border'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedDay(open ? null : day.date)}
                      className="w-full px-4 py-3 flex items-center gap-3.5 cursor-pointer text-left"
                    >
                      <div className="text-center min-w-[40px]">
                        <div
                          className="text-[9px] text-text-hint uppercase tracking-[0.12em]"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {chip.heading}
                        </div>
                        <div
                          className="text-[22px] font-medium leading-none mt-0.5 text-text"
                          style={{ fontFamily: 'var(--font-serif)' }}
                        >
                          {chip.dayNum}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-text capitalize">{day.dayLabel}</div>
                        <div className="text-[11px] text-text-hint mt-0.5">
                          {day.slots.length} {day.slots.length === 1 ? 'horario disponible' : 'horarios disponibles'}
                        </div>
                      </div>
                      <div
                        className="text-text-hint text-[16px] transition-transform"
                        style={{ transform: open ? 'rotate(90deg)' : 'none' }}
                      >
                        ›
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 border-t border-gray-border">
                        <AccordionSlotBlocks
                          slots={day.slots}
                          selectedTime={selectedSlot && openBooking && selectedSlot.date === day.date ? selectedSlot.time : null}
                          onPick={(time) => {
                            setSelectedSlot({ date: day.date, time, dayLabel: day.dayLabel })
                            setOpenBooking(true)
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              {canLoadMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="mt-2 w-full py-3 rounded-[12px] text-[13px] bg-surface border border-gray-border-2 text-text-muted hover:bg-surface-2 transition-colors disabled:opacity-60"
                >
                  {loadingMore ? 'Cargando…' : 'Ver más días'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="text-[10px] text-text-hint uppercase tracking-[0.18em] py-4 px-6 lg:px-10 border-t border-gray-border flex items-center justify-between"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <div>MediBot · reservá con cualquier médico</div>
        <div className="hidden sm:flex gap-4">
          <a className="hover:text-text cursor-pointer">Ayuda</a>
          <a className="hover:text-text cursor-pointer">Privacidad</a>
        </div>
      </div>

      {openBooking && selectedSlot && (
        <BookingModal
          doctor={doctor}
          slot={selectedSlot}
          location={currentLocation}
          onClose={() => setOpenBooking(false)}
          onSuccess={async () => {
            await handleBookingSuccess()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Doctor sidebar (desktop) — full profile + consultorio picker
// ────────────────────────────────────────────────────────────────

function DoctorSidebar({
  doctor,
  initials,
  locations,
  selectedLocationId,
  onSelectLocation,
  currentLocation,
}: {
  doctor: PublicDoctor
  initials: string
  locations: PublicLocation[]
  selectedLocationId: string | null
  onSelectLocation: (id: string) => void
  currentLocation: PublicLocation | null
}) {
  const addrSource = currentLocation ?? { address: doctor.address, city: doctor.city }
  const fullAddress = addrSource.address ? `${addrSource.address}${addrSource.city ? ', ' + addrSource.city : ''}` : ''
  const mapUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null
  const duration = `${doctor.session_duration || 50} min`

  return (
    <aside className="bg-surface border-r border-gray-border p-8 overflow-y-auto scrollbar-hide">
      {/* Avatar + identity */}
      <div
        className="w-12 h-12 rounded-full bg-primary-light text-primary grid place-items-center text-[15px] overflow-hidden mb-5"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {doctor.avatar_url ? (
          <img src={doctor.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {doctor.specialty && (
        <div
          className="text-[10px] text-text-hint uppercase tracking-[0.14em] mb-1.5"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {doctor.specialty}
        </div>
      )}
      <div
        className="text-[22px] font-normal text-text leading-[1.1] tracking-[-0.02em]"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {doctor.first_name} {doctor.last_name}
      </div>
      {doctor.license && (
        <div
          className="text-[11px] text-text-hint mt-1.5"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          MN · {doctor.license}
        </div>
      )}

      {doctor.bio && (
        <div
          className="text-[13px] text-text-muted leading-[1.55] mt-5 italic"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {doctor.bio}
        </div>
      )}

      <div className="border-t border-gray-border my-6" />

      {/* Consultorio / Duración / Coberturas */}
      <div className="space-y-4">
        {currentLocation && (
          <div>
            <div
              className="text-[10px] text-text-hint uppercase tracking-[0.14em] mb-1"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Consultorio
            </div>
            <div className="text-[13px] text-text font-medium">{currentLocation.name}</div>
            {fullAddress && (
              <div className="text-[12px] text-text-muted mt-0.5 leading-[1.5]">
                {fullAddress}
                {mapUrl && (
                  <>
                    {' · '}
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium hover:underline"
                    >
                      Cómo llegar
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <div
            className="text-[10px] text-text-hint uppercase tracking-[0.14em] mb-1"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Duración
          </div>
          <div className="text-[13px] text-text">{duration}</div>
        </div>

        {doctor.price_particular && (
          <div>
            <div
              className="text-[10px] text-text-hint uppercase tracking-[0.14em] mb-1"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Valor particular
            </div>
            <div className="text-[13px] text-text">${doctor.price_particular.toLocaleString('es-AR')}</div>
          </div>
        )}

      </div>

      {/* Location picker — only if multi */}
      {locations.length > 1 && (
        <>
          <div className="border-t border-gray-border my-6" />
          <div
            className="text-[10px] text-text-hint uppercase tracking-[0.14em] mb-2"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Cambiar consultorio
          </div>
          <div className="flex flex-col gap-1.5">
            {locations.map((loc) => {
              const active = selectedLocationId === loc.id
              return (
                <button
                  key={loc.id}
                  onClick={() => onSelectLocation(loc.id)}
                  className={`text-left px-3 py-2 rounded-[8px] border cursor-pointer transition-colors ${
                    active
                      ? 'bg-primary-light border-primary-mid'
                      : 'bg-surface border-gray-border hover:bg-surface-2'
                  }`}
                >
                  <div className={`text-[12px] font-medium ${active ? 'text-primary' : 'text-text'}`}>
                    {loc.name}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5 truncate">
                    {loc.address}{loc.city && `, ${loc.city}`}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </aside>
  )
}

// ────────────────────────────────────────────────────────────────
// Calendar grid (desktop) — 21-day view starting on the week's Monday
// ────────────────────────────────────────────────────────────────

function CalendarGrid({
  allSlots,
  selectedDay,
  onSelectDay,
  daysToShow,
  canLoadMore,
  onLoadMore,
  loadingMore,
  stepIndex,
  busy,
}: {
  allSlots: DaySlots[]
  selectedDay: string | null
  onSelectDay: (iso: string) => void
  daysToShow: number
  canLoadMore: boolean
  onLoadMore: () => Promise<void>
  loadingMore: boolean
  stepIndex: number
  busy: boolean
}) {
  // Build a slot-count map for quick lookup
  const slotCounts = new Map<string, number>()
  for (const d of allSlots) slotCounts.set(d.date, d.slots.length)

  // Grid starts on the Monday of the current week; spans N weeks based on daysToShow.
  const weeks = Math.max(3, Math.ceil(daysToShow / 7) + 1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = toISO(today)
  // Go back to Monday (Mon=1, Sun=0 → offset)
  const dayOfWeek = today.getDay()
  const offsetToMonday = (dayOfWeek + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - offsetToMonday)

  const grid: Array<Array<{ iso: string; num: number; inPast: boolean; isToday: boolean; slots: number }>> = []
  for (let w = 0; w < weeks; w++) {
    const row = []
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(start)
      cellDate.setDate(start.getDate() + w * 7 + d)
      const iso = toISO(cellDate)
      const inPast = cellDate < today
      row.push({
        iso,
        num: cellDate.getDate(),
        inPast,
        isToday: iso === todayISO,
        slots: slotCounts.get(iso) ?? 0,
      })
    }
    grid.push(row)
  }

  const monthName = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const steps = ['Horario', 'Datos', 'Listo']

  return (
    <div className={`px-10 py-9 overflow-y-auto scrollbar-hide relative transition-opacity duration-200 ${busy ? 'opacity-60' : 'opacity-100'}`}>
      {busy && <BusyOverlay label="Actualizando agenda" />}
      <div className="flex items-start justify-between mb-6 gap-6">
        <div>
          <div
            className="text-[10px] text-text-hint uppercase tracking-[0.14em] mb-1.5"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Agenda pública · <span className="capitalize">{monthName}</span>
          </div>
          <h1
            className="text-[28px] lg:text-[32px] font-normal leading-[1.05] tracking-[-0.025em] m-0 text-text"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Elegí el día que <span className="italic">te queda mejor</span>
          </h1>
        </div>
        <div
          className="flex items-center gap-2 pt-1 shrink-0"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {steps.map((s, i) => {
            const active = i === stepIndex
            const done = i < stepIndex
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full grid place-items-center text-[10px] border ${
                    active
                      ? 'bg-primary text-surface border-primary'
                      : done
                        ? 'bg-primary-light text-primary border-primary-mid'
                        : 'bg-surface text-text-hint border-gray-border'
                  }`}
                >
                  {i + 1}
                </div>
                <div
                  className={`text-[10px] uppercase tracking-[0.14em] ${
                    active ? 'text-text' : 'text-text-hint'
                  }`}
                >
                  {s}
                </div>
                {i < steps.length - 1 && <div className="w-4 h-px bg-gray-border" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d) => (
          <div
            key={d}
            className="text-[10px] text-text-hint uppercase tracking-[0.14em] pl-1"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-2">
        {grid.map((row, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-2">
            {row.map((cell) => {
              const available = cell.slots > 0
              const selected = selectedDay === cell.iso
              return (
                <button
                  key={cell.iso}
                  disabled={!available}
                  onClick={() => available && onSelectDay(cell.iso)}
                  className={`aspect-square p-3 rounded-[10px] border text-left flex flex-col justify-between transition-colors ${
                    selected
                      ? 'bg-primary border-primary text-surface'
                      : available
                        ? 'bg-surface border-gray-border text-text hover:border-gray-border-2 cursor-pointer'
                        : 'bg-transparent border-transparent text-text-dim cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="text-[22px] font-medium leading-none tracking-[-0.02em]"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      {cell.num}
                    </div>
                    {cell.isToday && (
                      <div
                        className="text-[9px] uppercase tracking-[0.14em] opacity-70"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        Hoy
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-[10px] ${selected ? 'opacity-70' : available ? 'opacity-55' : 'opacity-40'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {available ? `${cell.slots} libres` : '—'}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {canLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-5 w-full py-3 rounded-[10px] text-[12px] bg-surface border border-gray-border-2 text-text-muted hover:bg-surface-2 transition-colors disabled:opacity-60"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {loadingMore ? 'Cargando…' : 'Ver más semanas'}
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Right rail — slots for selected day (desktop)
// ────────────────────────────────────────────────────────────────

function SlotRail({
  currentDay,
  selectedTime,
  onPickSlot,
  onConfirm,
  busy,
}: {
  currentDay: DaySlots | undefined
  selectedTime: string | null
  onPickSlot: (time: string) => void
  onConfirm: () => void
  busy: boolean
}) {
  if (!currentDay) {
    return (
      <div className="bg-surface border-l border-gray-border p-10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-2 border border-gray-border grid place-items-center text-text-hint">
            <Icon name="calendar" size={16} />
          </div>
          <div className="text-[13px] text-text-muted">Elegí un día del calendario.</div>
        </div>
      </div>
    )
  }

  const d = new Date(currentDay.date + 'T12:00:00')
  const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const monthsShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const dow = dayNamesShort[d.getDay()]
  const short = `${d.getDate()} ${monthsShort[d.getMonth()]}`
  const todayISO = toISO(new Date())
  const isToday = currentDay.date === todayISO
  const railLabel = isToday ? 'Horarios del hoy' : `Horarios del ${dow.toLowerCase()}`

  // Split slots into morning (< 13:00) and afternoon (>= 13:00)
  const morning = currentDay.slots.filter((s) => parseInt(s.split(':')[0], 10) < 13)
  const afternoon = currentDay.slots.filter((s) => parseInt(s.split(':')[0], 10) >= 13)

  return (
    <div className={`bg-surface border-l border-gray-border p-8 overflow-y-auto scrollbar-hide flex flex-col relative transition-opacity duration-200 ${busy ? 'opacity-60' : 'opacity-100'}`}>
      {busy && <BusyOverlay label="Actualizando horarios" />}
      <div
        className="text-[10px] text-text-hint uppercase tracking-[0.14em] mb-1.5"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {railLabel}
      </div>
      <div
        className="text-[26px] font-medium leading-[1.1] tracking-[-0.02em] text-text"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        <span className="italic">{dow}</span> {short}
      </div>

      <div className="mt-6 flex-1">
        {morning.length > 0 && (
          <SlotBlock title="Mañana" slots={morning} selectedTime={selectedTime} onPick={onPickSlot} />
        )}
        {afternoon.length > 0 && (
          <SlotBlock title="Tarde" slots={afternoon} selectedTime={selectedTime} onPick={onPickSlot} last />
        )}
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 -mx-8 px-8 pt-5 pb-2 bg-surface">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!selectedTime}
          className="w-full py-[14px] rounded-[12px] text-[14px] font-medium cursor-pointer bg-primary text-surface hover:bg-[#2F3C2D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {selectedTime ? `Continuar con ${selectedTime}` : 'Elegí un horario'}
        </button>
      </div>
    </div>
  )
}

function SlotBlock({ title, slots, selectedTime, onPick, last }: { title: string; slots: string[]; selectedTime: string | null; onPick: (s: string) => void; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-5'}>
      <div
        className="text-[10px] text-text-hint uppercase tracking-[0.12em] mb-2.5"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {title}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {slots.map((time) => {
          const active = selectedTime === time
          return (
            <button
              key={time}
              onClick={() => onPick(time)}
              className={`px-2 py-[11px] rounded-[8px] text-[13px] font-medium border transition-colors cursor-pointer ${
                active
                  ? 'bg-primary text-surface border-primary'
                  : 'bg-surface-2 border-gray-border text-text hover:bg-primary hover:text-surface hover:border-primary'
              }`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {time}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AccordionSlotBlocks({ slots, selectedTime, onPick }: { slots: string[]; selectedTime: string | null; onPick: (s: string) => void }) {
  const morning = slots.filter((s) => parseInt(s.split(':')[0], 10) < 13)
  const afternoon = slots.filter((s) => parseInt(s.split(':')[0], 10) >= 13)
  return (
    <div className="pt-3">
      {morning.length > 0 && (
        <MobileSlotBlock title="Mañana" slots={morning} selectedTime={selectedTime} onPick={onPick} />
      )}
      {afternoon.length > 0 && (
        <MobileSlotBlock title="Tarde" slots={afternoon} selectedTime={selectedTime} onPick={onPick} last />
      )}
    </div>
  )
}

function MobileSlotBlock({ title, slots, selectedTime, onPick, last }: { title: string; slots: string[]; selectedTime: string | null; onPick: (s: string) => void; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-3'}>
      <div
        className="text-[9px] text-text-hint uppercase tracking-[0.12em] mb-2"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {title}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((time) => {
          const active = selectedTime === time
          return (
            <button
              key={time}
              onClick={() => onPick(time)}
              className={`px-1 py-2.5 rounded-[8px] text-[12.5px] font-medium border transition-colors cursor-pointer ${
                active
                  ? 'bg-primary text-surface border-primary'
                  : 'bg-surface-2 border-gray-border text-text hover:bg-primary hover:text-surface hover:border-primary'
              }`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {time}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Editorial busy overlay — centered, mono label + animated 3-dot sage spinner.
function BusyOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-3 bg-surface/85 backdrop-blur-sm rounded-[14px] px-6 py-5 border border-gray-border">
        <div className="flex gap-1.5" aria-hidden>
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '160ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '320ms' }} />
        </div>
        <div
          className="text-[10px] text-text-muted uppercase tracking-[0.16em]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {label}…
        </div>
      </div>
    </div>
  )
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
