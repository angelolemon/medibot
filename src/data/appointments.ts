export type AppointmentStatus = 'confirmado' | 'pendiente' | 'cancelado' | 'libre' | 'bloqueado'

export interface TimeBlock {
  id: string
  date: string
  from: string
  to: string
}

export interface DateBlock {
  id: string
  from: string
  to: string
  reason: string
  createdAt: string
}

export function getDatesBetween(from: string, to: string): string[] {
  const dates: string[] = []
  const start = new Date(from + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export interface Patient {
  name: string
  phone: string
  email: string
  age: string
  since: string
  insurance: string
  lastVisit: string
  totalSessions: number
  tags: string[]
  history: { date: string; text: string }[]
}

export interface Appointment {
  id: string
  date: string
  time: string
  duration: string
  patientName: string | null
  detail: string
  status: AppointmentStatus
  patient: Patient | null
  doctorLabel?: string
  locationId?: string | null
  locationName?: string | null
  locationAddress?: string | null
  locationCity?: string | null
}

export interface DayOption {
  label: string
  date: string
  isToday: boolean
}

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const TODAY = '2026-04-04'

function getWeekDays(referenceDate: string): DayOption[] {
  const ref = new Date(referenceDate + 'T12:00:00')
  const dayOfWeek = ref.getDay() // 0=Sun
  const sunday = new Date(ref)
  sunday.setDate(ref.getDate() - dayOfWeek)

  const result: DayOption[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const isToday = iso === TODAY
    const label = isToday ? `Hoy ${d.getDate()}` : `${dayNames[d.getDay()]} ${d.getDate()}`
    result.push({ label, date: iso, isToday })
  }
  return result
}

export function getWeekForDate(date: string): DayOption[] {
  return getWeekDays(date)
}

export function shiftWeek(currentDate: string, direction: -1 | 1): string {
  const d = new Date(currentDate + 'T12:00:00')
  d.setDate(d.getDate() + direction * 7)
  return d.toISOString().split('T')[0]
}

// Shared patient records
const patients: Record<string, Patient> = {
  marcos: {
    name: 'Marcos Rodríguez',
    phone: '+54 9 11 4523-8870',
    email: 'marcos.rod@gmail.com',
    age: '34 años',
    since: 'Paciente desde marzo 2024',
    insurance: 'OSDE 310',
    lastVisit: '28 mar 2026',
    totalSessions: 42,
    tags: ['Ansiedad', 'TCC', 'Semanal'],
    history: [
      { date: 'Mar 28', text: 'Sesión — Avance en técnicas de respiración' },
      { date: 'Mar 21', text: 'Sesión — Revisión de registro de pensamientos' },
      { date: 'Mar 14', text: 'Sesión — Inicio de reestructuración cognitiva' },
    ],
  },
  valentina: {
    name: 'Valentina Gómez',
    phone: '+54 9 11 6712-4490',
    email: 'vale.gomez@hotmail.com',
    age: '27 años',
    since: 'Primera consulta hoy',
    insurance: 'Swiss Medical',
    lastVisit: 'Primera vez',
    totalSessions: 0,
    tags: ['Primera vez', 'Derivación'],
    history: [],
  },
  julian: {
    name: 'Julián Torres',
    phone: '+54 9 11 5230-1102',
    email: 'jtorres@live.com',
    age: '41 años',
    since: 'Paciente desde enero 2025',
    insurance: 'Particular',
    lastVisit: '21 mar 2026',
    totalSessions: 12,
    tags: ['Depresión', 'Quincenal'],
    history: [
      { date: 'Mar 21', text: 'Sesión — Estado estable, continúa medicación' },
      { date: 'Mar 7', text: 'Sesión — Dificultades en el trabajo' },
    ],
  },
  ana: {
    name: 'Ana Martínez',
    phone: '+54 9 11 7890-3340',
    email: 'ana.martinez@gmail.com',
    age: '38 años',
    since: 'Paciente desde mayo 2023',
    insurance: 'OSDE 210',
    lastVisit: '28 mar 2026',
    totalSessions: 78,
    tags: ['Ansiedad', 'TCC', 'Semanal'],
    history: [
      { date: 'Mar 28', text: 'Sesión — Trabajamos exposición gradual' },
    ],
  },
  sofia: {
    name: 'Sofía Benítez',
    phone: '+54 9 11 3344-9921',
    email: 'sofi.benitez@yahoo.com',
    age: '29 años',
    since: 'Paciente desde julio 2024',
    insurance: 'Medifé',
    lastVisit: '1 mar 2026',
    totalSessions: 9,
    tags: ['Control', 'Mensual'],
    history: [
      { date: 'Mar 1', text: 'Control mensual — Sin novedades' },
      { date: 'Feb 1', text: 'Control mensual — Buen progreso' },
    ],
  },
  ricardo: {
    name: 'Ricardo Fernández',
    phone: '+54 9 11 2233-5566',
    email: 'rfernandez@empresa.com',
    age: '45 años',
    since: 'Paciente desde noviembre 2024',
    insurance: 'Galeno Oro',
    lastVisit: '28 mar 2026',
    totalSessions: 18,
    tags: ['Estrés laboral', 'Semanal'],
    history: [
      { date: 'Mar 28', text: 'Sesión — Técnicas de manejo del estrés' },
    ],
  },
  camila: {
    name: 'Camila Herrera',
    phone: '+54 9 11 8877-4455',
    email: 'cami.herrera@gmail.com',
    age: '31 años',
    since: 'Paciente desde agosto 2024',
    insurance: 'Particular',
    lastVisit: '28 mar 2026',
    totalSessions: 28,
    tags: ['TCC', 'Fobia social', 'Semanal'],
    history: [
      { date: 'Mar 28', text: 'Sesión — Ejercicios de exposición social' },
      { date: 'Mar 21', text: 'Sesión — Registro de situaciones sociales' },
    ],
  },
  lucia: {
    name: 'Lucía Morales',
    phone: '+54 9 11 6655-2233',
    email: 'lu.morales@outlook.com',
    age: '25 años',
    since: 'Paciente desde febrero 2025',
    insurance: 'OSDE 310',
    lastVisit: '25 mar 2026',
    totalSessions: 4,
    tags: ['Ansiedad social', 'Quincenal'],
    history: [
      { date: 'Mar 25', text: 'Sesión — Técnicas de relajación' },
    ],
  },
}

export const allPatients: Patient[] = Object.values(patients)

export const initialAppointments: Appointment[] = [
  // =============================================
  // Semana 29 mar - 4 abr (semana actual)
  // =============================================

  // --- Lun 30 mar ---
  { id: 'l30-1', date: '2026-03-30', time: '09:00', duration: '50 min', patientName: 'Marcos Rodríguez', detail: 'Sesión individual · Ansiedad', status: 'confirmado', patient: patients.marcos },
  { id: 'l30-2', date: '2026-03-30', time: '10:00', duration: '50 min', patientName: 'Camila Herrera', detail: 'Sesión individual · TCC', status: 'confirmado', patient: patients.camila },
  { id: 'l30-3', date: '2026-03-30', time: '11:00', duration: '50 min', patientName: 'Ricardo Fernández', detail: 'Sesión individual · Seguimiento', status: 'confirmado', patient: patients.ricardo },
  { id: 'l30-4', date: '2026-03-30', time: '14:00', duration: '50 min', patientName: 'Lucía Morales', detail: 'Sesión individual · Ansiedad social', status: 'cancelado', patient: patients.lucia },
  { id: 'l30-5', date: '2026-03-30', time: '15:00', duration: '50 min', patientName: null, detail: '', status: 'libre', patient: null },

  // --- Mar 31 mar ---
  { id: 'm31-1', date: '2026-03-31', time: '09:00', duration: '50 min', patientName: 'Ana Martínez', detail: 'Sesión individual · TCC', status: 'confirmado', patient: patients.ana },
  { id: 'm31-2', date: '2026-03-31', time: '10:00', duration: '50 min', patientName: 'Julián Torres', detail: 'Sesión individual', status: 'confirmado', patient: patients.julian },
  { id: 'm31-3', date: '2026-03-31', time: '11:00', duration: '50 min', patientName: 'Valentina Gómez', detail: 'Evaluación inicial', status: 'pendiente', patient: patients.valentina },
  { id: 'm31-4', date: '2026-03-31', time: '14:00', duration: '50 min', patientName: 'Sofía Benítez', detail: 'Control mensual', status: 'confirmado', patient: patients.sofia },

  // --- Mié 1 abr ---
  { id: 'mi1-1', date: '2026-04-01', time: '09:00', duration: '50 min', patientName: 'Marcos Rodríguez', detail: 'Sesión individual · Ansiedad', status: 'confirmado', patient: patients.marcos },
  { id: 'mi1-2', date: '2026-04-01', time: '10:00', duration: '50 min', patientName: 'Camila Herrera', detail: 'Sesión individual · TCC', status: 'pendiente', patient: patients.camila },
  { id: 'mi1-3', date: '2026-04-01', time: '11:00', duration: '50 min', patientName: null, detail: '', status: 'libre', patient: null },
  { id: 'mi1-4', date: '2026-04-01', time: '14:00', duration: '50 min', patientName: 'Ricardo Fernández', detail: 'Sesión individual · Seguimiento', status: 'confirmado', patient: patients.ricardo },
  { id: 'mi1-5', date: '2026-04-01', time: '15:00', duration: '50 min', patientName: 'Lucía Morales', detail: 'Sesión individual · Ansiedad social', status: 'confirmado', patient: patients.lucia },

  // --- Jue 2 abr ---
  { id: 'j2-1', date: '2026-04-02', time: '09:00', duration: '50 min', patientName: 'Ana Martínez', detail: 'Sesión individual · TCC', status: 'confirmado', patient: patients.ana },
  { id: 'j2-2', date: '2026-04-02', time: '10:00', duration: '50 min', patientName: 'Julián Torres', detail: 'Sesión individual', status: 'confirmado', patient: patients.julian },
  { id: 'j2-3', date: '2026-04-02', time: '11:00', duration: '50 min', patientName: 'Lucía Morales', detail: 'Sesión individual · Ansiedad social', status: 'cancelado', patient: patients.lucia },
  { id: 'j2-4', date: '2026-04-02', time: '14:00', duration: '50 min', patientName: 'Marcos Rodríguez', detail: 'Sesión extra · Ansiedad', status: 'confirmado', patient: patients.marcos },
  { id: 'j2-5', date: '2026-04-02', time: '15:00', duration: '50 min', patientName: null, detail: '', status: 'libre', patient: null },

  // --- Vie 3 abr ---
  { id: 'v3-1', date: '2026-04-03', time: '09:00', duration: '50 min', patientName: 'Sofía Benítez', detail: 'Control mensual', status: 'confirmado', patient: patients.sofia },
  { id: 'v3-2', date: '2026-04-03', time: '10:00', duration: '50 min', patientName: 'Camila Herrera', detail: 'Sesión individual · TCC', status: 'confirmado', patient: patients.camila },
  { id: 'v3-3', date: '2026-04-03', time: '11:00', duration: '50 min', patientName: 'Ricardo Fernández', detail: 'Sesión individual · Seguimiento', status: 'pendiente', patient: patients.ricardo },
  { id: 'v3-4', date: '2026-04-03', time: '14:00', duration: '50 min', patientName: null, detail: '', status: 'libre', patient: null },

  // --- Sáb 4 abr (HOY) ---
  { id: '1', date: '2026-04-04', time: '09:00', duration: '50 min', patientName: 'Marcos Rodríguez', detail: 'Sesión individual · Ansiedad', status: 'confirmado', patient: patients.marcos },
  { id: '2', date: '2026-04-04', time: '10:00', duration: '50 min', patientName: 'Valentina Gómez', detail: 'Primera consulta · Derivación', status: 'confirmado', patient: patients.valentina },
  { id: '3', date: '2026-04-04', time: '11:00', duration: '50 min', patientName: 'Julián Torres', detail: 'Sesión individual', status: 'pendiente', patient: patients.julian },
  { id: '4', date: '2026-04-04', time: '12:00', duration: '50 min', patientName: null, detail: '', status: 'libre', patient: null },
  { id: '5', date: '2026-04-04', time: '14:00', duration: '50 min', patientName: 'Ana Martínez', detail: 'Canceló vía WhatsApp a las 8:30', status: 'cancelado', patient: patients.ana },
  { id: '6', date: '2026-04-04', time: '15:00', duration: '50 min', patientName: 'Sofía Benítez', detail: 'Sesión individual · Control', status: 'confirmado', patient: patients.sofia },
  { id: '7', date: '2026-04-04', time: '16:00', duration: '50 min', patientName: 'Ricardo Fernández', detail: 'Sesión individual · Seguimiento', status: 'confirmado', patient: patients.ricardo },
  { id: '8', date: '2026-04-04', time: '17:00', duration: '50 min', patientName: 'Camila Herrera', detail: 'Sesión individual · TCC', status: 'confirmado', patient: patients.camila },

  // =============================================
  // Semana 5 abr - 11 abr (próxima semana)
  // =============================================

  // --- Lun 6 abr ---
  { id: 'l6-1', date: '2026-04-06', time: '09:00', duration: '50 min', patientName: 'Marcos Rodríguez', detail: 'Sesión individual · Ansiedad', status: 'pendiente', patient: patients.marcos },
  { id: 'l6-2', date: '2026-04-06', time: '10:00', duration: '50 min', patientName: 'Ana Martínez', detail: 'Sesión individual · TCC', status: 'pendiente', patient: patients.ana },
  { id: 'l6-3', date: '2026-04-06', time: '11:00', duration: '50 min', patientName: null, detail: '', status: 'libre', patient: null },
  { id: 'l6-4', date: '2026-04-06', time: '14:00', duration: '50 min', patientName: 'Camila Herrera', detail: 'Sesión individual · TCC', status: 'pendiente', patient: patients.camila },
  { id: 'l6-5', date: '2026-04-06', time: '15:00', duration: '50 min', patientName: 'Ricardo Fernández', detail: 'Sesión individual · Seguimiento', status: 'pendiente', patient: patients.ricardo },

  // --- Mar 7 abr ---
  { id: 'm7-1', date: '2026-04-07', time: '09:00', duration: '50 min', patientName: 'Sofía Benítez', detail: 'Control mensual', status: 'pendiente', patient: patients.sofia },
  { id: 'm7-2', date: '2026-04-07', time: '10:00', duration: '50 min', patientName: 'Julián Torres', detail: 'Sesión individual', status: 'pendiente', patient: patients.julian },
  { id: 'm7-3', date: '2026-04-07', time: '14:00', duration: '50 min', patientName: 'Lucía Morales', detail: 'Sesión individual · Ansiedad social', status: 'pendiente', patient: patients.lucia },

  // --- Mié 8 abr ---
  { id: 'mi8-1', date: '2026-04-08', time: '09:00', duration: '50 min', patientName: 'Marcos Rodríguez', detail: 'Sesión individual · Ansiedad', status: 'pendiente', patient: patients.marcos },
  { id: 'mi8-2', date: '2026-04-08', time: '10:00', duration: '50 min', patientName: 'Camila Herrera', detail: 'Sesión individual · TCC', status: 'pendiente', patient: patients.camila },
  { id: 'mi8-3', date: '2026-04-08', time: '15:00', duration: '50 min', patientName: null, detail: '', status: 'libre', patient: null },

  // --- Jue 9 abr ---
  { id: 'j9-1', date: '2026-04-09', time: '09:00', duration: '50 min', patientName: 'Ana Martínez', detail: 'Sesión individual · TCC', status: 'pendiente', patient: patients.ana },
  { id: 'j9-2', date: '2026-04-09', time: '10:00', duration: '50 min', patientName: 'Ricardo Fernández', detail: 'Sesión individual · Seguimiento', status: 'pendiente', patient: patients.ricardo },
  { id: 'j9-3', date: '2026-04-09', time: '14:00', duration: '50 min', patientName: null, detail: '', status: 'libre', patient: null },

  // --- Vie 10 abr ---
  { id: 'v10-1', date: '2026-04-10', time: '09:00', duration: '50 min', patientName: 'Valentina Gómez', detail: 'Segunda consulta', status: 'pendiente', patient: patients.valentina },
  { id: 'v10-2', date: '2026-04-10', time: '10:00', duration: '50 min', patientName: 'Sofía Benítez', detail: 'Sesión individual · Control', status: 'pendiente', patient: patients.sofia },
  { id: 'v10-3', date: '2026-04-10', time: '11:00', duration: '50 min', patientName: 'Lucía Morales', detail: 'Sesión individual · Ansiedad social', status: 'pendiente', patient: patients.lucia },

]
