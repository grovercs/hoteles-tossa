// Parser de informes "Daily Financial Summary" exportados desde Beds24.
//
// Beds24 exporta estos informes como .xls que en realidad son tablas HTML.
// Para ser robustos usamos SheetJS (xlsx), que lee .xls (HTML), .xlsx real y .csv
// con el mismo codigo.
//
// El informe tiene dos variantes:
//  - Granular: una fila por (fecha x tipo de habitacion). Incluye columna "Habitacion".
//  - Agregado: una fila por fecha (todo el hotel). Sin columna "Habitacion".
//
// Ambas variantes terminan con filas "Average" y "Total" que NO son datos diarios,
// pero de las que extraemos totales cuando estan disponibles.
//
// Salida normalizada (mismo "shape" que devuelve la Edge Function beds24-report):
//   {
//     source, fileName, range, variant,
//     days: [{ date, dateLabel, revenue, roomRevenue, nightsOccupied, available, guests, occupancyPct, adr, revpar }],
//     totals: { revenue, nightsOccupied, available, guests, adr, revpar, occupancyPct, days },
//     months: [{ month, label, revenue, nightsOccupied, available, occupancyPct, adr, revpar }],
//     roomTypes: [{ name, revenue, nightsOccupied, available, occupancyPct, adr }] | null,
//   }

import * as XLSX from "xlsx";

const MONTHS_ES = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
  // formas con acento/alternativas que a veces usa Beds24
  "set": 9, "sept": 9,
};

// Fecha tipo "vie 01 may 2026" o "mié 06 may 2026".
const DATE_RE =
  /^(lun|mar|mi[eé]|jue|vie|s[áa]b|dom)\s+(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})$/i;

function normalizeHeader(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar acentos
    .replace(/\s+/g, " ")
    .trim();
}

// Convierte "Revenue per Available Room EUR" -> "revenue per available room"
function stripCurrency(h) {
  return h.replace(/\b(eur|euros|€)\b/g, "").replace(/\s+/g, " ").trim();
}

// Parser de numeros europeo/US: "526.50", "1.234,56", "1,234.56", "3%", "24%"
export function parseNum(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  const isPercent = s.endsWith("%");
  if (isPercent) s = s.slice(0, -1).trim();
  s = s.replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // el separador mas a la derecha es el decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // solo coma: decimal si tiene 1-2 cifras, miles en caso contrario
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) s = parts.join(".");
    else s = s.replace(/,/g, "");
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function parseBeds24Date(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  const m = s.match(DATE_RE);
  if (!m) return null;
  const day = parseInt(m[2], 10);
  const monthKey = m[3];
  const year = parseInt(m[4], 10);
  const month = MONTHS_ES[monthKey];
  if (!month) return null;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// Mapea cabeceras Beds24 a claves internas.
function buildColumnMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const n = stripCurrency(normalizeHeader(h));
    if (n === "fecha") map.date = i;
    else if (n === "habitacion" || n === "room" || n === "habitaciones") map.room = i;
    else if (n === "reservado" || n === "booked" || n === "rooms sold") map.reservado = i;
    else if (n === "disponible" || n === "available") map.disponible = i;
    else if (n === "huespedes" || n === "guests" || n === "huéspedes") map.guests = i;
    else if (n === "ocupacion") map.ocupacion = i;
    else if (n === "room revenue") map.roomRevenue = i;
    else if (n === "daily revenue") map.dailyRevenue = i;
    else if (n === "average daily revenue") map.adr = i;
    else if (n === "revenue per available room") map.revpar = i;
    else if (n === "revenue per guest") map.revPerGuest = i;
  });
  return map;
}

function safeRound(n, decimals = 2) {
  if (!isFinite(n)) return 0;
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function emptyTotals() {
  return { revenue: 0, roomRevenue: 0, nightsOccupied: 0, available: 0, guests: 0, days: 0, adr: 0, revpar: 0, occupancyPct: 0 };
}

function computeTotals(days) {
  const t = emptyTotals();
  for (const d of days) {
    t.revenue += d.revenue;
    t.roomRevenue += d.roomRevenue;
    t.nightsOccupied += d.nightsOccupied;
    t.available += d.available;
    t.guests += d.guests;
  }
  t.days = days.length;
  t.adr = t.nightsOccupied > 0 ? t.revenue / t.nightsOccupied : 0;
  t.revpar = t.available > 0 ? t.revenue / t.available : 0;
  t.occupancyPct = t.available > 0 ? (t.nightsOccupied / t.available) * 100 : 0;
  t.revenue = safeRound(t.revenue);
  t.roomRevenue = safeRound(t.roomRevenue);
  t.adr = safeRound(t.adr);
  t.revpar = safeRound(t.revpar);
  t.occupancyPct = safeRound(t.occupancyPct, 1);
  return t;
}

function buildMonths(days) {
  const byMonth = new Map();
  for (const d of days) {
    const month = d.date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(month)) {
      byMonth.set(month, { month, revenue: 0, nightsOccupied: 0, available: 0, guests: 0 });
    }
    const m = byMonth.get(month);
    m.revenue += d.revenue;
    m.nightsOccupied += d.nightsOccupied;
    m.available += d.available;
    m.guests += d.guests;
  }
  const months = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  for (const m of months) {
    const [y, mo] = m.month.split("-");
    m.label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    m.adr = m.nightsOccupied > 0 ? m.revenue / m.nightsOccupied : 0;
    m.revpar = m.available > 0 ? m.revenue / m.available : 0;
    m.occupancyPct = m.available > 0 ? (m.nightsOccupied / m.available) * 100 : 0;
    m.revenue = safeRound(m.revenue);
    m.adr = safeRound(m.adr);
    m.revpar = safeRound(m.revpar);
    m.occupancyPct = safeRound(m.occupancyPct, 1);
  }
  return months;
}

// Nombres que indican fila de subtotal/media (no un tipo de habitacion real).
const SUBTOTAL_RE = /^(total|totales|subtotal|sub-?total|media|average|promedio|suma)$/i;

function isSubtotalRoom(name) {
  const n = String(name || "").trim();
  return !n || SUBTOTAL_RE.test(n);
}

function buildRoomTypes(rows, col) {
  const byRoom = new Map();
  for (const r of rows) {
    const name = String(r[col.room] || "").trim();
    if (isSubtotalRoom(name)) continue;
    if (!byRoom.has(name)) byRoom.set(name, { name, revenue: 0, nightsOccupied: 0, available: 0 });
    const rt = byRoom.get(name);
    rt.revenue += parseNum(r[col.dailyRevenue] ?? r[col.roomRevenue]);
    rt.nightsOccupied += parseNum(r[col.reservado]);
    rt.available += parseNum(r[col.disponible]);
  }
  const list = [...byRoom.values()];
  for (const rt of list) {
    rt.adr = rt.nightsOccupied > 0 ? rt.revenue / rt.nightsOccupied : 0;
    rt.occupancyPct = rt.available > 0 ? (rt.nightsOccupied / rt.available) * 100 : 0;
    rt.revenue = safeRound(rt.revenue);
    rt.adr = safeRound(rt.adr);
    rt.occupancyPct = safeRound(rt.occupancyPct, 1);
  }
  list.sort((a, b) => b.revenue - a.revenue);
  return list;
}

function dateLabelFromIso(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Parsea un archivo de informe Beds24 (.xls/.xlsx/.csv) y devuelve el reporte normalizado.
 * @param {File} file
 * @returns {Promise<object>}
 */
export async function parseBeds24File(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("El archivo no contiene hojas con datos.");
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

  if (!rows.length) throw new Error("La primera hoja está vacía.");

  // La primera fila con celdas no vacias suele ser la cabecera.
  let headerIdx = rows.findIndex((r) => r && r.some((c) => String(c).trim()));
  if (headerIdx < 0) throw new Error("No se encontró la cabecera del informe.");
  const headers = rows[headerIdx];
  const col = buildColumnMap(headers);
  if (col.date == null) throw new Error("No se encontró la columna 'Fecha'. ¿Es un Daily Financial Summary de Beds24?");

  const variant = col.room != null ? "granular" : "aggregated";

  // Filas con datos diarios (patron de fecha) + filas Average/Total.
  const dailyRows = [];
  let averageRow = null;
  let totalRow = null;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.length) continue;
    const first = String(r[0] || "").trim();
    if (!first) continue;
    const low = normalizeHeader(first);
    if (low === "average" || low === "media" || low === "promedio") { averageRow = r; continue; }
    if (low === "total" || low === "totales") { totalRow = r; continue; }
    const iso = parseBeds24Date(first);
    if (iso) dailyRows.push({ iso, raw: r, room: col.room != null ? String(r[col.room] || "").trim() : null });
  }

  if (!dailyRows.length) throw new Error("No se detectaron filas diarias con fechas válidas en el informe.");

  let days;
  if (variant === "granular") {
    // Agregar por fecha: una fila por (fecha x tipo).
    const byDate = new Map();
    for (const { iso, raw, room } of dailyRows) {
      if (isSubtotalRoom(room)) continue; // saltar subtotales diarios (duplicarian la suma)
      if (!byDate.has(iso)) {
        byDate.set(iso, { revenue: 0, roomRevenue: 0, nightsOccupied: 0, available: 0, guests: 0 });
      }
      const d = byDate.get(iso);
      d.revenue += parseNum(raw[col.dailyRevenue] ?? raw[col.roomRevenue]);
      d.roomRevenue += parseNum(raw[col.roomRevenue]);
      d.nightsOccupied += parseNum(raw[col.reservado]);
      d.available += parseNum(raw[col.disponible]);
      d.guests += parseNum(raw[col.guests]);
    }
    days = [...byDate.entries()].map(([iso, d]) => ({
      date: iso,
      dateLabel: dateLabelFromIso(iso),
      revenue: safeRound(d.revenue),
      roomRevenue: safeRound(d.roomRevenue),
      nightsOccupied: d.nightsOccupied,
      available: d.available,
      guests: d.guests,
      occupancyPct: d.available > 0 ? safeRound((d.nightsOccupied / d.available) * 100, 1) : 0,
      adr: d.nightsOccupied > 0 ? safeRound(d.revenue / d.nightsOccupied) : 0,
      revpar: d.available > 0 ? safeRound(d.revenue / d.available) : 0,
    }));
  } else {
    // Agregado: cada fila ya es el total del dia.
    days = dailyRows.map(({ iso, raw }) => {
      const revenue = parseNum(raw[col.dailyRevenue] ?? raw[col.roomRevenue]);
      const nights = parseNum(raw[col.reservado]);
      const available = parseNum(raw[col.disponible]);
      const occRaw = col.ocupacion != null ? parseNum(raw[col.ocupacion]) : 0;
      const occupancyPct = occRaw > 0 ? occRaw : (available > 0 ? (nights / available) * 100 : 0);
      return {
        date: iso,
        dateLabel: dateLabelFromIso(iso),
        revenue: safeRound(revenue),
        roomRevenue: safeRound(parseNum(raw[col.roomRevenue])),
        nightsOccupied: nights,
        available,
        guests: parseNum(raw[col.guests]),
        occupancyPct: safeRound(occupancyPct, 1),
        adr: col.adr != null && raw[col.adr] !== "" ? safeRound(parseNum(raw[col.adr])) : (nights > 0 ? safeRound(revenue / nights) : 0),
        revpar: col.revpar != null && raw[col.revpar] !== "" ? safeRound(parseNum(raw[col.revpar])) : (available > 0 ? safeRound(revenue / available) : 0),
      };
    });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));

  const totals = computeTotals(days);
  const months = buildMonths(days);
  const roomTypes = variant === "granular" ? buildRoomTypes(dailyRows.map((d) => d.raw), col) : null;

  return {
    source: "xls",
    fileName: file.name,
    variant,
    range: { desde: days[0].date, hasta: days[days.length - 1].date },
    days,
    totals,
    months,
    roomTypes,
    averageRow,
    totalRow,
  };
}

/**
 * Construye un reporte normalizado a partir del JSON que devuelve la Edge Function
 * beds24-report (conexion en vivo con la API de Beds24). Mismo shape que parseBeds24File.
 */
export function buildReportFromApi(apiJson) {
  const days = (apiJson.days || []).map((d) => ({
    date: d.date,
    dateLabel: dateLabelFromIso(d.date),
    revenue: safeRound(d.revenue || 0),
    roomRevenue: safeRound(d.roomRevenue || d.revenue || 0),
    nightsOccupied: d.nightsOccupied || 0,
    available: d.available || 0,
    guests: d.guests || 0,
    occupancyPct: safeRound(d.occupancyPct || 0, 1),
    adr: safeRound(d.adr || 0),
    revpar: safeRound(d.revpar || 0),
  }));
  days.sort((a, b) => a.date.localeCompare(b.date));
  return {
    source: "api",
    fileName: null,
    variant: apiJson.variant || "aggregated",
    range: apiJson.range || { desde: days[0]?.date, hasta: days[days.length - 1]?.date },
    days,
    totals: apiJson.totals || computeTotals(days),
    months: apiJson.months || buildMonths(days),
    roomTypes: apiJson.roomTypes || null,
    channels: apiJson.channels || null,
  };
}