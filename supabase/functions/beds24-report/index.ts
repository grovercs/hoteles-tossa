// Edge Function: beds24-report
// Hotel L'Hostalet de Tossa — Panel de informes Beds24
//
// Recibe { desde: "YYYY-MM-DD", hasta: "YYYY-MM-DD" } y devuelve el mismo
// JSON normalizado que produce el parser del .xls en el frontend, pero
// obtenido EN VIVO desde la API de Beds24.
//
// Seguridad:
//  - Requiere un JWT valido de Supabase (Authorization: Bearer <token>).
//  - Solo pueden llamarla usuarios con perfil role = "Administrador" o "Dirección".
//  - Las credenciales de Beds24 se leen de secrets de Supabase, nunca del navegador.
//
// Despliegue:
//   supabase functions deploy beds24-report
//
// Secrets a configurar (supabase secrets set ...):
//   BEDS24_API_KEY   -> API Key de Beds24 (SETTINGS > ACCOUNT > ACCOUNT ACCESS)
//   BEDS24_PROP_KEY  -> PROP Key de la propiedad (SETTINGS > PROPERTY > LINK > PROPKEY)
//   BEDS24_TOTAL_ROOMS -> (opcional) nº total de habitaciones del hotel para el
//                      denominador de ocupación/RevPAR si no se usa getRoomDates.
//                      Por defecto 29 (L'Hostalet).
//
// Notas sobre la API de Beds24:
//  - No existe un endpoint "Daily Financial Summary" ya agregado. Se compone a
//    partir de getBookings (con includeInvoice) para ingresos + noches ocupadas,
//    y opcionalmente getRoomDates para disponibilidad exacta por día.
//  - includeInvoice solo funciona si la consulta devuelve <100 reservas; para
//    rangos largos conviene paginar (no implementado aquí: el hotel es pequeño).
//  - Los nombres exactos de campos (precio por noche, impuestos, comisiones)
//    deben verificarse contra la cuenta real de Beds24; la lógica de agregación
//    está aislada en aggregateDaily() para ajustarla fácilmente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const ALLOWED_ROLES = ["Administrador", "Dirección"];
const TOTAL_ROOMS_DEFAULT = 29;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function toBeds24Date(iso: string): string {
  // YYYY-MM-DD -> YYYYMMDD
  return iso.replaceAll("-", "");
}

function isoToLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function round2(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function eachDay(desde: string, hasta: string): string[] {
  const out: string[] = [];
  const [y, m, d] = desde.split("-").map(Number);
  const end = new Date(hasta.split("-").map(Number)[0], Number(hasta.split("-")[1]) - 1, Number(hasta.split("-")[2]));
  const cur = new Date(y, m - 1, d);
  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    out.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function isBookingActiveOnDate(b: any, dateIso: string): boolean {
  if (!b || b.status === "Cancelled" || b.status === "No-show") return false;
  const checkin = b.arrivalDate || b.firstNight || b.checkin; // campo real segun cuenta
  const checkout = b.departureDate || b.lastNight || b.checkout;
  if (!checkin || !checkout) return false;
  // estancia: [checkin, checkout)
  return dateIso >= checkin && dateIso < checkout;
}

// ---- Llamadas a Beds24 (V1 JSON) ----
async function beds24Call(functionName: string, payload: any, apiKey: string, propKey: string) {
  const body = {
    authentication: { apiKey, propKey },
    ...payload,
  };
  const res = await fetch(`https://api.beds24.com/json/${functionName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Beds24 ${functionName} respondió ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  // Beds24 puede devolver errores en { error: "..." } o success:false
  if (data && (data.error || data.success === false)) {
    throw new Error(`Beds24 ${functionName}: ${data.error || data.message || "error desconocido"}`);
  }
  return data;
}

// Precio total de una reserva: probar varios campos que usa Beds24.
function bookingTotal(b: any): number {
  const v = b?.invoice?.totalPrice ?? b?.invoice?.price ?? b?.price ?? b?.totalPrice ?? b?.priceTotal ?? 0;
  return Number(v) || 0;
}

// ---- Agregación diaria ----
function aggregateDaily(bookings: any[], dates: string[], totalRooms: number) {
  const days = dates.map((date) => {
    const active = bookings.filter((b) => isBookingActiveOnDate(b, date));
    let revenue = 0;
    let guests = 0;
    for (const b of active) {
      const price = bookingTotal(b);
      // reparto del ingreso entre las noches de la estancia
      const nightsRaw = b.nights ?? b.numberOfNights;
      const nights = Number(nightsRaw) || estimateNights(b);
      revenue += nights > 0 ? price / nights : price;
      guests += Number(b.guests || b.numberOfPeople || 0) || 0;
    }
    const nightsOccupied = active.length;
    const available = Math.max(totalRooms - nightsOccupied, 0);
    const occupancyPct = totalRooms > 0 ? (nightsOccupied / totalRooms) * 100 : 0;
    return {
      date,
      dateLabel: isoToLabel(date),
      revenue: round2(revenue),
      roomRevenue: round2(revenue),
      nightsOccupied,
      available,
      guests,
      occupancyPct: Math.round(occupancyPct * 10) / 10,
      adr: nightsOccupied > 0 ? round2(revenue / nightsOccupied) : 0,
      revpar: totalRooms > 0 ? round2(revenue / totalRooms) : 0,
    };
  });
  return days;
}

function estimateNights(b: any): number {
  const c = b.arrivalDate || b.firstNight || b.checkin;
  const o = b.departureDate || b.lastNight || b.checkout;
  if (!c || !o) return 1;
  const ms = new Date(o).getTime() - new Date(c).getTime();
  return Math.max(Math.round(ms / 86400000), 1);
}

function buildTotals(days: any[]) {
  const t = { revenue: 0, nightsOccupied: 0, available: 0, guests: 0, days: days.length, adr: 0, revpar: 0, occupancyPct: 0 };
  for (const d of days) {
    t.revenue += d.revenue;
    t.nightsOccupied += d.nightsOccupied;
    t.available += d.available;
    t.guests += d.guests;
  }
  t.adr = t.nightsOccupied > 0 ? round2(t.revenue / t.nightsOccupied) : 0;
  t.revpar = t.available > 0 ? round2(t.revenue / t.available) : 0;
  t.occupancyPct = t.available > 0 ? Math.round((t.nightsOccupied / t.available) * 1000) / 10 : 0;
  t.revenue = round2(t.revenue);
  return t;
}

function buildMonths(days: any[]) {
  const map = new Map<string, any>();
  for (const d of days) {
    const month = d.date.slice(0, 7);
    if (!map.has(month)) map.set(month, { month, revenue: 0, nightsOccupied: 0, available: 0, guests: 0 });
    const m = map.get(month);
    m.revenue += d.revenue;
    m.nightsOccupied += d.nightsOccupied;
    m.available += d.available;
    m.guests += d.guests;
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).map((m) => {
    m.adr = m.nightsOccupied > 0 ? round2(m.revenue / m.nightsOccupied) : 0;
    m.revpar = m.available > 0 ? round2(m.revenue / m.available) : 0;
    m.occupancyPct = m.available > 0 ? Math.round((m.nightsOccupied / m.available) * 1000) / 10 : 0;
    m.revenue = round2(m.revenue);
    return m;
  });
}

// ---- Control de acceso ----
async function authorize(req: Request, supabaseUrl: string, serviceRoleKey: string) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Falta el token de autenticación.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) throw new Error("Token inválido o expirado.");
  const userId = userData.user.id;

  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .limit(1);
  if (profileErr) throw new Error("No se pudo verificar el perfil de usuario.");
  const role = profiles?.[0]?.role;
  const isActive = profiles?.[0]?.is_active !== false;
  if (!isActive) throw new Error("Usuario inactivo.");
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(`Tu rol (${role || "desconocido"}) no tiene acceso a Informes Beds24.`);
  }
  return { userId, role };
}

// ---- Handler principal ----
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Faltan variables de entorno de Supabase." }, 500);
    }

    const { userId } = await authorize(req, supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const desde = String(body?.desde || "");
    const hasta = String(body?.hasta || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
      return json({ error: "Se requiere 'desde' y 'hasta' en formato YYYY-MM-DD." }, 400);
    }
    if (desde > hasta) return json({ error: "'desde' no puede ser posterior a 'hasta'." }, 400);

    const apiKey = Deno.env.get("BEDS24_API_KEY") || "";
    const propKey = Deno.env.get("BEDS24_PROP_KEY") || "";
    const totalRooms = Number(Deno.env.get("BEDS24_TOTAL_ROOMS") || TOTAL_ROOMS_DEFAULT);

    if (!apiKey || !propKey) {
      return json({ error: "Faltan credenciales de Beds24 (BEDS24_API_KEY / BEDS24_PROP_KEY)." }, 500);
    }

    // 1) Reservas que se solapan con el rango [desde, hasta] (no solo las
    //    contenidas): arrival <= hasta  AND  departure >= desde. Asi entran
    //    tambien las reservas que cruzan el limite del mes.
    const bookingsResp = await beds24Call(
      "getBookings",
      {
        includeInvoice: true,
        includeInfoItems: false,
        arrivalTo: toBeds24Date(hasta),
        departureFrom: toBeds24Date(desde),
      },
      apiKey,
      propKey,
    );
    const bookings = Array.isArray(bookingsResp) ? bookingsResp : bookingsResp?.getBookings || bookingsResp?.bookings || [];

    // 2) Días del rango + agregación.
    const dates = eachDay(desde, hasta);
    const days = aggregateDaily(bookings, dates, totalRooms);
    const totals = buildTotals(days);
    const months = buildMonths(days);

    // 3) Depuración: sumas crudas por cada campo candidato + muestra de la 1ª reserva.
    let sumBprice = 0, sumInvTotal = 0, sumInvPrice = 0, sumPriceTotal = 0;
    for (const b of bookings) {
      sumBprice += Number(b?.price || 0) || 0;
      sumInvTotal += Number(b?.invoice?.totalPrice || 0) || 0;
      sumInvPrice += Number(b?.invoice?.price || 0) || 0;
      sumPriceTotal += Number(b?.priceTotal || 0) || 0;
    }
    const b0 = bookings[0] || null;
    const sampleBooking = b0 ? {
      reference: b0.reference ?? b0.bookId,
      status: b0.status,
      arrivalDate: b0.arrivalDate,
      departureDate: b0.departureDate,
      firstNight: b0.firstNight,
      lastNight: b0.lastNight,
      nights: b0.nights,
      numberOfNights: b0.numberOfNights,
      guests: b0.guests ?? b0.numberOfPeople,
      price: b0.price,
      totalPrice: b0.totalPrice,
      priceTotal: b0.priceTotal,
      invoice: b0.invoice ? { price: b0.invoice.price, totalPrice: b0.invoice.totalPrice } : undefined,
      keys: Object.keys(b0),
    } : null;

    return json({
      source: "api",
      variant: "aggregated",
      range: { desde, hasta },
      days,
      totals,
      months,
      roomTypes: null,
      meta: {
        userId,
        bookingsCount: bookings.length,
        totalRooms,
        note: "Agregación calculada en servidor desde getBookings. Verifica el mapeo de campos de precio contra tu cuenta de Beds24.",
        debug: {
          computedRevenue: round2(totals.revenue),
          sumBprice: round2(sumBprice),
          sumPriceTotal: round2(sumPriceTotal),
          sumInvoicePrice: round2(sumInvPrice),
          sumInvoiceTotal: round2(sumInvTotal),
          sampleBooking,
        },
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno.";
    const status = /inválido|expirado|no tiene acceso|inactivo|Falta el token/i.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});