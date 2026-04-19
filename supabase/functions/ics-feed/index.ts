// MediBot — ICS feed endpoint.
// Serves each doctor's calendar as an iCalendar file that Google Calendar,
// Apple Calendar, Outlook, etc. can subscribe to.
//
// URL: https://<project>.functions.supabase.co/ics-feed/<booking_code>
// (or with .ics suffix for nicer URLs: .../ics-feed/<booking_code>.ics)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============ HELPERS ============

/** Argentina is UTC-3 year-round (no DST). Convert local date+time to UTC ISO-like stamp. */
function toUtcICalStamp(date: string, time: string, durationMin = 0): string {
  // date = "2026-04-18", time = "10:30" or "10:30:00"
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // Local Argentina time → UTC: add 3 hours.
  const utc = new Date(Date.UTC(y, m - 1, d, hh + 3, mm + durationMin, 0));
  const YYYY = utc.getUTCFullYear();
  const MM = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(utc.getUTCDate()).padStart(2, "0");
  const H = String(utc.getUTCHours()).padStart(2, "0");
  const M = String(utc.getUTCMinutes()).padStart(2, "0");
  return `${YYYY}${MM}${DD}T${H}${M}00Z`;
}

/** Escape text for iCalendar fields: commas, semicolons, backslashes, newlines */
function icsEscape(s: string): string {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/** Fold lines longer than 75 octets per RFC 5545 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let rest = line;
  out.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    out.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length > 0) out.push(" " + rest);
  return out.join("\r\n");
}

function toUtcStamp(): string {
  // "Now" in UTC as iCal-format UTC timestamp, ending with Z
  const d = new Date();
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0") +
    "Z"
  );
}

// ============ CORS ============

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// ============ HANDLER ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Path: /ics-feed/<code> or /ics-feed/<code>.ics
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  const code = last.replace(/\.ics$/i, "").trim();

  if (!code || !/^[a-f0-9]{4,32}$/i.test(code)) {
    return new Response("Invalid booking code", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  // Look up the doctor by booking_code
  const { data: doctor, error: docErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, specialty, session_duration, address, city")
    .eq("booking_code", code)
    .single();

  if (docErr || !doctor) {
    return new Response("Doctor not found", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  // Fetch all non-blocked, non-free appointments.
  // Include cancelled ones so they show as cancelled in the calendar (user can opt to hide).
  const { data: appts, error: aptErr } = await supabase
    .from("appointments")
    .select("id, date, time, duration, patient_name, detail, status")
    .eq("doctor_id", doctor.id)
    .not("status", "in", "(libre,bloqueado)")
    .order("date")
    .order("time");

  if (aptErr) {
    return new Response("Error fetching appointments", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const doctorName = `${doctor.first_name ?? ""} ${doctor.last_name ?? ""}`.trim() || "Profesional";
  const calName = `MediBot - ${doctorName}`;
  const location = [doctor.address, doctor.city].filter(Boolean).join(", ");
  const defaultDuration = Number(doctor.session_duration) || 50;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MediBot//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calName)}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
    `X-WR-CALDESC:${icsEscape("Turnos de " + doctorName + " - MediBot")}`,
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  const dtstamp = toUtcStamp();

  for (const a of appts ?? []) {
    const startTime = String(a.time).slice(0, 5); // "HH:MM"
    const durationMin = Number(String(a.duration).match(/\d+/)?.[0] || defaultDuration);

    const dtstart = toUtcICalStamp(a.date, startTime, 0);
    const dtend = toUtcICalStamp(a.date, startTime, durationMin);

    const isCancelled = a.status === "cancelado";
    const summaryPrefix = isCancelled ? "[CANCELADO] " : "";
    const summary = `${summaryPrefix}${a.patient_name || "Turno"}`;

    const descriptionParts: string[] = [];
    if (a.detail) descriptionParts.push(a.detail);
    descriptionParts.push(`Estado: ${a.status}`);
    descriptionParts.push(`Duracion: ${durationMin} min`);
    const description = descriptionParts.join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@medibot`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(description)}`,
    );
    if (location) lines.push(`LOCATION:${icsEscape(location)}`);
    if (isCancelled) lines.push("STATUS:CANCELLED");
    else if (a.status === "confirmado") lines.push("STATUS:CONFIRMED");
    else lines.push("STATUS:TENTATIVE");
    lines.push("SEQUENCE:0");
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // CRLF + fold long lines per RFC 5545
  const body = lines.map(foldLine).join("\r\n") + "\r\n";

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="medibot-${code}.ics"`,
      "Cache-Control": "public, max-age=600", // 10 min, calendar apps usually re-fetch on their own schedule
    },
  });
});
