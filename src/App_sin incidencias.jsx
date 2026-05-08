import React, { useEffect, useMemo, useState } from "react";

/**
 * Hotel Daily Control - Supabase Ready MVP
 *
 * - Responsive para móvil/tablet/escritorio.
 * - Usa Supabase vía REST API si existen VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
 * - Si Supabase no está configurado o falla, funciona en modo demo con localStorage.
 * - Sin dependencias externas de iconos.
 */

const STORAGE_KEY = "hotel_daily_control_responsive_v2";
const DEMO_HOTEL_ID = "local-demo-hotel";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_KEY);

const defaultHotel = {
  id: DEMO_HOTEL_ID,
  name: "Hotel Demo Val d'Aran",
  director: "Dirección",
  receptionHours: "09:00 - 17:00",
  currency: "€",
  directBookingGoal: 25,
  bookingRiskLimit: 55,
  highOccupancyLimit: 80,
  lowOccupancyLimit: 45,
};

const defaultRooms = {
  total: 42,
  occupied: 31,
  blocked: 2,
  clean: 24,
  dirty: 12,
  pending: 4,
};

const defaultReports = [
  {
    id: "demo-report-1",
    date: "2026-05-08",
    manager: "Marta - Jefa de recepción",
    shift: "09:00 - 17:00",
    arrivalsExpected: 14,
    arrivalsDone: 10,
    departuresExpected: 9,
    departuresDone: 9,
    newBookings: 7,
    directBookings: 2,
    bookingBookings: 4,
    expediaBookings: 1,
    cancellations: 1,
    noShows: 0,
    revenue: 3840,
    pendingPayments: 620,
    incidents: "Habitación 204 con problema de calefacción. Cliente de la 118 solicita late check-out.",
    notes: "Alta demanda para sábado. Recomendamos revisar precios y guardar 2 habitaciones para venta directa.",
    recommendation: "Subir tarifa viernes/sábado un 8-12% y limitar disponibilidad en Booking.",
    createdAt: "2026-05-08T16:55:00.000Z",
  },
];

const defaultIncidents = [
  {
    id: "demo-incident-1",
    date: "2026-05-08",
    room: "204",
    type: "Mantenimiento",
    priority: "Alta",
    status: "Abierta",
    owner: "Mantenimiento",
    text: "Calefacción no responde. Revisar antes de volver a vender.",
  },
  {
    id: "demo-incident-2",
    date: "2026-05-08",
    room: "118",
    type: "Cliente",
    priority: "Media",
    status: "Seguimiento",
    owner: "Dirección",
    text: "Solicita late check-out hasta las 13:30. Dirección debe validar según ocupación.",
  },
];

const defaultTasks = [
  { id: "open-arrivals", area: "Apertura", title: "Revisar llegadas del día", done: false },
  { id: "open-departures", area: "Apertura", title: "Revisar salidas del día", done: false },
  { id: "open-payments", area: "Apertura", title: "Comprobar pagos pendientes", done: false },
  { id: "open-housekeeping", area: "Apertura", title: "Enviar listado a limpieza", done: false },
  { id: "shift-incidents", area: "Durante turno", title: "Registrar incidencias relevantes", done: false },
  { id: "shift-notes", area: "Durante turno", title: "Actualizar notas importantes en reservas", done: false },
  { id: "close-checkins", area: "Cierre", title: "Confirmar check-ins y check-outs", done: false },
  { id: "close-cash", area: "Cierre", title: "Revisar caja, cobros y facturas", done: false },
  { id: "close-report", area: "Cierre", title: "Enviar informe diario a dirección", done: false },
];

const defaultChannels = [
  { name: "Web directa", bookings: 2, revenue: 980, commission: 0 },
  { name: "Booking", bookings: 4, revenue: 2060, commission: 18 },
  { name: "Expedia", bookings: 1, revenue: 800, commission: 17 },
];

const ICONS = {
  alert: "⚠️",
  bed: "🛏️",
  calendar: "📅",
  check: "✅",
  clipboard: "📋",
  copy: "📎",
  euro: "€",
  file: "📄",
  hotel: "🏨",
  chart: "📈",
  menu: "☰",
  megaphone: "📣",
  plus: "+",
  save: "💾",
  settings: "⚙️",
  sparkles: "✨",
  trash: "🗑️",
  user: "👤",
  wrench: "🔧",
  cloud: "☁️",
  offline: "💻",
};

function Icon({ name, size = 22 }) {
  return (
    <span aria-hidden="true" style={{ fontSize: size }} className="inline-flex h-7 w-7 shrink-0 items-center justify-center leading-none">
      {ICONS[name] || "•"}
    </span>
  );
}

function cls(...items) {
  return items.filter(Boolean).join(" ");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function readLocal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage puede fallar en algunos navegadores privados.
  }
}

async function sb(path, options = {}) {
  if (!HAS_SUPABASE) throw new Error("Supabase no está configurado");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error Supabase ${response.status}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function normalizeHotel(row) {
  if (!row) return defaultHotel;
  return {
    id: row.id,
    name: row.name || defaultHotel.name,
    director: row.director || "Dirección",
    receptionHours: row.reception_hours || "09:00 - 17:00",
    currency: row.currency || "€",
    directBookingGoal: row.direct_booking_goal ?? 25,
    bookingRiskLimit: row.booking_risk_limit ?? 55,
    highOccupancyLimit: row.high_occupancy_limit ?? 80,
    lowOccupancyLimit: row.low_occupancy_limit ?? 45,
  };
}

function reportFromRow(row) {
  return {
    id: row.id,
    date: row.report_date,
    manager: row.manager || "",
    shift: row.shift || "",
    arrivalsExpected: row.arrivals_expected || 0,
    arrivalsDone: row.arrivals_done || 0,
    departuresExpected: row.departures_expected || 0,
    departuresDone: row.departures_done || 0,
    newBookings: row.new_bookings || 0,
    directBookings: row.direct_bookings || 0,
    bookingBookings: row.booking_bookings || 0,
    expediaBookings: row.expedia_bookings || 0,
    cancellations: row.cancellations || 0,
    noShows: row.no_shows || 0,
    revenue: Number(row.revenue || 0),
    pendingPayments: Number(row.pending_payments || 0),
    incidents: row.incidents || "",
    notes: row.notes || "",
    recommendation: row.recommendation || "",
    createdAt: row.created_at,
  };
}

function reportToRow(report, hotelId) {
  return {
    hotel_id: hotelId,
    report_date: report.date,
    manager: report.manager,
    shift: report.shift,
    arrivals_expected: Number(report.arrivalsExpected) || 0,
    arrivals_done: Number(report.arrivalsDone) || 0,
    departures_expected: Number(report.departuresExpected) || 0,
    departures_done: Number(report.departuresDone) || 0,
    new_bookings: Number(report.newBookings) || 0,
    direct_bookings: Number(report.directBookings) || 0,
    booking_bookings: Number(report.bookingBookings) || 0,
    expedia_bookings: Number(report.expediaBookings) || 0,
    cancellations: Number(report.cancellations) || 0,
    no_shows: Number(report.noShows) || 0,
    revenue: Number(report.revenue) || 0,
    pending_payments: Number(report.pendingPayments) || 0,
    incidents: report.incidents,
    notes: report.notes,
    recommendation: report.recommendation,
  };
}

function incidentFromRow(row) {
  return {
    id: row.id,
    date: row.incident_date,
    room: row.room || "-",
    type: row.type || "Cliente",
    priority: row.priority || "Media",
    status: row.status || "Abierta",
    owner: row.owner || "Recepción",
    text: row.description || "",
  };
}

function incidentToRow(incident, hotelId) {
  return {
    hotel_id: hotelId,
    incident_date: incident.date || todayIso(),
    room: incident.room || "-",
    type: incident.type,
    priority: incident.priority,
    status: incident.status || "Abierta",
    owner: incident.owner || "Recepción",
    description: incident.text,
  };
}

function calculateOccupancy(rooms) {
  return Math.round(((Number(rooms.occupied) || 0) / Math.max(Number(rooms.total) || 1, 1)) * 100);
}

function calculateAvailable(rooms) {
  return Math.max((Number(rooms.total) || 0) - (Number(rooms.occupied) || 0) - (Number(rooms.blocked) || 0), 0);
}

function createRecommendations({ occupancy, bookingShare, directShare, blockedRooms, pendingPayments, hotel }) {
  const list = [];
  const highLimit = Number(hotel.highOccupancyLimit) || 80;
  const lowLimit = Number(hotel.lowOccupancyLimit) || 45;
  const bookingLimit = Number(hotel.bookingRiskLimit) || 55;
  const directGoal = Number(hotel.directBookingGoal) || 25;

  if (occupancy >= highLimit) list.push({ tone: "green", title: "Demanda alta", text: "Subir precios 8-12%, cerrar descuentos y reservar cupo para venta directa." });
  if (occupancy < lowLimit) list.push({ tone: "amber", title: "Ocupación baja", text: "Abrir disponibilidad en OTAs, revisar precio y activar promoción controlada." });
  if (bookingShare > bookingLimit) list.push({ tone: "red", title: "Dependencia de Booking", text: "Limitar cupo en alta demanda y reforzar ventajas de reserva directa." });
  if (directShare < directGoal) list.push({ tone: "amber", title: "Venta directa baja", text: "Mejorar botón de reserva, beneficios directos y campañas a clientes anteriores." });
  if (blockedRooms > 0) list.push({ tone: "red", title: "Habitaciones bloqueadas", text: "Priorizar mantenimiento: cada habitación fuera de servicio es revenue perdido." });
  if (pendingPayments > 500) list.push({ tone: "amber", title: "Cobros pendientes", text: "Recepción debe revisar garantías y cobrar antes del check-out." });

  return list.length ? list : [{ tone: "green", title: "Operativa estable", text: "Mantener precios y revisar previsión de los próximos 7 días." }];
}

function buildReportText({ hotel, latest, rooms, occupancy, available, openIncidents, recommendations }) {
  const currency = hotel.currency || "€";
  return `INFORME DIARIO DE RECEPCIÓN\n\nHotel: ${hotel.name}\nFecha: ${latest.date}\nResponsable: ${latest.manager || "No indicado"}\nHorario: ${latest.shift}\n\nOCUPACIÓN\nHabitaciones totales: ${rooms.total}\nOcupadas: ${rooms.occupied}\nDisponibles: ${available}\nBloqueadas: ${rooms.blocked}\nOcupación: ${occupancy}%\n\nMOVIMIENTOS\nLlegadas previstas: ${latest.arrivalsExpected}\nLlegadas realizadas: ${latest.arrivalsDone}\nSalidas previstas: ${latest.departuresExpected}\nSalidas realizadas: ${latest.departuresDone}\nCancelaciones: ${latest.cancellations}\nNo-shows: ${latest.noShows}\n\nVENTAS\nReservas nuevas: ${latest.newBookings}\nWeb directa: ${latest.directBookings}\nBooking: ${latest.bookingBookings}\nExpedia: ${latest.expediaBookings}\n\nCOBROS\nIngresos del día: ${latest.revenue} ${currency}\nPagos pendientes: ${latest.pendingPayments} ${currency}\n\nINCIDENCIAS ABIERTAS\n${openIncidents}\n\nINCIDENCIAS DEL TURNO\n${latest.incidents || "Sin incidencias relevantes."}\n\nOBSERVACIONES\n${latest.notes || "Sin observaciones."}\n\nRECOMENDACIÓN DE RECEPCIÓN\n${latest.recommendation || "Sin recomendación manual."}\n\nRECOMENDACIONES AUTOMÁTICAS\n${recommendations.map((r) => `- ${r.title}: ${r.text}`).join("\n")}`;
}

function runSelfTests() {
  const tests = [];
  tests.push({ name: "Ocupación 8/10 = 80%", pass: calculateOccupancy({ total: 10, occupied: 8 }) === 80, value: calculateOccupancy({ total: 10, occupied: 8 }) });
  tests.push({ name: "Disponibles 10 - 8 - 1 = 1", pass: calculateAvailable({ total: 10, occupied: 8, blocked: 1 }) === 1, value: calculateAvailable({ total: 10, occupied: 8, blocked: 1 }) });
  tests.push({ name: "Disponibles nunca es negativo", pass: calculateAvailable({ total: 5, occupied: 6, blocked: 2 }) === 0, value: calculateAvailable({ total: 5, occupied: 6, blocked: 2 }) });
  const recs = createRecommendations({ occupancy: 85, bookingShare: 60, directShare: 10, blockedRooms: 1, pendingPayments: 700, hotel: defaultHotel });
  tests.push({ name: "Recomendaciones críticas se generan", pass: recs.length >= 4, value: recs.length });
  const stable = createRecommendations({ occupancy: 60, bookingShare: 40, directShare: 30, blockedRooms: 0, pendingPayments: 0, hotel: defaultHotel });
  tests.push({ name: "Operativa estable sin alertas", pass: stable[0].title === "Operativa estable", value: stable[0].title });
  const report = reportToRow(defaultReports[0], "hotel-id");
  tests.push({ name: "Mapeo a Supabase incluye report_date", pass: report.report_date === defaultReports[0].date, value: report.report_date });
  return tests;
}

function Card({ children, className = "" }) {
  return <div className={cls("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>{children}</div>;
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return <span className={cls("inline-flex rounded-full px-3 py-1 text-xs font-semibold", tones[tone] || tones.slate)}>{children}</span>;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Stat({ icon, label, value, hint }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="rounded-2xl bg-slate-100 p-2 text-slate-700 sm:p-3">
          <Icon name={icon} size={22} />
        </div>
      </div>
    </Card>
  );
}

const inputStyle = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200";
const buttonDark = "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-700 sm:px-5";
const buttonLight = "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:px-5";

export default function HotelDailyControlApp() {
  const stored = typeof window !== "undefined" ? readLocal() : null;

  const [active, setActive] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hotel, setHotel] = useState(stored?.hotel || defaultHotel);
  const [rooms, setRooms] = useState(stored?.rooms || defaultRooms);
  const [reports, setReports] = useState(stored?.reports || defaultReports);
  const [incidents, setIncidents] = useState(stored?.incidents || defaultIncidents);
  const [tasks, setTasks] = useState(stored?.tasks || defaultTasks);
  const [channels, setChannels] = useState(stored?.channels || defaultChannels);
  const [copied, setCopied] = useState(false);
  const [connection, setConnection] = useState({ status: HAS_SUPABASE ? "loading" : "local", message: HAS_SUPABASE ? "Conectando con Supabase..." : "Modo local: faltan variables de Supabase" });
  const [form, setForm] = useState({
    date: todayIso(),
    manager: "",
    shift: hotel.receptionHours || "09:00 - 17:00",
    arrivalsExpected: 0,
    arrivalsDone: 0,
    departuresExpected: 0,
    departuresDone: 0,
    newBookings: 0,
    directBookings: 0,
    bookingBookings: 0,
    expediaBookings: 0,
    cancellations: 0,
    noShows: 0,
    revenue: 0,
    pendingPayments: 0,
    incidents: "",
    notes: "",
    recommendation: "",
  });
  const [incidentForm, setIncidentForm] = useState({ room: "", type: "Cliente", priority: "Media", owner: "Recepción", text: "" });

  useEffect(() => {
    async function loadSupabase() {
      if (!HAS_SUPABASE) return;
      try {
        const hotels = await sb("hotels?select=*&order=created_at.asc&limit=1");
        const normalizedHotel = normalizeHotel(hotels?.[0]);
        setHotel(normalizedHotel);
        setForm((old) => ({ ...old, shift: normalizedHotel.receptionHours || old.shift }));

        const [remoteReports, remoteIncidents] = await Promise.all([
          sb(`daily_reports?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=50`),
          sb(`incidents?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=100`),
        ]);

        setReports(remoteReports?.length ? remoteReports.map(reportFromRow) : []);
        setIncidents(remoteIncidents?.length ? remoteIncidents.map(incidentFromRow) : []);
        setConnection({ status: "online", message: "Conectado a Supabase" });
      } catch (error) {
        console.error(error);
        setConnection({ status: "error", message: "No se pudo conectar con Supabase. Usando modo local." });
      }
    }

    loadSupabase();
  }, []);

  useEffect(() => {
    writeLocal({ hotel, rooms, reports, incidents, tasks, channels });
  }, [hotel, rooms, reports, incidents, tasks, channels]);

  const latest = reports[0] || defaultReports[0];
  const occupancy = calculateOccupancy(rooms);
  const available = calculateAvailable(rooms);
  const bookingShare = latest ? Math.round((Number(latest.bookingBookings) / Math.max(Number(latest.newBookings), 1)) * 100) : 0;
  const directShare = latest ? Math.round((Number(latest.directBookings) / Math.max(Number(latest.newBookings), 1)) * 100) : 0;
  const openIncidents = incidents.filter((i) => i.status !== "Cerrada").length;
  const tasksDone = tasks.filter((task) => task.done).length;
  const taskProgress = Math.round((tasksDone / Math.max(tasks.length, 1)) * 100);

  const recommendations = useMemo(() => createRecommendations({ occupancy, bookingShare, directShare, blockedRooms: Number(rooms.blocked) || 0, pendingPayments: Number(latest?.pendingPayments) || 0, hotel }), [occupancy, bookingShare, directShare, rooms.blocked, latest, hotel]);
  const reportText = useMemo(() => buildReportText({ hotel, latest, rooms, occupancy, available, openIncidents, recommendations }), [hotel, latest, rooms, occupancy, available, openIncidents, recommendations]);
  const selfTests = useMemo(() => runSelfTests(), []);
  const allTestsPass = selfTests.every((test) => test.pass);

  const tabs = [
    ["dashboard", "Dirección", "chart"],
    ["daily", "Parte diario", "clipboard"],
    ["tasks", "Checklist", "check"],
    ["incidents", "Incidencias", "alert"],
    ["rooms", "Habitaciones", "bed"],
    ["reports", "Informes", "file"],
    ["setup", "Config.", "settings"],
  ];

  function goToTab(id) {
    setActive(id);
    setMobileMenuOpen(false);
  }

  async function saveReport(e) {
    e.preventDefault();
    const draftReport = {
      id: `local-${Date.now()}`,
      ...form,
      arrivalsExpected: Number(form.arrivalsExpected),
      arrivalsDone: Number(form.arrivalsDone),
      departuresExpected: Number(form.departuresExpected),
      departuresDone: Number(form.departuresDone),
      newBookings: Number(form.newBookings),
      directBookings: Number(form.directBookings),
      bookingBookings: Number(form.bookingBookings),
      expediaBookings: Number(form.expediaBookings),
      cancellations: Number(form.cancellations),
      noShows: Number(form.noShows),
      revenue: Number(form.revenue),
      pendingPayments: Number(form.pendingPayments),
      createdAt: new Date().toISOString(),
    };

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const inserted = await sb("daily_reports", { method: "POST", body: JSON.stringify(reportToRow(draftReport, hotel.id)) });
        const savedReport = inserted?.[0] ? reportFromRow(inserted[0]) : draftReport;
        setReports([savedReport, ...reports]);
      } else {
        setReports([draftReport, ...reports]);
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "Error guardando en Supabase. Guardado localmente." });
      setReports([draftReport, ...reports]);
    }

    setForm({ ...form, date: todayIso(), manager: "", incidents: "", notes: "", recommendation: "" });
    setActive("dashboard");
  }

  async function addIncident(e) {
    e.preventDefault();
    if (!incidentForm.text.trim()) return;

    const draftIncident = {
      id: `local-${Date.now()}`,
      date: todayIso(),
      room: incidentForm.room || "-",
      type: incidentForm.type,
      priority: incidentForm.priority,
      owner: incidentForm.owner,
      status: "Abierta",
      text: incidentForm.text,
    };

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const inserted = await sb("incidents", { method: "POST", body: JSON.stringify(incidentToRow(draftIncident, hotel.id)) });
        const savedIncident = inserted?.[0] ? incidentFromRow(inserted[0]) : draftIncident;
        setIncidents([savedIncident, ...incidents]);
      } else {
        setIncidents([draftIncident, ...incidents]);
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "Error guardando incidencia en Supabase. Guardada localmente." });
      setIncidents([draftIncident, ...incidents]);
    }

    setIncidentForm({ room: "", type: "Cliente", priority: "Media", owner: "Recepción", text: "" });
  }

  async function updateIncidentStatus(id, status) {
    setIncidents(incidents.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      if (connection.status === "online" && !String(id).startsWith("local-") && !String(id).startsWith("demo-")) {
        await sb(`incidents?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo actualizar la incidencia en Supabase." });
    }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function resetDemo() {
    setHotel(defaultHotel);
    setRooms(defaultRooms);
    setReports(defaultReports);
    setIncidents(defaultIncidents);
    setTasks(defaultTasks);
    setChannels(defaultChannels);
    setConnection({ status: HAS_SUPABASE ? "loading" : "local", message: HAS_SUPABASE ? "Recarga la página para reconectar con Supabase" : "Modo local" });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
  }

  function updateChannel(index, key, value) {
    setChannels(channels.map((channel, i) => (i === index ? { ...channel, [key]: key === "name" ? value : Number(value) } : channel)));
  }

  const activeTabLabel = tabs.find(([id]) => id === active)?.[1] || "Dirección";
  const connectionTone = connection.status === "online" ? "green" : connection.status === "error" ? "red" : connection.status === "loading" ? "amber" : "slate";
  const connectionIcon = connection.status === "online" ? "cloud" : "offline";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-2 text-white shadow-sm sm:p-3">
              <Icon name="hotel" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-2xl">Hotel Daily Control</h1>
              <p className="hidden text-sm text-slate-500 sm:block">{hotel.name} · recepción, dirección, revenue e incidencias</p>
              <p className="text-xs text-slate-500 sm:hidden">{activeTabLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone={connectionTone}><span className="inline-flex items-center gap-1"><Icon name={connectionIcon} size={14} /> {connection.status === "online" ? "Supabase" : connection.status === "loading" ? "Conectando" : "Local"}</span></Badge>
            <button className="rounded-2xl border border-slate-300 bg-white p-2 text-slate-700 shadow-sm lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Abrir menú">
              <Icon name="menu" size={22} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-3 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tabs.map(([id, label, icon]) => (
                <button key={id} onClick={() => goToTab(id)} className={cls("flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold", active === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700")}>
                  <Icon name={icon} size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-4 sm:py-6 lg:grid-cols-[250px_1fr]">
        <aside className="hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:block lg:h-fit">
          <nav className="space-y-1">
            {tabs.map(([id, label, icon]) => (
              <button key={id} onClick={() => goToTab(id)} className={cls("flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition", active === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}>
                <Icon name={icon} size={18} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-5 sm:space-y-6">
          {connection.message && (
            <Card className={connection.status === "error" ? "border-red-200 bg-red-50" : connection.status === "online" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}>
              <div className="flex items-start gap-3 text-sm">
                <Icon name={connectionIcon} size={20} />
                <div>
                  <b>Estado:</b> {connection.message}
                  {connection.status === "online" && <p className="text-slate-600">Los partes e incidencias nuevos se guardarán en Supabase.</p>}
                </div>
              </div>
            </Card>
          )}

          {active === "dashboard" && (
            <div className="space-y-5 sm:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <Stat icon="bed" label="Ocupación" value={`${occupancy}%`} hint={`${rooms.occupied}/${rooms.total} ocupadas`} />
                <Stat icon="calendar" label="Disponibles" value={available} hint={`${rooms.blocked} bloqueadas`} />
                <Stat icon="euro" label="Ingresos" value={`${latest.revenue}${hotel.currency}`} hint={`${latest.pendingPayments}${hotel.currency} pendientes`} />
                <Stat icon="alert" label="Incidencias" value={openIncidents} hint="Abiertas" />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
                <Card>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl">Panel de decisión</h2>
                      <p className="text-sm text-slate-500">Resumen accionable para precios, canales y operativa.</p>
                    </div>
                    <Badge tone={occupancy >= Number(hotel.highOccupancyLimit) ? "green" : occupancy < Number(hotel.lowOccupancyLimit) ? "amber" : "blue"}>Ocupación {occupancy}%</Badge>
                  </div>

                  <div className="space-y-3">
                    {recommendations.map((r, idx) => (
                      <div key={`${r.title}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Icon name="megaphone" size={18} />
                          <span className="font-semibold">{r.title}</span>
                          <Badge tone={r.tone}>Acción</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <h2 className="text-lg font-bold sm:text-xl">Producción por canal</h2>
                  <p className="mb-4 text-sm text-slate-500">Control para reducir comisiones y proteger venta directa.</p>
                  <div className="space-y-4">
                    {channels.map((c) => {
                      const totalRevenue = channels.reduce((a, b) => a + Number(b.revenue || 0), 0) || 1;
                      const pct = Math.round((Number(c.revenue || 0) / totalRevenue) * 100);
                      return (
                        <div key={c.name}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold">{c.name}</span>
                            <span className="whitespace-nowrap text-slate-500">{c.revenue}{hotel.currency} · {c.commission}%</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Checklist del día</h2>
                    <p className="text-sm text-slate-500">Progreso operativo: {tasksDone}/{tasks.length} tareas completadas.</p>
                  </div>
                  <Badge tone={taskProgress === 100 ? "green" : "amber"}>{taskProgress}% completado</Badge>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${taskProgress}%` }} />
                </div>
              </Card>
            </div>
          )}

          {active === "daily" && (
            <form onSubmit={saveReport} className="space-y-5 sm:space-y-6">
              <Card>
                <h2 className="text-lg font-bold sm:text-xl">Parte diario de recepción</h2>
                <p className="mb-5 text-sm text-slate-500">Formulario de cierre de turno para informar a dirección.</p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <Field label="Fecha"><input className={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
                  <Field label="Responsable"><input className={inputStyle} placeholder="Nombre" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></Field>
                  <Field label="Horario"><input className={inputStyle} value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} /></Field>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 font-bold">Movimientos y ventas</h3>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    ["Llegadas previstas", "arrivalsExpected"], ["Llegadas realizadas", "arrivalsDone"],
                    ["Salidas previstas", "departuresExpected"], ["Salidas realizadas", "departuresDone"],
                    ["Reservas nuevas", "newBookings"], ["Web directa", "directBookings"],
                    ["Booking", "bookingBookings"], ["Expedia", "expediaBookings"],
                    ["Cancelaciones", "cancellations"], ["No-shows", "noShows"],
                    ["Ingresos", "revenue"], ["Pagos pendientes", "pendingPayments"],
                  ].map(([label, key]) => (
                    <Field key={key} label={label}><input className={inputStyle} type="number" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 font-bold">Incidencias, observaciones y recomendación</h3>
                <div className="grid gap-4">
                  <Field label="Incidencias importantes"><textarea className={inputStyle} rows={3} value={form.incidents} onChange={(e) => setForm({ ...form, incidents: e.target.value })} placeholder="Quejas, averías, problemas de cobro, reservas conflictivas..." /></Field>
                  <Field label="Observaciones para dirección"><textarea className={inputStyle} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Lo que dirección debe saber para mañana" /></Field>
                  <Field label="Recomendación de recepción"><textarea className={inputStyle} rows={2} value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} placeholder="Subir precios, abrir/cerrar canales, guardar habitaciones, reforzar limpieza..." /></Field>
                </div>
                <button className={cls(buttonDark, "mt-5 w-full sm:w-auto")}>
                  <Icon name="save" size={18} /> Guardar parte diario
                </button>
              </Card>
            </form>
          )}

          {active === "tasks" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Checklist operativo</h2>
                    <p className="text-sm text-slate-500">Pensado para recepción abierta {hotel.receptionHours}.</p>
                  </div>
                  <Badge tone={taskProgress === 100 ? "green" : "amber"}>{taskProgress}% completado</Badge>
                </div>
              </Card>

              {["Apertura", "Durante turno", "Cierre"].map((area) => (
                <Card key={area}>
                  <h3 className="mb-3 font-bold">{area}</h3>
                  <div className="space-y-2">
                    {tasks.filter((task) => task.area === area).map((task) => (
                      <label key={task.id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                        <input className="mt-1 h-5 w-5" type="checkbox" checked={task.done} onChange={(e) => setTasks(tasks.map((x) => x.id === task.id ? { ...x, done: e.target.checked } : x))} />
                        <span className={task.done ? "text-slate-400 line-through" : "text-slate-800"}>{task.title}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {active === "incidents" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <h2 className="text-lg font-bold sm:text-xl">Registrar incidencia</h2>
                <form onSubmit={addIncident} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <Field label="Habitación"><input className={inputStyle} value={incidentForm.room} onChange={(e) => setIncidentForm({ ...incidentForm, room: e.target.value })} /></Field>
                  <Field label="Tipo"><select className={inputStyle} value={incidentForm.type} onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}><option>Cliente</option><option>Mantenimiento</option><option>Limpieza</option><option>Pago</option><option>OTA</option><option>Cloudbeds</option></select></Field>
                  <Field label="Prioridad"><select className={inputStyle} value={incidentForm.priority} onChange={(e) => setIncidentForm({ ...incidentForm, priority: e.target.value })}><option>Baja</option><option>Media</option><option>Alta</option><option>Urgente</option></select></Field>
                  <Field label="Responsable"><input className={inputStyle} value={incidentForm.owner} onChange={(e) => setIncidentForm({ ...incidentForm, owner: e.target.value })} /></Field>
                  <div className="sm:col-span-2 xl:col-span-5"><Field label="Descripción"><input className={inputStyle} value={incidentForm.text} onChange={(e) => setIncidentForm({ ...incidentForm, text: e.target.value })} /></Field></div>
                  <button className={cls(buttonDark, "sm:col-span-2 xl:col-span-5")}><Icon name="plus" size={18} /> Añadir incidencia</button>
                </form>
              </Card>

              <div className="grid gap-3">
                {incidents.map((i) => (
                  <Card key={i.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone={i.priority === "Alta" || i.priority === "Urgente" ? "red" : i.priority === "Media" ? "amber" : "slate"}>{i.priority}</Badge>
                        <Badge tone="blue">{i.type}</Badge>
                        <span className="text-sm text-slate-500">Hab. {i.room} · {i.date} · {i.owner}</span>
                      </div>
                      <p className="text-sm font-medium sm:text-base">{i.text}</p>
                    </div>
                    <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" value={i.status} onChange={(e) => updateIncidentStatus(i.id, e.target.value)}>
                      <option>Abierta</option><option>Seguimiento</option><option>Cerrada</option>
                    </select>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {active === "rooms" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <h2 className="text-lg font-bold sm:text-xl">Estado de habitaciones</h2>
                <p className="mb-5 text-sm text-slate-500">Control rápido para recepción, limpieza y mantenimiento.</p>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {[
                    ["Total habitaciones", "total"], ["Ocupadas", "occupied"], ["Bloqueadas", "blocked"],
                    ["Limpias", "clean"], ["Sucias", "dirty"], ["Pendientes revisión", "pending"],
                  ].map(([label, key]) => (
                    <Field key={key} label={label}><input className={inputStyle} type="number" value={rooms[key]} onChange={(e) => setRooms({ ...rooms, [key]: Number(e.target.value) })} /></Field>
                  ))}
                </div>
              </Card>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat icon="user" label="Limpias" value={rooms.clean} hint="Preparadas para entrada" />
                <Stat icon="wrench" label="Bloqueadas" value={rooms.blocked} hint="No vendibles" />
                <Stat icon="bed" label="Disponibles venta" value={available} hint="Total - ocupadas - bloqueadas" />
              </div>
            </div>
          )}

          {active === "reports" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Informe listo para dirección</h2>
                    <p className="text-sm text-slate-500">Versión copiable para email, WhatsApp interno o PDF.</p>
                  </div>
                  <button className={buttonDark} onClick={copyReport} type="button"><Icon name="copy" size={18} /> {copied ? "Copiado" : "Copiar informe"}</button>
                </div>
                <textarea className="h-96 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 font-mono text-xs sm:text-sm" readOnly value={reportText} />
              </Card>

              <Card>
                <h3 className="mb-3 font-bold">Histórico de partes</h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b bg-slate-50 text-slate-500"><tr><th className="px-3 py-3">Fecha</th><th>Responsable</th><th>Reservas</th><th>Ingresos</th><th>Pendiente</th><th>Recomendación</th></tr></thead>
                    <tbody>
                      {reports.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="px-3 py-3">{r.date}</td><td>{r.manager || "-"}</td><td>{r.newBookings}</td><td>{r.revenue}{hotel.currency}</td><td>{r.pendingPayments}{hotel.currency}</td><td className="max-w-md truncate pr-3">{r.recommendation}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {active === "setup" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <h2 className="text-lg font-bold sm:text-xl">Configuración del hotel</h2>
                <p className="mb-5 text-sm text-slate-500">El hotel se carga desde Supabase si está conectado.</p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Nombre del hotel"><input className={inputStyle} value={hotel.name} onChange={(e) => setHotel({ ...hotel, name: e.target.value })} /></Field>
                  <Field label="Dirección"><input className={inputStyle} value={hotel.director} onChange={(e) => setHotel({ ...hotel, director: e.target.value })} /></Field>
                  <Field label="Horario recepción"><input className={inputStyle} value={hotel.receptionHours} onChange={(e) => setHotel({ ...hotel, receptionHours: e.target.value })} /></Field>
                  <Field label="Moneda"><input className={inputStyle} value={hotel.currency} onChange={(e) => setHotel({ ...hotel, currency: e.target.value })} /></Field>
                  <Field label="Objetivo web directa %"><input className={inputStyle} type="number" value={hotel.directBookingGoal} onChange={(e) => setHotel({ ...hotel, directBookingGoal: Number(e.target.value) })} /></Field>
                  <Field label="Riesgo Booking %"><input className={inputStyle} type="number" value={hotel.bookingRiskLimit} onChange={(e) => setHotel({ ...hotel, bookingRiskLimit: Number(e.target.value) })} /></Field>
                  <Field label="Alta ocupación %"><input className={inputStyle} type="number" value={hotel.highOccupancyLimit} onChange={(e) => setHotel({ ...hotel, highOccupancyLimit: Number(e.target.value) })} /></Field>
                  <Field label="Baja ocupación %"><input className={inputStyle} type="number" value={hotel.lowOccupancyLimit} onChange={(e) => setHotel({ ...hotel, lowOccupancyLimit: Number(e.target.value) })} /></Field>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 font-bold">Canales de venta demo</h3>
                <div className="grid gap-4">
                  {channels.map((channel, index) => (
                    <div key={`${channel.name}-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-4">
                      <Field label="Canal"><input className={inputStyle} value={channel.name} onChange={(e) => updateChannel(index, "name", e.target.value)} /></Field>
                      <Field label="Reservas"><input className={inputStyle} type="number" value={channel.bookings} onChange={(e) => updateChannel(index, "bookings", e.target.value)} /></Field>
                      <Field label="Ingresos"><input className={inputStyle} type="number" value={channel.revenue} onChange={(e) => updateChannel(index, "revenue", e.target.value)} /></Field>
                      <Field label="Comisión %"><input className={inputStyle} type="number" value={channel.commission} onChange={(e) => updateChannel(index, "commission", e.target.value)} /></Field>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 font-bold">Conexión</h3>
                <p className="text-sm text-slate-600"><b>Estado:</b> {connection.message}</p>
                <p className="mt-2 text-sm text-slate-600"><b>Supabase URL detectada:</b> {SUPABASE_URL ? "Sí" : "No"}</p>
                <p className="text-sm text-slate-600"><b>Publishable key detectada:</b> {SUPABASE_KEY ? "Sí" : "No"}</p>
              </Card>

              <Card>
                <h3 className="mb-3 font-bold">Validaciones internas</h3>
                <Badge tone={allTestsPass ? "green" : "red"}>{allTestsPass ? "Todos los tests pasan" : "Hay tests fallando"}</Badge>
                <div className="mt-4 space-y-2">
                  {selfTests.map((test) => (
                    <div key={test.name} className="flex flex-col gap-1 rounded-xl bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span>{test.name}</span>
                      <span className={test.pass ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>{test.pass ? "OK" : "FALLA"} · {String(test.value)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 font-bold">Datos demo</h3>
                <p className="mb-4 text-sm text-slate-500">Si Supabase falla, la app guarda datos localmente en este navegador.</p>
                <button className={buttonLight} type="button" onClick={resetDemo}><Icon name="trash" size={18} /> Restaurar datos demo</button>
              </Card>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
