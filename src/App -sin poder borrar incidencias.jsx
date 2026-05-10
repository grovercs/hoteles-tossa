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

const defaultRoomCatalog = Array.from({ length: 42 }, (_, index) => {
  const number = String(101 + index);
  return {
    id: `principal-${number}`,
    area: "Edificio principal",
    number,
    label: `Edificio principal · ${number}`,
  };
});

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
  { id: "open-rooms", area: "Apertura", title: "Revisar habitaciones disponibles, bloqueadas y fuera de servicio", done: false },
  { id: "open-cloudbeds", area: "Apertura", title: "Comprobar reservas nuevas o modificaciones en Cloudbeds", done: false },
  { id: "open-otas", area: "Apertura", title: "Revisar disponibilidad y cupos en canales externos", done: false },
  { id: "open-cleaning-priority", area: "Apertura", title: "Marcar prioridades de limpieza por llegadas tempranas", done: false },
  { id: "shift-incidents", area: "Durante turno", title: "Registrar incidencias relevantes", done: false },
  { id: "shift-notes", area: "Durante turno", title: "Actualizar notas importantes en reservas", done: false },
  { id: "shift-payments", area: "Durante turno", title: "Revisar cobros pendientes y garantías", done: false },
  { id: "shift-maintenance", area: "Durante turno", title: "Comunicar incidencias urgentes a mantenimiento o limpieza", done: false },
  { id: "close-checkins", area: "Cierre", title: "Confirmar check-ins y check-outs", done: false },
  { id: "close-cash", area: "Cierre", title: "Revisar caja, cobros y facturas", done: false },
  { id: "close-report", area: "Cierre", title: "Enviar informe diario a dirección", done: false },
  { id: "close-tomorrow", area: "Cierre", title: "Preparar observaciones importantes para el turno siguiente", done: false },
];

const defaultChannels = [
  { name: "Web directa", bookings: 2, revenue: 980, commission: 0 },
  { name: "Booking", bookings: 4, revenue: 2060, commission: 18 },
  { name: "Expedia", bookings: 1, revenue: 800, commission: 17 },
];

const defaultEmployees = [
  "Recepción",
  "Jefa de recepción",
  "Dirección",
  "Mantenimiento",
  "Limpieza",
  "Revenue",
  "Administración",
  "Grover",
];

const roomStatusOptions = ["Disponible", "Ocupada", "Bloqueada", "Fuera de servicio", "Sucia", "Pendiente"];

const ICON_PATHS = {
  alert: ["M12 9v4", "M12 17h.01", "M10.3 3.9 1.7-2.9 1.7 2.9 7.6 13.2a2 2 0 0 1-1.7 3H4.7a2 2 0 0 1-1.7-3Z"],
  bed: ["M3 7v11", "M21 11v7", "M3 14h18", "M7 11h4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3", "M15 11h4a2 2 0 0 1 2 2v1"],
  calendar: ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"],
  check: ["M20 6 9 17l-5-5"],
  lock: ["M7 11V8a5 5 0 0 1 10 0v3", "M6 11h12v10H6Z"],
  clipboard: ["M9 4h6", "M9 2h6v4H9Z", "M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2", "M8 12h8", "M8 16h6"],
  copy: ["M8 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z", "M4 16H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z", "M14 2v6h6", "M8 13h8", "M8 17h5"],
  hotel: ["M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16", "M16 9h2a2 2 0 0 1 2 2v10", "M8 7h.01", "M12 7h.01", "M8 11h.01", "M12 11h.01", "M8 15h.01", "M12 15h.01", "M3 21h18"],
  chart: ["M3 3v18h18", "M7 15l4-4 3 3 5-7"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  megaphone: ["M3 11v2a2 2 0 0 0 2 2h2l4 4v-4l8-3V6l-8 3H5a2 2 0 0 0-2 2Z", "M19 7a4 4 0 0 1 0 10"],
  plus: ["M12 5v14", "M5 12h14"],
  save: ["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z", "M17 21v-8H7v8", "M7 3v5h8"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"],
  sparkles: ["M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8Z", "M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9Z", "M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9Z"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 15H6L5 6", "M10 11v6", "M14 11v6"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
  wrench: ["M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-3 3-2-2Z"],
  cloud: ["M17.5 19H7a5 5 0 1 1 1.2-9.9A7 7 0 0 1 21 12.5 3.5 3.5 0 0 1 17.5 19Z"],
  offline: ["M3 3l18 18", "M8.5 8.5A7 7 0 0 1 21 12.5 3.5 3.5 0 0 1 17.5 16H16", "M12 19H7a5 5 0 0 1-.8-9.9"],
  sync: ["M21 12a9 9 0 0 1-15.5 6.2", "M3 12A9 9 0 0 1 18.5 5.8", "M18 3v4h4", "M6 21v-4H2"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
  cancel: ["M18 6 6 18", "M6 6l12 12"],
  view: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  print: ["M6 9V3h12v6", "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2", "M6 14h12v8H6Z", "M8 18h8"],
};

function Icon({ name, size = 22 }) {
  if (name === "euro") {
    return <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-sm font-bold leading-none">€</span>;
  }

  const paths = ICON_PATHS[name] || [];
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="inline-flex h-5 w-5 shrink-0 text-current">
      {paths.map((d, index) => <path key={`${name}-${index}`} d={d} />)}
    </svg>
  );
}

function cls(...items) {
  return items.filter(Boolean).join(" ");
}

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIso() {
  return toLocalIsoDate(new Date());
}

function addDaysIso(dateValue, days) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

function formatDateEs(dateValue) {
  if (!dateValue) return "-";
  const [year, month, day] = String(dateValue).slice(0, 10).split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
}

function formatDateTimeEs(dateValue) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function hotelToRow(hotel) {
  return {
    name: hotel.name,
    director: hotel.director,
    reception_hours: hotel.receptionHours,
    currency: hotel.currency,
    direct_booking_goal: Number(hotel.directBookingGoal) || 25,
    booking_risk_limit: Number(hotel.bookingRiskLimit) || 55,
    high_occupancy_limit: Number(hotel.highOccupancyLimit) || 80,
    low_occupancy_limit: Number(hotel.lowOccupancyLimit) || 45,
  };
}

function roomStatusFromRow(row) {
  if (!row) return defaultRooms;
  return {
    total: row.total || 0,
    occupied: row.occupied || 0,
    blocked: row.blocked || 0,
    clean: row.clean || 0,
    dirty: row.dirty || 0,
    pending: row.pending || 0,
  };
}

function roomStatusToRow(rooms, hotelId, statusDate = todayIso()) {
  return {
    hotel_id: hotelId,
    status_date: statusDate,
    total: Number(rooms.total) || 0,
    occupied: Number(rooms.occupied) || 0,
    blocked: Number(rooms.blocked) || 0,
    clean: Number(rooms.clean) || 0,
    dirty: Number(rooms.dirty) || 0,
    pending: Number(rooms.pending) || 0,
  };
}

function roomDailyStatusFromRow(row) {
  const status = row.status || "Disponible";
  const label = row.room_number || "-";
  const [areaMaybe, numberMaybe] = String(label).includes(" · ") ? String(label).split(" · ") : ["Edificio principal", label];
  return {
    id: row.id,
    area: areaMaybe,
    number: numberMaybe,
    label,
    status,
    notes: row.notes || "",
    tone: statusTone(status),
    detail: statusDetail(status),
  };
}

function roomDailyStatusToRow(room, hotelId, statusDate) {
  return {
    hotel_id: hotelId,
    status_date: statusDate,
    room_number: room.label || `${room.area || "Edificio principal"} · ${room.number}`,
    status: room.status || "Disponible",
    notes: room.notes || null,
    updated_at: new Date().toISOString(),
  };
}

function taskFromRow(row) {
  return {
    id: row.id,
    area: row.area,
    title: row.title,
    done: Boolean(row.done),
  };
}

function taskToRow(task, hotelId, taskDate = todayIso()) {
  return {
    hotel_id: hotelId,
    task_date: taskDate,
    area: task.area,
    title: task.title,
    done: Boolean(task.done),
  };
}

function channelFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    bookings: row.bookings || 0,
    revenue: Number(row.revenue || 0),
    commission: Number(row.commission || 0),
  };
}

function channelToRow(channel, hotelId) {
  return {
    hotel_id: hotelId,
    name: channel.name,
    bookings: Number(channel.bookings) || 0,
    revenue: Number(channel.revenue) || 0,
    commission: Number(channel.commission) || 0,
  };
}

function calculateOccupancy(rooms) {
  return Math.round(((Number(rooms.occupied) || 0) / Math.max(Number(rooms.total) || 1, 1)) * 100);
}

function calculateAvailable(rooms) {
  return Math.max((Number(rooms.total) || 0) - (Number(rooms.occupied) || 0) - (Number(rooms.blocked) || 0), 0);
}

function emptyDefaultTasks(template = defaultTasks) {
  return template.map((task, index) => ({
    ...task,
    id: task.id || `task-${index}-${Date.now()}`,
    done: false,
  }));
}

function summarizeRoomDetails(details) {
  const total = details.length;
  const occupied = details.filter((room) => room.status === "Ocupada").length;
  const blocked = details.filter((room) => room.status === "Bloqueada" || room.status === "Fuera de servicio").length;
  const dirty = details.filter((room) => room.status === "Sucia").length;
  const pending = details.filter((room) => room.status === "Pendiente").length;
  const clean = details.filter((room) => room.status === "Disponible" || room.status === "Ocupada").length;
  return { total, occupied, blocked, clean, dirty, pending };
}

function parseRoomCatalog(text) {
  const newline = String.fromCharCode(10);
  const lines = String(text || "").split(newline).map((line) => line.trim()).filter(Boolean);
  const catalog = lines.map((line, index) => {
    const [areaRaw, numberRaw] = line.includes(";") ? line.split(";") : line.split(",");
    const area = (areaRaw || "Edificio principal").trim();
    const number = (numberRaw || String(index + 1)).trim();
    return {
      id: `${area}-${number}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      area,
      number,
      label: `${area} · ${number}`,
    };
  });

  return catalog.length ? catalog : defaultRoomCatalog;
}

function formatRoomCatalog(catalog) {
  const newline = String.fromCharCode(10);
  return (catalog || []).map((room) => `${room.area};${room.number}`).join(newline);
}

function summarizeCatalogAreasFromText(text) {
  const newline = String.fromCharCode(10);
  const lines = String(text || "").split(newline).map((line) => line.trim()).filter(Boolean);
  const counts = new Map();

  lines.forEach((line) => {
    const [areaRaw] = line.includes(";") ? line.split(";") : line.split(",");
    const area = (areaRaw || "Edificio principal").trim();
    counts.set(area, (counts.get(area) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([area, count]) => ({ area, count }));
}

function groupRoomsByArea(rooms) {
  return rooms.reduce((groups, room) => {
    const area = room.area || "Sin estancia";
    if (!groups[area]) groups[area] = [];
    groups[area].push(room);
    return groups;
  }, {});
}

function summarizeAreaRooms(areaRooms) {
  return {
    total: areaRooms.length,
    available: areaRooms.filter((room) => room.status === "Disponible").length,
    occupied: areaRooms.filter((room) => room.status === "Ocupada").length,
    blocked: areaRooms.filter((room) => room.status === "Bloqueada" || room.status === "Fuera de servicio").length,
    dirty: areaRooms.filter((room) => room.status === "Sucia").length,
    pending: areaRooms.filter((room) => room.status === "Pendiente").length,
  };
}

function getIncidentArea(roomLabel) {
  if (!roomLabel || roomLabel === "General" || roomLabel === "-" || roomLabel === "General / sin habitación") return "General";
  return String(roomLabel).includes(" · ") ? String(roomLabel).split(" · ")[0] : "Sin estancia";
}

function alignRoomDetailsToCatalog(catalog, currentDetails = []) {
  return catalog.map((room) => {
    const existing = currentDetails.find((item) => item.id === room.id || item.label === room.label || item.number === room.label);
    const status = existing?.status || "Disponible";
    return {
      ...room,
      status,
      notes: existing?.notes || "",
      tone: statusTone(status),
      detail: statusDetail(status),
    };
  });
}

function statusTone(status) {
  if (status === "Disponible") return "green";
  if (status === "Bloqueada" || status === "Fuera de servicio") return "red";
  if (status === "Sucia" || status === "Pendiente") return "amber";
  return "slate";
}

function statusDetail(status) {
  if (status === "Disponible") return "Lista para venta";
  if (status === "Ocupada") return "Cliente alojado";
  if (status === "Bloqueada") return "Bloqueada temporalmente";
  if (status === "Fuera de servicio") return "No disponible por avería";
  if (status === "Sucia") return "Limpieza pendiente";
  if (status === "Pendiente") return "Revisión necesaria";
  return "Sin detalle";
}

function buildRoomInventory(rooms, catalog = defaultRoomCatalog) {
  const baseCatalog = catalog?.length ? catalog : defaultRoomCatalog;
  const occupied = Number(rooms.occupied) || 0;
  const blocked = Number(rooms.blocked) || 0;
  const pending = Number(rooms.pending) || 0;
  const dirty = Number(rooms.dirty) || 0;

  return baseCatalog.map((room, index) => {
    let status = "Disponible";

    if (index < occupied) status = "Ocupada";
    else if (index < occupied + blocked) status = "Bloqueada";
    else {
      const availableIndex = index - occupied - blocked;
      if (availableIndex < pending) status = "Pendiente";
      else if (availableIndex < pending + dirty) status = "Sucia";
    }

    return { ...room, status, tone: statusTone(status), detail: statusDetail(status), notes: "" };
  });
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

function buildRoomAreaSummaryText(roomAreaSummaries) {
  const newline = String.fromCharCode(10);
  if (!roomAreaSummaries?.length) return "Sin desglose por edificio.";
  return roomAreaSummaries
    .map((area) => `- ${area.area}: ${area.total} hab. · ${area.available} disponibles · ${area.occupied} ocupadas · ${area.blocked} bloqueadas/FDS · ${area.dirty} sucias · ${area.pending} pendientes`)
    .join(newline);
}

function buildOpenIncidentsByAreaText(incidents) {
  const newline = String.fromCharCode(10);
  const openItems = incidents.filter((incident) => incident.status !== "Cerrada");
  if (!openItems.length) return "Sin incidencias abiertas.";
  const grouped = openItems.reduce((groups, incident) => {
    const area = getIncidentArea(incident.room);
    if (!groups[area]) groups[area] = [];
    groups[area].push(incident);
    return groups;
  }, {});

  return Object.entries(grouped)
    .map(([area, items]) => `${area}${newline}${items.map((item) => `- ${item.priority} · ${item.room === "General" ? "General" : item.room} · ${item.type}: ${item.text}`).join(newline)}`)
    .join(`${newline}${newline}`);
}

function buildShiftLabel(form) {
  const morningStart = form.shiftMorningStart || "";
  const morningEnd = form.shiftMorningEnd || "";
  const afternoonStart = form.shiftAfternoonStart || "";
  const afternoonEnd = form.shiftAfternoonEnd || "";
  const morning = morningStart && morningEnd ? `${morningStart} - ${morningEnd}` : "";
  const afternoon = form.splitShift && afternoonStart && afternoonEnd ? `${afternoonStart} - ${afternoonEnd}` : "";
  return [morning, afternoon].filter(Boolean).join(" / ") || form.shift || "";
}

function parseShiftLabel(shift) {
  const parts = String(shift || "").split("/").map((part) => part.trim());
  const parsePart = (part) => {
    const [start, end] = String(part || "").split("-").map((value) => value.trim());
    return { start: start || "", end: end || "" };
  };
  const morning = parsePart(parts[0] || "");
  const afternoon = parsePart(parts[1] || "");
  return {
    shiftMorningStart: morning.start || "09:00",
    shiftMorningEnd: morning.end || "17:00",
    splitShift: Boolean(parts[1]),
    shiftAfternoonStart: afternoon.start || "",
    shiftAfternoonEnd: afternoon.end || "",
  };
}

function buildReportText({ hotel, latest, rooms, occupancy, available, openIncidents, recommendations, roomAreaSummaries }) {
  const currency = hotel.currency || "€";
  return `INFORME DIARIO DE RECEPCIÓN

Hotel: ${hotel.name}
Fecha: ${formatDateEs(latest.date)}
Responsable: ${latest.manager || "No indicado"}
Horario: ${latest.shift || "No indicado"}

OCUPACIÓN
Habitaciones totales: ${rooms.total}
Ocupadas: ${rooms.occupied}
Disponibles: ${available}
Bloqueadas/FDS: ${rooms.blocked}
Ocupación: ${occupancy}%

DESGLOSE POR EDIFICIO / ESTANCIA
${buildRoomAreaSummaryText(roomAreaSummaries)}

MOVIMIENTOS
Llegadas previstas: ${latest.arrivalsExpected}
Llegadas realizadas: ${latest.arrivalsDone}
Salidas previstas: ${latest.departuresExpected}
Salidas realizadas: ${latest.departuresDone}
Cancelaciones: ${latest.cancellations}
No-shows: ${latest.noShows}

VENTAS
Reservas nuevas: ${latest.newBookings}
Web directa: ${latest.directBookings}
Booking: ${latest.bookingBookings}
Expedia: ${latest.expediaBookings}

COBROS
Ingresos del día: ${latest.revenue} ${currency}
Pagos pendientes: ${latest.pendingPayments} ${currency}

INCIDENCIAS ABIERTAS
${openIncidents}

INCIDENCIAS DEL TURNO
${latest.incidents || "Sin incidencias relevantes."}

OBSERVACIONES
${latest.notes || "Sin observaciones."}

RECOMENDACIÓN DE RECEPCIÓN
${latest.recommendation || "Sin recomendación manual."}

RECOMENDACIONES AUTOMÁTICAS
${recommendations.map((r) => `- ${r.title}: ${r.text}`).join("\n")}`;
}

function buildSingleReportText({ hotel, report }) {
  const currency = hotel.currency || "€";
  return `INFORME DIARIO DE RECEPCIÓN

Hotel: ${hotel.name}
Fecha: ${formatDateEs(report.date)}
Responsable: ${report.manager || "No indicado"}
Horario: ${report.shift || "No indicado"}

MOVIMIENTOS
Llegadas previstas: ${report.arrivalsExpected}
Llegadas realizadas: ${report.arrivalsDone}
Salidas previstas: ${report.departuresExpected}
Salidas realizadas: ${report.departuresDone}
Cancelaciones: ${report.cancellations}
No-shows: ${report.noShows}

VENTAS
Reservas nuevas: ${report.newBookings}
Web directa: ${report.directBookings}
Booking: ${report.bookingBookings}
Expedia: ${report.expediaBookings}

COBROS
Ingresos del día: ${report.revenue} ${currency}
Pagos pendientes: ${report.pendingPayments} ${currency}

INCIDENCIAS DEL TURNO
${report.incidents || "Sin incidencias relevantes."}

OBSERVACIONES
${report.notes || "Sin observaciones."}

RECOMENDACIÓN DE RECEPCIÓN
${report.recommendation || "Sin recomendación manual."}`;
}

function getChecklistArea(item) {
  const rawNotes = String(item?.notes || "");
  const newline = String.fromCharCode(10);
  const firstLine = rawNotes.split(newline)[0] || "";

  if (firstLine.startsWith("[AREA:") && firstLine.endsWith("]")) {
    return firstLine.slice(6, -1) || "General";
  }

  return "General";
}

function cleanChecklistNotes(notes) {
  const rawNotes = String(notes || "");
  const newline = String.fromCharCode(10);
  const lines = rawNotes.split(newline);
  const firstLine = lines[0] || "";

  if (firstLine.startsWith("[AREA:") && firstLine.endsWith("]")) {
    return lines.slice(1).join(newline);
  }

  return rawNotes;
}

function encodeChecklistNotes(area, notes) {
  return `[AREA:${area || "General"}]${String.fromCharCode(10)}${notes || ""}`;
}

function findChecklistSignoffFor(dateValue, area, history) {
  return (history || []).find((item) => item.signoff_date === dateValue && getChecklistArea(item) === area) || null;
}

function firstAvailableChecklistArea(options, dateValue, history) {
  return (options || []).find((area) => !findChecklistSignoffFor(dateValue, area, history)) || (options || ["General"])[0] || "General";
}

function buildChecklistText({ hotel, checklist }) {
  return `CIERRE DE CHECKLIST OPERATIVO

Hotel: ${hotel.name}
Fecha: ${formatDateEs(checklist.signoff_date)}
Responsable: ${checklist.responsible || "No indicado"}
Edificio / estancia: ${getChecklistArea(checklist)}
Estado: ${checklist.status || "No indicado"}
Progreso: ${checklist.completed_count}/${checklist.total_count}
Creado: ${formatDateTimeEs(checklist.created_at)}

OBSERVACIONES
${cleanChecklistNotes(checklist.notes) || "Sin observaciones."}`;
}

function buildIncidentText({ hotel, incident }) {
  return `INFORME DE INCIDENCIA

Hotel: ${hotel.name}
Fecha: ${formatDateEs(incident.date)}
Habitación: ${incident.room || "-"}
Tipo: ${incident.type || "No indicado"}
Prioridad: ${incident.priority || "No indicada"}
Estado: ${incident.status || "No indicado"}
Responsable: ${incident.owner || "No indicado"}

DESCRIPCIÓN
${incident.text || "Sin descripción."}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(text) {
  return escapeHtml(text).split("\n").join("<br />");
}

function openPrintableDocument({ title, subtitle, bodyText }) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return false;

  const now = formatDateTimeEs(new Date().toISOString());
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #0f172a; background: white; }
    .toolbar { position: sticky; top: 0; display: flex; gap: 10px; padding: 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    button { border: 0; background: #0f172a; color: white; padding: 11px 15px; border-radius: 12px; font-weight: 700; cursor: pointer; }
    .secondary { background: white; color: #0f172a; border: 1px solid #cbd5e1; }
    .page { max-width: 860px; margin: 24px auto; padding: 34px; border: 1px solid #e2e8f0; border-radius: 18px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 25px; }
    .subtitle { margin-top: 8px; color: #475569; font-size: 14px; }
    .generated { margin-top: 8px; color: #64748b; font-size: 12px; }
    .content { line-height: 1.55; font-size: 14px; }
    @page { margin: 16mm; }
    @media print {
      .toolbar { display: none; }
      .page { margin: 0; padding: 0; border: 0; border-radius: 0; max-width: none; }
      body { background: white; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
    <button class="secondary" onclick="window.close()">Cerrar</button>
  </div>
  <main class="page">
    <section class="header">
      <h1>${escapeHtml(title)}</h1>
      <div class="subtitle">${escapeHtml(subtitle)}</div>
      <div class="generated">Generado: ${escapeHtml(now)}</div>
    </section>
    <section class="content">${textToHtml(bodyText)}</section>
  </main>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
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
  const incident = incidentToRow({ date: "2026-05-08", room: "101", type: "Mantenimiento", priority: "Alta", status: "Abierta", owner: "Recepción", text: "Test" }, "hotel-id");
  tests.push({ name: "Mapeo incidencia incluye description", pass: incident.description === "Test" && incident.incident_date === "2026-05-08", value: incident.description });
  const editedReport = reportToRow({ ...defaultReports[0], manager: "Editado" }, "hotel-id");
  tests.push({ name: "Mapeo edición conserva manager", pass: editedReport.manager === "Editado", value: editedReport.manager });
  const roomRow = roomStatusToRow({ total: 10, occupied: 7, blocked: 1, clean: 5, dirty: 3, pending: 1 }, "hotel-id");
  tests.push({ name: "Mapeo habitaciones incluye total", pass: roomRow.total === 10 && roomRow.status_date.length === 10, value: roomRow.total });
  const taskRow = taskToRow({ area: "Cierre", title: "Enviar informe", done: true }, "hotel-id");
  tests.push({ name: "Mapeo checklist mantiene done", pass: taskRow.done === true && taskRow.area === "Cierre", value: String(taskRow.done) });
  const channelRow = channelToRow({ name: "Booking", bookings: 2, revenue: 300, commission: 18 }, "hotel-id");
  tests.push({ name: "Mapeo canal mantiene comisión", pass: channelRow.commission === 18, value: channelRow.commission });
  return tests;
}

function Card({ children, className = "", ...props }) {
  return <div {...props} className={cls("rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-white/70 sm:p-5", className)}>{children}</div>;
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
  };
  return <span className={cls("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tones[tone] || tones.slate)}>{children}</span>;
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

function Modal({ title, subtitle, children, onClose, footer }) {
  if (!onClose) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-2 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-5">
          <div>
            <h3 className="text-lg font-bold sm:text-xl">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-5">
          {children}
        </div>
        {footer && <div className="border-t border-slate-200 p-4 sm:p-5">{footer}</div>}
      </div>
    </div>
  );
}

const inputStyle = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
const buttonDark = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2f5f7a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#254b62] active:scale-[0.99] sm:px-5";
const buttonLight = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] sm:px-5";

export default function HotelDailyControlApp() {
  const stored = typeof window !== "undefined" ? readLocal() : null;

  const [active, setActive] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hotel, setHotel] = useState(stored?.hotel || defaultHotel);
  const [rooms, setRooms] = useState(stored?.rooms || defaultRooms);
  const [roomCatalog, setRoomCatalog] = useState(stored?.roomCatalog || defaultRoomCatalog);
  const [roomCatalogText, setRoomCatalogText] = useState(formatRoomCatalog(stored?.roomCatalog || defaultRoomCatalog));
  const [newRoomArea, setNewRoomArea] = useState("Edificio principal");
  const [newRoomStart, setNewRoomStart] = useState("101");
  const [newRoomCount, setNewRoomCount] = useState(10);
  const [roomDate, setRoomDate] = useState(stored?.roomDate || todayIso());
  const [roomDetailsByDate, setRoomDetailsByDate] = useState(stored?.roomDetailsByDate || { [stored?.roomDate || todayIso()]: stored?.roomDetails || buildRoomInventory(stored?.rooms || defaultRooms, stored?.roomCatalog || defaultRoomCatalog) });
  const [roomDetails, setRoomDetails] = useState(stored?.roomDetailsByDate?.[stored?.roomDate || todayIso()] || stored?.roomDetails || buildRoomInventory(stored?.rooms || defaultRooms, stored?.roomCatalog || defaultRoomCatalog));
  const [reports, setReports] = useState(stored?.reports || defaultReports);
  const [incidents, setIncidents] = useState(stored?.incidents || defaultIncidents);
  const [checklistTemplate, setChecklistTemplate] = useState(stored?.checklistTemplate || defaultTasks);
  const [tasks, setTasks] = useState(stored?.tasks || emptyDefaultTasks(stored?.checklistTemplate || defaultTasks));
  const [channels, setChannels] = useState(stored?.channels || defaultChannels);
  const [copied, setCopied] = useState(false);
  const [copiedReportId, setCopiedReportId] = useState(null);
  const [lastAction, setLastAction] = useState("");
  const [connection, setConnection] = useState({ status: HAS_SUPABASE ? "loading" : "local", message: HAS_SUPABASE ? "Conectando con Supabase..." : "Modo local: faltan variables de Supabase" });
  const [form, setForm] = useState({
    date: todayIso(),
    manager: "",
    shift: hotel.receptionHours || "09:00 - 17:00",
    ...parseShiftLabel(hotel.receptionHours || "09:00 - 17:00"),
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
  const [incidentForm, setIncidentForm] = useState({ room: "", type: "Cliente", priority: "Media", status: "Abierta", owner: "Recepción", text: "" });
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingOriginalReport, setEditingOriginalReport] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteIncidentCandidate, setDeleteIncidentCandidate] = useState(null);
  const [viewingIncident, setViewingIncident] = useState(null);
  const [editingIncidentId, setEditingIncidentId] = useState(null);
  const [editingOriginalIncident, setEditingOriginalIncident] = useState(null);
  const [reportFilters, setReportFilters] = useState({ date: "", manager: "" });
  const [incidentFilters, setIncidentFilters] = useState({ query: "", status: "Todos", type: "Todos", priority: "Todas" });
  const [checklistDate, setChecklistDate] = useState(todayIso());
  const [checklistResponsible, setChecklistResponsible] = useState("");
  const [checklistArea, setChecklistArea] = useState("General");
  const [checklistNotes, setChecklistNotes] = useState("");
  const [checklistSignoff, setChecklistSignoff] = useState(null);
  const [checklistHistory, setChecklistHistory] = useState([]);
  const [viewingChecklist, setViewingChecklist] = useState(null);
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [deleteChecklistCandidate, setDeleteChecklistCandidate] = useState(null);
  const [checklistAreaModal, setChecklistAreaModal] = useState(null);
  const [incidentArea, setIncidentArea] = useState("");

  useEffect(() => {
    async function loadSupabase() {
      if (!HAS_SUPABASE) return;
      try {
        const hotels = await sb("hotels?select=*&order=created_at.asc&limit=1");
        const normalizedHotel = normalizeHotel(hotels?.[0]);
        setHotel(normalizedHotel);
        setForm((old) => ({ ...old, shift: normalizedHotel.receptionHours || old.shift }));

        const [remoteReports, remoteIncidents, remoteRooms, remoteTasks, remoteSignoffs, remoteChannels] = await Promise.all([
          sb(`daily_reports?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=50`),
          sb(`incidents?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=100`),
          sb(`room_status?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=1`),
          sb(`daily_tasks?select=*&hotel_id=eq.${normalizedHotel.id}&task_date=eq.${todayIso()}&order=created_at.asc`),
          sb(`checklist_signoffs?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=30`),
          sb(`sales_channels?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.asc`),
        ]);

        setReports(remoteReports?.length ? remoteReports.map(reportFromRow) : []);
        setIncidents(remoteIncidents?.length ? remoteIncidents.map(incidentFromRow) : []);
        if (remoteRooms?.length) {
          const loadedRooms = roomStatusFromRow(remoteRooms[0]);
          setRooms(loadedRooms);
          setRoomDetails(buildRoomInventory(loadedRooms, roomCatalog));
        }

        if (remoteTasks?.length) {
          setTasks(remoteTasks.map(taskFromRow));
        } else {
          const insertedTasks = await sb("daily_tasks?select=*", { method: "POST", body: JSON.stringify(emptyDefaultTasks(checklistTemplate).map((task) => taskToRow(task, normalizedHotel.id, todayIso()))) });
          setTasks(insertedTasks?.length ? insertedTasks.map(taskFromRow) : emptyDefaultTasks(checklistTemplate));
        }

        if (remoteSignoffs?.length) {
          setChecklistHistory(remoteSignoffs);
          const todaySignoff = remoteSignoffs.find((item) => item.signoff_date === todayIso());
          setChecklistSignoff(todaySignoff || null);
          if (todaySignoff) {
            setChecklistResponsible(todaySignoff.responsible || "");
            setChecklistNotes(todaySignoff.notes || "");
          }
        }

        if (remoteChannels?.length) {
          setChannels(remoteChannels.map(channelFromRow));
        } else {
          const insertedChannels = await sb("sales_channels?select=*", { method: "POST", body: JSON.stringify(defaultChannels.map((channel) => channelToRow(channel, normalizedHotel.id))) });
          setChannels(insertedChannels?.length ? insertedChannels.map(channelFromRow) : defaultChannels);
        }
        setConnection({ status: "online", message: "Conectado a Supabase" });
      } catch (error) {
        console.error(error);
        setConnection({ status: "error", message: "No se pudo conectar con Supabase. Usando modo local." });
      }
    }

    loadSupabase();
  }, []);

  useEffect(() => {
    writeLocal({ hotel, rooms, roomCatalog, roomDate, roomDetails, roomDetailsByDate, reports, incidents, checklistTemplate, tasks, channels });
  }, [hotel, rooms, roomCatalog, roomDate, roomDetails, roomDetailsByDate, reports, incidents, checklistTemplate, tasks, channels]);

  const latest = reports[0] || defaultReports[0];
  const occupancy = calculateOccupancy(rooms);
  const available = calculateAvailable(rooms);
  const roomInventory = useMemo(() => {
    const aligned = alignRoomDetailsToCatalog(roomCatalog, roomDetails);
    return aligned.map((room) => ({ ...room, tone: statusTone(room.status), detail: statusDetail(room.status) }));
  }, [roomCatalog, roomDetails]);
  const availableRooms = useMemo(() => roomInventory.filter((room) => room.status === "Disponible"), [roomInventory]);
  const blockedRooms = useMemo(() => roomInventory.filter((room) => room.status === "Bloqueada"), [roomInventory]);
  const bookingShare = latest ? Math.round((Number(latest.bookingBookings) / Math.max(Number(latest.newBookings), 1)) * 100) : 0;
  const directShare = latest ? Math.round((Number(latest.directBookings) / Math.max(Number(latest.newBookings), 1)) * 100) : 0;
  const openIncidents = incidents.filter((i) => i.status !== "Cerrada").length;
  const tasksDone = tasks.filter((task) => task.done).length;
  const taskProgress = Math.round((tasksDone / Math.max(tasks.length, 1)) * 100);

  const recommendations = useMemo(() => createRecommendations({ occupancy, bookingShare, directShare, blockedRooms: Number(rooms.blocked) || 0, pendingPayments: Number(latest?.pendingPayments) || 0, hotel }), [occupancy, bookingShare, directShare, rooms.blocked, latest, hotel]);
  const selfTests = useMemo(() => runSelfTests(), []);
  const allTestsPass = selfTests.every((test) => test.pass);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesDate = !reportFilters.date || report.date === reportFilters.date;
      const manager = (report.manager || "").toLowerCase();
      const matchesManager = !reportFilters.manager || manager.includes(reportFilters.manager.toLowerCase());
      return matchesDate && matchesManager;
    });
  }, [reports, reportFilters]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const query = incidentFilters.query.toLowerCase().trim();
      const text = `${incident.room} ${incident.owner} ${incident.text}`.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesStatus = incidentFilters.status === "Todos" || incident.status === incidentFilters.status;
      const matchesType = incidentFilters.type === "Todos" || incident.type === incidentFilters.type;
      const matchesPriority = incidentFilters.priority === "Todas" || incident.priority === incidentFilters.priority;
      return matchesQuery && matchesStatus && matchesType && matchesPriority;
    });
  }, [incidents, incidentFilters]);

  const employeeOptions = useMemo(() => {
    const values = [
      ...defaultEmployees,
      hotel.director,
      ...reports.map((report) => report.manager),
      ...incidents.map((incident) => incident.owner),
      checklistResponsible,
    ];
    return [...new Set(values.filter(Boolean))];
  }, [hotel.director, reports, incidents, checklistResponsible]);

  const openIncidentItems = useMemo(() => incidents.filter((incident) => incident.status !== "Cerrada"), [incidents]);

  const roomOptions = useMemo(() => roomInventory.map((room) => room.label || `${room.area} · ${room.number}`), [roomInventory]);
  const groupedRooms = useMemo(() => groupRoomsByArea(roomInventory), [roomInventory]);
  const groupedAvailableRooms = useMemo(() => groupRoomsByArea(availableRooms), [availableRooms]);
  const groupedBlockedRooms = useMemo(() => groupRoomsByArea(blockedRooms), [blockedRooms]);
  const groupedIncidents = useMemo(() => {
    return filteredIncidents.reduce((groups, incident) => {
      const area = getIncidentArea(incident.room);
      if (!groups[area]) groups[area] = [];
      groups[area].push(incident);
      return groups;
    }, {});
  }, [filteredIncidents]);
  const roomCatalogDraftSummary = useMemo(() => summarizeCatalogAreasFromText(roomCatalogText), [roomCatalogText]);
  const incidentAreaRooms = useMemo(() => {
    if (!incidentArea) return [];
    return groupedRooms[incidentArea] || [];
  }, [groupedRooms, incidentArea]);
  const buildingChecklistAreaOptions = useMemo(() => Object.keys(groupedRooms), [groupedRooms]);
  const checklistAreaOptions = useMemo(() => ["General", ...buildingChecklistAreaOptions], [buildingChecklistAreaOptions]);
  const groupedChecklistHistory = useMemo(() => {
    return checklistHistory.reduce((groups, item) => {
      const area = getChecklistArea(item);
      if (!groups[area]) groups[area] = [];
      groups[area].push(item);
      return groups;
    }, {});
  }, [checklistHistory]);
  const checklistSignoffsForDate = useMemo(() => checklistHistory.filter((item) => item.signoff_date === checklistDate), [checklistHistory, checklistDate]);
  const checklistAreasCreatedForDate = useMemo(() => checklistSignoffsForDate.map((item) => getChecklistArea(item)), [checklistSignoffsForDate]);
  const selectedChecklistExisting = useMemo(() => findChecklistSignoffFor(checklistDate, checklistArea, checklistHistory), [checklistDate, checklistArea, checklistHistory]);
  const buildingChecklistAreasCreatedForDate = buildingChecklistAreaOptions.filter((area) => checklistAreasCreatedForDate.includes(area));
  const allChecklistAreasClosedForDate = buildingChecklistAreaOptions.length > 0 && buildingChecklistAreaOptions.every((area) => checklistAreasCreatedForDate.includes(area));
  const roomAreaSummaries = useMemo(() => {
    return Object.entries(groupedRooms).map(([area, areaRooms]) => ({ area, ...summarizeAreaRooms(areaRooms) }));
  }, [groupedRooms]);
  const reportText = useMemo(() => buildReportText({ hotel, latest, rooms, occupancy, available, openIncidents, recommendations, roomAreaSummaries }), [hotel, latest, rooms, occupancy, available, openIncidents, recommendations, roomAreaSummaries]);

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
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  async function saveReport(e) {
    e.preventDefault();
    const draftReport = {
      id: editingReportId || `local-${Date.now()}`,
      ...form,
      shift: buildShiftLabel(form),
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
        if (editingReportId && !String(editingReportId).startsWith("local-") && !String(editingReportId).startsWith("demo-")) {
          const updated = await sb(`daily_reports?id=eq.${editingReportId}&select=*`, { method: "PATCH", body: JSON.stringify(reportToRow(draftReport, hotel.id)) });
          const savedReport = updated?.[0] ? reportFromRow(updated[0]) : draftReport;
          setReports(reports.map((report) => report.id === editingReportId ? savedReport : report));
          setLastAction(`Parte diario actualizado: ${formatDateEs(savedReport.date)}`);
        } else {
          const inserted = await sb("daily_reports?select=*", { method: "POST", body: JSON.stringify(reportToRow(draftReport, hotel.id)) });
          const savedReport = inserted?.[0] ? reportFromRow(inserted[0]) : draftReport;
          setReports([savedReport, ...reports]);
          setLastAction(`Parte diario guardado en Supabase: ${formatDateEs(savedReport.date)}`);
        }
      } else {
        if (editingReportId) {
          setReports(reports.map((report) => report.id === editingReportId ? draftReport : report));
          setLastAction("Parte diario actualizado en modo local");
        } else {
          setReports([draftReport, ...reports]);
          setLastAction("Parte diario guardado en modo local");
        }
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "Error guardando en Supabase. Guardado localmente." });
      if (editingReportId) setReports(reports.map((report) => report.id === editingReportId ? draftReport : report));
      else setReports([draftReport, ...reports]);
    }

    clearReportForm();
    setActive("dashboard");
  }

  function getFormFromReport(report) {
    const parsedShift = parseShiftLabel(report.shift || hotel.receptionHours || "09:00 - 17:00");
    return {
      date: report.date || todayIso(),
      manager: report.manager || "",
      shift: report.shift || hotel.receptionHours || "09:00 - 17:00",
      ...parsedShift,
      arrivalsExpected: report.arrivalsExpected || 0,
      arrivalsDone: report.arrivalsDone || 0,
      departuresExpected: report.departuresExpected || 0,
      departuresDone: report.departuresDone || 0,
      newBookings: report.newBookings || 0,
      directBookings: report.directBookings || 0,
      bookingBookings: report.bookingBookings || 0,
      expediaBookings: report.expediaBookings || 0,
      cancellations: report.cancellations || 0,
      noShows: report.noShows || 0,
      revenue: report.revenue || 0,
      pendingPayments: report.pendingPayments || 0,
      incidents: report.incidents || "",
      notes: report.notes || "",
      recommendation: report.recommendation || "",
    };
  }

  function editReport(report) {
    setEditingReportId(report.id);
    setEditingOriginalReport(report);
    setForm(getFormFromReport(report));
    setActive("daily");
    setLastAction(`Editando parte diario del ${formatDateEs(report.date)}`);
  }

  function cancelEditReport() {
    if (editingOriginalReport) {
      setForm(getFormFromReport(editingOriginalReport));
      setLastAction(`Edición cancelada. Datos originales restaurados del ${formatDateEs(editingOriginalReport.date)}`);
    }
    setEditingReportId(null);
    setEditingOriginalReport(null);
    setActive("reports");
  }

  function viewReport(report) {
    setViewingReport(report);
    setDeleteCandidate(null);
    setLastAction(`Visualizando parte diario del ${formatDateEs(report.date)}`);
  }

  function askDeleteReport(report) {
    setDeleteCandidate(report);
    setViewingReport(null);
  }

  async function confirmDeleteReport() {
    if (!deleteCandidate) return;
    const reportToDelete = deleteCandidate;

    try {
      if (connection.status === "online" && !String(reportToDelete.id).startsWith("local-") && !String(reportToDelete.id).startsWith("demo-")) {
        const deleted = await sb(`daily_reports?id=eq.${reportToDelete.id}&select=*`, {
          method: "DELETE",
          headers: { Prefer: "return=representation" },
        });

        if (!deleted || deleted.length === 0) {
          throw new Error("Supabase no ha eliminado ninguna fila. Revisa la política DELETE de RLS en daily_reports.");
        }
      }

      setReports(reports.filter((report) => report.id !== reportToDelete.id));
      setDeleteCandidate(null);
      if (viewingReport?.id === reportToDelete.id) setViewingReport(null);
      setLastAction(`Parte diario eliminado: ${formatDateEs(reportToDelete.date)}`);
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido eliminando el parte";
      setConnection({ status: "error", message: `No se pudo borrar el parte en Supabase: ${message}` });
      setLastAction(`Fallo al borrar parte: ${message}`);
    }
  }

  function clearReportForm() {
    setEditingReportId(null);
    setEditingOriginalReport(null);
    setForm({
      date: todayIso(),
      manager: "",
      shift: hotel.receptionHours || "09:00 - 17:00",
      ...parseShiftLabel(hotel.receptionHours || "09:00 - 17:00"),
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
  }

  async function addIncident(e) {
    e.preventDefault();
    if (!incidentForm.text.trim()) return;

    const draftIncident = {
      id: editingIncidentId || `local-${Date.now()}`,
      date: editingOriginalIncident?.date || todayIso(),
      room: incidentForm.room || "-",
      type: incidentForm.type,
      priority: incidentForm.priority,
      owner: incidentForm.owner,
      status: incidentForm.status || editingOriginalIncident?.status || "Abierta",
      text: incidentForm.text,
    };

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        if (editingIncidentId && !String(editingIncidentId).startsWith("local-") && !String(editingIncidentId).startsWith("demo-")) {
          const updated = await sb(`incidents?id=eq.${editingIncidentId}&select=*`, {
            method: "PATCH",
            body: JSON.stringify(incidentToRow(draftIncident, hotel.id)),
          });

          if (!updated || updated.length === 0) {
            throw new Error("Supabase no ha actualizado ninguna fila. Revisa la política UPDATE de RLS en incidents.");
          }

          const savedIncident = incidentFromRow(updated[0]);
          setIncidents(incidents.map((incident) => incident.id === editingIncidentId ? savedIncident : incident));
          setLastAction(`Incidencia actualizada: habitación ${savedIncident.room}`);
        } else {
          const payload = incidentToRow(draftIncident, hotel.id);
          const inserted = await sb("incidents?select=*", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const savedIncident = inserted?.[0] ? incidentFromRow(inserted[0]) : draftIncident;
          setIncidents([savedIncident, ...incidents]);
          setLastAction(`Incidencia guardada en Supabase: habitación ${savedIncident.room}`);
        }
      } else {
        if (editingIncidentId) {
          setIncidents(incidents.map((incident) => incident.id === editingIncidentId ? draftIncident : incident));
          setLastAction("Incidencia actualizada en modo local");
        } else {
          setIncidents([draftIncident, ...incidents]);
          setLastAction("Incidencia guardada solo en modo local");
        }
      }
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido guardando incidencia";
      setConnection({ status: "error", message: `Error guardando incidencia en Supabase: ${message}` });
      setLastAction(`Fallo al guardar incidencia en Supabase: ${message}`);
      if (editingIncidentId) setIncidents(incidents.map((incident) => incident.id === editingIncidentId ? draftIncident : incident));
      else setIncidents([draftIncident, ...incidents]);
    }

    clearIncidentForm();
  }

  function getIncidentFormFromIncident(incident) {
    const area = getIncidentArea(incident.room);
    setIncidentArea(area === "General" ? "" : area);
    return {
      room: incident.room || "-",
      type: incident.type || "Cliente",
      priority: incident.priority || "Media",
      status: incident.status || "Abierta",
      owner: incident.owner || "Recepción",
      text: incident.text || "",
    };
  }

  function viewIncident(incident) {
    setViewingIncident(incident);
    setDeleteIncidentCandidate(null);
    setLastAction(`Visualizando incidencia de habitación ${incident.room}`);
  }

  function editIncident(incident) {
    setEditingIncidentId(incident.id);
    setEditingOriginalIncident(incident);
    setIncidentForm(getIncidentFormFromIncident(incident));
    setViewingIncident(null);
    setDeleteIncidentCandidate(null);
    setLastAction(`Editando incidencia de habitación ${incident.room}`);
    window.setTimeout(() => {
      document.getElementById("incident-form-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function cancelEditIncident() {
    if (editingOriginalIncident) {
      setIncidentForm(getIncidentFormFromIncident(editingOriginalIncident));
      setLastAction(`Edición de incidencia cancelada. Datos restaurados de habitación ${editingOriginalIncident.room}`);
    }
    setEditingIncidentId(null);
    setEditingOriginalIncident(null);
    window.setTimeout(() => clearIncidentForm(), 250);
  }

  function clearIncidentForm() {
    setEditingIncidentId(null);
    setEditingOriginalIncident(null);
    setIncidentArea("");
    setIncidentForm({ room: "", type: "Cliente", priority: "Media", status: "Abierta", owner: "Recepción", text: "" });
  }

  function askDeleteIncident(incident) {
    setDeleteIncidentCandidate(incident);
    setViewingIncident(null);
  }

  async function confirmDeleteIncident() {
    if (!deleteIncidentCandidate) return;
    const incidentToDelete = deleteIncidentCandidate;
    const shouldDeleteRemote = HAS_SUPABASE
      && hotel.id !== DEMO_HOTEL_ID
      && !String(incidentToDelete.id).startsWith("local-")
      && !String(incidentToDelete.id).startsWith("demo-");

    try {
      if (shouldDeleteRemote) {
        await sb(`incidents?id=eq.${incidentToDelete.id}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
      }

      setIncidents((current) => current.filter((incident) => incident.id !== incidentToDelete.id));
      setDeleteIncidentCandidate(null);
      if (viewingIncident?.id === incidentToDelete.id) setViewingIncident(null);
      setConnection((current) => HAS_SUPABASE ? { status: "online", message: "Conectado a Supabase" } : current);
      setLastAction(shouldDeleteRemote ? `Incidencia eliminada de Supabase: habitación ${incidentToDelete.room}` : `Incidencia eliminada en modo local: habitación ${incidentToDelete.room}`);
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido eliminando la incidencia";
      setLastAction(`No se pudo borrar la incidencia en Supabase: ${message}`);
      setConnection({ status: "error", message: `No se pudo borrar la incidencia en Supabase: ${message}` });
    }
  }(id, status) {
    setIncidents(incidents.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      if (connection.status === "online" && !String(id).startsWith("local-") && !String(id).startsWith("demo-")) {
        const updated = await sb(`incidents?id=eq.${id}&select=*`, { method: "PATCH", body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
        if (!updated || updated.length === 0) {
          throw new Error("Supabase no ha actualizado ninguna fila. Revisa la política UPDATE de RLS en incidents.");
        }
        setLastAction(`Estado de incidencia actualizado: ${status}`);
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo actualizar la incidencia en Supabase." });
    }
  }

  async function updateTaskDone(id, done) {
    if (checklistSignoff && !editingChecklistId) {
      setLastAction("Checklist cerrado. Pulsa Editar en el histórico para corregir este checklist.");
      return;
    }

    setTasks(tasks.map((x) => (x.id === id ? { ...x, done } : x)));
    try {
      if (connection.status === "online" && !String(id).startsWith("open-") && !String(id).startsWith("shift-") && !String(id).startsWith("close-")) {
        await sb(`daily_tasks?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ done }) });
        setLastAction(done ? "Tarea marcada como completada" : "Tarea marcada como pendiente");
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo actualizar el checklist en Supabase." });
    }
  }

  async function loadChecklistForDate(dateValue) {
    setChecklistDate(dateValue);
    setEditingChecklistId(null);
    setChecklistResponsible("");
    setChecklistNotes("");

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const [remoteTasks, remoteSignoffs] = await Promise.all([
          sb(`daily_tasks?select=*&hotel_id=eq.${hotel.id}&task_date=eq.${dateValue}&order=created_at.asc`),
          sb(`checklist_signoffs?select=*&hotel_id=eq.${hotel.id}&signoff_date=eq.${dateValue}&order=created_at.desc`),
        ]);

        if (remoteTasks?.length) {
          setTasks(remoteTasks.map(taskFromRow));
        } else {
          const insertedTasks = await sb("daily_tasks?select=*", { method: "POST", body: JSON.stringify(emptyDefaultTasks(checklistTemplate).map((task) => taskToRow(task, hotel.id, dateValue))) });
          setTasks(insertedTasks?.length ? insertedTasks.map(taskFromRow) : emptyDefaultTasks(checklistTemplate));
        }

        const daySignoffs = remoteSignoffs || [];
        setChecklistHistory((current) => [...daySignoffs, ...current.filter((item) => item.signoff_date !== dateValue)]);
        const nextArea = firstAvailableChecklistArea(checklistAreaOptions, dateValue, daySignoffs);
        const signoff = findChecklistSignoffFor(dateValue, nextArea, daySignoffs);
        setChecklistArea(nextArea);
        setChecklistSignoff(signoff);
        if (signoff) {
          setChecklistResponsible(signoff.responsible || "");
          setChecklistNotes(cleanChecklistNotes(signoff.notes));
          setLastAction(`Todos o varios checklists ya existen para ${formatDateEs(dateValue)}. Puedes editar el cierre de ${nextArea}.`);
        } else {
          setLastAction(`Checklist abierto para ${formatDateEs(dateValue)} · ${nextArea}`);
        }
      } else {
        const nextArea = firstAvailableChecklistArea(checklistAreaOptions, dateValue, checklistHistory);
        const signoff = findChecklistSignoffFor(dateValue, nextArea, checklistHistory);
        setChecklistArea(nextArea);
        setChecklistSignoff(signoff);
        setTasks(emptyDefaultTasks(checklistTemplate));
        if (signoff) {
          setChecklistResponsible(signoff.responsible || "");
          setChecklistNotes(cleanChecklistNotes(signoff.notes));
        }
        setLastAction(`Checklist local cargado para ${formatDateEs(dateValue)} · ${nextArea}`);
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo cargar el checklist de esa fecha." });
    }
  }

  async function createBlankChecklistForDate(dateValue) {
    const nextArea = firstAvailableChecklistArea(checklistAreaOptions, dateValue, checklistHistory);
    const existingForArea = findChecklistSignoffFor(dateValue, nextArea, checklistHistory);
    setChecklistDate(dateValue);
    setChecklistSignoff(existingForArea);
    setEditingChecklistId(null);
    setChecklistResponsible(existingForArea?.responsible || "");
    setChecklistArea(nextArea);
    setChecklistNotes(existingForArea ? cleanChecklistNotes(existingForArea.notes) : "");
    setTasks(emptyDefaultTasks(checklistTemplate));

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const existing = await sb(`daily_tasks?select=*&hotel_id=eq.${hotel.id}&task_date=eq.${dateValue}&order=created_at.asc`);
        if (!existing?.length) {
          const insertedTasks = await sb("daily_tasks?select=*", { method: "POST", body: JSON.stringify(emptyDefaultTasks(checklistTemplate).map((task) => taskToRow(task, hotel.id, dateValue))) });
          setTasks(insertedTasks?.length ? insertedTasks.map(taskFromRow) : emptyDefaultTasks(checklistTemplate));
        } else {
          setTasks(existing.map(taskFromRow).map((task) => ({ ...task, done: false })));
        }
      }
      setLastAction(existingForArea ? `Ya existe checklist para ${formatDateEs(dateValue)} · ${nextArea}. Puedes editarlo desde el histórico.` : `Nuevo checklist abierto para ${formatDateEs(dateValue)} · ${nextArea}`);
    } catch (error) {
      console.error(error);
      setLastAction(`Nuevo checklist local abierto para ${formatDateEs(dateValue)}`);
    }
  }

  function createNextChecklist() {
    const nextDate = addDaysIso(checklistDate, 1);
    createBlankChecklistForDate(nextDate);
    window.setTimeout(() => {
      document.getElementById("checklist-top-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function createTodayChecklist() {
    loadChecklistForDate(todayIso());
    window.setTimeout(() => {
      document.getElementById("checklist-top-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function acceptChecklist() {
    const duplicateSignoff = findChecklistSignoffFor(checklistDate, checklistArea, checklistHistory);
    if (duplicateSignoff && !editingChecklistId && duplicateSignoff.id !== checklistSignoff?.id) {
      setChecklistSignoff(duplicateSignoff);
      setChecklistResponsible(duplicateSignoff.responsible || "");
      setChecklistNotes(cleanChecklistNotes(duplicateSignoff.notes));
      setLastAction(`Ya existe un checklist para ${formatDateEs(checklistDate)} · ${checklistArea}. Puedes editarlo desde el histórico.`);
      return;
    }

    const completedCount = tasks.filter((task) => task.done).length;
    const totalCount = tasks.length;
    const hasPending = completedCount < totalCount;

    const payload = {
      hotel_id: hotel.id,
      signoff_date: checklistDate,
      responsible: checklistResponsible || "No indicado",
      notes: encodeChecklistNotes(checklistArea, checklistNotes),
      completed_count: completedCount,
      total_count: totalCount,
      status: hasPending ? "Cerrado con pendientes" : "Correcto",
    };

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        if (checklistSignoff?.id) {
          const updated = await sb(`checklist_signoffs?id=eq.${checklistSignoff.id}&select=*`, { method: "PATCH", body: JSON.stringify(payload) });
          const saved = updated?.[0] || checklistSignoff;
          setChecklistSignoff(saved);
          setChecklistHistory(checklistHistory.map((item) => item.id === saved.id ? saved : item));
          setLastAction(`Cierre de checklist actualizado: ${formatDateEs(saved.signoff_date)}`);
        } else {
          const inserted = await sb("checklist_signoffs?select=*", { method: "POST", body: JSON.stringify(payload) });
          const saved = inserted?.[0] || payload;
          setChecklistSignoff(saved);
          setChecklistHistory([saved, ...checklistHistory]);
          setLastAction(hasPending ? "Checklist cerrado con tareas pendientes" : "Checklist aceptado como correcto");
        }

        const history = await sb(`checklist_signoffs?select=*&hotel_id=eq.${hotel.id}&order=created_at.desc&limit=30`);
        setChecklistHistory(history || []);
        setEditingChecklistId(null);
      } else {
        const localSignoff = checklistSignoff?.id
          ? { ...checklistSignoff, ...payload }
          : { ...payload, id: `local-signoff-${Date.now()}`, created_at: new Date().toISOString() };
        setChecklistSignoff(localSignoff);
        setChecklistHistory(checklistSignoff?.id ? checklistHistory.map((item) => item.id === checklistSignoff.id ? localSignoff : item) : [localSignoff, ...checklistHistory]);
        setEditingChecklistId(null);
        setLastAction(hasPending ? "Checklist local cerrado con pendientes" : "Checklist local aceptado como correcto");
      }
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido cerrando checklist";
      setConnection({ status: "error", message: `No se pudo cerrar el checklist: ${message}` });
    }
  }

  function viewChecklist(item) {
    setViewingChecklist(item);
    setDeleteChecklistCandidate(null);
    setLastAction(`Visualizando cierre de checklist del ${formatDateEs(item.signoff_date)}`);
  }

  async function editChecklist(item) {
    setViewingChecklist(null);
    setDeleteChecklistCandidate(null);
    setEditingChecklistId(item.id);
    setChecklistSignoff(item);
    setChecklistDate(item.signoff_date);
    setChecklistResponsible(item.responsible || "");
    setChecklistArea(getChecklistArea(item));
    setChecklistNotes(cleanChecklistNotes(item.notes));
    setLastAction(`Editando cierre de checklist del ${formatDateEs(item.signoff_date)}`);

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const remoteTasks = await sb(`daily_tasks?select=*&hotel_id=eq.${hotel.id}&task_date=eq.${item.signoff_date}&order=created_at.asc`);
        if (remoteTasks?.length) setTasks(remoteTasks.map(taskFromRow));
      }
    } catch (error) {
      console.error(error);
      setLastAction("No se pudieron cargar las tareas del checklist, pero puedes editar el cierre.");
    }

    window.setTimeout(() => {
      document.getElementById("checklist-close-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function cancelEditChecklist() {
    if (checklistSignoff) {
      setChecklistResponsible(checklistSignoff.responsible || "");
      setChecklistArea(getChecklistArea(checklistSignoff));
      setChecklistNotes(cleanChecklistNotes(checklistSignoff.notes));
    }
    setEditingChecklistId(null);
    setLastAction("Edición de cierre de checklist cancelada");
  }

  function askDeleteChecklist(item) {
    setDeleteChecklistCandidate(item);
    setViewingChecklist(null);
  }

  async function confirmDeleteChecklist() {
    if (!deleteChecklistCandidate) return;
    const itemToDelete = deleteChecklistCandidate;

    try {
      if (connection.status === "online" && !String(itemToDelete.id).startsWith("local-")) {
        const deleted = await sb(`checklist_signoffs?id=eq.${itemToDelete.id}&select=*`, {
          method: "DELETE",
          headers: { Prefer: "return=representation" },
        });

        if (!deleted || deleted.length === 0) {
          throw new Error("Supabase no ha eliminado ninguna fila. Revisa la política DELETE de RLS en checklist_signoffs.");
        }
      }

      setChecklistHistory(checklistHistory.filter((item) => item.id !== itemToDelete.id));
      if (checklistSignoff?.id === itemToDelete.id) {
        setChecklistSignoff(null);
        setEditingChecklistId(null);
        setChecklistResponsible("");
        setChecklistNotes("");
      }
      setDeleteChecklistCandidate(null);
      setLastAction(`Cierre de checklist eliminado: ${formatDateEs(itemToDelete.signoff_date)}`);
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido eliminando el cierre de checklist";
      setConnection({ status: "error", message: `No se pudo borrar el cierre de checklist en Supabase: ${message}` });
      setLastAction(`Fallo al borrar cierre de checklist: ${message}`);
    }
  }

  async function saveRooms() {
    const summarizedRooms = summarizeRoomDetails(roomDetails);
    setRooms(summarizedRooms);
    setRoomDetailsByDate((current) => ({ ...current, [roomDate]: roomDetails }));

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        await sb("room_status?select=*", { method: "POST", body: JSON.stringify(roomStatusToRow(summarizedRooms, hotel.id, roomDate)) });

        await Promise.all(roomDetails.map((room) => {
          const payload = roomDailyStatusToRow(room, hotel.id, roomDate);
          return sb(
            `room_daily_status?hotel_id=eq.${hotel.id}&status_date=eq.${roomDate}&room_number=eq.${encodeURIComponent(room.label || `${room.area || "Edificio principal"} · ${room.number}`)}&select=*`,
            { method: "PATCH", body: JSON.stringify(payload) }
          ).then((updated) => {
            if (!updated || updated.length === 0) {
              return sb("room_daily_status?select=*", { method: "POST", body: JSON.stringify(payload) });
            }
            return updated;
          });
        }));

        setLastAction(`Estado de habitaciones guardado para ${formatDateEs(roomDate)}`);
      } else {
        setLastAction(`Estado de habitaciones guardado en modo local para ${formatDateEs(roomDate)}`);
      }
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido guardando habitaciones";
      setConnection({ status: "error", message: `No se pudo guardar el estado de habitaciones en Supabase: ${message}` });
    }
  }

  async function loadRoomsForDate(dateValue) {
    setRoomDate(dateValue);

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const [remoteDetails, remoteRows] = await Promise.all([
          sb(`room_daily_status?select=*&hotel_id=eq.${hotel.id}&status_date=eq.${dateValue}&order=room_number.asc`),
          sb(`room_status?select=*&hotel_id=eq.${hotel.id}&status_date=eq.${dateValue}&order=created_at.desc&limit=1`),
        ]);

        if (remoteDetails?.length) {
          const loadedDetails = remoteDetails.map(roomDailyStatusFromRow);
          setRoomDetails(loadedDetails);
          setRoomDetailsByDate((current) => ({ ...current, [dateValue]: loadedDetails }));
          setRooms(summarizeRoomDetails(loadedDetails));
          setLastAction(`Detalle de habitaciones cargado para ${formatDateEs(dateValue)}`);
          return;
        }

        if (remoteRows?.length) {
          const loadedRooms = roomStatusFromRow(remoteRows[0]);
          const localDetails = roomDetailsByDate[dateValue];
          const details = localDetails || buildRoomInventory(loadedRooms);
          setRooms(loadedRooms);
          setRoomDetails(details);
          setRoomDetailsByDate((current) => ({ ...current, [dateValue]: details }));
          setLastAction(`Resumen de habitaciones cargado para ${formatDateEs(dateValue)}`);
          return;
        }
      }

      const localDetails = roomDetailsByDate[dateValue];
      if (localDetails?.length) {
        setRoomDetails(localDetails);
        setRooms(summarizeRoomDetails(localDetails));
        setLastAction(`Estado local de habitaciones cargado para ${formatDateEs(dateValue)}`);
      } else {
        const blankDetails = roomCatalog.map((room) => ({ ...room, status: "Disponible", notes: "", tone: statusTone("Disponible"), detail: statusDetail("Disponible") }));
        setRoomDetails(blankDetails);
        setRooms(summarizeRoomDetails(blankDetails));
        setRoomDetailsByDate((current) => ({ ...current, [dateValue]: blankDetails }));
        setLastAction(`Nuevo estado de habitaciones abierto para ${formatDateEs(dateValue)}`);
      }
    } catch (error) {
      console.error(error);
      const localDetails = roomDetailsByDate[dateValue];
      if (localDetails?.length) {
        setRoomDetails(localDetails);
        setRooms(summarizeRoomDetails(localDetails));
      }
      const message = error?.message || "Error desconocido cargando habitaciones";
      setConnection({ status: "error", message: `No se pudo cargar el estado de habitaciones de esa fecha: ${message}` });
    }
  }

  function openRoomDate(dateValue) {
    loadRoomsForDate(dateValue);
    window.setTimeout(() => {
      document.getElementById("rooms-top-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function createRoomDayFromCurrent(dateValue) {
    const nextDetails = roomDetails.map((room) => ({ ...room }));
    setRoomDate(dateValue);
    setRoomDetails(nextDetails);
    setRoomDetailsByDate((current) => ({ ...current, [dateValue]: nextDetails }));
    setRooms(summarizeRoomDetails(nextDetails));
    setLastAction(`Nueva foto de habitaciones creada para ${formatDateEs(dateValue)} a partir del estado actual. Revisa cambios y pulsa Guardar estado.`);
    window.setTimeout(() => {
      document.getElementById("rooms-top-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function createNextRoomDay() {
    createRoomDayFromCurrent(addDaysIso(roomDate, 1));
  }

  function goPreviousRoomDay() {
    openRoomDate(addDaysIso(roomDate, -1));
  }

  function goNextRoomDay() {
    openRoomDate(addDaysIso(roomDate, 1));
  }

  async function saveHotelConfig() {
    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const updated = await sb(`hotels?id=eq.${hotel.id}&select=*`, { method: "PATCH", body: JSON.stringify(hotelToRow(hotel)) });
        if (updated?.[0]) setHotel(normalizeHotel(updated[0]));
        setLastAction("Configuración del hotel guardada en Supabase");
      } else {
        setLastAction("Configuración guardada en modo local");
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo guardar la configuración del hotel en Supabase." });
    }
  }

  async function saveChannels() {
    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const remoteChannels = channels.filter((channel) => channel.id && !String(channel.id).startsWith("local-"));
        await Promise.all(remoteChannels.map((channel) => sb(`sales_channels?id=eq.${channel.id}`, { method: "PATCH", body: JSON.stringify(channelToRow(channel, hotel.id)) })));
        setLastAction("Canales de venta guardados en Supabase");
      } else {
        setLastAction("Canales de venta guardados en modo local");
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudieron guardar los canales en Supabase." });
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

  async function copySingleReport(report) {
    try {
      await navigator.clipboard.writeText(buildSingleReportText({ hotel, report }));
      setCopiedReportId(report.id);
      setLastAction(`Informe copiado: ${formatDateEs(report.date)}`);
      setTimeout(() => setCopiedReportId(null), 1800);
    } catch {
      setLastAction("No se pudo copiar el informe seleccionado");
    }
  }

  function printSummary() {
    const ok = openPrintableDocument({
      title: "Resumen rápido para dirección",
      subtitle: hotel.name,
      bodyText: reportText,
    });
    setLastAction(ok ? "Vista de impresión del resumen abierta" : "No se pudo abrir la ventana de impresión. Revisa el bloqueo de ventanas emergentes.");
  }

  function printSingleReport(report) {
    const ok = openPrintableDocument({
      title: `Parte diario - ${formatDateEs(report.date)}`,
      subtitle: `${hotel.name} · ${report.manager || "Responsable no indicado"}`,
      bodyText: buildSingleReportText({ hotel, report }),
    });
    setLastAction(ok ? `Vista de impresión abierta: ${formatDateEs(report.date)}` : "No se pudo abrir la ventana de impresión. Revisa el bloqueo de ventanas emergentes.");
  }

  function printChecklist(checklist) {
    const ok = openPrintableDocument({
      title: `Checklist operativo - ${formatDateEs(checklist.signoff_date)}`,
      subtitle: `${hotel.name} · ${checklist.responsible || "Responsable no indicado"}`,
      bodyText: buildChecklistText({ hotel, checklist }),
    });
    setLastAction(ok ? `Vista de impresión de checklist abierta: ${formatDateEs(checklist.signoff_date)}` : "No se pudo abrir la ventana de impresión. Revisa el bloqueo de ventanas emergentes.");
  }

  function printIncident(incident) {
    const ok = openPrintableDocument({
      title: `Incidencia habitación ${incident.room || "-"}`,
      subtitle: `${hotel.name} · ${incident.type || "Tipo no indicado"}`,
      bodyText: buildIncidentText({ hotel, incident }),
    });
    setLastAction(ok ? `Vista de impresión de incidencia abierta: habitación ${incident.room}` : "No se pudo abrir la ventana de impresión. Revisa el bloqueo de ventanas emergentes.");
  }

  function resetDemo() {
    setHotel(defaultHotel);
    setRooms(defaultRooms);
    setRoomDetails(buildRoomInventory(defaultRooms, roomCatalog));
    setReports(defaultReports);
    setIncidents(defaultIncidents);
    setTasks(emptyDefaultTasks(checklistTemplate));
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

  function updateChecklistTemplate(index, key, value) {
    setChecklistTemplate(checklistTemplate.map((task, i) => (i === index ? { ...task, [key]: value } : task)));
  }

  function addChecklistTemplateTask() {
    setChecklistTemplate([
      ...checklistTemplate,
      { id: `template-${Date.now()}`, area: "Apertura", title: "Nueva tarea del checklist", done: false },
    ]);
    setLastAction("Nueva tarea añadida a la plantilla del checklist. Puedes editarla y se usará en nuevos checklists.");
  }

  function deleteChecklistTemplateTask(index) {
    setChecklistTemplate(checklistTemplate.filter((_, i) => i !== index));
    setLastAction("Tarea eliminada de la plantilla del checklist. No afecta a cierres ya guardados.");
  }

  function resetChecklistTemplate() {
    setChecklistTemplate(defaultTasks);
    setLastAction("Plantilla del checklist restaurada a la versión base de 16 tareas.");
  }

  function saveRoomCatalog() {
    const parsedCatalog = parseRoomCatalog(roomCatalogText);
    const alignedDetails = alignRoomDetailsToCatalog(parsedCatalog, roomDetails);
    const summarizedRooms = summarizeRoomDetails(alignedDetails);
    setRoomCatalog(parsedCatalog);
    setRoomDetails(alignedDetails);
    setRooms(summarizedRooms);
    setRoomDetailsByDate((current) => ({ ...current, [roomDate]: alignedDetails }));
    setLastAction(`Catálogo de habitaciones actualizado: ${parsedCatalog.length} habitaciones configuradas. Ya puedes verlo en Habitaciones.`);
  }

  function resetRoomCatalogFromCurrent() {
    const text = formatRoomCatalog(roomCatalog);
    setRoomCatalogText(text);
    setLastAction("Catálogo de habitaciones restaurado desde la configuración actual.");
  }

  function addRoomAreaToCatalog() {
    const area = (newRoomArea || "Edificio principal").trim();
    const start = Number(newRoomStart) || 1;
    const count = Math.max(Number(newRoomCount) || 1, 1);
    const generated = Array.from({ length: count }, (_, index) => `${area};${start + index}`);
    const newline = String.fromCharCode(10);

    setRoomCatalogText((current) => {
      const cleanCurrent = String(current || "").trim();
      const generatedText = generated.join(newline);
      return cleanCurrent ? `${cleanCurrent}${newline}${generatedText}` : generatedText;
    });

    setNewRoomArea("");
    setNewRoomStart("101");
    setNewRoomCount(10);
    setLastAction(`${count} habitaciones añadidas al catálogo para ${area}. Puedes añadir otro edificio o pulsar Guardar catálogo para aplicar.`);
  }

  function clearRoomCatalogText() {
    setRoomCatalogText("");
    setLastAction("Catálogo en edición vaciado. Pulsa Guardar catálogo solo si quieres aplicar el cambio.");
  }

  const activeTabLabel = tabs.find(([id]) => id === active)?.[1] || "Dirección";
  const connectionTone = connection.status === "online" ? "green" : connection.status === "error" ? "red" : connection.status === "loading" ? "amber" : "slate";
  const connectionIcon = connection.status === "online" ? "cloud" : "offline";

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#3f7895] to-slate-800 p-2 text-white shadow-sm sm:p-3">
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
                <button key={id} onClick={() => goToTab(id)} className={cls("flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold", active === id ? "bg-[#2f5f7a] text-white shadow-sm" : "bg-slate-100 text-slate-700")}>
                  <Icon name={icon} size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-4 sm:py-6 lg:grid-cols-[250px_1fr]">
        <aside className="hidden rounded-3xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)] lg:sticky lg:top-24 lg:block lg:h-fit">
          <nav className="space-y-1">
            {tabs.map(([id, label, icon]) => (
              <button key={id} onClick={() => goToTab(id)} className={cls("flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition", active === id ? "bg-[#2f5f7a] text-white shadow-sm" : "text-slate-600 hover:bg-sky-50 hover:text-sky-900")}>
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
                  {lastAction && <p className="mt-1 font-semibold text-slate-700">Última acción: {lastAction}</p>}
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
                            <div className="h-full rounded-full bg-[#2f5f7a]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Card>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl">Habitaciones disponibles</h2>
                      <p className="text-sm text-slate-500">Habitaciones listas para vender según el último estado guardado.</p>
                    </div>
                    <button className={buttonLight} type="button" onClick={() => { setChecklistAreaModal(null); goToTab("rooms"); }}><Icon name="bed" size={18} /> Ver habitaciones</button>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(groupedAvailableRooms).map(([area, areaRooms]) => (
                      <div key={area} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="font-semibold text-emerald-900">{area}</p>
                          <Badge tone="green">{areaRooms.length} disponibles</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {areaRooms.slice(0, 16).map((room) => <Badge key={room.id} tone="green">{room.number}</Badge>)}
                          {areaRooms.length > 16 && <Badge tone="slate">+{areaRooms.length - 16} más</Badge>}
                        </div>
                      </div>
                    ))}
                    {availableRooms.length === 0 && <p className="text-sm text-slate-500">No hay habitaciones disponibles según el estado actual.</p>}
                  </div>
                  {blockedRooms.length > 0 && (
                    <div className="mt-4 space-y-2 text-sm text-red-700">
                      <b>Bloqueadas / fuera de servicio:</b>
                      {Object.entries(groupedBlockedRooms).map(([area, areaRooms]) => (
                        <p key={area}><span className="font-semibold">{area}:</span> {areaRooms.map((room) => room.number).join(", ")}</p>
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl">Incidencias abiertas</h2>
                      <p className="text-sm text-slate-500">Control rápido para dirección.</p>
                    </div>
                    <button className={buttonLight} type="button" onClick={() => goToTab("incidents")}><Icon name="alert" size={18} /> Ver incidencias</button>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(openIncidentItems.reduce((groups, incident) => {
                      const area = getIncidentArea(incident.room);
                      if (!groups[area]) groups[area] = [];
                      groups[area].push(incident);
                      return groups;
                    }, {})).map(([area, areaIncidents]) => (
                      <div key={area} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800">{area}</p>
                          <Badge tone="slate">{areaIncidents.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {areaIncidents.slice(0, 4).map((incident) => (
                            <button key={incident.id} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm hover:bg-slate-50" type="button" onClick={() => viewIncident(incident)}>
                              <div className="mb-1 flex flex-wrap items-center gap-2"><Badge tone={incident.priority === "Alta" || incident.priority === "Urgente" ? "red" : "amber"}>{incident.priority}</Badge><span className="font-semibold">{incident.room === "General" ? "General" : incident.room}</span><span className="text-slate-500">{incident.type}</span></div>
                              <p className="line-clamp-2 text-slate-600">{incident.text}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {openIncidentItems.length === 0 && <p className="text-sm text-slate-500">No hay incidencias abiertas.</p>}
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
                  <div className="h-full rounded-full bg-[#2f5f7a]" style={{ width: `${taskProgress}%` }} />
                </div>
              </Card>
            </div>
          )}

          {active === "daily" && (
            <form onSubmit={saveReport} className="space-y-5 sm:space-y-6">
              <Card>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">{editingReportId ? "Editar parte diario" : "Parte diario de recepción"}</h2>
                    <p className="text-sm text-slate-500">{editingReportId ? "Corrige los datos necesarios y guarda los cambios." : "Formulario de cierre de turno para informar a dirección."}</p>
                  </div>
                  {editingReportId && <Badge tone="amber">Modo edición</Badge>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <Field label="Fecha"><input className={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
                  <Field label="Responsable"><select className={inputStyle} value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}><option value="">Seleccionar responsable</option>{employeeOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field>
                  <div className="sm:col-span-2 xl:col-span-1">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-3 flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700">Horario del turno</span>
                        <span className="text-xs text-slate-500">Selecciona inicio y fin. Puedes activar turno partido.</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Inicio mañana"><input className={inputStyle} type="time" value={form.shiftMorningStart || ""} onChange={(e) => setForm({ ...form, shiftMorningStart: e.target.value })} /></Field>
                        <Field label="Fin mañana"><input className={inputStyle} type="time" value={form.shiftMorningEnd || ""} onChange={(e) => setForm({ ...form, shiftMorningEnd: e.target.value })} /></Field>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" className="h-4 w-4" checked={Boolean(form.splitShift)} onChange={(e) => setForm({ ...form, splitShift: e.target.checked, shiftAfternoonStart: e.target.checked ? form.shiftAfternoonStart : "", shiftAfternoonEnd: e.target.checked ? form.shiftAfternoonEnd : "" })} />
                        Turno partido / tarde
                      </label>
                      {form.splitShift && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <Field label="Inicio tarde"><input className={inputStyle} type="time" value={form.shiftAfternoonStart || ""} onChange={(e) => setForm({ ...form, shiftAfternoonStart: e.target.value })} /></Field>
                          <Field label="Fin tarde"><input className={inputStyle} type="time" value={form.shiftAfternoonEnd || ""} onChange={(e) => setForm({ ...form, shiftAfternoonEnd: e.target.value })} /></Field>
                        </div>
                      )}
                      <div className="mt-3 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs text-sky-900">
                        <b>Horario guardado:</b> {buildShiftLabel(form) || "No indicado"}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Contexto de habitaciones por edificio</h3>
                    <p className="text-sm text-slate-500">Referencia del estado operativo actual mientras se rellena el parte.</p>
                  </div>
                  <button className={buttonLight} type="button" onClick={() => { setChecklistAreaModal(null); goToTab("rooms"); }}><Icon name="bed" size={18} /> Ver habitaciones</button>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {roomAreaSummaries.map((summary) => (
                    <button key={summary.area} type="button" onClick={() => setChecklistAreaModal(summary.area)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-white hover:shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="font-bold">{summary.area}</h4>
                        <Badge tone="slate">{summary.total} habitaciones</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="green">{summary.available} disponibles</Badge>
                        <Badge tone="slate">{summary.occupied} ocupadas</Badge>
                        <Badge tone="red">{summary.blocked} bloqueadas/FDS</Badge>
                        <Badge tone="amber">{summary.dirty} sucias</Badge>
                        <Badge tone="amber">{summary.pending} pendientes</Badge>
                      </div>
                    </button>
                  ))}
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
                    <Field key={key} label={label}>
                      <input className={inputStyle} type="number" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    </Field>
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
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button className={cls(buttonDark, "w-full sm:w-auto")}>
                    <Icon name="save" size={18} /> {editingReportId ? "Actualizar parte diario" : "Guardar parte diario"}
                  </button>
                  {editingReportId && (
                    <button className={cls(buttonLight, "w-full sm:w-auto")} type="button" onClick={cancelEditReport}>
                      <Icon name="cancel" size={18} /> Cancelar edición
                    </button>
                  )}
                </div>
              </Card>
            </form>
          )}

          {active === "tasks" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Checklists creados para esta fecha</h3>
                    <p className="text-sm text-slate-500">Primero elige qué edificio quieres crear o editar. El checklist general es opcional para tareas de todo el hotel.</p>
                  </div>
                  <Badge tone={allChecklistAreasClosedForDate ? "green" : "amber"}>{buildingChecklistAreasCreatedForDate.length}/{buildingChecklistAreaOptions.length} edificios creados</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {buildingChecklistAreaOptions.map((area) => {
                    const existing = findChecklistSignoffFor(checklistDate, area, checklistHistory);
                    return (
                      <div key={area} className={cls("rounded-2xl border p-4", existing ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50")}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h4 className="font-bold">{area}</h4>
                          <Badge tone={existing ? "green" : "slate"}>{existing ? `${existing.completed_count}/${existing.total_count}` : "Pendiente"}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{existing ? `Cerrado por ${existing.responsible || "responsable no indicado"}` : "Todavía no creado para esta fecha."}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          {existing ? (
                            <>
                              <button className={buttonLight} type="button" onClick={() => viewChecklist(existing)}><Icon name="view" size={16} /> Ver</button>
                              <button className={buttonLight} type="button" onClick={() => editChecklist(existing)}><Icon name="edit" size={16} /> Editar</button>
                            </>
                          ) : (
                            <button className={cls(buttonDark, "col-span-2 sm:col-span-1")} type="button" onClick={() => { setChecklistArea(area); setChecklistSignoff(null); setChecklistResponsible(""); setChecklistNotes(""); setLastAction(`Preparando checklist para ${formatDateEs(checklistDate)} · ${area}`); window.setTimeout(() => document.getElementById("checklist-top-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}><Icon name="plus" size={16} /> Crear aquí</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-bold text-sky-950">Checklist general del hotel</h4>
                      <p className="text-sm text-sky-900">Opcional: úsalo para tareas globales que no pertenecen a un edificio concreto.</p>
                    </div>
                    {findChecklistSignoffFor(checklistDate, "General", checklistHistory) ? <Badge tone="green">Creado</Badge> : <Badge tone="slate">Opcional</Badge>}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {findChecklistSignoffFor(checklistDate, "General", checklistHistory) ? (
                      <>
                        <button className={buttonLight} type="button" onClick={() => viewChecklist(findChecklistSignoffFor(checklistDate, "General", checklistHistory))}><Icon name="view" size={16} /> Ver general</button>
                        <button className={buttonLight} type="button" onClick={() => editChecklist(findChecklistSignoffFor(checklistDate, "General", checklistHistory))}><Icon name="edit" size={16} /> Editar general</button>
                      </>
                    ) : (
                      <button className={buttonLight} type="button" onClick={() => { setChecklistArea("General"); setChecklistSignoff(null); setChecklistResponsible(""); setChecklistNotes(""); window.setTimeout(() => document.getElementById("checklist-top-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}><Icon name="plus" size={16} /> Crear checklist general</button>
                    )}
                  </div>
                </div>
              </Card>

              <Card id="checklist-top-card">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Checklist operativo diario</h2>
                    <p className="text-sm text-slate-500">Debe quedar cerrado cada día para demostrar qué tareas se realizaron y quién las validó.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[860px] xl:grid-cols-4">
                    <Field label="Fecha del checklist"><input className={inputStyle} type="date" value={checklistDate} onChange={(e) => loadChecklistForDate(e.target.value)} /></Field>
                    <Field label="Responsable"><select className={inputStyle} value={checklistResponsible} onChange={(e) => setChecklistResponsible(e.target.value)} disabled={Boolean(checklistSignoff) && !editingChecklistId}><option value="">Seleccionar responsable</option>{employeeOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field>
                    <Field label="Edificio / estancia">
                      <select
                        className={inputStyle}
                        value={checklistArea}
                        onChange={(e) => {
                          const area = e.target.value;
                          const existing = findChecklistSignoffFor(checklistDate, area, checklistHistory);
                          setChecklistArea(area);
                          setChecklistSignoff(existing);
                          if (existing) {
                            setChecklistResponsible(existing.responsible || "");
                            setChecklistNotes(cleanChecklistNotes(existing.notes));
                            setLastAction(`Ya existe checklist para ${formatDateEs(checklistDate)} · ${area}. Puedes editarlo desde el histórico.`);
                          } else {
                            setChecklistResponsible("");
                            setChecklistNotes("");
                            setLastAction(`Preparando checklist para ${formatDateEs(checklistDate)} · ${area}`);
                          }
                        }}
                        disabled={Boolean(checklistSignoff) && !editingChecklistId}
                      >
                        {checklistAreaOptions.map((area) => {
                          const existing = findChecklistSignoffFor(checklistDate, area, checklistHistory);
                          const isCurrent = area === checklistArea;
                          return <option key={area} value={area} disabled={Boolean(existing) && !isCurrent && !editingChecklistId}>{area}{existing ? " · ya creado" : ""}</option>;
                        })}
                      </select>
                    </Field>
                    <Field label="Estado"><div className="flex min-h-10 items-center gap-2"><Badge tone={editingChecklistId ? "amber" : checklistSignoff ? checklistSignoff.status === "Correcto" ? "green" : "amber" : "blue"}>{editingChecklistId ? "Editando cierre" : checklistSignoff ? checklistSignoff.status : "Abierto"}</Badge></div></Field>
                    <button className={buttonLight} type="button" onClick={createTodayChecklist}>
                      <Icon name="calendar" size={18} /> Cargar hoy
                    </button>
                    {checklistSignoff && !editingChecklistId && (
                      <button className={buttonLight} type="button" onClick={createNextChecklist}>
                        <Icon name="plus" size={18} /> Crear checklist siguiente día
                      </button>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 font-bold">Histórico rápido de checklist</h3>
                <p className="mb-4 text-sm text-slate-500">Vista rápida para comprobar si ya está hecho el checklist de hoy, mañana o fechas recientes sin bajar hasta el final.</p>
                <div className="mb-4 grid gap-3">
                  {Object.entries(groupedChecklistHistory).map(([area, items]) => (
                    <div key={area} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="font-bold">{area}</h4>
                          <p className="text-sm text-slate-500">{items.length} cierres registrados</p>
                        </div>
                        <Badge tone="slate">Último: {items[0] ? `${items[0].completed_count}/${items[0].total_count}` : "-"}</Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {items.slice(0, 6).map((item) => (
                          <button key={item.id} type="button" onClick={() => viewChecklist(item)} className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="font-semibold">{formatDateEs(item.signoff_date)}</span>
                              <Badge tone={item.status === "Correcto" ? "green" : "amber"}>{item.completed_count}/{item.total_count}</Badge>
                            </div>
                            <p className="text-xs text-slate-500">{item.responsible || "Responsable no indicado"}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{cleanChecklistNotes(item.notes) || "Sin observaciones."}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {checklistHistory.length === 0 && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay cierres de checklist registrados.</p>}
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Contexto por edificio / estancia</h3>
                    <p className="text-sm text-slate-500">Resumen operativo para validar checklist con visión por edificio.</p>
                  </div>
                  <button className={buttonLight} type="button" onClick={() => { setChecklistAreaModal(null); goToTab("rooms"); }}><Icon name="bed" size={18} /> Ver habitaciones</button>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {roomAreaSummaries.map((summary) => (
                    <button key={summary.area} type="button" onClick={() => setChecklistAreaModal(summary.area)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-white hover:shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="font-bold">{summary.area}</h4>
                        <Badge tone="slate">{summary.total} hab.</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="green">{summary.available} disp.</Badge>
                        <Badge tone="slate">{summary.occupied} ocup.</Badge>
                        <Badge tone="red">{summary.blocked} bloq./FDS</Badge>
                        <Badge tone="amber">{summary.dirty} sucias</Badge>
                        <Badge tone="amber">{summary.pending} pendientes</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Progreso del día</h3>
                    <p className="text-sm text-slate-500">{tasksDone}/{tasks.length} tareas completadas para el {formatDateEs(checklistDate)}.</p>
                  </div>
                  <Badge tone={taskProgress === 100 ? "green" : "amber"}>{taskProgress}% completado</Badge>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#2f5f7a]" style={{ width: `${taskProgress}%` }} />
                </div>
                {checklistSignoff && (
                  <div className={cls("mt-4 rounded-2xl border p-4 text-sm", editingChecklistId ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                    <b><Icon name={editingChecklistId ? "edit" : "lock"} size={16} /> {editingChecklistId ? "Editando cierre." : "Checklist cerrado."}</b> {editingChecklistId ? "Puedes corregir responsable, observaciones y checks antes de actualizar el cierre." : `Validado por ${checklistSignoff.responsible || "No indicado"}. Para cambios posteriores, registra una incidencia o nota de seguimiento.`}
                  </div>
                )}
              </Card>

              {["Apertura", "Durante turno", "Cierre"].map((area) => (
                <Card key={area}>
                  <h3 className="mb-3 font-bold">{area}</h3>
                  <div className="space-y-2">
                    {tasks.filter((task) => task.area === area).map((task) => (
                      <label key={task.id} className={cls("flex items-start gap-3 rounded-2xl p-3 text-sm", checklistSignoff && !editingChecklistId ? "bg-slate-100 cursor-not-allowed" : editingChecklistId ? "bg-amber-50 cursor-pointer" : "bg-slate-50 cursor-pointer")}>
                        <input className="mt-1 h-5 w-5" type="checkbox" checked={task.done} disabled={Boolean(checklistSignoff) && !editingChecklistId} onChange={(e) => updateTaskDone(task.id, e.target.checked)} />
                        <span className={task.done ? "text-slate-400 line-through" : "text-slate-800"}>{task.title}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              ))}

              <Card id="checklist-close-card">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">{editingChecklistId ? "Editar cierre de checklist" : "Cierre y aceptación del checklist"}</h3>
                    <p className="text-sm text-slate-500">{editingChecklistId ? "Puedes corregir responsable, observaciones y checks del cierre. Úsalo solo si el checklist se cerró con algún dato incorrecto." : "Usa este cierre para dejar constancia diaria de que recepción revisó la operativa."}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button className={buttonDark} type="button" onClick={acceptChecklist} disabled={Boolean(checklistSignoff) && !editingChecklistId}>
                      <Icon name="check" size={18} /> {editingChecklistId ? "Actualizar cierre" : checklistSignoff ? "Checklist cerrado" : taskProgress === 100 ? "Aceptar: todo correcto" : "Cerrar con pendientes"}
                    </button>
                    {checklistSignoff && !editingChecklistId && (
                      <button className={buttonLight} type="button" onClick={createNextChecklist}>
                        <Icon name="plus" size={18} /> Nuevo checklist
                      </button>
                    )}
                    {editingChecklistId && (
                      <button className={buttonLight} type="button" onClick={cancelEditChecklist}>
                        <Icon name="cancel" size={18} /> Cancelar edición
                      </button>
                    )}
                  </div>
                </div>
                <Field label="Observaciones de cierre"><textarea className={inputStyle} rows={3} value={checklistNotes} onChange={(e) => setChecklistNotes(e.target.value)} disabled={Boolean(checklistSignoff) && !editingChecklistId} placeholder="Ej.: queda pendiente confirmar late check-out de la 204, revisar cobro de Booking, limpieza avisada..." /></Field>
                {taskProgress < 100 && !checklistSignoff && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <b>Hay tareas pendientes.</b> Puedes cerrar el checklist, pero quedará registrado como “Cerrado con pendientes”.
                  </div>
                )}
              </Card>

              <Card>
                {viewingChecklist && (
                  <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-lg font-bold">Cierre de checklist del {formatDateEs(viewingChecklist.signoff_date)}</h4>
                        <p className="text-sm text-slate-600">Vista de solo lectura del cierre operativo.</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button className={buttonLight} type="button" onClick={() => printChecklist(viewingChecklist)}><Icon name="print" size={18} /> Imprimir</button>
                        <button className={buttonLight} type="button" onClick={() => setViewingChecklist(null)}><Icon name="cancel" size={18} /> Cerrar vista</button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Responsable</p><p className="font-bold">{viewingChecklist.responsible || "-"}</p></div>
                      <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Estado</p><p className="font-bold">{viewingChecklist.status}</p></div>
                      <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Progreso</p><p className="font-bold">{viewingChecklist.completed_count}/{viewingChecklist.total_count}</p></div>
                      <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Creado</p><p className="font-bold">{formatDateTimeEs(viewingChecklist.created_at)}</p></div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-white p-4"><p className="text-sm font-bold">Observaciones</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingChecklist.notes || "Sin observaciones."}</p></div>
                  </div>
                )}

                <h3 className="mb-3 font-bold">Histórico completo de cierres de checklist</h3>
                <p className="mb-4 text-sm text-slate-500">Listado completo para consultar, editar, imprimir o borrar cierres antiguos.</p>
                <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-b bg-slate-50 text-slate-500"><tr><th className="px-3 py-3">Fecha</th><th>Edificio</th><th>Responsable</th><th>Estado</th><th>Progreso</th><th>Observaciones</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {checklistHistory.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-3">{formatDateEs(item.signoff_date)}</td><td>{getChecklistArea(item)}</td><td>{item.responsible || "-"}</td><td><Badge tone={item.status === "Correcto" ? "green" : "amber"}>{item.status}</Badge></td><td>{item.completed_count}/{item.total_count}</td><td className="max-w-md truncate pr-3">{cleanChecklistNotes(item.notes) || "-"}</td><td className="pr-3"><div className="flex flex-wrap gap-2"><button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => viewChecklist(item)}><Icon name="view" size={14} /> Ver</button><button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => editChecklist(item)}><Icon name="edit" size={14} /> Editar</button><button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => printChecklist(item)}><Icon name="print" size={14} /> Imprimir</button><button className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100" type="button" onClick={() => askDeleteChecklist(item)}><Icon name="trash" size={14} /> Borrar</button></div></td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:hidden">
                  {checklistHistory.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">Checklist</p>
                          <p className="font-bold">{formatDateEs(item.signoff_date)}</p>
                        </div>
                        <Badge tone={item.status === "Correcto" ? "green" : "amber"}>{item.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-600"><b>Responsable:</b> {item.responsible || "-"}</p>
                      <p className="text-sm text-slate-600"><b>Progreso:</b> {item.completed_count}/{item.total_count}</p>
                      <p className="text-sm text-slate-600"><b>Edificio:</b> {getChecklistArea(item)}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{cleanChecklistNotes(item.notes) || "Sin observaciones."}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" type="button" onClick={() => viewChecklist(item)}>Ver</button>
                        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" type="button" onClick={() => editChecklist(item)}>Editar</button>
                        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" type="button" onClick={() => printChecklist(item)}>Imprimir</button>
                        <button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700" type="button" onClick={() => askDeleteChecklist(item)}>Borrar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {active === "incidents" && (
            <div className="space-y-5 sm:space-y-6">
              <Card id="incident-form-card">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">{editingIncidentId ? "Editar incidencia" : "Registrar incidencia"}</h2>
                    <p className="text-sm text-slate-500">{editingIncidentId ? "Corrige los datos y actualiza la incidencia." : "Añade incidencias de cliente, limpieza, mantenimiento, pagos, OTAs o Cloudbeds."}</p>
                  </div>
                  {editingIncidentId && <Badge tone="amber">Modo edición</Badge>}
                </div>
                <form onSubmit={addIncident} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  <Field label="Edificio / estancia">
                    <select
                      className={inputStyle}
                      value={incidentArea}
                      onChange={(e) => {
                        const area = e.target.value;
                        setIncidentArea(area);
                        setIncidentForm({ ...incidentForm, room: area ? "" : "General" });
                      }}
                    >
                      <option value="">General / sin habitación</option>
                      {Object.keys(groupedRooms).map((area) => <option key={area} value={area}>{area}</option>)}
                    </select>
                  </Field>
                  <Field label="Habitación">
                    <select
                      className={inputStyle}
                      value={incidentForm.room}
                      onChange={(e) => setIncidentForm({ ...incidentForm, room: e.target.value })}
                      disabled={!incidentArea}
                    >
                      <option value="">{incidentArea ? "Seleccionar habitación" : "Sin habitación"}</option>
                      {incidentAreaRooms.map((room) => {
                        const label = room.label || `${room.area} · ${room.number}`;
                        return <option key={room.id} value={label}>{room.number}</option>;
                      })}
                    </select>
                  </Field>
                  <Field label="Tipo"><select className={inputStyle} value={incidentForm.type} onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}><option>Cliente</option><option>Mantenimiento</option><option>Limpieza</option><option>Pago</option><option>OTA</option><option>Cloudbeds</option></select></Field>
                  <Field label="Prioridad"><select className={inputStyle} value={incidentForm.priority} onChange={(e) => setIncidentForm({ ...incidentForm, priority: e.target.value })}><option>Baja</option><option>Media</option><option>Alta</option><option>Urgente</option></select></Field>
                  <Field label="Estado"><select className={inputStyle} value={incidentForm.status} onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value })}><option>Abierta</option><option>Seguimiento</option><option>Cerrada</option></select></Field>
                  <Field label="Responsable"><select className={inputStyle} value={incidentForm.owner} onChange={(e) => setIncidentForm({ ...incidentForm, owner: e.target.value })}>{employeeOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field>
                  <div className="sm:col-span-2 xl:col-span-6"><Field label="Descripción"><input className={inputStyle} value={incidentForm.text} onChange={(e) => setIncidentForm({ ...incidentForm, text: e.target.value })} /></Field></div>
                  <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row xl:col-span-6">
                    <button className={cls(buttonDark, "w-full sm:w-auto")}><Icon name="save" size={18} /> {editingIncidentId ? "Actualizar incidencia" : "Añadir incidencia"}</button>
                    {editingIncidentId && (
                      <button className={cls(buttonLight, "w-full sm:w-auto")} type="button" onClick={cancelEditIncident}>
                        <Icon name="cancel" size={18} /> Cancelar edición
                      </button>
                    )}
                  </div>
                </form>
              </Card>

              {viewingIncident && (
                <Card className="border-blue-200 bg-blue-50">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Incidencia habitación {viewingIncident.room}</h3>
                      <p className="text-sm text-slate-600">Vista de solo lectura. Para modificar datos usa “Editar”.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button className={buttonLight} type="button" onClick={() => printIncident(viewingIncident)}><Icon name="print" size={18} /> Imprimir</button>
                      <button className={buttonLight} type="button" onClick={() => setViewingIncident(null)}>
                        <Icon name="cancel" size={18} /> Cerrar vista
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Fecha</p><p className="font-bold">{formatDateEs(viewingIncident.date)}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Tipo</p><p className="font-bold">{viewingIncident.type}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Prioridad</p><p className="font-bold">{viewingIncident.priority}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Estado</p><p className="font-bold">{viewingIncident.status}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Responsable</p><p className="font-bold">{viewingIncident.owner || "-"}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Habitación</p><p className="font-bold">{viewingIncident.room}</p></div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="text-sm font-bold">Descripción</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingIncident.text || "Sin descripción."}</p>
                  </div>
                </Card>
              )}

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Filtrar incidencias</h3>
                    <p className="text-sm text-slate-500">Mostrando {filteredIncidents.length} de {incidents.length} incidencias.</p>
                  </div>
                  <button className={buttonLight} type="button" onClick={() => setIncidentFilters({ query: "", status: "Todos", type: "Todos", priority: "Todas" })}>
                    <Icon name="cancel" size={18} /> Limpiar filtros
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Buscar"><input className={inputStyle} placeholder="Habitación, responsable o texto" value={incidentFilters.query} onChange={(e) => setIncidentFilters({ ...incidentFilters, query: e.target.value })} /></Field>
                  <Field label="Estado"><select className={inputStyle} value={incidentFilters.status} onChange={(e) => setIncidentFilters({ ...incidentFilters, status: e.target.value })}><option>Todos</option><option>Abierta</option><option>Seguimiento</option><option>Cerrada</option></select></Field>
                  <Field label="Tipo"><select className={inputStyle} value={incidentFilters.type} onChange={(e) => setIncidentFilters({ ...incidentFilters, type: e.target.value })}><option>Todos</option><option>Cliente</option><option>Mantenimiento</option><option>Limpieza</option><option>Pago</option><option>OTA</option><option>Cloudbeds</option></select></Field>
                  <Field label="Prioridad"><select className={inputStyle} value={incidentFilters.priority} onChange={(e) => setIncidentFilters({ ...incidentFilters, priority: e.target.value })}><option>Todas</option><option>Baja</option><option>Media</option><option>Alta</option><option>Urgente</option></select></Field>
                </div>
              </Card>

              <div className="grid gap-5">
                {Object.entries(groupedIncidents).map(([area, areaIncidents]) => (
                  <div key={area} className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold">{area}</h4>
                      <Badge tone="slate">{areaIncidents.length} incidencias</Badge>
                    </div>
                    {areaIncidents.map((i) => (
                  <Card key={i.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone={i.priority === "Alta" || i.priority === "Urgente" ? "red" : i.priority === "Media" ? "amber" : "slate"}>{i.priority}</Badge>
                        <Badge tone="blue">{i.type}</Badge>
                        <span className="text-sm text-slate-500">{i.room === "General" ? "General" : i.room} · {formatDateEs(i.date)} · {i.owner}</span>
                      </div>
                      <p className="text-sm font-medium sm:text-base">{i.text}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" value={i.status} onChange={(e) => updateIncidentStatus(i.id, e.target.value)}>
                        <option>Abierta</option><option>Seguimiento</option><option>Cerrada</option>
                      </select>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => viewIncident(i)}>
                          <Icon name="view" size={14} /> Ver
                        </button>
                        <button className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => editIncident(i)}>
                          <Icon name="edit" size={14} /> Editar
                        </button>
                        <button className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => printIncident(i)}>
                          <Icon name="print" size={14} /> Imprimir
                        </button>
                        <button className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100" type="button" onClick={() => askDeleteIncident(i)}>
                          <Icon name="trash" size={14} /> Borrar
                        </button>
                      </div>
                    </div>
                  </Card>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === "rooms" && (
            <div className="space-y-5 sm:space-y-6">
              <Card id="rooms-top-card">
                <h2 className="text-lg font-bold sm:text-xl">Estado de habitaciones</h2>
                <p className="mb-5 text-sm text-slate-500">Control diario para recepción, limpieza y mantenimiento.</p>
                <div className="mb-5 grid gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto_auto] xl:items-end">
                  <Field label="Fecha del estado"><input className={inputStyle} type="date" value={roomDate} onChange={(e) => openRoomDate(e.target.value)} /></Field>
                  <button className={buttonLight} type="button" onClick={goPreviousRoomDay}><Icon name="calendar" size={18} /> Día anterior</button>
                  <button className={buttonLight} type="button" onClick={() => openRoomDate(todayIso())}><Icon name="calendar" size={18} /> Hoy</button>
                  <button className={buttonLight} type="button" onClick={goNextRoomDay}><Icon name="calendar" size={18} /> Día siguiente</button>
                  <button className={buttonLight} type="button" onClick={createNextRoomDay}><Icon name="plus" size={18} /> Crear copia mañana</button>
                  <button className={buttonDark} type="button" onClick={saveRooms}><Icon name="save" size={18} /> Guardar estado</button>
                </div>
                <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                  <b>Calendario:</b> puedes escoger cualquier fecha con el selector. “Día siguiente” navega al día siguiente guardado o vacío. “Crear copia mañana” crea una nueva foto copiando el estado actual para ajustarla y guardarla.
                </div>
                <div className="mb-5 flex flex-wrap gap-2">
                  <Badge tone="blue">Foto diaria: {formatDateEs(roomDate)}</Badge>
                  <Badge tone="slate">{roomInventory.length} habitaciones</Badge>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {roomAreaSummaries.map((summary) => (
                    <div key={summary.area} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-bold">{summary.area}</h3>
                          <p className="text-xs text-slate-500">Resumen diario por edificio / estancia</p>
                        </div>
                        <Badge tone="slate">{summary.total} habitaciones</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Disponibles</p><p className="text-xl font-bold text-emerald-700">{summary.available}</p></div>
                        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Ocupadas</p><p className="text-xl font-bold text-slate-700">{summary.occupied}</p></div>
                        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Bloq./FDS</p><p className="text-xl font-bold text-red-700">{summary.blocked}</p></div>
                        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Sucias</p><p className="text-xl font-bold text-amber-700">{summary.dirty}</p></div>
                        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Pendientes</p><p className="text-xl font-bold text-amber-700">{summary.pending}</p></div>
                        <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Vendibles</p><p className="text-xl font-bold text-[#2f5f7a]">{Math.max(summary.total - summary.occupied - summary.blocked, 0)}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">Estos totales se calculan automáticamente a partir del estado individual de cada habitación y se separan por edificio o estancia.</p>
              </Card>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat icon="bed" label="Total disponibles" value={availableRooms.length} hint="Habitaciones vendibles hoy" />
                <Stat icon="wrench" label="Total bloqueadas/FDS" value={blockedRooms.length} hint="No vendibles" />
                <Stat icon="hotel" label="Edificios/estancias" value={roomAreaSummaries.length} hint="Configurados en catálogo" />
              </div>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Mapa operativo de habitaciones</h3>
                    <p className="text-sm text-slate-500">Vista generada para el día {formatDateEs(roomDate)} usando el catálogo fijo configurado.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="green">{availableRooms.length} disponibles</Badge>
                    <Badge tone="red">{blockedRooms.length} bloqueadas/FDS</Badge>
                  </div>
                </div>

                <div className="space-y-6">
                  {Object.entries(groupedRooms).map(([area, areaRooms]) => {
                    const summary = summarizeAreaRooms(areaRooms);
                    return (
                      <div key={area} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h4 className="text-lg font-bold">{area}</h4>
                            <p className="text-sm text-slate-500">{summary.total} habitaciones configuradas</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge tone="green">{summary.available} disponibles</Badge>
                            <Badge tone="slate">{summary.occupied} ocupadas</Badge>
                            <Badge tone="red">{summary.blocked} bloqueadas/FDS</Badge>
                            <Badge tone="amber">{summary.dirty} sucias</Badge>
                            <Badge tone="amber">{summary.pending} pendientes</Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {areaRooms.map((room) => (
                            <div key={room.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="font-bold">{room.label || `Hab. ${room.number}`}</span>
                                <Badge tone={room.tone}>{room.status}</Badge>
                              </div>
                              <Field label="Estado de la habitación">
                                <select
                                  className={inputStyle}
                                  value={room.status}
                                  onChange={(e) => {
                                    const next = roomInventory.map((item) => {
                                      const sameRoom = item.id === room.id || item.label === room.label;
                                      return sameRoom ? { ...item, status: e.target.value } : item;
                                    });
                                    setRoomDetails(next);
                                    setRoomDetailsByDate((current) => ({ ...current, [roomDate]: next }));
                                    setRooms(summarizeRoomDetails(next));
                                  }}
                                >
                                  {roomStatusOptions.map((status) => <option key={status}>{status}</option>)}
                                </select>
                              </Field>
                              <p className="mt-2 text-xs text-slate-500">{room.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {active === "reports" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Resumen rápido para dirección</h2>
                    <p className="text-sm text-slate-500">Generado automáticamente con el último parte diario, habitaciones actuales e incidencias abiertas.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button className={buttonDark} onClick={copyReport} type="button"><Icon name="copy" size={18} /> {copied ? "Copiado" : "Copiar resumen"}</button>
                    <button className={buttonLight} onClick={printSummary} type="button"><Icon name="print" size={18} /> Imprimir</button>
                  </div>
                </div>
                <textarea className="h-96 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 font-mono text-xs sm:text-sm" readOnly value={reportText} />
              </Card>

              {viewingReport && (
                <Card className="border-blue-200 bg-blue-50">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Parte diario del {formatDateEs(viewingReport.date)}</h3>
                      <p className="text-sm text-slate-600">Vista de solo lectura. Para modificar datos usa “Editar”.</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button className={buttonDark} type="button" onClick={() => copySingleReport(viewingReport)}>
                          <Icon name="copy" size={18} /> {copiedReportId === viewingReport.id ? "Copiado" : "Copiar este informe"}
                        </button>
                        <button className={buttonLight} type="button" onClick={() => printSingleReport(viewingReport)}>
                          <Icon name="print" size={18} /> Imprimir
                        </button>
                      </div>
                    </div>
                    <button className={buttonLight} type="button" onClick={() => setViewingReport(null)}>
                      <Icon name="cancel" size={18} /> Cerrar vista
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Responsable</p><p className="font-bold">{viewingReport.manager || "-"}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Horario</p><p className="font-bold">{viewingReport.shift || "-"}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Reservas nuevas</p><p className="font-bold">{viewingReport.newBookings}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Ingresos</p><p className="font-bold">{viewingReport.revenue}{hotel.currency}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Llegadas</p><p className="font-bold">{viewingReport.arrivalsDone}/{viewingReport.arrivalsExpected}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Salidas</p><p className="font-bold">{viewingReport.departuresDone}/{viewingReport.departuresExpected}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Cancelaciones</p><p className="font-bold">{viewingReport.cancellations}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">No-shows</p><p className="font-bold">{viewingReport.noShows}</p></div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-white p-4"><p className="text-sm font-bold">Incidencias del turno</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingReport.incidents || "Sin incidencias relevantes."}</p></div>
                    <div className="rounded-2xl bg-white p-4"><p className="text-sm font-bold">Observaciones</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingReport.notes || "Sin observaciones."}</p></div>
                    <div className="rounded-2xl bg-white p-4"><p className="text-sm font-bold">Recomendación</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingReport.recommendation || "Sin recomendación."}</p></div>
                  </div>
                </Card>
              )}

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Histórico de partes</h3>
                    <p className="text-sm text-slate-500">Mostrando {filteredReports.length} de {reports.length} partes.</p>
                  </div>
                  <button className={buttonLight} type="button" onClick={() => setReportFilters({ date: "", manager: "" })}>
                    <Icon name="cancel" size={18} /> Limpiar filtros
                  </button>
                </div>
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Filtrar por fecha"><input className={inputStyle} type="date" value={reportFilters.date} onChange={(e) => setReportFilters({ ...reportFilters, date: e.target.value })} /></Field>
                  <Field label="Buscar responsable"><input className={inputStyle} placeholder="Nombre del responsable" value={reportFilters.manager} onChange={(e) => setReportFilters({ ...reportFilters, manager: e.target.value })} /></Field>
                </div>
                <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
                  <table className="w-full min-w-[1040px] text-left text-sm">
                    <thead className="border-b bg-slate-50 text-slate-500"><tr><th className="px-3 py-3">Fecha</th><th>Responsable</th><th>Reservas</th><th>Ingresos</th><th>Pendiente</th><th>Recomendación</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {filteredReports.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="px-3 py-3">{formatDateEs(r.date)}</td><td>{r.manager || "-"}</td><td>{r.newBookings}</td><td>{r.revenue}{hotel.currency}</td><td>{r.pendingPayments}{hotel.currency}</td><td className="max-w-md truncate pr-3">{r.recommendation}</td><td className="pr-3"><div className="flex flex-wrap gap-2"><button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => viewReport(r)}><Icon name="view" size={14} /> Ver</button><button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => copySingleReport(r)}><Icon name="copy" size={14} /> {copiedReportId === r.id ? "Copiado" : "Copiar"}</button><button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => printSingleReport(r)}><Icon name="print" size={14} /> Imprimir</button><button className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50" type="button" onClick={() => editReport(r)}><Icon name="edit" size={14} /> Editar</button><button className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100" type="button" onClick={() => askDeleteReport(r)}><Icon name="trash" size={14} /> Borrar</button></div></td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:hidden">
                  {filteredReports.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">Parte diario</p>
                          <p className="font-bold">{formatDateEs(r.date)}</p>
                        </div>
                        <Badge tone="blue">{r.revenue}{hotel.currency}</Badge>
                      </div>
                      <p className="text-sm text-slate-600"><b>Responsable:</b> {r.manager || "-"}</p>
                      <p className="text-sm text-slate-600"><b>Reservas:</b> {r.newBookings} · <b>Pendiente:</b> {r.pendingPayments}{hotel.currency}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.recommendation || "Sin recomendación."}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" type="button" onClick={() => viewReport(r)}>Ver</button>
                        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" type="button" onClick={() => copySingleReport(r)}>{copiedReportId === r.id ? "Copiado" : "Copiar"}</button>
                        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" type="button" onClick={() => printSingleReport(r)}>Imprimir</button>
                        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold" type="button" onClick={() => editReport(r)}>Editar</button>
                        <button className="col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700" type="button" onClick={() => askDeleteReport(r)}>Borrar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {active === "setup" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <h2 className="text-lg font-bold sm:text-xl">Configuración del hotel</h2>
                <p className="mb-5 text-sm text-slate-500">El hotel se carga desde Supabase si está conectado.</p>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Badge tone="purple">Umbrales de revenue</Badge>
                  <button className={buttonDark} type="button" onClick={saveHotelConfig}><Icon name="save" size={18} /> Guardar configuración</button>
                </div>
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
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Catálogo fijo de habitaciones / estancias</h3>
                    <p className="text-sm text-slate-500">Define una habitación por línea con el formato: edificio o estancia; número. Permite numeraciones repetidas en edificios diferentes.</p>
                  </div>
                  <Badge tone="blue">{roomCatalog.length} habitaciones configuradas</Badge>
                </div>
                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-3 font-bold">Añadir edificio o estancia</h4>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_.6fr_.6fr_auto] xl:items-end">
                    <Field label="Nombre del edificio / estancia">
                      <input className={inputStyle} value={newRoomArea} onChange={(e) => setNewRoomArea(e.target.value)} placeholder="Añadir edificio/estancia" />
                    </Field>
                    <Field label="Número inicial">
                      <input className={inputStyle} value={newRoomStart} onChange={(e) => setNewRoomStart(e.target.value)} placeholder="Ej.: 101" />
                    </Field>
                    <Field label="Nº habitaciones">
                      <input className={inputStyle} type="number" min="1" value={newRoomCount} onChange={(e) => setNewRoomCount(e.target.value)} placeholder="Cantidad" />
                    </Field>
                    <button className={buttonDark} type="button" onClick={addRoomAreaToCatalog}><Icon name="plus" size={18} /> Añadir edificio/estancia</button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Ejemplo: “Anexo”, número inicial “101” y Nº habitaciones “10” generará Anexo · 101 hasta Anexo · 110.</p>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h5 className="font-bold">Edificios / estancias añadidas</h5>
                      <Badge tone="slate">{roomCatalogDraftSummary.reduce((total, item) => total + item.count, 0)} habitaciones en preparación</Badge>
                    </div>
                    {roomCatalogDraftSummary.length ? (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {roomCatalogDraftSummary.map((item) => (
                          <div key={item.area} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="font-semibold text-slate-800">{item.area}</p>
                            <p className="text-sm text-slate-500">{item.count} habitaciones configuradas</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Todavía no hay edificios o estancias añadidas en el catálogo.</p>
                    )}
                  </div>
                </div>

                <Field label="Habitaciones configuradas">
                  <textarea className={inputStyle} rows={10} value={roomCatalogText} onChange={(e) => setRoomCatalogText(e.target.value)} placeholder={[
                    "Edificio principal;101",
                    "Edificio principal;102",
                    "Anexo;101",
                    "Anexo;102",
                  ].join(String.fromCharCode(10))} />
                </Field>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button className={buttonDark} type="button" onClick={saveRoomCatalog}><Icon name="save" size={18} /> Guardar catálogo</button>
                  <button className={buttonLight} type="button" onClick={resetRoomCatalogFromCurrent}><Icon name="sync" size={18} /> Restaurar texto actual</button>
                  <button className={buttonLight} type="button" onClick={clearRoomCatalogText}><Icon name="trash" size={18} /> Vaciar texto</button>
                </div>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <b>Importante:</b> este catálogo es la configuración fija del hotel. Los estados diarios se gestionan después desde “Habitaciones”. Si una habitación está averiada, no se elimina del catálogo: se marca como “Fuera de servicio” en el día correspondiente.
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Plantilla del checklist</h3>
                    <p className="text-sm text-slate-500">Estas tareas se usarán al crear nuevos checklists. Puedes añadir, editar o borrar tareas sin afectar a cierres ya guardados.</p>
                  </div>
                  <Badge tone="blue">{checklistTemplate.length} tareas configuradas</Badge>
                </div>
                <div className="space-y-3">
                  {checklistTemplate.map((task, index) => (
                    <div key={task.id || index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[180px_1fr_auto] xl:items-end">
                      <Field label="Apartado">
                        <select className={inputStyle} value={task.area} onChange={(e) => updateChecklistTemplate(index, "area", e.target.value)}>
                          <option>Apertura</option>
                          <option>Durante turno</option>
                          <option>Cierre</option>
                        </select>
                      </Field>
                      <Field label="Tarea">
                        <input className={inputStyle} value={task.title} onChange={(e) => updateChecklistTemplate(index, "title", e.target.value)} />
                      </Field>
                      <button className={buttonLight} type="button" onClick={() => deleteChecklistTemplateTask(index)}><Icon name="trash" size={18} /> Borrar</button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button className={buttonDark} type="button" onClick={addChecklistTemplateTask}><Icon name="plus" size={18} /> Añadir tarea</button>
                  <button className={buttonLight} type="button" onClick={resetChecklistTemplate}><Icon name="sync" size={18} /> Restaurar 16 tareas base</button>
                </div>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <b>Importante:</b> los cambios en esta plantilla se aplican a checklists nuevos. Si ya hay tareas creadas para una fecha, se mantienen para respetar el histórico.
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Canales de venta</h3>
                    <p className="text-sm text-slate-500">Control básico de producción y comisiones por canal.</p>
                  </div>
                  <button className={buttonDark} type="button" onClick={saveChannels}><Icon name="save" size={18} /> Guardar canales</button>
                </div>
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

      <footer className="mx-auto max-w-7xl px-3 pb-6 sm:px-4">
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs text-slate-500 shadow-sm sm:flex-row">
          <span>Hotel Daily Control · Sistema interno de gestión operativa</span>
          <a href="https://vielhacomputer.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-slate-500 transition hover:text-[#2f5f7a]">
            <span>Desarrollado por</span>
            <img src="/vielha-computer-logo.gif" alt="Vielha Computer" className="h-7 w-auto max-w-[150px] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>Vielha Computer</span>
          </a>
        </div>
      </footer>

      {viewingReport && (
        <Modal
          title={`Parte diario del ${formatDateEs(viewingReport.date)}`}
          subtitle="Vista de solo lectura"
          onClose={() => setViewingReport(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className={buttonDark} type="button" onClick={() => copySingleReport(viewingReport)}><Icon name="copy" size={18} /> {copiedReportId === viewingReport.id ? "Copiado" : "Copiar informe"}</button>
              <button className={buttonLight} type="button" onClick={() => printSingleReport(viewingReport)}><Icon name="print" size={18} /> Imprimir</button>
              <button className={buttonLight} type="button" onClick={() => editReport(viewingReport)}><Icon name="edit" size={18} /> Editar</button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Responsable</p><p className="font-bold">{viewingReport.manager || "-"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Horario</p><p className="font-bold">{viewingReport.shift || "-"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Reservas</p><p className="font-bold">{viewingReport.newBookings}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Ingresos</p><p className="font-bold">{viewingReport.revenue}{hotel.currency}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Llegadas</p><p className="font-bold">{viewingReport.arrivalsDone}/{viewingReport.arrivalsExpected}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Salidas</p><p className="font-bold">{viewingReport.departuresDone}/{viewingReport.departuresExpected}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Cancelaciones</p><p className="font-bold">{viewingReport.cancellations}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">No-shows</p><p className="font-bold">{viewingReport.noShows}</p></div>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold">Incidencias</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingReport.incidents || "Sin incidencias relevantes."}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold">Observaciones</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingReport.notes || "Sin observaciones."}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold">Recomendación</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingReport.recommendation || "Sin recomendación."}</p></div>
          </div>
        </Modal>
      )}

      {checklistAreaModal && (
        <Modal
          title={`Checklist operativo · ${checklistAreaModal}`}
          subtitle={`Fecha del checklist: ${formatDateEs(checklistDate)} · Revisión por edificio / estancia`}
          onClose={() => setChecklistAreaModal(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className={buttonLight} type="button" onClick={() => { setChecklistAreaModal(null); goToTab("rooms"); }}><Icon name="bed" size={18} /> Ver habitaciones</button>
              <button className={buttonDark} type="button" onClick={() => setChecklistAreaModal(null)}><Icon name="check" size={18} /> Entendido</button>
            </div>
          }
        >
          {(() => {
            const areaRooms = groupedRooms[checklistAreaModal] || [];
            const summary = summarizeAreaRooms(areaRooms);
            return (
              <div className="space-y-4">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Edificio / estancia seleccionada</p>
                      <h4 className="mt-1 text-xl font-bold text-slate-900">{checklistAreaModal}</h4>
                      <p className="mt-1 text-sm text-slate-600">Checklist correspondiente al día {formatDateEs(checklistDate)}.</p>
                    </div>
                    <Badge tone="blue">{summary.total} habitaciones en este edificio</Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Habitaciones</p><p className="font-bold">{summary.total}</p></div>
                  <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Disponibles</p><p className="font-bold text-emerald-800">{summary.available}</p></div>
                  <div className="rounded-2xl bg-red-50 p-3"><p className="text-xs text-red-700">Bloqueadas/FDS</p><p className="font-bold text-red-800">{summary.blocked}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Ocupadas</p><p className="font-bold">{summary.occupied}</p></div>
                  <div className="rounded-2xl bg-amber-50 p-3"><p className="text-xs text-amber-700">Sucias</p><p className="font-bold text-amber-800">{summary.dirty}</p></div>
                  <div className="rounded-2xl bg-amber-50 p-3"><p className="text-xs text-amber-700">Pendientes</p><p className="font-bold text-amber-800">{summary.pending}</p></div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-3 font-bold">Puntos a validar en {checklistAreaModal}</h4>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p><b>{checklistAreaModal}:</b> comprobar limpieza y habitaciones pendientes.</p>
                    <p><b>{checklistAreaModal}:</b> revisar bloqueadas o fuera de servicio con mantenimiento.</p>
                    <p><b>{checklistAreaModal}:</b> confirmar que las disponibles están realmente vendibles.</p>
                    <p><b>{checklistAreaModal}:</b> registrar incidencias antes de cerrar el checklist general.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="font-bold">Habitaciones de {checklistAreaModal}</h4>
                    <p className="text-sm text-slate-500">Estado usado como referencia para este checklist.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {areaRooms.map((room) => (
                      <div key={room.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">{room.area || checklistAreaModal} · Hab. {room.number}</span>
                          <Badge tone={room.tone}>{room.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{room.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {viewingChecklist && (
        <Modal
          title={`Cierre de checklist del ${formatDateEs(viewingChecklist.signoff_date)}`}
          subtitle="Vista de solo lectura"
          onClose={() => setViewingChecklist(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className={buttonLight} type="button" onClick={() => printChecklist(viewingChecklist)}><Icon name="print" size={18} /> Imprimir</button>
              <button className={buttonLight} type="button" onClick={() => editChecklist(viewingChecklist)}><Icon name="edit" size={18} /> Editar</button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Responsable</p><p className="font-bold">{viewingChecklist.responsible || "-"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Estado</p><p className="font-bold">{viewingChecklist.status}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Progreso</p><p className="font-bold">{viewingChecklist.completed_count}/{viewingChecklist.total_count}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Creado</p><p className="font-bold">{formatDateTimeEs(viewingChecklist.created_at)}</p></div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold">Observaciones</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingChecklist.notes || "Sin observaciones."}</p></div>
        </Modal>
      )}

      {deleteCandidate && (
        <Modal
          title="Confirmar borrado de parte diario"
          subtitle="Esta acción elimina el registro del histórico. Úsalo solo si el parte se creó por error."
          onClose={() => setDeleteCandidate(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setDeleteCandidate(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-800" type="button" onClick={confirmDeleteReport}><Icon name="trash" size={18} /> Sí, borrar</button>
            </div>
          }
        >
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <h4 className="font-bold">Parte diario del {formatDateEs(deleteCandidate.date)}</h4>
            <p className="mt-2 text-sm">Responsable: <b>{deleteCandidate.manager || "responsable no indicado"}</b></p>
            <p className="mt-2 text-sm">Si lo borras, dejará de aparecer en informes e histórico.</p>
          </div>
        </Modal>
      )}

      {deleteChecklistCandidate && (
        <Modal
          title="Confirmar borrado de cierre de checklist"
          subtitle="Esto reabre la posibilidad de modificar el checklist de esa fecha. Úsalo solo si el cierre se creó por error."
          onClose={() => setDeleteChecklistCandidate(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setDeleteChecklistCandidate(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-800" type="button" onClick={confirmDeleteChecklist}><Icon name="trash" size={18} /> Sí, borrar</button>
            </div>
          }
        >
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <h4 className="font-bold">Checklist del {formatDateEs(deleteChecklistCandidate.signoff_date)}</h4>
            <p className="mt-2 text-sm">Edificio / estancia: <b>{getChecklistArea(deleteChecklistCandidate)}</b></p>
            <p className="mt-2 text-sm">Progreso registrado: <b>{deleteChecklistCandidate.completed_count}/{deleteChecklistCandidate.total_count}</b></p>
          </div>
        </Modal>
      )}

      {deleteIncidentCandidate && (
        <Modal
          title="Confirmar borrado de incidencia"
          subtitle="Esta acción elimina el registro. Úsalo solo si la incidencia se creó por error."
          onClose={() => setDeleteIncidentCandidate(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setDeleteIncidentCandidate(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-800" type="button" onClick={confirmDeleteIncident}><Icon name="trash" size={18} /> Sí, borrar</button>
            </div>
          }
        >
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <h4 className="font-bold">Incidencia de {deleteIncidentCandidate.room || "sin habitación"}</h4>
            <p className="mt-2 text-sm">Tipo: <b>{deleteIncidentCandidate.type}</b></p>
            <p className="mt-2 text-sm">Prioridad: <b>{deleteIncidentCandidate.priority}</b></p>
            <p className="mt-2 text-sm">Descripción: {deleteIncidentCandidate.text || "Sin descripción."}</p>
          </div>
        </Modal>
      )}

      {viewingIncident && (
        <Modal
          title={`Incidencia habitación ${viewingIncident.room}`}
          subtitle="Vista de solo lectura"
          onClose={() => setViewingIncident(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className={buttonLight} type="button" onClick={() => printIncident(viewingIncident)}><Icon name="print" size={18} /> Imprimir</button>
              <button className={buttonLight} type="button" onClick={() => editIncident(viewingIncident)}><Icon name="edit" size={18} /> Editar</button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Fecha</p><p className="font-bold">{formatDateEs(viewingIncident.date)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Tipo</p><p className="font-bold">{viewingIncident.type}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Prioridad</p><p className="font-bold">{viewingIncident.priority}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Estado</p><p className="font-bold">{viewingIncident.status}</p></div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold">Descripción</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{viewingIncident.text || "Sin descripción."}</p></div>
        </Modal>
      )}
    </div>
  );
}
