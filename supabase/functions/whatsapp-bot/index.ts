import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;

// ============ SEND WHATSAPP MESSAGE ============

async function sendWhatsApp(to: string, body: string) {
  console.log(`[SEND] Attempting to send to ${to}, PHONE_ID=${WA_PHONE_ID}, TOKEN_LENGTH=${WA_TOKEN?.length}`);
  const url = `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body },
    }),
  });
  const data = await res.json();
  console.log(`[SEND] Response status=${res.status}:`, JSON.stringify(data));
  return data;
}

// ============ TYPES ============

interface IncomingMessage {
  from: string;
  body: string;
  provider: string;
}

// ============ MESSAGE PARSER ============

function normalizeMessage(raw: Record<string, unknown>, provider: string): IncomingMessage | null {
  if (provider === "twilio") {
    return {
      from: (raw.From as string || "").replace("whatsapp:", ""),
      body: (raw.Body as string || "").trim(),
      provider: "twilio",
    };
  }
  if (provider === "meta") {
    const entry = (raw.entry as any)?.[0];
    const change = entry?.changes?.[0];
    const msg = change?.value?.messages?.[0];
    if (!msg) return null;
    return { from: msg.from, body: msg.text?.body || "", provider: "meta" };
  }
  return { from: raw.from as string || "", body: raw.body as string || "", provider: "test" };
}

// ============ TEMPLATES ============

const defaultTemplates: Record<string, string> = {
  greeting: 'Hola {nombre}! Soy el asistente de *{doctor}*.\n\n¿En qué puedo ayudarte?\n\n1️⃣ Sacar turno\n2️⃣ Ver mi próximo turno\n3️⃣ Cancelar turno\n4️⃣ Hablar con {doctor_nombre}',
  booking_location: '¿Dónde preferís atenderte?\n\n{ubicaciones}\n\nRespondé con el número de la ubicación.',
  booking_slots: '📅 Horarios en *{ubicacion}* para el *{fecha}*:\n\n{horarios}\n\nRespondé con el número del horario.',
  booking_confirm: '✅ Turno agendado!\n\n📅 *{fecha}*\n🕐 *{hora} hs*\n📍 *{ubicacion}*\n{direccion}\n\nRespondé *"confirmo"* para confirmar o *"cancelar"* si necesitás cancelar.',
  next_appointment: 'Tu próximo turno:\n\n📅 *{fecha}*\n🕐 *{hora} hs*\n{ubicacion_linea}\n{estado_emoji} {estado}',
  cancel_confirm: '❌ Tu turno del *{fecha}* a las *{hora} hs* fue cancelado.\n\nSi querés reagendar, respondé *"turno"*.',
  patient_confirm: '✅ Perfecto! Tu turno del *{fecha}* a las *{hora} hs* quedó confirmado.\n\n¡Te esperamos!',
  talk_to_doctor: '📩 Entendido. Le aviso a {doctor} y te va a contactar a la brevedad.\n\nSi es urgente, llamá al consultorio.',
  unknown_patient: 'Hola! Soy el asistente virtual de MediBot.\n\nNo encontré tu número registrado. Contactá al consultorio para que te agreguen como paciente.',
  default_reply: 'No entendí tu mensaje. Podés escribir:\n\n1️⃣ *turno* - para agendar\n2️⃣ *próximo* - para ver tu turno\n3️⃣ *cancelar* - para cancelar\n4️⃣ *hablar* - para contactar al profesional',
};

async function getTemplate(doctorId: string, key: string): Promise<string> {
  const { data } = await supabase
    .from("bot_templates")
    .select("message, enabled")
    .eq("doctor_id", doctorId)
    .eq("template_key", key)
    .single();

  if (data && data.enabled && data.message) return data.message;
  return defaultTemplates[key] || "";
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

// ============ DB HELPERS ============

async function findPatientByPhone(phone: string) {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const last8 = cleaned.slice(-8);
  const { data } = await supabase
    .from("patients")
    .select("*")
    .ilike("phone", `%${last8}%`)
    .limit(1)
    .single();
  if (data) return { patient: data, doctorId: data.doctor_id };
  return null;
}

async function getDoctorProfile(doctorId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, specialty, address, city, work_days, work_from, work_to, session_duration")
    .eq("id", doctorId)
    .single();
  return data;
}

async function getDoctorLocations(doctorId: string) {
  // Get orgs the doctor belongs to
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(id, name, address, city)")
    .eq("user_id", doctorId);

  const locations: { id: string | null; name: string; address: string }[] = [];

  if (memberships) {
    for (const m of memberships) {
      const org = (m as any).organizations;
      if (org && org.address) {
        locations.push({ id: org.id, name: org.name, address: `${org.address}${org.city ? ", " + org.city : ""}` });
      }
    }
  }

  // Add personal address
  const profile = await getDoctorProfile(doctorId);
  if (profile && profile.address) {
    locations.push({
      id: null,
      name: "Consultorio particular",
      address: `${profile.address}${profile.city ? ", " + profile.city : ""}`,
    });
  }

  return locations;
}

async function getAvailableSlots(doctorId: string, date: string) {
  const profile = await getDoctorProfile(doctorId);
  if (!profile) return [];

  const { data: existing } = await supabase
    .from("appointments")
    .select("time")
    .eq("doctor_id", doctorId)
    .eq("date", date);

  const bookedTimes = new Set((existing || []).map((a: any) => String(a.time).slice(0, 5)));
  const [startH] = (profile.work_from || "09:00").split(":").map(Number);
  const [endH] = (profile.work_to || "18:00").split(":").map(Number);

  const slots: string[] = [];
  for (let h = startH; h < endH; h++) {
    const time = `${String(h).padStart(2, "0")}:00`;
    if (!bookedTimes.has(time)) slots.push(time);
  }
  return slots;
}

async function getNextAppointment(doctorId: string, patientId: string) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("appointments")
    .select("*, organizations(name, address, city)")
    .eq("doctor_id", doctorId)
    .eq("patient_id", patientId)
    .gte("date", today)
    .in("status", ["confirmado", "pendiente"])
    .order("date")
    .order("time")
    .limit(1)
    .single();
  return data;
}

function getNextWorkday(workDays: string[]): string {
  const dayMap: Record<number, string> = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mi\u00e9", 4: "Jue", 5: "Vie", 6: "S\u00e1b" };
  const d = new Date();
  for (let i = 1; i <= 7; i++) {
    d.setDate(d.getDate() + 1);
    if (workDays.includes(dayMap[d.getDay()])) return d.toISOString().split("T")[0];
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

async function getSpecialties(): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("specialty")
    .not("specialty", "is", null)
    .not("specialty", "eq", "");
  if (!data) return [];
  const unique = [...new Set(data.map((p: any) => p.specialty).filter(Boolean))];
  return unique;
}

async function getDoctorsBySpecialty(specialty: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, specialty, address, city")
    .ilike("specialty", `%${specialty}%`);
  return data || [];
}

async function getDoctorByBookingCode(code: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, specialty, address, city")
    .eq("booking_code", code)
    .single();
  return data;
}

async function createPatient(doctorId: string, name: string, phone: string, dni: string, insurance: string) {
  const { data, error } = await supabase
    .from("patients")
    .insert({
      doctor_id: doctorId,
      name,
      phone,
      dni,
      insurance,
      since: `Paciente desde ${new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`,
      total_sessions: 0,
      tags: [],
    })
    .select()
    .single();
  return { data, error };
}

// ============ SESSION STATE (Supabase persistent) ============

async function getSession(phone: string): Promise<{ step: string; data: Record<string, any> } | null> {
  const { data } = await supabase
    .from("bot_sessions")
    .select("step, data, expires_at")
    .eq("phone", phone)
    .single();
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("bot_sessions").delete().eq("phone", phone);
    return null;
  }
  return { step: data.step, data: data.data || {} };
}

async function setSession(phone: string, step: string, data: Record<string, any> = {}) {
  const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min TTL
  await supabase.from("bot_sessions").upsert({
    phone, step, data, expires_at,
  });
}

async function clearSession(phone: string) {
  await supabase.from("bot_sessions").delete().eq("phone", phone);
}

// ============ ONBOARDING INSURANCES ============

const insuranceOptions = ["OSDE", "Swiss Medical", "Medife", "Galeno", "Particular", "Otra"];

// ============ BOT LOGIC ============

async function handleMessage(from: string, body: string): Promise<string> {
  const text = body.toLowerCase().trim();
  let session = await getSession(from);

  // ---- BOOKING CODE: detect if message contains a doctor's link code ----
  // Format expected: "turno-XXXXXXXX" or just "XXXXXXXX"
  const codeMatch = text.match(/(?:turno[-_])?([a-f0-9]{8})/);
  if (codeMatch) {
    const code = codeMatch[1];
    const doctor = await getDoctorByBookingCode(code);
    if (doctor) {
      // Check if patient already exists with any doctor
      const existing = await findPatientByPhone(from);
      if (existing) {
        // Patient already registered, go to booking flow directly
        await clearSession(from);
        return handleExistingPatient(from, "turno", existing);
      }
      // New patient: skip specialty/doctor selection, pre-assign doctor
      await setSession(from, "onboard_name", { preAssignedDoctor: doctor });
      return `Hola! Soy el asistente de *${doctor.first_name} ${doctor.last_name}*. Para agendar tu turno, decime tu nombre y apellido.`;
    }
  }

  // ---- ONBOARDING: new patient registration ----

  // Step: waiting for name
  if (session?.step === "onboard_name") {
    const name = body.trim();
    if (name.length < 2) return "Por favor, decime tu nombre y apellido.";
    const firstName = name.split(" ")[0];
    await setSession(from, "onboard_dni", { ...session.data, name, firstName });
    return `Hola ${firstName}! ¿Cual es tu DNI?`;
  }

  // Step: waiting for DNI
  if (session?.step === "onboard_dni") {
    const dni = body.trim().replace(/\./g, "");
    if (dni.length < 6) return "Por favor, ingresa un DNI valido.";
    await setSession(from, "onboard_insurance", { ...session.data, dni });
    const list = insuranceOptions.map((ins, i) => `${i + 1}. ${ins}`).join("\n");
    return `¿Tenes obra social?\n\n${list}`;
  }

  // Step: waiting for insurance selection
  if (session?.step === "onboard_insurance") {
    const choice = parseInt(text);
    let insurance = "";
    if (choice >= 1 && choice <= insuranceOptions.length) {
      insurance = insuranceOptions[choice - 1];
    } else if (text === "otra" || text === "5") {
      insurance = "Otra";
    } else {
      insurance = body.trim(); // free text
    }

    // If there's a pre-assigned doctor (from booking code link), register directly
    if (session.data.preAssignedDoctor) {
      const doc = session.data.preAssignedDoctor;
      const { data: patient } = await createPatient(doc.id, session.data.name, from, session.data.dni, insurance);
      await clearSession(from);
      if (!patient) return "Hubo un error. Intenta de nuevo.";
      return `Perfecto ${session.data.firstName}! Quedaste registrad@ con *${doc.first_name} ${doc.last_name}*.\n\n¿Queres sacar turno?\n\n1. Si, sacar turno\n2. No, gracias`;
    }

    await setSession(from, "onboard_specialty", { ...session.data, insurance });

    const specialties = await getSpecialties();
    if (specialties.length === 0) {
      // No doctors registered yet
      await clearSession(from);
      return "En este momento no hay profesionales disponibles. Intenta mas tarde.";
    }
    if (specialties.length === 1) {
      // Only one specialty, skip selection
      await setSession(from, "onboard_doctor", { ...session.data, insurance, specialty: specialties[0] });
      const doctors = await getDoctorsBySpecialty(specialties[0]);
      if (doctors.length === 1) {
        // Only one doctor, register directly
        const doc = doctors[0];
        const { data: patient } = await createPatient(doc.id, session.data.name, from, session.data.dni, insurance);
        await clearSession(from);
        if (!patient) return "Hubo un error. Intenta de nuevo.";
        return `Perfecto ${session.data.firstName}! Quedaste registrad@ con *${doc.first_name} ${doc.last_name}*.\n\n¿Queres sacar turno?\n\n1. Si, sacar turno\n2. No, gracias`;
      }
      const docList = doctors.map((d: any, i: number) => `${i + 1}. ${d.first_name} ${d.last_name}${d.address ? ` - ${d.address}` : ""}`).join("\n");
      return `Estos son los profesionales de ${specialties[0]}:\n\n${docList}\n\nResponde con el numero del profesional.`;
    }

    const specList = specialties.map((s, i) => `${i + 1}. ${s}`).join("\n");
    return `¿Que especialidad estas buscando?\n\n${specList}`;
  }

  // Step: waiting for specialty selection
  if (session?.step === "onboard_specialty") {
    const specialties = await getSpecialties();
    const choice = parseInt(text);
    let specialty = "";
    if (choice >= 1 && choice <= specialties.length) {
      specialty = specialties[choice - 1];
    } else {
      specialty = body.trim();
    }

    const doctors = await getDoctorsBySpecialty(specialty);
    if (doctors.length === 0) {
      return `No encontre profesionales de ${specialty}. Intenta con otra especialidad.`;
    }
    if (doctors.length === 1) {
      const doc = doctors[0];
      const { data: patient } = await createPatient(doc.id, session.data.name, from, session.data.dni, session.data.insurance);
      await clearSession(from);
      if (!patient) return "Hubo un error. Intenta de nuevo.";
      return `Perfecto ${session.data.firstName}! Quedaste registrad@ con *${doc.first_name} ${doc.last_name}*.\n\n¿Queres sacar turno?\n\n1. Si, sacar turno\n2. No, gracias`;
    }

    await setSession(from, "onboard_doctor", { ...session.data, specialty });
    const docList = doctors.map((d: any, i: number) => `${i + 1}. ${d.first_name} ${d.last_name}${d.address ? ` - ${d.address}` : ""}`).join("\n");
    return `Estos son los profesionales de ${specialty}:\n\n${docList}\n\nResponde con el numero del profesional.`;
  }

  // Step: waiting for doctor selection
  if (session?.step === "onboard_doctor") {
    const doctors = await getDoctorsBySpecialty(session.data.specialty);
    const choice = parseInt(text);
    if (choice >= 1 && choice <= doctors.length) {
      const doc = doctors[choice - 1];
      const { data: patient } = await createPatient(doc.id, session.data.name, from, session.data.dni, session.data.insurance);
      await clearSession(from);
      if (!patient) return "Hubo un error. Intenta de nuevo.";
      return `Perfecto ${session.data.firstName}! Quedaste registrad@ con *${doc.first_name} ${doc.last_name}*.\n\n¿Queres sacar turno?\n\n1. Si, sacar turno\n2. No, gracias`;
    }
    return "Opcion invalida. Responde con el numero del profesional.";
  }

  // ---- CHECK IF PATIENT EXISTS ----

  const result = await findPatientByPhone(from);

  // Handle "si, sacar turno" after onboarding
  if (!result && (text === "1" || text === "si" || text.includes("si"))) {
    // Just registered but session cleared, try finding again
    const retry = await findPatientByPhone(from);
    if (retry) {
      // Redirect to booking flow
      return handleExistingPatient(from, "turno", retry);
    }
  }

  if (!result) {
    // Start onboarding
    await setSession(from, "onboard_name", {});
    return "Hola! Soy el asistente de MediBot. Decime tu nombre y apellido.";
  }

  return handleExistingPatient(from, text, result);
}

async function handleExistingPatient(from: string, text: string, result: { patient: any; doctorId: string }): Promise<string> {
  const session = await getSession(from);
  const { patient, doctorId } = result;
  const profile = await getDoctorProfile(doctorId);
  const doctorName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "tu profesional";
  const doctorFirstName = profile?.first_name || "el profesional";
  const baseVars = { nombre: patient.name, doctor: doctorName, doctor_nombre: doctorFirstName };

  // ---- HANDLE SESSION STEPS ----

  if (session?.step === "choose_location") {
    const locations = session.data.locations as { id: string | null; name: string; address: string }[];
    const choice = parseInt(text);
    if (choice >= 1 && choice <= locations.length) {
      const loc = locations[choice - 1];
      const workDays = profile?.work_days || ["Lun", "Mar", "Mie", "Jue", "Vie"];
      const nextDay = getNextWorkday(workDays);
      const slots = await getAvailableSlots(doctorId, nextDay);
      if (slots.length === 0) { await clearSession(from); return `No hay horarios disponibles para el ${formatDate(nextDay)} en ${loc.name}.`; }
      await setSession(from, "choose_slot", { location: loc, date: nextDay, slots: slots.slice(0, 6) });
      const slotList = slots.slice(0, 6).map((s, i) => `${i + 1}. ${s} hs`).join("\n");
      const tpl = await getTemplate(doctorId, "booking_slots");
      return fillTemplate(tpl, { ...baseVars, ubicacion: loc.name, fecha: formatDate(nextDay), horarios: slotList });
    }
    await clearSession(from);
    return `Opcion invalida. Responde *"turno"* para empezar de nuevo.`;
  }

  if (session?.step === "choose_slot") {
    const { location, date, slots } = session.data;
    const choice = parseInt(text);
    if (choice >= 1 && choice <= slots.length) {
      const time = slots[choice - 1];
      await supabase.from("appointments").insert({
        doctor_id: doctorId, patient_id: patient.id, date, time,
        duration: "50 min", patient_name: patient.name,
        detail: "Turno agendado via WhatsApp", status: "pendiente",
        organization_id: location.id || null,
      });
      await clearSession(from);
      const tpl = await getTemplate(doctorId, "booking_confirm");
      return fillTemplate(tpl, { ...baseVars, fecha: formatDate(date), hora: time, ubicacion: location.name, direccion: location.address });
    }
    await clearSession(from);
    return `Opcion invalida. Responde *"turno"* para empezar de nuevo.`;
  }

  // ---- MAIN MENU ----

  if (["hola", "buenas", "buen dia", "buenos dias", "buenas tardes", "buenas noches", "hi", "hello"].some((g) => text.startsWith(g))) {
    await clearSession(from);
    const tpl = await getTemplate(doctorId, "greeting");
    return fillTemplate(tpl, baseVars);
  }

  if (text === "1" || text.includes("turno") || text.includes("sacar") || text.includes("agendar") || text.includes("reservar") || text === "si") {
    const locations = await getDoctorLocations(doctorId);
    const workDays = profile?.work_days || ["Lun", "Mar", "Mie", "Jue", "Vie"];

    const showSlots = async (loc: { id: string | null; name: string; address: string }) => {
      const nextDay = getNextWorkday(workDays);
      const slots = await getAvailableSlots(doctorId, nextDay);
      if (slots.length === 0) return `No hay horarios disponibles en ${loc.name}.`;
      await setSession(from, "choose_slot", { location: loc, date: nextDay, slots: slots.slice(0, 6) });
      const slotList = slots.slice(0, 6).map((s, i) => `${i + 1}. ${s} hs`).join("\n");
      const tpl = await getTemplate(doctorId, "booking_slots");
      return fillTemplate(tpl, { ...baseVars, ubicacion: loc.name, fecha: formatDate(nextDay), horarios: slotList });
    };

    if (locations.length <= 1) {
      const loc = locations[0] || { id: null, name: "Consultorio", address: "" };
      return showSlots(loc);
    }

    await setSession(from, "choose_location", { locations });
    const locList = locations.map((l, i) => `${i + 1}. 📍 ${l.name}\n    ${l.address}`).join("\n\n");
    const tpl = await getTemplate(doctorId, "booking_location");
    return fillTemplate(tpl, { ...baseVars, ubicaciones: locList });
  }

  if (text === "2" || text.includes("proximo") || text.includes("cuando")) {
    await clearSession(from);
    const next = await getNextAppointment(doctorId, patient.id);
    if (next) {
      const org = (next as any).organizations;
      const locLine = org?.address ? `📍 *${org.name}* - ${org.address}${org.city ? ", " + org.city : ""}` : "";
      const statusEmoji = next.status === "confirmado" ? "✅" : "⏳";
      const estado = next.status === "confirmado" ? "Confirmado" : "Pendiente de confirmar";
      const tpl = await getTemplate(doctorId, "next_appointment");
      return fillTemplate(tpl, { ...baseVars, fecha: formatDate(next.date), hora: String(next.time).slice(0, 5), ubicacion_linea: locLine, estado_emoji: statusEmoji, estado });
    }
    return `No tenes turnos programados. Responde *"turno"* para agendar uno nuevo.`;
  }

  if (text === "3" || text.includes("cancelar") || text.includes("cancelo")) {
    await clearSession(from);
    const next = await getNextAppointment(doctorId, patient.id);
    if (next) {
      await supabase.from("appointments").update({ status: "cancelado", detail: "Cancelado por el paciente via WhatsApp" }).eq("id", next.id);
      const tpl = await getTemplate(doctorId, "cancel_confirm");
      return fillTemplate(tpl, { ...baseVars, fecha: formatDate(next.date), hora: String(next.time).slice(0, 5) });
    }
    return `No tenes turnos activos para cancelar.`;
  }

  if (text === "4" || text.includes("hablar") || text.includes("doctor") || text.includes("profesional")) {
    await clearSession(from);
    const tpl = await getTemplate(doctorId, "talk_to_doctor");
    return fillTemplate(tpl, baseVars);
  }

  if (text.includes("confirmo") || text.includes("confirmar")) {
    await clearSession(from);
    const next = await getNextAppointment(doctorId, patient.id);
    if (next && next.status === "pendiente") {
      await supabase.from("appointments").update({ status: "confirmado" }).eq("id", next.id);
      const tpl = await getTemplate(doctorId, "patient_confirm");
      return fillTemplate(tpl, { ...baseVars, fecha: formatDate(next.date), hora: String(next.time).slice(0, 5) });
    }
    return `No encontre un turno pendiente de confirmar.`;
  }

  await clearSession(from);
  const tpl = await getTemplate(doctorId, "default_reply");
  return fillTemplate(tpl, baseVars);
}

// ============ HTTP HANDLER ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Meta webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "medibot-verify";

    if (mode === "subscribe" && token === verifyToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("MediBot WhatsApp Bot activo", { status: 200 });
  }

  // POST - incoming message
  try {
    const contentType = req.headers.get("content-type") || "";
    let raw: Record<string, unknown>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      raw = Object.fromEntries(new URLSearchParams(text));
      raw._provider = "twilio";
    } else {
      raw = await req.json();
    }

    const provider = (raw._provider as string) || (raw.entry ? "meta" : "test");
    const msg = normalizeMessage(raw, provider);

    if (!msg || !msg.from) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process message
    const replyText = await handleMessage(msg.from, msg.body);
    console.log(`[${provider}] ${msg.from}: "${msg.body}" -> "${replyText.substring(0, 80)}..."`);

    // Send reply via WhatsApp API (only for meta/twilio, not test)
    if (provider === "meta" && WA_TOKEN && WA_PHONE_ID) {
      await sendWhatsApp(msg.from, replyText);
    }

    // Always return the reply in the response (useful for testing + Twilio TwiML)
    if (provider === "twilio") {
      // Twilio expects TwiML
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyText}</Message></Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    return new Response(JSON.stringify({ reply: { to: msg.from, body: replyText } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("Bot error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
