import React, { useEffect, useMemo, useState } from "react";

/**
 * Hotel Daily Control - MVP operativo
 *
 * - Responsive para móvil/tablet/escritorio.
 * - Puede sincronizar datos si existen variables de entorno configuradas.
 * - Si la sincronización no está configurada o falla, funciona en modo demo con localStorage.
 * - Sin dependencias externas de iconos.
 */

const STORAGE_KEY = "hotel_daily_control_responsive_v2";
const DEMO_HOTEL_ID = "local-demo-hotel";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_KEY);
const AUTH_STORAGE_KEY = "hotel_daily_control_auth_v1";

const ROLES = ["Administrador", "Dirección", "Recepción", "Limpieza", "Mantenimiento"];

const ROLE_TABS = {
  Administrador: ["dashboard", "daily", "tasks", "incidents", "rooms", "calendar", "reports", "manual", "setup", "help"],
  Dirección: ["dashboard", "daily", "tasks", "incidents", "rooms", "calendar", "reports", "manual", "help"],
  Recepción: ["daily", "tasks", "incidents", "rooms", "calendar", "reports", "manual", "help"],
  Limpieza: ["tasks", "rooms", "incidents", "help"],
  Mantenimiento: ["incidents", "rooms", "help"],
};

function canAccessTab(role, tabId) {
  return (ROLE_TABS[role] || ROLE_TABS.Recepción).includes(tabId);
}

function normalizeProfile(row, user = null) {
  return {
    id: row?.id || user?.id || "",
    email: row?.email || user?.email || "",
    fullName: row?.full_name || user?.email || "Usuario",
    role: ROLES.includes(row?.role) ? row.role : "Recepción",
    isActive: row?.is_active !== false,
  };
}

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

const defaultReservations = [
  {
    id: "demo-reservation-1",
    roomLabel: "Edificio principal · 101",
    guestName: "Reserva demo",
    channel: "Booking",
    checkinDate: todayIso(),
    checkoutDate: addDaysIso(todayIso(), 2),
    nightlyRate: 120,
    totalAmount: 240,
    reference: "BK-DEMO",
    phone: "",
    email: "",
    status: "Confirmada",
    notes: "Reserva de ejemplo para probar el planning.",
  },
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

function startOfWeekIso(dateValue) {
  const [year, month, day] = String(dateValue || todayIso()).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + diffToMonday);
  return toLocalIsoDate(date);
}

function formatWeekdayShort(dateValue) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "");
}

function formatDateEs(dateValue) {
  if (!dateValue) return "-";
  const [year, month, day] = String(dateValue).slice(0, 10).split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
}

function daysBetweenIso(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const [startYear, startMonth, startDay] = String(startDate).split("-").map(Number);
  const [endYear, endMonth, endDay] = String(endDate).split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  return Math.max(Math.round((end - start) / 86400000), 0);
}

function reservationNights(reservation) {
  return daysBetweenIso(reservation.checkinDate, reservation.checkoutDate);
}

function reservationNightlyRate(reservation) {
  const nights = Math.max(reservationNights(reservation), 1);
  if (reservation.nightlyRate !== undefined && reservation.nightlyRate !== null && reservation.nightlyRate !== "") return Number(reservation.nightlyRate) || 0;
  return Math.round(((Number(reservation.totalAmount) || 0) / nights) * 100) / 100;
}

function reservationTotalAmount(reservation) {
  const nights = Math.max(reservationNights(reservation), 1);
  if (reservation.totalAmount !== undefined && reservation.totalAmount !== null && reservation.totalAmount !== "") return Number(reservation.totalAmount) || 0;
  return Math.round((reservationNightlyRate(reservation) * nights) * 100) / 100;
}

function calculateTotalFromNightly(reservation) {
  return Math.round((reservationNightlyRate(reservation) * Math.max(reservationNights(reservation), 1)) * 100) / 100;
}

function isReservationActiveOnDate(reservation, dateValue) {
  if (!reservation || reservation.status === "Cancelada" || reservation.status === "No-show") return false;
  return dateValue >= reservation.checkinDate && dateValue < reservation.checkoutDate;
}

function reservationTouchesDate(reservation, dateValue) {
  return isReservationActiveOnDate(reservation, dateValue) || reservation.checkinDate === dateValue || reservation.checkoutDate === dateValue;
}

function isReservationInactive(reservation) {
  return reservation?.status === "Cancelada" || reservation?.status === "No-show";
}

function isReservationBlocking(reservation) {
  return !isReservationInactive(reservation) && (reservation?.status || "Confirmada") === "Confirmada";
}

function reservationsOverlap(a, b) {
  if (!a || !b) return false;
  if (isReservationInactive(a) || isReservationInactive(b)) return false;
  return a.roomLabel === b.roomLabel && a.checkinDate < b.checkoutDate && b.checkinDate < a.checkoutDate;
}

function reservationsBlockingOverlap(a, b) {
  return reservationsOverlap(a, b) && isReservationBlocking(a) && isReservationBlocking(b);
}

function getReservationForRoomDate(reservations, roomLabel, dateValue) {
  return (reservations || []).find((reservation) => reservation.roomLabel === roomLabel && isReservationActiveOnDate(reservation, dateValue)) || null;
}

function applyReservationsToRooms(rooms, reservations, dateValue) {
  return rooms.map((room) => {
    const label = room.label || `${room.area || "Edificio principal"} · ${room.number}`;
    const reservation = getReservationForRoomDate(reservations, label, dateValue);
    if (!reservation) return room;
    if (room.status === "Bloqueada" || room.status === "Fuera de servicio") return { ...room, reservationConflict: reservation };
    return {
      ...room,
      status: "Ocupada",
      bookingChannel: reservation.channel || room.bookingChannel || "",
      bookingAmount: reservationNightlyRate(reservation) || room.bookingAmount || "",
      bookingTotalAmount: reservationTotalAmount(reservation) || "",
      bookingReference: reservation.reference || room.bookingReference || "",
      reservationId: reservation.id,
      reservationGuest: reservation.guestName,
      reservationPhone: reservation.phone || "",
      reservationEmail: reservation.email || "",
      reservationChannel: reservation.channel || "Pendiente",
      reservationReference: reservation.reference || "",
      reservationNightlyRate: reservationNightlyRate(reservation),
      reservationTotalAmount: reservationTotalAmount(reservation),
      reservationCheckin: reservation.checkinDate,
      reservationCheckout: reservation.checkoutDate,
      tone: statusTone("Ocupada"),
      detail: `Reserva ${formatDateEs(reservation.checkinDate)} → ${formatDateEs(reservation.checkoutDate)}`,
    };
  });
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

function readAuthSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeAuthSession(session) {
  try {
    if (session) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // localStorage puede fallar en algunos navegadores privados.
  }
}

async function refreshAuthSession() {
  if (!HAS_SUPABASE) return null;
  const currentSession = readAuthSession();
  const refreshToken = currentSession?.refresh_token;
  if (!refreshToken) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    writeAuthSession(null);
    return null;
  }

  const refreshedSession = await response.json();
  writeAuthSession(refreshedSession);
  return refreshedSession;
}

function readLocal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function canUseRemote(connection, hotel, authSession) {
  return HAS_SUPABASE && Boolean(authSession?.access_token) && hotel?.id && hotel.id !== DEMO_HOTEL_ID;
}

function writeLocal(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage puede fallar en algunos navegadores privados.
  }
}

async function sb(path, options = {}) {
  if (!HAS_SUPABASE) throw new Error("El sistema de sincronización no está configurado");

  const { retryAuth = true, ...fetchOptions } = options;
  const session = readAuthSession();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...fetchOptions,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(fetchOptions.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const isExpiredJwt = response.status === 401 || text.includes("JWT expired") || text.includes("PGRST303");

    if (retryAuth && isExpiredJwt) {
      const refreshedSession = await refreshAuthSession();
      if (refreshedSession?.access_token) {
        return sb(path, { ...fetchOptions, retryAuth: false });
      }
      throw new Error("Sesión caducada. Vuelve a iniciar sesión para sincronizar con Supabase.");
    }

    throw new Error(text || `Error de sincronización ${response.status}`);
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

function parseRoomNotes(notes) {
  try {
    const data = JSON.parse(notes || "{}");
    return {
      bookingChannel: data.bookingChannel || "",
      bookingAmount: data.bookingAmount || "",
      bookingReference: data.bookingReference || "",
      note: data.note || "",
    };
  } catch {
    return { bookingChannel: "", bookingAmount: "", bookingReference: "", note: notes || "" };
  }
}

function buildRoomNotes(room) {
  const data = {
    bookingChannel: room.bookingChannel || "",
    bookingAmount: room.bookingAmount || "",
    bookingReference: room.bookingReference || "",
    note: room.note || "",
  };
  return JSON.stringify(data);
}

function roomDailyStatusFromRow(row) {
  const status = row.status || "Disponible";
  const label = row.room_number || "-";
  const [areaMaybe, numberMaybe] = String(label).includes(" · ") ? String(label).split(" · ") : ["Edificio principal", label];
  const parsedNotes = parseRoomNotes(row.notes || "");
  return {
    id: row.id,
    area: areaMaybe,
    number: numberMaybe,
    label,
    status,
    notes: row.notes || "",
    ...parsedNotes,
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
    notes: buildRoomNotes(room),
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

function roomCatalogFromRow(row) {
  return {
    id: row.id,
    area: row.area || "Edificio principal",
    number: row.room_number || "",
    label: row.room_label || `${row.area || "Edificio principal"} · ${row.room_number || ""}`,
    sortOrder: row.sort_order || 0,
    isActive: row.is_active !== false,
  };
}

function roomCatalogToRow(room, hotelId, index = 0) {
  const area = room.area || "Edificio principal";
  const number = room.number || room.room_number || String(index + 1);
  return {
    hotel_id: hotelId,
    area,
    room_number: number,
    sort_order: room.sortOrder || index + 1,
    is_active: true,
  };
}

function normalizeRoomCatalog(catalog) {
  return (catalog || [])
    .filter((room) => room && (room.number || room.room_number))
    .map((room, index) => {
      const area = room.area || "Edificio principal";
      const number = room.number || room.room_number || String(index + 1);
      return {
        ...room,
        area,
        number,
        label: room.label || `${area} · ${number}`,
        sortOrder: room.sortOrder || index + 1,
      };
    });
}

function reindexRoomCatalog(catalog) {
  return normalizeRoomCatalog(catalog).map((room, index) => ({
    ...room,
    label: `${room.area} · ${room.number}`,
    sortOrder: index + 1,
  }));
}

function reservationFromRow(row) {
  return {
    id: row.id,
    roomLabel: row.room_label || "",
    guestName: row.guest_name || "",
    channel: row.channel || "Pendiente",
    checkinDate: row.checkin_date,
    checkoutDate: row.checkout_date,
    nightlyRate: Number(row.nightly_rate || 0),
    totalAmount: Number(row.total_amount || 0),
    reference: row.reference || "",
    phone: row.phone || "",
    email: row.email || "",
    status: row.status || "Confirmada",
    notes: row.notes || "",
    createdAt: row.created_at,
  };
}

function reservationToRow(reservation, hotelId) {
  const nights = Math.max(reservationNights(reservation), 1);
  const nightlyRate = Number(reservation.nightlyRate) || reservationNightlyRate(reservation);
  return {
    hotel_id: hotelId,
    room_label: reservation.roomLabel,
    guest_name: reservation.guestName || "Reserva sin nombre",
    channel: reservation.channel || "Pendiente",
    checkin_date: reservation.checkinDate,
    checkout_date: reservation.checkoutDate,
    nightly_rate: nightlyRate,
    total_amount: Math.round((nightlyRate * nights) * 100) / 100,
    reference: reservation.reference || "",
    phone: reservation.phone || "",
    email: reservation.email || "",
    status: reservation.status || "Confirmada",
    notes: reservation.notes || "",
  };
}

function calculateOccupancy(rooms) {
  return Math.round(((Number(rooms.occupied) || 0) / Math.max(Number(rooms.total) || 1, 1)) * 100);
}

function calculateAvailable(rooms) {
  return Math.max((Number(rooms.total) || 0) - (Number(rooms.occupied) || 0) - (Number(rooms.blocked) || 0), 0);
}

function normalizeChecklistTemplate(template = defaultTasks) {
  const seen = new Set();
  const base = Array.isArray(template) && template.length ? template : defaultTasks;
  const cleaned = [];

  [...base, ...defaultTasks].forEach((task, index) => {
    const area = task?.area || "Apertura";
    const title = String(task?.title || "").trim();
    if (!title) return;
    const key = `${area}::${title}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push({
      id: task?.id || `template-${index}`,
      area,
      title,
      done: false,
    });
  });

  return cleaned;
}

function emptyDefaultTasks(template = defaultTasks) {
  return normalizeChecklistTemplate(template).map((task, index) => ({
    ...task,
    id: task.id || `task-${index}-${Date.now()}`,
    done: false,
  }));
}

function mergeTasksWithTemplate(existingTasks = [], template = defaultTasks) {
  const normalizedTemplate = normalizeChecklistTemplate(template);
  const existingByKey = new Map((existingTasks || []).map((task) => [`${task.area || "Apertura"}::${String(task.title || "").trim()}`.toLowerCase(), task]));

  return normalizedTemplate.map((templateTask, index) => {
    const key = `${templateTask.area}::${templateTask.title}`.toLowerCase();
    const existing = existingByKey.get(key);
    return {
      ...templateTask,
      id: existing?.id || templateTask.id || `task-${index}-${Date.now()}`,
      done: Boolean(existing?.done),
    };
  });
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
    channelPending: areaRooms.filter((room) => room.status === "Ocupada" && !room.bookingChannel).length,
  };
}

function summarizeRoomBookings(rooms) {
  const occupied = rooms.filter((room) => room.status === "Ocupada");
  const pendingChannel = occupied.filter((room) => !room.bookingChannel);
  const byChannel = occupied.reduce((groups, room) => {
    const channel = room.bookingChannel || "Pendiente";
    if (!groups[channel]) groups[channel] = { channel, bookings: 0, revenue: 0, rooms: [] };
    groups[channel].bookings += 1;
    groups[channel].revenue += Number(room.bookingAmount) || 0;
    groups[channel].rooms.push(room);
    return groups;
  }, {});

  return {
    occupiedCount: occupied.length,
    pendingChannelCount: pendingChannel.length,
    totalRevenue: occupied.reduce((total, room) => total + (Number(room.bookingAmount) || 0), 0),
    byChannel: Object.values(byChannel),
  };
}

function summarizeReservationForecast(reservations, days) {
  const byChannel = {};
  let total = 0;
  let roomNights = 0;

  (reservations || []).forEach((reservation) => {
    if (!reservation || reservation.status === "Cancelada" || reservation.status === "No-show") return;
    const channel = reservation.channel || "Pendiente";
    const nightly = reservationNightlyRate(reservation);
    const activeDays = (days || []).filter((day) => isReservationActiveOnDate(reservation, day));
    if (!activeDays.length) return;

    if (!byChannel[channel]) byChannel[channel] = { channel, revenue: 0, roomNights: 0, reservations: [] };
    byChannel[channel].revenue += nightly * activeDays.length;
    byChannel[channel].roomNights += activeDays.length;
    byChannel[channel].reservations.push(reservation);
    total += nightly * activeDays.length;
    roomNights += activeDays.length;
  });

  return {
    total: Math.round(total * 100) / 100,
    roomNights,
    byChannel: Object.values(byChannel).map((item) => ({ ...item, revenue: Math.round(item.revenue * 100) / 100 })),
  };
}

function normalizeChannelName(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getChannelBucket(channel) {
  const normalized = normalizeChannelName(channel);
  if (normalized.includes("web") || normalized.includes("direct")) return "directBookings";
  if (normalized.includes("booking")) return "bookingBookings";
  if (normalized.includes("expedia")) return "expediaBookings";
  return "other";
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
      bookingChannel: existing?.bookingChannel || "",
      bookingAmount: existing?.bookingAmount || "",
      bookingReference: existing?.bookingReference || "",
      note: existing?.note || "",
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

function roomChipClass(room) {
  return cls(
    "rounded-xl border px-2 py-2 text-xs font-bold transition hover:scale-[1.02] hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-100",
    room.status === "Disponible" ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : room.status === "Ocupada" ? "border-slate-300 bg-slate-100 text-slate-800"
      : room.status === "Bloqueada" || room.status === "Fuera de servicio" ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-800"
  );
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
    return lines.slice(1).join(newline).trim();
  }

  return rawNotes.trim();
}

function encodeChecklistNotes(area, notes) {
  return `[AREA:${area || "General"}]${String.fromCharCode(10)}${notes || ""}`;
}

function isWeakChecklistNote(notes) {
  const clean = cleanChecklistNotes(notes).toLowerCase().trim();
  if (!clean) return false;
  return clean.length < 18 || ["prueba", "test", "ok", "todo ok", "sin novedad"].includes(clean);
}

function findChecklistSignoffFor(dateValue, area, history) {
  return (history || []).find((item) => item.signoff_date === dateValue && getChecklistArea(item) === area) || null;
}

function firstAvailableChecklistArea(options, dateValue, history) {
  const realAreas = (options || []).filter((area) => area && area !== "General");
  return realAreas.find((area) => !findChecklistSignoffFor(dateValue, area, history)) || realAreas[0] || "General";
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
${cleanChecklistNotes(checklist.notes) || "Sin observaciones relevantes registradas para este cierre."}`;
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

function Stat({ icon, label, value, hint, onClick, actionLabel }) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {actionLabel && <p className="mt-3 text-xs font-bold text-[#2f5f7a]">{actionLabel} →</p>}
      </div>
      <div className="rounded-2xl bg-slate-100 p-2 text-slate-700 sm:p-3">
        <Icon name={icon} size={22} />
      </div>
    </div>
  );

  if (!onClick) return <Card>{content}</Card>;

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-2xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-sky-100 active:scale-[0.99]"
      aria-label={actionLabel || label}
    >
      <Card className="h-full cursor-pointer border-sky-100 hover:border-sky-300 hover:bg-sky-50/40">
        {content}
      </Card>
    </button>
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

function useResponsivePlanningDays() {
  const getDays = () => {
    if (typeof window === "undefined") return 15;
    const width = window.innerWidth;
    if (width < 640) return 7;
    if (width < 1024) return 10;
    return 15;
  };

  const [days, setDays] = useState(getDays);

  useEffect(() => {
    const onResize = () => setDays(getDays());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return days;
}

const inputStyle = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100";
const buttonDark = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2f5f7a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#254b62] active:scale-[0.99] sm:px-5";
const buttonLight = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] sm:px-5";
const buttonTiny = "inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold leading-none text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";
const buttonTinyDanger = "inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-bold leading-none text-red-700 transition hover:bg-red-100";


const MANUAL_OPERATIVO_SECCIONES = [
  {
    id: "inicio-turno",
    titulo: "Inicio de turno",
    etiqueta: "Diario",
    resumen: "Revisión inicial para saber qué ocurre hoy en L’Hostalet de Tossa y El Bergantí antes de empezar a gestionar reservas.",
    pasos: [
      "Abrir el programa de ocupación o Cloudbeds.",
      "Revisar primero L’Hostalet de Tossa y después El Bergantí.",
      "Comprobar llegadas previstas, salidas previstas, estancias en curso y habitaciones bloqueadas.",
      "Revisar pagos pendientes, observaciones importantes y peticiones especiales.",
      "Detectar incidencias abiertas que afecten a llegadas o habitaciones vendibles.",
      "Dejar anotado cualquier punto importante para el equipo.",
    ],
    checklist: [
      "Llegadas del día revisadas",
      "Salidas del día revisadas",
      "Habitaciones bloqueadas localizadas",
      "Pagos pendientes revisados",
      "Incidencias abiertas revisadas",
      "Observaciones importantes leídas",
    ],
    errores: [
      "Revisar solo un alojamiento y olvidar el otro.",
      "No mirar observaciones internas de las reservas.",
      "No detectar una habitación bloqueada con llegada prevista.",
    ],
  },
  {
    id: "reservas-nuevas",
    titulo: "Reservas nuevas",
    etiqueta: "Reservas",
    resumen: "Cada reserva nueva debe validarse antes de darla por correcta, especialmente el alojamiento, las fechas y el estado del pago.",
    pasos: [
      "Abrir la reserva en el sistema.",
      "Confirmar si pertenece a L’Hostalet de Tossa o a El Bergantí.",
      "Revisar nombre, teléfono, email, fechas, número de personas y tipo de habitación.",
      "Comprobar canal de reserva, importe total, estado del pago y política de cancelación.",
      "Leer peticiones especiales: cuna, cama extra, llegada tarde, accesos o notas del cliente.",
      "Confirmar que aparece correctamente en el calendario/planning.",
    ],
    checklist: [
      "Alojamiento correcto",
      "Fechas correctas",
      "Tipo de habitación correcto",
      "Datos de contacto completos",
      "Pago o garantía revisados",
      "Observaciones internas añadidas si hace falta",
    ],
    errores: [
      "Confundir L’Hostalet con El Bergantí.",
      "No revisar si hay petición especial.",
      "No comprobar si el pago está pendiente o garantizado.",
    ],
  },
  {
    id: "check-in",
    titulo: "Llegadas / Check-in",
    etiqueta: "Recepción",
    resumen: "Proceso para recibir al cliente, verificar la reserva, revisar documentación y marcar la entrada correctamente.",
    pasos: [
      "Antes de la llegada, comprobar que la habitación esté asignada y limpia o en proceso de limpieza.",
      "Confirmar que no hay incidencias pendientes en la habitación.",
      "Saludar al cliente y pedir el nombre de la reserva.",
      "Confirmar alojamiento, fechas, número de noches y habitación asignada.",
      "Solicitar documentación y completar datos si falta información.",
      "Confirmar forma de pago y explicar horarios básicos, Wi‑Fi y normas del alojamiento.",
      "Entregar llaves o instrucciones de acceso.",
      "Marcar la reserva como entrada realizada en el sistema.",
    ],
    checklist: [
      "Habitación asignada",
      "Habitación confirmada por limpieza",
      "Pago revisado",
      "Documentación solicitada",
      "Datos del cliente completos",
      "Entrada marcada en el sistema",
    ],
    errores: [
      "Entregar una habitación sin confirmación de limpieza.",
      "No confirmar el alojamiento antes de entregar llaves.",
      "Olvidar marcar la entrada como realizada.",
    ],
  },
  {
    id: "check-out",
    titulo: "Salidas / Check-out",
    etiqueta: "Recepción",
    resumen: "Cierre correcto de la estancia, revisión de pagos y comunicación inmediata a limpieza.",
    pasos: [
      "Confirmar habitación y alojamiento.",
      "Revisar la cuenta del cliente y posibles cargos pendientes.",
      "Cobrar importes abiertos si corresponde.",
      "Emitir factura o recibo si el cliente lo solicita o si procede.",
      "Recoger llaves o confirmar salida.",
      "Marcar salida realizada en el sistema.",
      "Avisar a limpieza para que la habitación pase a pendiente de limpieza.",
    ],
    checklist: [
      "Pago cerrado",
      "Factura o recibo revisado",
      "Llaves recogidas o salida confirmada",
      "Salida marcada en el sistema",
      "Limpieza avisada",
      "Habitación en estado correcto tras la salida",
    ],
    errores: [
      "No revisar pagos pendientes antes de cerrar.",
      "No avisar a limpieza.",
      "Marcar disponible una habitación que todavía no está revisada.",
    ],
  },
  {
    id: "limpieza",
    titulo: "Coordinación con limpieza",
    etiqueta: "Operativa",
    resumen: "Recepción debe comunicar prioridades de limpieza, entradas tempranas, salidas tardías e incidencias detectadas.",
    pasos: [
      "Pasar a limpieza las salidas del día.",
      "Indicar habitaciones con llegada el mismo día como prioridad.",
      "Avisar de entradas tempranas, salidas tardías y clientes esperando.",
      "Comunicar peticiones especiales: cuna, cama extra, amenities o preparación concreta.",
      "Registrar incidencias detectadas por limpieza.",
      "No entregar habitación hasta recibir confirmación de que está lista.",
    ],
    checklist: [
      "Salidas comunicadas",
      "Llegadas prioritarias marcadas",
      "Peticiones especiales comunicadas",
      "Habitaciones listas confirmadas",
      "Incidencias registradas",
    ],
    errores: [
      "Depender solo de avisos verbales.",
      "No priorizar habitaciones con llegada el mismo día.",
      "Entregar habitación sin confirmación de limpieza.",
    ],
  },
  {
    id: "incidencias",
    titulo: "Incidencias",
    etiqueta: "Control",
    resumen: "Toda incidencia debe quedar registrada con alojamiento, habitación o zona, prioridad, responsable y estado.",
    pasos: [
      "Crear la incidencia en el panel correspondiente.",
      "Indicar alojamiento: L’Hostalet de Tossa o El Bergantí.",
      "Indicar habitación o zona afectada.",
      "Seleccionar tipo: limpieza, mantenimiento, cliente, reserva, pago, acceso, ruido, daños o problema técnico.",
      "Describir el problema de forma clara.",
      "Asignar prioridad alta, media o baja.",
      "Asignar responsable si procede.",
      "Añadir foto si aplica, especialmente desde móvil.",
      "Actualizar el estado hasta su resolución.",
    ],
    checklist: [
      "Alojamiento indicado",
      "Habitación o zona indicada",
      "Descripción clara",
      "Prioridad asignada",
      "Responsable asignado",
      "Estado actualizado",
    ],
    errores: [
      "No registrar incidencias pequeñas.",
      "No diferenciar urgencia real.",
      "No bloquear una habitación que no se puede vender.",
    ],
  },
  {
    id: "pagos",
    titulo: "Control de pagos",
    etiqueta: "Caja",
    resumen: "Recepción debe revisar pagos pendientes, garantías, devoluciones y cargos abiertos antes de llegadas y salidas.",
    pasos: [
      "Revisar llegadas con pago pendiente.",
      "Comprobar reservas garantizadas con tarjeta.",
      "Revisar estancias con cargos abiertos.",
      "Comprobar salidas del día con importes pendientes.",
      "Registrar devoluciones pendientes si existen.",
      "Añadir nota interna cuando haya algo que revisar en el siguiente turno.",
    ],
    checklist: [
      "Llegadas con pago pendiente revisadas",
      "Salidas con importes abiertos revisadas",
      "Garantías comprobadas",
      "Devoluciones pendientes localizadas",
      "Notas internas añadidas",
    ],
    errores: [
      "Esperar al check-out para descubrir pagos pendientes.",
      "No dejar nota cuando hay una devolución pendiente.",
      "No diferenciar pagado, parcialmente pagado y garantizado.",
    ],
  },
  {
    id: "modificaciones-cancelaciones",
    titulo: "Modificaciones y cancelaciones",
    etiqueta: "Reservas",
    resumen: "Cualquier cambio de fechas, habitación, precio o cancelación debe revisarse contra disponibilidad, política y calendario.",
    pasos: [
      "Abrir la reserva original.",
      "Confirmar identidad del cliente o canal que solicita el cambio.",
      "Revisar disponibilidad real antes de modificar.",
      "Modificar fechas, noches, personas, habitación, precio o alojamiento si corresponde.",
      "Comprobar nuevo importe y comunicar cambio al cliente si procede.",
      "Guardar cambios y verificar el calendario.",
      "Añadir nota interna explicando el cambio.",
      "En cancelaciones, revisar política, penalización y devolución antes de cancelar.",
    ],
    checklist: [
      "Reserva original localizada",
      "Disponibilidad revisada",
      "Importe nuevo comprobado",
      "Política de cancelación revisada",
      "Calendario comprobado",
      "Nota interna añadida",
    ],
    errores: [
      "Cambiar fechas sin mirar disponibilidad real.",
      "Cancelar sin revisar penalización o devolución.",
      "No comprobar que la habitación vuelve a disponibilidad.",
    ],
  },
  {
    id: "cierre-turno",
    titulo: "Cierre de turno",
    etiqueta: "Diario",
    resumen: "Antes de terminar, recepción debe dejar la información clara para el siguiente turno.",
    pasos: [
      "Revisar llegadas pendientes.",
      "Revisar salidas cerradas y habitaciones pendientes de limpieza.",
      "Comprobar incidencias abiertas.",
      "Comprobar pagos o devoluciones pendientes.",
      "Dejar nota de traspaso con clientes, habitaciones o tareas que requieren seguimiento.",
      "Confirmar que la información importante no queda solo de forma verbal.",
    ],
    checklist: [
      "Llegadas pendientes revisadas",
      "Salidas cerradas revisadas",
      "Incidencias abiertas anotadas",
      "Pagos pendientes anotados",
      "Nota de traspaso preparada",
    ],
    errores: [
      "No dejar constancia escrita del pendiente.",
      "No avisar de una habitación bloqueada.",
      "No explicar el estado real de una incidencia abierta.",
    ],
  },
];


const CLOUDBEDS_MANUAL_LINKS = {
  general: [
    {
      title: "Panel de Cloudbeds PMS",
      description: "Resumen diario: llegadas, salidas, ocupación y habitaciones disponibles.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/115000400634-Panel-Todo-lo-que-debes-saber",
    },
    {
      title: "Guía de operaciones diarias",
      description: "Referencia general para tareas comunes de recepción en Cloudbeds PMS.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/40771665486363-Tu-gu%C3%ADa-de-operaciones-diarias-de-Cloudbeds-PMS",
    },
  ],
  "inicio-turno": [
    {
      title: "Panel - Todo lo que debes saber",
      description: "Para revisar llegadas, salidas, ocupación y disponibilidad al iniciar el turno.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/115000400634-Panel-Todo-lo-que-debes-saber",
    },
    {
      title: "Calendario - Todo lo que debe saber",
      description: "Para visualizar reservas, bloqueos, cambios de fecha y asignaciones.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/235146587-Calendario-Todo-lo-que-debe-saber",
    },
  ],
  "reservas-nuevas": [
    {
      title: "Reservas",
      description: "Sección oficial sobre página de reservas, creación, edición, cancelación y folios.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/sections/21390664190491-Reservas",
    },
    {
      title: "Página de información de las reservas",
      description: "Datos del huésped, estado de reserva, alojamientos y detalles financieros.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/8354513114907-P%C3%A1gina-de-informaci%C3%B3n-de-las-reservas-Todo-lo-que-debe-saber",
    },
    {
      title: "Introducción a los detalles de una reserva",
      description: "Guía rápida para entender la información disponible dentro de una reserva.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/218512847-Introducci%C3%B3n-a-los-detalles-de-una-reserva",
    },
  ],
  "check-in": [
    {
      title: "Guía de operaciones diarias de Cloudbeds PMS",
      description: "Flujos habituales de recepción, llegadas, salidas y trabajo diario.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/40771665486363-Tu-gu%C3%ADa-de-operaciones-diarias-de-Cloudbeds-PMS",
    },
    {
      title: "Página de información de las reservas",
      description: "Para comprobar datos del huésped, estado, alojamiento y detalles financieros.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/8354513114907-P%C3%A1gina-de-informaci%C3%B3n-de-las-reservas-Todo-lo-que-debe-saber",
    },
  ],
  "check-out": [
    {
      title: "Resumen de cuenta de la reserva",
      description: "Detalles financieros, transacciones, cargos, pagos, ajustes y reembolsos.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/22503892593051-Resumen-de-cuenta-de-la-reserva-Todo-lo-que-debes-saber",
    },
    {
      title: "Cómo anular transacciones",
      description: "Pasos para anular pagos o transacciones desde el folio de la reserva.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/1260805465149-C%C3%B3mo-anular-transacciones",
    },
  ],
  limpieza: [
    {
      title: "Panel - Todo lo que debes saber",
      description: "Útil para cruzar llegadas, salidas y habitaciones disponibles antes de pasar prioridades a limpieza.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/115000400634-Panel-Todo-lo-que-debes-saber",
    },
    {
      title: "Calendario - Todo lo que debe saber",
      description: "Vista visual para entender ocupación, entradas, salidas y bloqueos.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/235146587-Calendario-Todo-lo-que-debe-saber",
    },
  ],
  incidencias: [
    {
      title: "Calendario - Todo lo que debe saber",
      description: "Referencia para bloqueos, retenciones y cambios que afectan a disponibilidad.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/235146587-Calendario-Todo-lo-que-debe-saber",
    },
    {
      title: "Página de información de las reservas",
      description: "Para revisar si una incidencia afecta a una reserva concreta o a sus datos.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/8354513114907-P%C3%A1gina-de-informaci%C3%B3n-de-las-reservas-Todo-lo-que-debe-saber",
    },
  ],
  pagos: [
    {
      title: "Cloudbeds Payments - Todo lo que debes saber",
      description: "Información general sobre configuración y funcionamiento de Cloudbeds Payments.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/360057382053-Cloudbeds-Payments-Todo-lo-que-debes-saber",
    },
    {
      title: "Resumen de cuenta de la reserva",
      description: "Folio, detalles financieros, transacciones, cargos, pagos y reembolsos.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/22503892593051-Resumen-de-cuenta-de-la-reserva-Todo-lo-que-debes-saber",
    },
    {
      title: "Cómo funciona la programación de pagos",
      description: "Pagos programados y transacciones pendientes dentro del folio.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/1260803167969--C%C3%B3mo-funciona-la-programaci%C3%B3n-de-pagos",
    },
    {
      title: "Cómo anular transacciones",
      description: "Anulación de pagos o transacciones desde el folio de la reserva.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/1260805465149-C%C3%B3mo-anular-transacciones",
    },
  ],
  "modificaciones-cancelaciones": [
    {
      title: "Cancelamiento de reservas directas",
      description: "Cambio de estado a cancelado y efectos sobre calendario, folio y saldo pendiente.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/219146188-Cancelamiento-de-reservas-directas",
    },
    {
      title: "Cancelar o modificar reservas recibidas de OTA",
      description: "Cuándo cancelar/modificar en Cloudbeds y cuándo hacerlo también en la extranet del canal.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/216541178-Cancelar-o-modificar-las-reservas-recibidas-de-las-OTA",
    },
    {
      title: "Políticas Inteligentes: reservas, pagos y cancelaciones",
      description: "Cómo se aplican reglas de garantía, pago y cancelación a reservas elegibles.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/44193538614043-C%C3%B3mo-se-aplican-las-Pol%C3%ADticas-Inteligentes-a-las-reservas-los-pagos-y-las-cancelaciones",
    },
  ],
  "cierre-turno": [
    {
      title: "Panel - Todo lo que debes saber",
      description: "Revisión final de llegadas, salidas, ocupación y habitaciones disponibles.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/115000400634-Panel-Todo-lo-que-debes-saber",
    },
    {
      title: "Guía de operaciones diarias de Cloudbeds PMS",
      description: "Referencia general para tareas comunes del día a día en recepción.",
      url: "https://myfrontdesk.cloudbeds.com/hc/es/articles/40771665486363-Tu-gu%C3%ADa-de-operaciones-diarias-de-Cloudbeds-PMS",
    },
  ],
};

function getCloudbedsLinksForManual(sectionId) {
  return [...(CLOUDBEDS_MANUAL_LINKS[sectionId] || []), ...CLOUDBEDS_MANUAL_LINKS.general]
    .filter((link, index, allLinks) => allLinks.findIndex((item) => item.url === link.url) === index);
}
const MANUAL_REGLA_ORO = ["Alojamiento", "Cliente", "Fechas", "Habitación", "Pago", "Observaciones", "Estado final en el sistema"];

function ManualOperativoRecepcion() {
  const [activeId, setActiveId] = useState(MANUAL_OPERATIVO_SECCIONES[0].id);
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return MANUAL_OPERATIVO_SECCIONES;
    return MANUAL_OPERATIVO_SECCIONES.filter((section) => {
      const searchable = [section.titulo, section.etiqueta, section.resumen, ...section.pasos, ...section.checklist, ...section.errores].join(" ").toLowerCase();
      return searchable.includes(value);
    });
  }, [query]);

  const activeSection = filteredSections.find((section) => section.id === activeId) || filteredSections[0] || MANUAL_OPERATIVO_SECCIONES[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card>
        <div className="grid gap-4 xl:grid-cols-[1fr_340px] xl:items-stretch">
          <div>
            <Badge tone="blue">Manual Operativo / Recepción</Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Manual de Operaciones — Jefa de Recepción</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Guía rápida para gestionar desde una única recepción los alojamientos L’Hostalet de Tossa y El Bergantí.</p>
          </div>
          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 text-sky-950">
            <div className="mb-2 flex items-center gap-2 font-bold"><Icon name="sparkles" size={18} /> Regla de oro</div>
            <p className="text-sm leading-6">Primero confirmar alojamiento, después gestionar la reserva.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ManualInfo label="Alojamientos" value="L’Hostalet de Tossa · El Bergantí" />
        <ManualInfo label="Punto de gestión" value="Recepción única" />
        <ManualInfo label="Sistema" value="Cloudbeds / ocupación conectada" />
        <ManualInfo label="Versión" value="1.0" />
      </div>

      <Card className="p-0">
        <div className="rounded-2xl bg-slate-950 p-4 text-white sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-white"><Icon name="check" size={18} /><h3 className="font-bold text-white">Orden obligatorio de comprobación</h3></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
            {MANUAL_REGLA_ORO.map((item, index) => (
              <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-3 text-sm font-bold text-white">
                <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-slate-950">{index + 1}</span>
                <span className="block text-white">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <Field label="Buscar en el manual"><input className={inputStyle} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar: pagos, check-in, limpieza, incidencias..." /></Field>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <Card className="xl:sticky xl:top-24 xl:h-fit">
          <h3 className="mb-3 font-bold">Bloques del manual</h3>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {filteredSections.map((section) => {
              const isActive = section.id === activeSection.id;
              return (
                <button key={section.id} type="button" onClick={() => setActiveId(section.id)} className={cls("rounded-2xl border p-3 text-left transition", isActive ? "border-[#2f5f7a] bg-sky-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-white")}>
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">{section.etiqueta}</span>
                  <strong className="text-sm text-slate-900">{section.titulo}</strong>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-5 border-b border-slate-200 pb-5">
            <Badge tone="blue">{activeSection.etiqueta}</Badge>
            <h3 className="mt-3 text-xl font-bold sm:text-2xl">{activeSection.titulo}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{activeSection.resumen}</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <ManualBlock title="Pasos recomendados" items={activeSection.pasos} ordered tone="blue" />
            <ManualBlock title="Checklist rápido" items={activeSection.checklist} icon="✓" tone="green" />
            <ManualBlock title="Errores a evitar" items={activeSection.errores} icon="!" tone="amber" />
          </div>
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
            <div className="mb-2 flex items-center gap-2 font-bold"><Icon name="cloud" size={18} /> Ayuda Cloudbeds relacionada</div>
            <p className="mb-4 text-sky-900">Enlaces oficiales de Cloudbeds para consultar el procedimiento ampliado sin salir del manual interno.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {getCloudbedsLinksForManual(activeSection.id).map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-sky-200 bg-white p-3 text-left transition hover:border-sky-400 hover:bg-sky-50 hover:shadow-sm"
                >
                  <span className="block font-bold text-sky-950">{link.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{link.description}</span>
                </a>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ManualInfo({ label, value }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </Card>
  );
}

function ManualBlock({ title, items, ordered = false, icon = "•", tone = "blue" }) {
  const iconClass = tone === "green" ? "bg-emerald-100 text-emerald-800" : tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-3 font-bold">{title}</h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={title + "-" + item} className="grid grid-cols-[28px_1fr] gap-2 text-sm leading-6 text-slate-700">
            <span className={cls("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black", iconClass)}>{ordered ? index + 1 : icon}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [checklistTemplate, setChecklistTemplate] = useState(normalizeChecklistTemplate(stored?.checklistTemplate || defaultTasks));
  const [tasks, setTasks] = useState(mergeTasksWithTemplate(stored?.tasks || [], stored?.checklistTemplate || defaultTasks));
  const [channels, setChannels] = useState(stored?.channels || defaultChannels);
  const [reservations, setReservations] = useState(stored?.reservations || defaultReservations);
  const [copied, setCopied] = useState(false);
  const [copiedReportId, setCopiedReportId] = useState(null);
  const [lastAction, setLastAction] = useState("");
  const [connection, setConnection] = useState({ status: HAS_SUPABASE ? "loading" : "local", message: HAS_SUPABASE ? "Preparando sistema..." : "Modo demostración" });
  const [authSession, setAuthSession] = useState(typeof window !== "undefined" ? readAuthSession() : null);
  const [authUser, setAuthUser] = useState(typeof window !== "undefined" ? readAuthSession()?.user || null : null);
  const [authProfile, setAuthProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
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
  const [checklistHistory, setChecklistHistory] = useState(stored?.checklistHistory || []);
  const [viewingChecklist, setViewingChecklist] = useState(null);
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [deleteChecklistCandidate, setDeleteChecklistCandidate] = useState(null);
  const [checklistAreaModal, setChecklistAreaModal] = useState(null);
  const [incidentArea, setIncidentArea] = useState("");
  const [quickRoomArea, setQuickRoomArea] = useState("");
  const [quickRoomId, setQuickRoomId] = useState("");
  const [quickRoomStatus, setQuickRoomStatus] = useState("Disponible");
  const [roomStatusModal, setRoomStatusModal] = useState(null);
  const [hasUnsavedRoomChanges, setHasUnsavedRoomChanges] = useState(false);
  const [calendarStartDate, setCalendarStartDate] = useState(startOfWeekIso(todayIso()));
  const [reservationForm, setReservationForm] = useState({ roomLabel: "", guestName: "", channel: "", checkinDate: todayIso(), checkoutDate: addDaysIso(todayIso(), 1), nightlyRate: 0, totalAmount: 0, reference: "", phone: "", email: "", status: "Confirmada", notes: "" });
  const [reservationModal, setReservationModal] = useState(null);
  const [calendarFullscreen, setCalendarFullscreen] = useState(false);
  const [resetRoomsCandidate, setResetRoomsCandidate] = useState(false);
  const [areaRenameCandidate, setAreaRenameCandidate] = useState(null);
  const [areaDeleteCandidate, setAreaDeleteCandidate] = useState(null);
  const [hasUnsavedCatalogChanges, setHasUnsavedCatalogChanges] = useState(false);
  const [catalogSaveReminder, setCatalogSaveReminder] = useState(null);
  const [reservationConflictCandidate, setReservationConflictCandidate] = useState(null);
  const [showChecklistHistory, setShowChecklistHistory] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const planningDays = useResponsivePlanningDays();

  useEffect(() => {
    if (planningDays < 15 && calendarFullscreen) {
      setCalendarFullscreen(false);
    }
  }, [planningDays, calendarFullscreen]);

  useEffect(() => {
    async function loadSupabase() {
      if (!HAS_SUPABASE) return;
      if (!authSession?.access_token) {
        setConnection({ status: "local", message: "Inicia sesión para cargar el sistema." });
        return;
      }
      try {
        const profiles = await sb(`profiles?id=eq.${authSession.user.id}&select=*&limit=1`);
        const loadedProfile = normalizeProfile(profiles?.[0], authSession.user);
        if (!loadedProfile.isActive) {
          throw new Error("Usuario desactivado. Contacta con administración.");
        }
        setAuthUser(authSession.user);
        setAuthProfile(loadedProfile);

        const initialTabByRole = {
          Administrador: "dashboard",
          Dirección: "dashboard",
          Recepción: "daily",
          Limpieza: "tasks",
          Mantenimiento: "incidents",
        };

        setActive(initialTabByRole[loadedProfile.role] || "daily");

        const hotels = await sb("hotels?select=*&order=created_at.asc&limit=1");
        const normalizedHotel = normalizeHotel(hotels?.[0]);
        setHotel(normalizedHotel);
        setForm((old) => ({ ...old, shift: normalizedHotel.receptionHours || old.shift }));

        const [remoteReports, remoteIncidents, remoteRooms, remoteSignoffs, remoteChannels, remoteReservations, remoteRoomCatalog] = await Promise.all([
          sb(`daily_reports?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=50`),
          sb(`incidents?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=100`),
          sb(`room_status?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=1`),
          sb(`checklist_signoffs?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.desc&limit=30`),
          sb(`sales_channels?select=*&hotel_id=eq.${normalizedHotel.id}&order=created_at.asc`),
          sb(`reservations?select=*&hotel_id=eq.${normalizedHotel.id}&order=checkin_date.asc,created_at.asc&limit=300`),
          sb(`room_catalog?select=*&hotel_id=eq.${normalizedHotel.id}&is_active=eq.true&order=sort_order.asc,room_number.asc`),
        ]);

        setReports(remoteReports?.length ? remoteReports.map(reportFromRow) : []);
        setIncidents(remoteIncidents?.length ? remoteIncidents.map(incidentFromRow) : []);
        if (remoteRooms?.length) {
          const loadedRooms = roomStatusFromRow(remoteRooms[0]);
          setRooms(loadedRooms);
          setRoomDetails(buildRoomInventory(loadedRooms, roomCatalog));
        }

        setTasks(emptyDefaultTasks(checklistTemplate));

        const loadedSignoffs = remoteSignoffs || [];
        setChecklistHistory(loadedSignoffs);
        setChecklistDate(todayIso());
        setChecklistSignoff(null);
        setEditingChecklistId(null);
        setChecklistResponsible("");
        setChecklistNotes("");

        if (remoteChannels?.length) {
          setChannels(remoteChannels.map(channelFromRow));
        } else {
          const insertedChannels = await sb("sales_channels?select=*", { method: "POST", body: JSON.stringify(defaultChannels.map((channel) => channelToRow(channel, normalizedHotel.id))) });
          setChannels(insertedChannels?.length ? insertedChannels.map(channelFromRow) : defaultChannels);
        }

        if (remoteReservations?.length) {
          setReservations(remoteReservations.map(reservationFromRow));
        } else {
          setReservations([]);
        }

        if (remoteRoomCatalog?.length) {
          const catalogFromDb = reindexRoomCatalog(remoteRoomCatalog.map(roomCatalogFromRow));
          setRoomCatalog(catalogFromDb);
          setRoomCatalogText(formatRoomCatalog(catalogFromDb));
          const todaySignoffs = loadedSignoffs.filter((item) => item.signoff_date === todayIso());
          const realAreas = Object.keys(groupRoomsByArea(catalogFromDb)).filter((area) => area && area !== "General");
          setChecklistArea(firstAvailableChecklistArea(realAreas, todayIso(), todaySignoffs));
        } else {
          const seedCatalog = reindexRoomCatalog(roomCatalog);
          if (seedCatalog.length) {
            await sb("room_catalog", { method: "POST", body: JSON.stringify(seedCatalog.map((room, index) => roomCatalogToRow(room, normalizedHotel.id, index))) });
            setRoomCatalog(seedCatalog);
            setRoomCatalogText(formatRoomCatalog(seedCatalog));
            const todaySignoffs = loadedSignoffs.filter((item) => item.signoff_date === todayIso());
            const realAreas = Object.keys(groupRoomsByArea(seedCatalog)).filter((area) => area && area !== "General");
            setChecklistArea(firstAvailableChecklistArea(realAreas, todayIso(), todaySignoffs));
          }
        }
        setConnection({ status: "online", message: "Sistema sincronizado" });
      } catch (error) {
        console.error(error);
        setConnection({ status: "error", message: `Trabajando en modo seguro local: ${error?.message || "error de sincronización"}` });
      }
    }

    loadSupabase();
  }, [authSession?.access_token]);

  useEffect(() => {
    writeLocal({ hotel, rooms, roomCatalog, roomDate, roomDetails, roomDetailsByDate, reports, incidents, checklistTemplate, tasks, checklistHistory, channels, reservations });
  }, [hotel, rooms, roomCatalog, roomDate, roomDetails, roomDetailsByDate, reports, incidents, checklistTemplate, tasks, checklistHistory, channels, reservations]);

  const latest = reports[0] || defaultReports[0];
  const roomInventory = useMemo(() => {
    const aligned = alignRoomDetailsToCatalog(roomCatalog, roomDetails);
    const withBaseState = aligned.map((room) => ({ ...room, tone: statusTone(room.status), detail: statusDetail(room.status) }));
    return applyReservationsToRooms(withBaseState, reservations, roomDate);
  }, [roomCatalog, roomDetails, reservations, roomDate]);
  const liveRooms = useMemo(() => summarizeRoomDetails(roomInventory), [roomInventory]);
  const occupancy = calculateOccupancy(liveRooms);
  const available = calculateAvailable(liveRooms);
  const availableRooms = useMemo(() => roomInventory.filter((room) => room.status === "Disponible"), [roomInventory]);
  const blockedRooms = useMemo(() => roomInventory.filter((room) => room.status === "Bloqueada" || room.status === "Fuera de servicio"), [roomInventory]);
  const liveBookingSummary = useMemo(() => summarizeRoomBookings(roomInventory), [roomInventory]);
  const liveDirectBookings = liveBookingSummary.byChannel.filter((item) => getChannelBucket(item.channel) === "directBookings").reduce((total, item) => total + item.bookings, 0);
  const liveBookingBookings = liveBookingSummary.byChannel.filter((item) => getChannelBucket(item.channel) === "bookingBookings").reduce((total, item) => total + item.bookings, 0);
  const liveExpediaBookings = liveBookingSummary.byChannel.filter((item) => getChannelBucket(item.channel) === "expediaBookings").reduce((total, item) => total + item.bookings, 0);
  const liveKnownBookings = liveDirectBookings + liveBookingBookings + liveExpediaBookings;
  const bookingShare = liveBookingSummary.occupiedCount ? Math.round((liveBookingBookings / Math.max(liveBookingSummary.occupiedCount, 1)) * 100) : latest ? Math.round((Number(latest.bookingBookings) / Math.max(Number(latest.newBookings), 1)) * 100) : 0;
  const directShare = liveBookingSummary.occupiedCount ? Math.round((liveDirectBookings / Math.max(liveBookingSummary.occupiedCount, 1)) * 100) : latest ? Math.round((Number(latest.directBookings) / Math.max(Number(latest.newBookings), 1)) * 100) : 0;
  const openIncidents = incidents.filter((i) => i.status !== "Cerrada").length;
  const tasksDone = tasks.filter((task) => task.done).length;
  const taskProgress = Math.round((tasksDone / Math.max(tasks.length, 1)) * 100);

  const recommendations = useMemo(() => createRecommendations({ occupancy, bookingShare, directShare, blockedRooms: Number(liveRooms.blocked) || 0, pendingPayments: Number(latest?.pendingPayments) || 0, hotel }), [occupancy, bookingShare, directShare, liveRooms.blocked, latest, hotel]);
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
  const quickRoomAreaOptions = useMemo(() => Object.keys(groupedRooms), [groupedRooms]);
  const quickRoomAreaRooms = useMemo(() => quickRoomArea ? groupedRooms[quickRoomArea] || [] : [], [groupedRooms, quickRoomArea]);
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
  const checklistSignoffsForDate = useMemo(() => checklistHistory.filter((item) => item.signoff_date === checklistDate), [checklistHistory, checklistDate]);
  const groupedChecklistHistory = useMemo(() => {
    return checklistSignoffsForDate.reduce((groups, item) => {
      const area = getChecklistArea(item);
      if (!groups[area]) groups[area] = [];
      groups[area].push(item);
      return groups;
    }, {});
  }, [checklistSignoffsForDate]);
  const checklistAreasCreatedForDate = useMemo(() => checklistSignoffsForDate.map((item) => getChecklistArea(item)), [checklistSignoffsForDate]);
  const selectedChecklistExisting = useMemo(() => findChecklistSignoffFor(checklistDate, checklistArea, checklistHistory), [checklistDate, checklistArea, checklistHistory]);
  const buildingChecklistAreasCreatedForDate = buildingChecklistAreaOptions.filter((area) => checklistAreasCreatedForDate.includes(area));
  const allChecklistAreasClosedForDate = buildingChecklistAreaOptions.length > 0 && buildingChecklistAreaOptions.every((area) => checklistAreasCreatedForDate.includes(area));
  const roomAreaSummaries = useMemo(() => {
    return Object.entries(groupedRooms).map(([area, areaRooms]) => ({ area, ...summarizeAreaRooms(areaRooms) }));
  }, [groupedRooms]);
  const roomBookingSummary = liveBookingSummary;
  const dashboardChannelRows = useMemo(() => {
    if (liveBookingSummary.byChannel.length) {
      return liveBookingSummary.byChannel.map((item) => ({
        name: item.channel,
        bookings: item.bookings,
        revenue: item.revenue,
        commission: channels.find((channel) => normalizeChannelName(channel.name) === normalizeChannelName(item.channel))?.commission || 0,
      }));
    }
    return channels;
  }, [liveBookingSummary, channels]);
  const dashboardRevenue = liveBookingSummary.occupiedCount ? liveBookingSummary.totalRevenue : Number(latest?.revenue || 0);
  const dashboardNewBookings = liveBookingSummary.occupiedCount ? liveBookingSummary.occupiedCount : Number(latest?.newBookings || 0);
  const reportText = useMemo(() => buildReportText({ hotel, latest, rooms, occupancy, available, openIncidents, recommendations, roomAreaSummaries }), [hotel, latest, rooms, occupancy, available, openIncidents, recommendations, roomAreaSummaries]);
  const calendarDays = useMemo(() => Array.from({ length: planningDays }, (_, index) => addDaysIso(startOfWeekIso(calendarStartDate), index)), [calendarStartDate, planningDays]);
  const calendarWeekStart = calendarDays[0];
  const calendarWeekEnd = calendarDays[calendarDays.length - 1];
  const reservationConflicts = useMemo(() => {
    return reservations.filter((reservation, index) => reservations.some((other, otherIndex) => otherIndex !== index && reservationsOverlap(reservation, other)));
  }, [reservations]);
  const blockingReservationConflicts = useMemo(() => {
    return reservations.filter((reservation, index) => reservations.some((other, otherIndex) => otherIndex !== index && reservationsBlockingOverlap(reservation, other)));
  }, [reservations]);
  const reservationForecast = useMemo(() => summarizeReservationForecast(reservations, calendarDays), [reservations, calendarDays]);
  const mobileCalendarSummary = useMemo(() => {
    return calendarDays.map((day) => {
      const active = reservations.filter((reservation) => !isReservationInactive(reservation) && isReservationActiveOnDate(reservation, day));
      const arrivals = reservations.filter((reservation) => !isReservationInactive(reservation) && reservation.checkinDate === day);
      const departures = reservations.filter((reservation) => !isReservationInactive(reservation) && reservation.checkoutDate === day);
      const touched = reservations.filter((reservation) => !isReservationInactive(reservation) && reservationTouchesDate(reservation, day));
      const revenue = active.reduce((total, reservation) => total + reservationNightlyRate(reservation), 0);
      return { day, active, arrivals, departures, touched, revenue };
    });
  }, [calendarDays, reservations]);
  const selectedCalendarDaySummary = useMemo(() => mobileCalendarSummary.find((item) => item.day === selectedCalendarDay) || null, [mobileCalendarSummary, selectedCalendarDay]);
  const selectedCalendarDayReservations = useMemo(() => {
    if (!selectedCalendarDaySummary) return [];
    const byId = new Map();
    [...selectedCalendarDaySummary.arrivals, ...selectedCalendarDaySummary.departures, ...selectedCalendarDaySummary.active].forEach((reservation) => {
      byId.set(reservation.id, reservation);
    });
    return Array.from(byId.values()).sort((a, b) => String(a.roomLabel || "").localeCompare(String(b.roomLabel || "")));
  }, [selectedCalendarDaySummary]);
  const bookingCommissionPct = channels.find((channel) => normalizeChannelName(channel.name).includes("booking"))?.commission || 0;
  const forecastBookingRow = reservationForecast.byChannel.find((item) => normalizeChannelName(item.channel).includes("booking"));
  const forecastDirectRow = reservationForecast.byChannel.find((item) => getChannelBucket(item.channel) === "directBookings");
  const forecastBookingRevenue = Number(forecastBookingRow?.revenue || 0);
  const forecastDirectRevenue = Number(forecastDirectRow?.revenue || 0);
  const forecastBookingShare = reservationForecast.total ? Math.round((forecastBookingRevenue / Math.max(reservationForecast.total, 1)) * 100) : 0;
  const forecastDirectShare = reservationForecast.total ? Math.round((forecastDirectRevenue / Math.max(reservationForecast.total, 1)) * 100) : 0;
  const forecastOccupancy = liveRooms.total ? Math.round((reservationForecast.roomNights / Math.max(liveRooms.total * calendarDays.length, 1)) * 100) : 0;
  const bookingCommissionCost = Math.round((forecastBookingRevenue * bookingCommissionPct / 100) * 100) / 100;
  const bookingNetRevenue = Math.round((forecastBookingRevenue - bookingCommissionCost) * 100) / 100;
  const shouldLimitBooking = forecastOccupancy >= Number(hotel.highOccupancyLimit) && forecastBookingShare >= Number(hotel.bookingRiskLimit);
  const shouldKeepBookingOpen = forecastOccupancy <= Number(hotel.lowOccupancyLimit);
  const bookingDecision = shouldLimitBooking
    ? { tone: "red", title: "Limitar cupo Booking", text: "Alta ocupación prevista y dependencia elevada de Booking. Conviene proteger cupo para web directa, teléfono o ventas sin comisión." }
    : shouldKeepBookingOpen
      ? { tone: "amber", title: "Mantener Booking abierto", text: "La ocupación prevista todavía es baja. Booking puede ayudar a llenar habitaciones, aunque conviene vigilar la comisión." }
      : forecastBookingShare >= Number(hotel.bookingRiskLimit)
        ? { tone: "amber", title: "Vigilar dependencia Booking", text: "Booking pesa mucho en el forecast. No cierres todo todavía, pero revisa cupos, precios y ventajas de venta directa." }
        : { tone: "green", title: "Equilibrio aceptable", text: "La dependencia de Booking está dentro de los límites configurados. Mantén seguimiento diario." };

  const tabs = [
    ["dashboard", "Dirección", "chart"],
    ["daily", "Parte diario", "clipboard"],
    ["tasks", "Checklist", "check"],
    ["incidents", "Incidencias", "alert"],
    ["rooms", "Habitaciones", "bed"],
    ["calendar", "Calendario", "calendar"],
    ["reports", "Informes", "file"],
    ["manual", "Manual operativo", "clipboard"],
    ["setup", "Config.", "settings"],
    ["help", "Ayuda", "sparkles"],
  ];
  const currentRole = authProfile?.role || "Recepción";
  const visibleTabs = tabs.filter(([id]) => canAccessTab(currentRole, id));
  const canManageUsers = currentRole === "Administrador";

  useEffect(() => {
    if (!visibleTabs.length) return;
    if (!canAccessTab(currentRole, active)) {
      setActive(visibleTabs[0][0]);
      setMobileMenuOpen(false);
    }
  }, [currentRole, active, visibleTabs]);

  async function loginWithEmail(e) {
    e.preventDefault();
    if (!HAS_SUPABASE) {
      setConnection({ status: "local", message: "Modo demostración activo." });
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: authForm.email.trim(), password: authForm.password }),
      });

      if (!response.ok) {
        throw new Error("Email o contraseña incorrectos.");
      }

      const session = await response.json();
      writeAuthSession(session);
      setAuthSession(session);
      setAuthUser(session.user || null);
      setAuthForm({ email: "", password: "" });
      setConnection({ status: "loading", message: "Cargando sistema..." });
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: error?.message || "No se pudo iniciar sesión." });
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    try {
      if (authSession?.access_token) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${authSession.access_token}`,
          },
        });
      }
    } catch {
      // Aunque falle el cierre remoto, cerramos sesión localmente.
    }
    writeAuthSession(null);
    setAuthSession(null);
    setAuthUser(null);
    setAuthProfile(null);
    setConnection({ status: "local", message: "Sesión cerrada." });
  }

  function goToTab(id) {
    if (!canAccessTab(currentRole, id)) {
      setLastAction("Tu usuario no tiene permisos para acceder a este apartado.");
      return;
    }
    setActive(id);
    setMobileMenuOpen(false);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  function openDashboardShortcut(tabId, message) {
    goToTab(tabId);
    if (message) setLastAction(message);
  }

  function handleContentSwipe(endX, endY) {
    if (!touchStart) return;
    const deltaX = endX - touchStart.x;
    const deltaY = endY - touchStart.y;
    setTouchStart(null);

    const isMobileWidth = typeof window !== "undefined" && window.innerWidth < 1024;
    const isHorizontalGesture = Math.abs(deltaX) > 90 && Math.abs(deltaX) > Math.abs(deltaY) * 1.8;
    const targetIsInteractive = touchStart.target?.closest?.("button, a, input, textarea, select, summary, [role='dialog']");

    if (!isMobileWidth || !isHorizontalGesture || targetIsInteractive || visibleTabs.length < 2) return;

    const currentIndex = visibleTabs.findIndex(([id]) => id === active);
    if (currentIndex < 0) return;

    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= visibleTabs.length) return;

    const [nextId, nextLabel] = visibleTabs[nextIndex];
    goToTab(nextId);
    setLastAction(`Navegación por gesto: ${nextLabel}`);
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
          setLastAction(`Parte diario guardado correctamente: ${formatDateEs(savedReport.date)}`);
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
      setConnection({ status: "error", message: "No se pudo sincronizar. Cambio guardado localmente." });
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
          throw new Error("No se ha eliminado ninguna fila. Revisa los permisos de borrado.");
        }
      }

      setReports(reports.filter((report) => report.id !== reportToDelete.id));
      setDeleteCandidate(null);
      if (viewingReport?.id === reportToDelete.id) setViewingReport(null);
      setLastAction(`Parte diario eliminado: ${formatDateEs(reportToDelete.date)}`);
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido eliminando el parte";
      setConnection({ status: "error", message: `No se pudo borrar el parte: ${message}` });
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
            throw new Error("No se ha actualizado ninguna fila. Revisa los permisos de edición.");
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
          setLastAction(`Incidencia guardada correctamente: habitación ${savedIncident.room}`);
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
      setConnection({ status: "error", message: `Error guardando incidencia: ${message}` });
      setLastAction(`Fallo al guardar incidencia: ${message}`);
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
      setConnection((current) => HAS_SUPABASE ? { status: "online", message: "Sistema sincronizado" } : current);
      setLastAction(shouldDeleteRemote ? `Incidencia eliminada correctamente: habitación ${incidentToDelete.room}` : `Incidencia eliminada en modo seguro local: habitación ${incidentToDelete.room}`);
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido eliminando la incidencia";
      setLastAction(`No se pudo borrar la incidencia: ${message}`);
      setConnection({ status: "error", message: `No se pudo borrar la incidencia: ${message}` });
    }
  }

  async function updateIncidentStatus(id, status) {
    setIncidents(incidents.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      if (connection.status === "online" && !String(id).startsWith("local-") && !String(id).startsWith("demo-")) {
        const updated = await sb(`incidents?id=eq.${id}&select=*`, { method: "PATCH", body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
        if (!updated || updated.length === 0) {
          throw new Error("No se ha actualizado ninguna fila. Revisa los permisos de edición.");
        }
        setLastAction(`Estado de incidencia actualizado: ${status}`);
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo sincronizar el cambio de incidencia." });
    }
  }

  async function updateTaskDone(id, done) {
    if (checklistSignoff && !editingChecklistId) {
      setLastAction("Checklist cerrado. Pulsa Editar en el cierre correspondiente si necesitas corregirlo.");
      return;
    }

    setTasks(tasks.map((x) => (x.id === id ? { ...x, done } : x)));
    setLastAction(done ? "Tarea marcada como completada" : "Tarea marcada como pendiente");
  }

  async function loadChecklistForDate(dateValue) {
    setChecklistDate(dateValue);
    setEditingChecklistId(null);
    setChecklistResponsible("");
    setChecklistNotes("");

    try {
      if (canUseRemote(connection, hotel, authSession)) {
        const remoteSignoffs = await sb(`checklist_signoffs?select=*&hotel_id=eq.${hotel.id}&signoff_date=eq.${dateValue}&order=created_at.desc`);

        const daySignoffs = remoteSignoffs || [];
        setChecklistHistory((current) => [...daySignoffs, ...current.filter((item) => item.signoff_date !== dateValue)]);
        const nextArea = firstAvailableChecklistArea(buildingChecklistAreaOptions, dateValue, daySignoffs);
        setChecklistArea(nextArea);
        setChecklistSignoff(null);
        setEditingChecklistId(null);
        setChecklistResponsible("");
        setChecklistNotes("");
        setTasks(emptyDefaultTasks(checklistTemplate));
        setLastAction(`Checklist nuevo preparado para ${formatDateEs(dateValue)} · ${nextArea}. Para corregir uno ya cerrado, pulsa Editar en su tarjeta.`);
      } else {
        const nextArea = firstAvailableChecklistArea(buildingChecklistAreaOptions, dateValue, checklistHistory);
        setChecklistArea(nextArea);
        setChecklistSignoff(null);
        setEditingChecklistId(null);
        setChecklistResponsible("");
        setChecklistNotes("");
        setTasks(emptyDefaultTasks(checklistTemplate));
        setLastAction(`Checklist local nuevo preparado para ${formatDateEs(dateValue)} · ${nextArea}`);
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo cargar el checklist de esa fecha." });
    }
  }

  async function createBlankChecklistForDate(dateValue) {
    const daySignoffs = checklistHistory.filter((item) => item.signoff_date === dateValue);
    const nextArea = firstAvailableChecklistArea(buildingChecklistAreaOptions, dateValue, daySignoffs);
    setChecklistDate(dateValue);
    setChecklistSignoff(null);
    setEditingChecklistId(null);
    setChecklistResponsible("");
    setChecklistArea(nextArea);
    setChecklistNotes("");
    setTasks(emptyDefaultTasks(checklistTemplate));
    setLastAction(`Nuevo checklist en blanco para ${formatDateEs(dateValue)} · ${nextArea}.`);
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
      if (canUseRemote(connection, hotel, authSession)) {
        if (checklistSignoff?.id) {
          const updated = await sb(`checklist_signoffs?id=eq.${checklistSignoff.id}&select=*`, { method: "PATCH", body: JSON.stringify(payload) });
          if (!updated?.[0]?.id) {
            throw new Error("Supabase no devolvió el cierre actualizado. Revisa permisos RLS de checklist_signoffs.");
          }
          const saved = updated[0];
          setChecklistSignoff(saved);
          setChecklistHistory(checklistHistory.map((item) => item.id === saved.id ? saved : item));
          setLastAction(`Cierre de checklist actualizado: ${formatDateEs(saved.signoff_date)}`);
        } else {
          const inserted = await sb("checklist_signoffs?select=*", { method: "POST", body: JSON.stringify(payload) });
          if (!inserted?.[0]?.id) {
            throw new Error("Supabase no devolvió el cierre guardado. Revisa permisos RLS de checklist_signoffs.");
          }
          const saved = inserted[0];
          setChecklistSignoff(saved);
          setChecklistHistory([saved, ...checklistHistory.filter((item) => item.id !== saved.id)]);
          setLastAction(hasPending ? "Checklist cerrado con tareas pendientes y sincronizado" : "Checklist aceptado como correcto y sincronizado");
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
      if (canUseRemote(connection, hotel, authSession)) {
        setTasks(emptyDefaultTasks(checklistTemplate).map((task, index) => ({ ...task, done: index < Number(item.completed_count || 0) })));
      } else {
        setTasks(emptyDefaultTasks(checklistTemplate).map((task, index) => ({ ...task, done: index < Number(item.completed_count || 0) })));
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
          throw new Error("No se ha eliminado ninguna fila. Revisa los permisos de borrado del checklist.");
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
      setConnection({ status: "error", message: `No se pudo borrar el cierre de checklist: ${message}` });
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

        setHasUnsavedRoomChanges(false);
        setLastAction(`Estado de habitaciones guardado para ${formatDateEs(roomDate)}`);
      } else {
        setHasUnsavedRoomChanges(false);
        setLastAction(`Estado de habitaciones guardado en modo local para ${formatDateEs(roomDate)}`);
      }
    } catch (error) {
      console.error(error);
      const message = error?.message || "Error desconocido guardando habitaciones";
      setConnection({ status: "error", message: `No se pudo guardar el estado de habitaciones: ${message}` });
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

  function resetRoomDayFromReservations() {
    setResetRoomsCandidate(false);
    const cleanDetails = roomCatalog.map((room) => ({
      ...room,
      status: "Disponible",
      notes: "",
      bookingChannel: "",
      bookingAmount: "",
      bookingReference: "",
      note: "",
      tone: statusTone("Disponible"),
      detail: statusDetail("Disponible"),
    }));

    setRoomDetails(cleanDetails);
    setRoomDetailsByDate((current) => ({ ...current, [roomDate]: cleanDetails }));
    setRooms(summarizeRoomDetails(applyReservationsToRooms(cleanDetails, reservations, roomDate)));
    setHasUnsavedRoomChanges(true);
    setLastAction(`Foto diaria limpiada para ${formatDateEs(roomDate)}. Las reservas activas del planning volverán a marcar ocupadas automáticamente. Pulsa Guardar estado.`);
  }

  function updateRoomStatus(room, status, bookingData = {}) {
    const next = roomInventory.map((item) => {
      const sameRoom = item.id === room.id || item.label === room.label;
      if (!sameRoom) return item;
      const nextRoom = {
        ...item,
        ...bookingData,
        status,
        tone: statusTone(status),
        detail: statusDetail(status),
      };
      if (status !== "Ocupada") {
        nextRoom.bookingChannel = "";
        nextRoom.bookingAmount = "";
        nextRoom.bookingReference = "";
      }
      return nextRoom;
    });
    setRoomDetails(next);
    setRoomDetailsByDate((current) => ({ ...current, [roomDate]: next }));
    setRooms(summarizeRoomDetails(next));
    const pendingText = status === "Ocupada" && !bookingData.bookingChannel && !room.bookingChannel ? " · canal pendiente" : "";
    setHasUnsavedRoomChanges(true);
    setLastAction(`Estado actualizado: ${room.label || `${room.area} · ${room.number}`} → ${status}${pendingText}`);
  }

  function applyQuickRoomStatus() {
    const room = quickRoomAreaRooms.find((item) => item.id === quickRoomId);
    if (!room) {
      setLastAction("Selecciona edificio y habitación antes de aplicar el cambio rápido.");
      return;
    }
    updateRoomStatus(room, quickRoomStatus);
  }

  function openRoomStatusModal(room) {
    setRoomStatusModal({ ...room, status: room.status || "Disponible" });
  }

  function saveRoomStatusModal() {
    if (!roomStatusModal) return;
    updateRoomStatus(roomStatusModal, roomStatusModal.status, {
      bookingChannel: roomStatusModal.bookingChannel || "",
      bookingAmount: roomStatusModal.bookingAmount || "",
      bookingReference: roomStatusModal.bookingReference || "",
      note: roomStatusModal.note || "",
    });
    setRoomStatusModal(null);
  }

  function applyRoomBookingSummaryToReport() {
    const summary = summarizeRoomBookings(roomInventory);
    const values = {
      newBookings: summary.occupiedCount,
      directBookings: 0,
      bookingBookings: 0,
      expediaBookings: 0,
      revenue: summary.totalRevenue,
    };

    summary.byChannel.forEach((item) => {
      const bucket = getChannelBucket(item.channel);
      if (bucket !== "other") values[bucket] += item.bookings;
    });

    setForm((current) => ({
      ...current,
      newBookings: values.newBookings,
      directBookings: values.directBookings,
      bookingBookings: values.bookingBookings,
      expediaBookings: values.expediaBookings,
      revenue: values.revenue,
    }));

    setLastAction(`Producción aplicada al parte diario desde habitaciones: ${values.newBookings} ocupadas · ${values.revenue}${hotel.currency}`);
  }

  function findReservationConflict(draft, ignoreId = null) {
    return reservations.find((reservation) => reservation.id !== ignoreId && reservationsBlockingOverlap(draft, reservation));
  }

  function getAvailableRoomsForDraft(draft, ignoreId = null) {
    return roomOptions.filter((roomLabel) => {
      const testDraft = { ...draft, roomLabel };
      return !reservations.some((reservation) => reservation.id !== ignoreId && reservationsBlockingOverlap(testDraft, reservation));
    });
  }

  function resolveReservationConflictWithRoom(roomLabel) {
    if (!reservationConflictCandidate?.draft) return;
    const draft = { ...reservationConflictCandidate.draft, roomLabel };
    setReservationConflictCandidate(null);
    setReservationModal({ ...draft, mode: draft.mode || "new" });
    setLastAction(`Habitación cambiada a ${roomLabel}. Revisa y guarda la reserva.`);
  }

  async function addReservation(e) {
    e.preventDefault();
    if (!reservationForm.roomLabel || !reservationForm.checkinDate || !reservationForm.checkoutDate) {
      setLastAction("Selecciona habitación, entrada y salida para crear la reserva.");
      return;
    }
    if (reservationForm.checkoutDate <= reservationForm.checkinDate) {
      setLastAction("La fecha de salida debe ser posterior a la fecha de entrada.");
      return;
    }

    const draft = {
      ...reservationForm,
      id: `local-reservation-${Date.now()}`,
      nightlyRate: Number(reservationForm.nightlyRate) || 0,
      totalAmount: calculateTotalFromNightly(reservationForm),
      guestName: reservationForm.guestName || "Reserva sin nombre",
      channel: reservationForm.channel || "Pendiente",
    };
    const conflict = findReservationConflict(draft);
    if (conflict) {
      setReservationConflictCandidate({ draft: { ...draft, mode: "new" }, conflict, source: "form" });
      setLastAction(`No se puede guardar: ${draft.roomLabel} ya está ocupada en esas fechas.`);
      return;
    }

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const inserted = await sb("reservations?select=*", { method: "POST", body: JSON.stringify(reservationToRow(draft, hotel.id)) });
        const saved = inserted?.[0] ? reservationFromRow(inserted[0]) : draft;
        setReservations([saved, ...reservations]);
        setLastAction(`Reserva creada correctamente: ${saved.roomLabel} · ${formatDateEs(saved.checkinDate)} → ${formatDateEs(saved.checkoutDate)}`);
      } else {
        setReservations([draft, ...reservations]);
        setLastAction(conflict ? `Reserva creada con aviso de posible overbooking en ${draft.roomLabel}.` : `Reserva creada: ${draft.roomLabel} · ${formatDateEs(draft.checkinDate)} → ${formatDateEs(draft.checkoutDate)}`);
      }
    } catch (error) {
      console.error(error);
      setReservations([draft, ...reservations]);
      setConnection({ status: "error", message: "No se pudo sincronizar la reserva. Guardada en modo seguro local." });
      setLastAction("Reserva guardada en modo seguro local por un problema de sincronización.");
    }

    setReservationForm({ roomLabel: "", guestName: "", channel: "", checkinDate: calendarStartDate, checkoutDate: addDaysIso(calendarStartDate, 1), nightlyRate: 0, totalAmount: 0, reference: "", phone: "", email: "", status: "Confirmada", notes: "" });
  }

  async function updateReservationStatus(id, status) {
    const reservationToUpdate = reservations.find((reservation) => reservation.id === id);
    if (!reservationToUpdate) return;
    const updatedReservation = { ...reservationToUpdate, status };

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID && !String(id).startsWith("local-") && !String(id).startsWith("draft-") && !String(id).startsWith("demo-")) {
        const updated = await sb(`reservations?id=eq.${id}&select=*`, { method: "PATCH", body: JSON.stringify({ status }) });
        const remoteSaved = updated?.[0] ? reservationFromRow(updated[0]) : updatedReservation;
        setReservations(reservations.map((reservation) => reservation.id === id ? remoteSaved : reservation));
      } else {
        setReservations(reservations.map((reservation) => reservation.id === id ? updatedReservation : reservation));
      }
      setLastAction(`Reserva marcada como ${status}: ${reservationToUpdate.roomLabel}.`);
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo cambiar el estado de la reserva." });
      setLastAction("No se pudo cambiar el estado de la reserva.");
    }
  }

  function convertConflictDraftToTentative() {
    if (!reservationConflictCandidate?.draft) return;
    const draft = { ...reservationConflictCandidate.draft, status: "Tentativa" };
    setReservationConflictCandidate(null);
    setReservationModal({ ...draft, mode: draft.mode || "new" });
    setLastAction("Reserva cambiada a Tentativa. Revisa los datos y pulsa Guardar reserva.");
  }

  async function deleteReservation(id) {
    const reservationToDelete = reservations.find((reservation) => reservation.id === id);
    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID && !String(id).startsWith("local-") && !String(id).startsWith("draft-") && !String(id).startsWith("demo-")) {
        await sb(`reservations?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      }
      setReservations(reservations.filter((reservation) => reservation.id !== id));
      setReservationModal(null);
      setLastAction(`Reserva eliminada: ${reservationToDelete?.roomLabel || "planning"}.`);
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo borrar la reserva." });
      setLastAction("No se pudo borrar la reserva.");
    }
  }

  function openReservationModal(reservation) {
    setRoomStatusModal(null);
    setViewingReport(null);
    setViewingIncident(null);
    setViewingChecklist(null);
    setReservationModal({ ...reservation, mode: "edit" });
  }

  function openNewReservationModal(roomLabel, day) {
    setRoomStatusModal(null);
    setReservationModal({
      id: `draft-reservation-${Date.now()}`,
      mode: "new",
      roomLabel,
      guestName: "",
      channel: "",
      checkinDate: day,
      checkoutDate: addDaysIso(day, 1),
      nightlyRate: 0,
      totalAmount: 0,
      reference: "",
      phone: "",
      email: "",
      status: "Confirmada",
      notes: "",
    });
  }

  async function saveReservationModal() {
    if (!reservationModal?.roomLabel || !reservationModal?.checkinDate || !reservationModal?.checkoutDate) {
      setLastAction("Selecciona habitación, entrada y salida para guardar la reserva.");
      return;
    }
    if (reservationModal.checkoutDate <= reservationModal.checkinDate) {
      setLastAction("La fecha de salida debe ser posterior a la fecha de entrada.");
      return;
    }

    const saved = {
      ...reservationModal,
      mode: undefined,
      id: reservationModal.mode === "new" ? `local-reservation-${Date.now()}` : reservationModal.id,
      guestName: reservationModal.guestName || "Reserva sin nombre",
      channel: reservationModal.channel || "Pendiente",
      nightlyRate: Number(reservationModal.nightlyRate) || reservationNightlyRate(reservationModal),
      totalAmount: calculateTotalFromNightly(reservationModal),
    };

    const conflict = findReservationConflict(saved, reservationModal.id);
    if (conflict) {
      setReservationConflictCandidate({ draft: saved, conflict, source: "modal" });
      setLastAction(`No se puede guardar: ${saved.roomLabel} ya está ocupada en esas fechas.`);
      return;
    }

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        if (reservationModal.mode === "new" || String(reservationModal.id).startsWith("draft-") || String(reservationModal.id).startsWith("local-")) {
          const inserted = await sb("reservations?select=*", { method: "POST", body: JSON.stringify(reservationToRow(saved, hotel.id)) });
          const remoteSaved = inserted?.[0] ? reservationFromRow(inserted[0]) : saved;
          setReservations([remoteSaved, ...reservations]);
          setLastAction(`Reserva guardada correctamente: ${remoteSaved.roomLabel}`);
        } else {
          const updated = await sb(`reservations?id=eq.${reservationModal.id}&select=*`, { method: "PATCH", body: JSON.stringify(reservationToRow(saved, hotel.id)) });
          const remoteSaved = updated?.[0] ? reservationFromRow(updated[0]) : saved;
          setReservations(reservations.map((reservation) => reservation.id === reservationModal.id ? remoteSaved : reservation));
          setLastAction(`Reserva actualizada: ${remoteSaved.roomLabel}`);
        }
      } else {
        setReservations(reservationModal.mode === "new" ? [saved, ...reservations] : reservations.map((reservation) => reservation.id === reservationModal.id ? saved : reservation));
        setLastAction(`Reserva guardada: ${saved.roomLabel} · ${formatDateEs(saved.checkinDate)} → ${formatDateEs(saved.checkoutDate)}`);
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo sincronizar la reserva. Guardada en modo seguro local." });
      setReservations(reservationModal.mode === "new" ? [saved, ...reservations] : reservations.map((reservation) => reservation.id === reservationModal.id ? saved : reservation));
      setLastAction("Reserva guardada en modo seguro local por un problema de sincronización.");
    }

    setReservationModal(null);
  }

  function loadReservationInRooms(reservation) {
    setRoomDate(reservation.checkinDate);
    loadRoomsForDate(reservation.checkinDate);
    goToTab("rooms");
  }

  async function saveHotelConfig() {
    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const updated = await sb(`hotels?id=eq.${hotel.id}&select=*`, { method: "PATCH", body: JSON.stringify(hotelToRow(hotel)) });
        if (updated?.[0]) setHotel(normalizeHotel(updated[0]));
        setLastAction("Configuración del hotel guardada correctamente");
      } else {
        setLastAction("Configuración guardada en modo local");
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo guardar la configuración del hotel." });
    }
  }

  async function saveRoomCatalogToSupabase() {
    const normalizedCatalog = reindexRoomCatalog(roomCatalog);
    if (!normalizedCatalog.length) {
      setLastAction("No hay habitaciones en el catálogo para guardar.");
      return;
    }

    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        await sb(`room_catalog?hotel_id=eq.${hotel.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        await sb("room_catalog", { method: "POST", body: JSON.stringify(normalizedCatalog.map((room, index) => roomCatalogToRow(room, hotel.id, index))) });
        setRoomCatalog(normalizedCatalog);
        setRoomDetails((current) => alignRoomDetailsToCatalog(normalizedCatalog, current));
        setHasUnsavedCatalogChanges(false);
        setCatalogSaveReminder(null);
        setLastAction("Catálogo de edificios y habitaciones guardado correctamente.");
      } else {
        setRoomCatalog(normalizedCatalog);
        setRoomDetails((current) => alignRoomDetailsToCatalog(normalizedCatalog, current));
        setHasUnsavedCatalogChanges(false);
        setCatalogSaveReminder(null);
        setLastAction("Catálogo guardado en modo seguro local.");
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudo guardar el catálogo de habitaciones." });
      setLastAction("No se pudo guardar el catálogo de habitaciones.");
    }
  }

  function renameCatalogArea(oldArea, newArea) {
    const cleanName = newArea.trim();
    if (!cleanName) {
      setLastAction("El nombre del edificio no puede estar vacío.");
      return;
    }
    if (cleanName !== oldArea && roomCatalog.some((room) => room.area === cleanName)) {
      setLastAction(`Ya existe un edificio llamado ${cleanName}.`);
      return;
    }

    setRoomCatalog((current) => reindexRoomCatalog(current.map((room) => {
      if (room.area !== oldArea) return room;
      return { ...room, area: cleanName, label: `${cleanName} · ${room.number}` };
    })));
    setRoomDetails((current) => current.map((room) => {
      if (room.area !== oldArea) return room;
      return { ...room, area: cleanName, label: `${cleanName} · ${room.number}` };
    }));
    setRoomDetailsByDate((current) => {
      const next = {};
      Object.entries(current || {}).forEach(([date, details]) => {
        next[date] = (details || []).map((room) => room.area === oldArea ? { ...room, area: cleanName, label: `${cleanName} · ${room.number}` } : room);
      });
      return next;
    });
    setAreaRenameCandidate(null);
    setHasUnsavedCatalogChanges(true);
    setCatalogSaveReminder({ title: "Edificio renombrado", text: `Has renombrado ${oldArea} como ${cleanName}. Para que se vea igual en todos los equipos, guarda el catálogo.` });
    setLastAction(`Edificio renombrado: ${oldArea} → ${cleanName}. Pulsa Guardar catálogo para conservar el cambio.`);
  }

  function requestDeleteCatalogArea(area) {
    const areaRooms = roomCatalog.filter((room) => room.area === area);
    const relatedReservations = reservations.filter((reservation) => String(reservation.roomLabel || "").startsWith(`${area} ·`));
    const relatedIncidents = incidents.filter((incident) => String(incident.room || "").startsWith(`${area} ·`));
    const relatedRoomSnapshots = Object.values(roomDetailsByDate || {}).reduce((total, details) => total + (details || []).filter((room) => room.area === area).length, 0);
    const hasData = relatedReservations.length > 0 || relatedIncidents.length > 0 || relatedRoomSnapshots > 0;

    setAreaDeleteCandidate({
      area,
      count: areaRooms.length,
      reservationsCount: relatedReservations.length,
      incidentsCount: relatedIncidents.length,
      roomSnapshotsCount: relatedRoomSnapshots,
      hasData,
      confirmText: "",
    });
  }

  function confirmDeleteCatalogArea() {
    if (!areaDeleteCandidate?.area) return;
    const area = areaDeleteCandidate.area;

    if (areaDeleteCandidate.hasData && areaDeleteCandidate.confirmText !== "BORRAR") {
      setLastAction("Para borrar un edificio con datos asociados escribe BORRAR en la confirmación.");
      return;
    }
    const nextCatalog = reindexRoomCatalog(roomCatalog.filter((room) => room.area !== area));
    setRoomCatalog(nextCatalog);
    setRoomCatalogText(formatRoomCatalog(nextCatalog));
    setRoomDetails((current) => current.filter((room) => room.area !== area));
    setRoomDetailsByDate((current) => {
      const next = {};
      Object.entries(current || {}).forEach(([date, details]) => {
        next[date] = (details || []).filter((room) => room.area !== area);
      });
      return next;
    });
    setRooms(summarizeRoomDetails(nextCatalog.map((room) => ({ ...room, status: "Disponible" }))));
    setAreaDeleteCandidate(null);
    setHasUnsavedCatalogChanges(true);
    setCatalogSaveReminder({ title: "Edificio eliminado", text: `Has eliminado ${area} del catálogo visible. Las reservas e incidencias históricas no se han borrado. Guarda el catálogo para sincronizarlo.` });
    setLastAction(`Edificio eliminado del catálogo: ${area}. Las reservas e incidencias históricas no se han borrado. Pulsa Guardar catálogo para conservar el cambio.`);
  }

  function moveCatalogArea(area, direction) {
    const grouped = Object.entries(groupRoomsByArea(roomCatalog));
    const currentIndex = grouped.findIndex(([name]) => name === area);
    if (currentIndex < 0) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= grouped.length) return;

    const nextGroups = [...grouped];
    const [moved] = nextGroups.splice(currentIndex, 1);
    nextGroups.splice(targetIndex, 0, moved);

    const nextCatalog = reindexRoomCatalog(nextGroups.flatMap(([, areaRooms]) => areaRooms));
    const alignedDetails = alignRoomDetailsToCatalog(nextCatalog, roomDetails);
    setRoomCatalog(nextCatalog);
    setRoomCatalogText(formatRoomCatalog(nextCatalog));
    setRoomDetails(alignedDetails);
    setRoomDetailsByDate((current) => ({ ...current, [roomDate]: alignedDetails }));
    setHasUnsavedCatalogChanges(true);
    setCatalogSaveReminder({ title: "Orden de edificios cambiado", text: `Has movido ${area}. Guarda el catálogo para que el orden se mantenga al refrescar y en todos los equipos.` });
    setLastAction(`Orden actualizado: ${area}. Pulsa Guardar catálogo para conservar el cambio.`);
  }

  async function saveChannels() {
    try {
      if (connection.status === "online" && hotel.id !== DEMO_HOTEL_ID) {
        const remoteChannels = channels.filter((channel) => channel.id && !String(channel.id).startsWith("local-"));
        const localChannels = channels.filter((channel) => !channel.id || String(channel.id).startsWith("local-"));

        await Promise.all(remoteChannels.map((channel) => sb(`sales_channels?id=eq.${channel.id}`, { method: "PATCH", body: JSON.stringify(channelToRow(channel, hotel.id)) })));

        if (localChannels.length) {
          const inserted = await sb("sales_channels?select=*", { method: "POST", body: JSON.stringify(localChannels.map((channel) => channelToRow(channel, hotel.id))) });
          if (inserted?.length) {
            const insertedNames = new Set(inserted.map((row) => row.name));
            setChannels([
              ...channels.filter((channel) => !String(channel.id || "").startsWith("local-") || !insertedNames.has(channel.name)),
              ...inserted.map(channelFromRow),
            ]);
          }
        }

        setLastAction("Canales de venta guardados correctamente");
      } else {
        setLastAction("Canales de venta guardados en modo local");
      }
    } catch (error) {
      console.error(error);
      setConnection({ status: "error", message: "No se pudieron guardar los canales." });
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

  function exportBackup() {
    const data = {
      exportedAt: new Date().toISOString(),
      app: "Hotel Daily Control",
      hotel,
      rooms,
      roomCatalog,
      roomDate,
      roomDetails,
      roomDetailsByDate,
      reports,
      incidents,
      checklistTemplate,
      tasks,
      channels,
      reservations,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotel-daily-control-backup-${todayIso()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLastAction("Copia de seguridad descargada en formato JSON.");
  }

  function resetDemo() {
    setHotel(defaultHotel);
    setRooms(defaultRooms);
    setRoomDetails(buildRoomInventory(defaultRooms, roomCatalog));
    setReports(defaultReports);
    setIncidents(defaultIncidents);
    setTasks(emptyDefaultTasks(checklistTemplate));
    setChannels(defaultChannels);
    setConnection({ status: HAS_SUPABASE ? "loading" : "local", message: HAS_SUPABASE ? "Recarga la página para reconectar el sistema" : "Modo demostración" });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
  }

  function updateChannel(index, key, value) {
    setChannels(channels.map((channel, i) => (i === index ? { ...channel, [key]: key === "name" ? value : Number(value) } : channel)));
  }

  function addChannel() {
    setChannels([
      ...channels,
      { id: `local-channel-${Date.now()}`, name: "Nuevo canal", bookings: 0, revenue: 0, commission: 0 },
    ]);
    setLastAction("Nuevo canal añadido. Edita el nombre y pulsa Guardar canales.");
  }

  function deleteChannel(index) {
    const removed = channels[index];
    setChannels(channels.filter((_, i) => i !== index));
    setLastAction(`Canal eliminado de la configuración: ${removed?.name || "canal"}. Pulsa Guardar canales para conservar el cambio.`);
  }

  function updateChecklistTemplate(index, key, value) {
    setChecklistTemplate(normalizeChecklistTemplate(checklistTemplate.map((task, i) => (i === index ? { ...task, [key]: value } : task))));
  }

  function addChecklistTemplateTask() {
    setChecklistTemplate(normalizeChecklistTemplate([
      ...checklistTemplate,
      { id: `template-${Date.now()}`, area: "Apertura", title: "Nueva tarea del checklist", done: false },
    ]));
    setLastAction("Nueva tarea añadida a la plantilla del checklist. Puedes editarla y se usará en nuevos checklists.");
  }

  function deleteChecklistTemplateTask(index) {
    setChecklistTemplate(normalizeChecklistTemplate(checklistTemplate.filter((_, i) => i !== index)));
    setLastAction("Tarea eliminada de la plantilla del checklist. No afecta a cierres ya guardados.");
  }

  function resetChecklistTemplate() {
    setChecklistTemplate(normalizeChecklistTemplate(defaultTasks));
    setLastAction("Plantilla del checklist restaurada a la versión base de 16 tareas.");
  }

  function applyRoomCatalogText() {
    const parsedCatalog = reindexRoomCatalog(parseRoomCatalog(roomCatalogText));
    const alignedDetails = alignRoomDetailsToCatalog(parsedCatalog, roomDetails);
    const summarizedRooms = summarizeRoomDetails(alignedDetails);
    setRoomCatalog(parsedCatalog);
    setRoomDetails(alignedDetails);
    setRooms(summarizedRooms);
    setRoomDetailsByDate((current) => ({ ...current, [roomDate]: alignedDetails }));
    setRoomCatalogText(formatRoomCatalog(parsedCatalog));
    setHasUnsavedCatalogChanges(true);
    setCatalogSaveReminder({ title: "Catálogo aplicado", text: "Has aplicado cambios desde el texto del catálogo. Guarda el catálogo para sincronizarlo con todos los equipos." });
    setLastAction(`Catálogo de habitaciones actualizado: ${parsedCatalog.length} habitaciones configuradas. Pulsa Guardar catálogo para conservar el cambio.`);
  }

  function resetRoomCatalogFromCurrent() {
    const text = formatRoomCatalog(roomCatalog);
    setRoomCatalogText(text);
    setLastAction("Catálogo de habitaciones restaurado desde la configuración actual.");
  }

  function addRoomAreaToCatalog() {
    const area = (newRoomArea || "Nuevo edificio").trim();
    const start = Number(newRoomStart) || 1;
    const count = Math.max(Number(newRoomCount) || 1, 1);
    const existingKeys = new Set(roomCatalog.map((room) => `${room.area}::${room.number}`));
    const generatedRooms = Array.from({ length: count }, (_, index) => {
      const number = String(start + index);
      return {
        id: `${area}-${number}-${Date.now()}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        area,
        number,
        label: `${area} · ${number}`,
        sortOrder: roomCatalog.length + index + 1,
      };
    }).filter((room) => !existingKeys.has(`${room.area}::${room.number}`));

    if (!generatedRooms.length) {
      setLastAction(`No se añadieron habitaciones porque ${area} ya tiene esos números en el catálogo.`);
      return;
    }

    const nextCatalog = reindexRoomCatalog([...roomCatalog, ...generatedRooms]);
    const alignedDetails = alignRoomDetailsToCatalog(nextCatalog, roomDetails);
    setRoomCatalog(nextCatalog);
    setRoomCatalogText(formatRoomCatalog(nextCatalog));
    setRoomDetails(alignedDetails);
    setRooms(summarizeRoomDetails(alignedDetails));
    setRoomDetailsByDate((current) => ({ ...current, [roomDate]: alignedDetails }));
    setHasUnsavedCatalogChanges(true);
    setCatalogSaveReminder({ title: "Edificio añadido", text: `${generatedRooms.length} habitaciones añadidas a ${area}. Guarda el catálogo para que aparezca igual en producción y en todos los equipos.` });

    setNewRoomArea("");
    setNewRoomStart("101");
    setNewRoomCount(10);
    setLastAction(`${generatedRooms.length} habitaciones añadidas al catálogo para ${area}. Pulsa Guardar catálogo para conservar el cambio.`);
  }

  function clearRoomCatalogText() {
    setRoomCatalogText("");
    setLastAction("Catálogo en edición vaciado. Pulsa Guardar catálogo solo si quieres aplicar el cambio.");
  }

  const activeTabLabel = visibleTabs.find(([id]) => id === active)?.[1] || "Dirección";
  const connectionTone = connection.status === "online" ? "green" : connection.status === "error" ? "red" : connection.status === "loading" ? "amber" : "slate";
  const connectionIcon = connection.status === "online" ? "check" : "offline";

  if (HAS_SUPABASE && !authSession?.access_token) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] px-4 py-8 text-slate-900">
        <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center">
          <Card className="w-full max-w-md">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 inline-flex rounded-3xl bg-gradient-to-br from-[#3f7895] to-slate-800 p-4 text-white shadow-sm">
                <Icon name="hotel" size={34} />
              </div>
              <h1 className="text-2xl font-bold">Hotel Daily Control</h1>
              <p className="mt-2 text-sm text-slate-500">Acceso interno para recepción, dirección y operativa.</p>
            </div>

            <form onSubmit={loginWithEmail} className="space-y-4">
              <Field label="Email">
                <input className={inputStyle} type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="usuario@hotel.com" autoComplete="email" required />
              </Field>
              <Field label="Contraseña">
                <input className={inputStyle} type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="Contraseña" autoComplete="current-password" required />
              </Field>
              <button className={cls(buttonDark, "w-full")} type="submit" disabled={authLoading}>
                <Icon name="lock" size={18} /> {authLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            {connection.message && (
              <div className={cls("mt-4 rounded-2xl border p-4 text-sm", connection.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-600")}>
                {connection.message}
              </div>
            )}

            <p className="mt-5 text-center text-xs text-slate-400">Desarrollado por Vielha Computer</p>
          </Card>
        </div>
      </div>
    );
  }

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
            <Badge tone={connectionTone}><span className="inline-flex items-center gap-1"><Icon name={connectionIcon} size={14} /> {connection.status === "online" ? "Sistema OK" : connection.status === "loading" ? "Preparando" : "Modo seguro"}</span></Badge>
            <button className="inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50" type="button" onClick={exportBackup}><Icon name="copy" size={14} /> <span className="hidden sm:inline">Copia JSON</span><span className="sm:hidden">Copia</span></button>
            {authProfile && <Badge tone="blue"><span className="inline-flex items-center gap-1"><Icon name="user" size={14} /> <span className="hidden sm:inline">{authProfile.fullName} · </span>{authProfile.role}</span></Badge>}
            {HAS_SUPABASE && authSession?.access_token && <button className="hidden rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex" type="button" onClick={logout}>Salir</button>}
            <button className="rounded-2xl border border-slate-300 bg-white p-2 text-slate-700 shadow-sm lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Abrir menú">
              <Icon name="menu" size={22} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-3 py-3 lg:hidden">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">{authProfile ? `${authProfile.fullName} · ${authProfile.role}` : "Usuario"}</span>
              {HAS_SUPABASE && authSession?.access_token && <button className="font-bold text-[#2f5f7a]" type="button" onClick={logout}>Salir</button>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {visibleTabs.map(([id, label, icon]) => (
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
            {visibleTabs.map(([id, label, icon]) => (
              <button key={id} onClick={() => goToTab(id)} className={cls("flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition", active === id ? "bg-[#2f5f7a] text-white shadow-sm" : "text-slate-600 hover:bg-sky-50 hover:text-sky-900")}>
                <Icon name={icon} size={18} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section
          className="space-y-5 sm:space-y-6"
          onTouchStart={(event) => setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY, target: event.target })}
          onTouchEnd={(event) => handleContentSwipe(event.changedTouches[0].clientX, event.changedTouches[0].clientY)}
        >
          {connection.message && (
            <Card className={connection.status === "error" ? "border-red-200 bg-red-50" : connection.status === "online" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}>
              <div className="flex items-start gap-3 text-sm">
                <Icon name={connectionIcon} size={20} />
                <div>
                  <b>Estado del sistema:</b> {connection.message}
                  {connection.status === "online" && <p className="text-slate-600">Los cambios se están guardando correctamente.</p>}
                  {lastAction && <p className="mt-1 font-semibold text-slate-700">Última acción: {lastAction}</p>}
                </div>
              </div>
            </Card>
          )}

          {active === "dashboard" && (
            <div className="space-y-5 sm:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <Stat
                  icon="bed"
                  label="Ocupación"
                  value={`${occupancy}%`}
                  hint={`${liveRooms.occupied}/${liveRooms.total} ocupadas · ${formatDateEs(roomDate)}`}
                  actionLabel="Ver habitaciones"
                  onClick={() => openDashboardShortcut("rooms", "Detalle de ocupación abierto desde Dirección.")}
                />
                <Stat
                  icon="calendar"
                  label="Disponibles"
                  value={available}
                  hint={`${liveRooms.blocked} bloqueadas/FDS`}
                  actionLabel="Ver disponibles"
                  onClick={() => openDashboardShortcut("rooms", "Habitaciones disponibles abiertas desde Dirección.")}
                />
                <Stat
                  icon="euro"
                  label="Ingresos día"
                  value={`${dashboardRevenue}${hotel.currency}`}
                  hint={liveBookingSummary.occupiedCount ? "Calculado desde reservas activas" : `${latest.pendingPayments}${hotel.currency} pendientes`}
                  actionLabel="Abrir parte diario"
                  onClick={() => openDashboardShortcut("daily", "Parte diario abierto desde ingresos del día.")}
                />
                <Stat
                  icon="alert"
                  label="Incidencias"
                  value={openIncidents}
                  hint="Abiertas"
                  actionLabel="Ver incidencias"
                  onClick={() => openDashboardShortcut("incidents", "Incidencias abiertas desde Dirección.")}
                />
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
                  <p className="mb-4 text-sm text-slate-500">Control para reducir comisiones y proteger venta directa. Calculado desde la ocupación activa del día.</p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge tone="blue">{dashboardNewBookings} ocupadas</Badge>
                    <Badge tone={directShare >= Number(hotel.directBookingGoal) ? "green" : "amber"}>Web directa {directShare}%</Badge>
                    <Badge tone={bookingShare > Number(hotel.bookingRiskLimit) ? "red" : "slate"}>Booking {bookingShare}%</Badge>
                    {liveBookingSummary.pendingChannelCount > 0 && <Badge tone="amber">{liveBookingSummary.pendingChannelCount} canal pendiente</Badge>}
                  </div>
                  <div className="space-y-4">
                    {dashboardChannelRows.map((c) => {
                      const totalRevenue = dashboardChannelRows.reduce((a, b) => a + Number(b.revenue || 0), 0) || 1;
                      const pct = Math.round((Number(c.revenue || 0) / totalRevenue) * 100);
                      return (
                        <div key={c.name}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold">{c.name}</span>
                            <span className="whitespace-nowrap text-slate-500">{c.bookings || 0} hab. · {c.revenue}{hotel.currency} · {c.commission}%</span>
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

              <Card className={shouldLimitBooking ? "border-red-200 bg-red-50" : shouldKeepBookingOpen ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Decisión de cupo Booking</h2>
                    <p className="text-sm text-slate-500">Recomendación basada en ocupación actual, forecast del rango visible, peso de Booking y comisión estimada.</p>
                  </div>
                  <Badge tone={bookingDecision.tone}>{bookingDecision.title}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl bg-white/80 p-3"><p className="text-xs text-slate-500">Ocupación hoy</p><p className="text-xl font-bold">{occupancy}%</p></div>
                  <div className="rounded-2xl bg-white/80 p-3"><p className="text-xs text-slate-500">Forecast visible</p><p className="text-xl font-bold">{forecastOccupancy}%</p></div>
                  <div className="rounded-2xl bg-white/80 p-3"><p className="text-xs text-slate-500">Booking forecast</p><p className="text-xl font-bold">{forecastBookingShare}%</p></div>
                  <div className="rounded-2xl bg-white/80 p-3"><p className="text-xs text-slate-500">Web directa forecast</p><p className="text-xl font-bold">{forecastDirectShare}%</p></div>
                  <div className="rounded-2xl bg-white/80 p-3"><p className="text-xs text-slate-500">Comisión Booking</p><p className="text-xl font-bold">{bookingCommissionCost}{hotel.currency}</p></div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <h3 className="font-bold">Recomendación</h3>
                    <p className="mt-1 text-sm text-slate-700">{bookingDecision.text}</p>
                    <p className="mt-3 text-xs text-slate-500">Regla: si forecast ≥ {hotel.highOccupancyLimit}% y Booking ≥ {hotel.bookingRiskLimit}%, se recomienda limitar cupo. Si forecast ≤ {hotel.lowOccupancyLimit}%, se recomienda mantener Booking abierto.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <h3 className="font-bold">Impacto Booking</h3>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p><b>Ingresos Booking previstos:</b> {forecastBookingRevenue}{hotel.currency}</p>
                      <p><b>Comisión:</b> {bookingCommissionPct}%</p>
                      <p><b>Coste comisión:</b> {bookingCommissionCost}{hotel.currency}</p>
                      <p><b>Neto estimado:</b> {bookingNetRevenue}{hotel.currency}</p>
                    </div>
                  </div>
                </div>
              </Card>

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
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-amber-950">Producción calculada desde habitaciones</h3>
                      <p className="text-sm text-amber-900">Se calcula con habitaciones marcadas como ocupadas. El canal puede quedar pendiente si recepción no lo sabe todavía.</p>
                    </div>
                    <Badge tone={roomBookingSummary.pendingChannelCount ? "amber" : "green"}>{roomBookingSummary.pendingChannelCount} pendientes de canal</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Ocupadas</p><p className="font-bold">{roomBookingSummary.occupiedCount}</p></div>
                    <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Revenue calculado</p><p className="font-bold">{roomBookingSummary.totalRevenue}{hotel.currency}</p></div>
                    {roomBookingSummary.byChannel.map((item) => (
                      <div key={item.channel} className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">{item.channel}</p><p className="font-bold">{item.bookings} · {item.revenue}{hotel.currency}</p></div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-amber-900">Al aplicar, se actualizan reservas nuevas, Web directa, Booking, Expedia e ingresos del parte. Los canales no reconocidos quedan fuera de esos contadores.</p>
                    <button className={buttonDark} type="button" onClick={applyRoomBookingSummaryToReport}><Icon name="sync" size={18} /> Aplicar al parte diario</button>
                  </div>
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
                        {summary.channelPending > 0 && <Badge tone="amber">{summary.channelPending} canales pendientes</Badge>}
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
                    <h3 className="font-bold">Checklist de hoy / fecha seleccionada</h3>
                    <p className="text-sm text-slate-500">Recepción debe trabajar normalmente sobre el día actual. Para revisar días anteriores, cambia la fecha del checklist.</p>
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
                            <button className={cls(buttonDark, "col-span-2 sm:col-span-1")} type="button" onClick={() => { setChecklistArea(area); setChecklistSignoff(null); setEditingChecklistId(null); setChecklistResponsible(""); setChecklistNotes(""); setTasks(emptyDefaultTasks(checklistTemplate)); setLastAction(`Checklist en blanco preparado para ${formatDateEs(checklistDate)} · ${area}`); window.setTimeout(() => document.getElementById("checklist-top-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}><Icon name="plus" size={16} /> Crear aquí</button>
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
                      <button className={buttonLight} type="button" onClick={() => { setChecklistArea("General"); setChecklistSignoff(null); setEditingChecklistId(null); setChecklistResponsible(""); setChecklistNotes(""); setTasks(emptyDefaultTasks(checklistTemplate)); setLastAction(`Checklist general en blanco preparado para ${formatDateEs(checklistDate)}`); window.setTimeout(() => document.getElementById("checklist-top-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}><Icon name="plus" size={16} /> Crear checklist general</button>
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
                            setChecklistResponsible("");
                            setChecklistNotes("");
                            setTasks(emptyDefaultTasks(checklistTemplate));
                            setLastAction(`Ya existe checklist para ${formatDateEs(checklistDate)} · ${area}. Si quieres modificarlo, pulsa Editar en su tarjeta.`);
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
                    {checklistSignoff && !editingChecklistId && (
                      <button className={buttonLight} type="button" onClick={createNextChecklist}>
                        <Icon name="plus" size={18} /> Crear checklist siguiente día
                      </button>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 font-bold">Cierres de checklist de la fecha seleccionada</h3>
                <p className="mb-4 text-sm text-slate-500">Aquí solo aparecen los cierres del {formatDateEs(checklistDate)} para que recepción localice rápido lo pendiente del día.</p>
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
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{cleanChecklistNotes(item.notes) || "Sin observaciones relevantes."}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {checklistSignoffsForDate.length === 0 && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay cierres de checklist para esta fecha.</p>}
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
                        {summary.channelPending > 0 && <Badge tone="amber">{summary.channelPending} canales pendientes</Badge>}
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
                <Field label="Observaciones de cierre">
                  <textarea className={inputStyle} rows={4} value={checklistNotes} onChange={(e) => setChecklistNotes(e.target.value)} disabled={Boolean(checklistSignoff) && !editingChecklistId} placeholder="Ej.: Limpieza informada de llegadas tempranas. Queda pendiente revisar la habitación 204 por mantenimiento. Cobro de Booking pendiente de confirmar. Se deja aviso para el turno siguiente." />
                </Field>
                <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <b>Qué añadir aquí:</b> incidencias menores no registradas como incidencia formal, tareas que quedan pendientes, avisos para el siguiente turno, habitaciones que requieren seguimiento, cobros pendientes, peticiones especiales de clientes o cualquier punto que dirección/recepción deba saber mañana.
                </div>
                {isWeakChecklistNote(checklistNotes) && (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <b>Observación demasiado breve:</b> este texto parece una prueba o no aporta contexto suficiente. Sustitúyelo por una nota útil, por ejemplo: “Todo correcto en el edificio. Queda pendiente revisar cobro de la 204 y avisar a limpieza de llegada temprana mañana”.
                  </div>
                )}
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
                    <div className="mt-4 rounded-2xl bg-white p-4"><p className="text-sm font-bold">Observaciones</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{cleanChecklistNotes(viewingChecklist.notes) || "Sin observaciones relevantes registradas para este cierre."}</p></div>
                  </div>
                )}

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">{showChecklistHistory ? "Histórico completo de cierres de checklist" : "Cierres del día seleccionado"}</h3>
                    <p className="text-sm text-slate-500">{showChecklistHistory ? "Listado completo para consultar, editar, imprimir o borrar cierres antiguos." : `Solo se muestran cierres del ${formatDateEs(checklistDate)}. Activa el histórico si necesitas buscar días anteriores.`}</p>
                  </div>
                  <button className={buttonLight} type="button" onClick={() => setShowChecklistHistory(!showChecklistHistory)}><Icon name="calendar" size={18} /> {showChecklistHistory ? "Ocultar histórico" : "Consultar histórico"}</button>
                </div>
                <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-b bg-slate-50 text-slate-500"><tr><th className="px-3 py-3">Fecha</th><th>Edificio</th><th>Responsable</th><th>Estado</th><th>Progreso</th><th>Observaciones</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {(showChecklistHistory ? checklistHistory : checklistSignoffsForDate).map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-3">{formatDateEs(item.signoff_date)}</td><td>{getChecklistArea(item)}</td><td>{item.responsible || "-"}</td><td><Badge tone={item.status === "Correcto" ? "green" : "amber"}>{item.status}</Badge></td><td>{item.completed_count}/{item.total_count}</td><td className="max-w-md truncate pr-3">{cleanChecklistNotes(item.notes) || "-"}</td><td className="pr-3"><div className="flex flex-nowrap gap-1"><button className={buttonTiny} type="button" onClick={() => viewChecklist(item)}><Icon name="view" size={13} /> Ver</button><button className={buttonTiny} type="button" onClick={() => editChecklist(item)}><Icon name="edit" size={13} /> Editar</button><button className={buttonTiny} type="button" onClick={() => printChecklist(item)}><Icon name="print" size={13} /> Imprimir</button><button className={buttonTinyDanger} type="button" onClick={() => askDeleteChecklist(item)}><Icon name="trash" size={13} /> Borrar</button></div></td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:hidden">
                  {(showChecklistHistory ? checklistHistory : checklistSignoffsForDate).map((item) => (
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
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{cleanChecklistNotes(item.notes) || "Sin observaciones relevantes."}</p>
                      <div className="mt-3 flex flex-nowrap gap-1 overflow-x-auto pb-1">
                        <button className={buttonTiny} type="button" onClick={() => viewChecklist(item)}>Ver</button>
                        <button className={buttonTiny} type="button" onClick={() => editChecklist(item)}>Editar</button>
                        <button className={buttonTiny} type="button" onClick={() => printChecklist(item)}>Imprimir</button>
                        <button className={buttonTinyDanger} type="button" onClick={() => askDeleteChecklist(item)}>Borrar</button>
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
                      <div className="flex flex-nowrap justify-end gap-1 overflow-x-auto pb-1">
                        <button className={buttonTiny} type="button" onClick={() => viewIncident(i)}><Icon name="view" size={13} /> Ver</button>
                        <button className={buttonTiny} type="button" onClick={() => editIncident(i)}><Icon name="edit" size={13} /> Editar</button>
                        <button className={buttonTiny} type="button" onClick={() => printIncident(i)}><Icon name="print" size={13} /> Imprimir</button>
                        <button className={buttonTinyDanger} type="button" onClick={() => askDeleteIncident(i)}><Icon name="trash" size={13} /> Borrar</button>
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
                  <button className={buttonLight} type="button" onClick={() => setResetRoomsCandidate(true)}><Icon name="sync" size={18} /> Recalcular desde reservas</button>
                  <button className={buttonDark} type="button" onClick={saveRooms}><Icon name="save" size={18} /> Guardar estado</button>
                </div>
                <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                  <b>Calendario:</b> puedes escoger cualquier fecha con el selector. “Día siguiente” navega al día siguiente guardado o vacío. “Crear copia mañana” crea una nueva foto copiando el estado actual. “Recalcular desde reservas” limpia ocupaciones manuales antiguas y deja que el planning marque las habitaciones ocupadas.
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
                    <h3 className="font-bold">Cambio rápido de habitación</h3>
                    <p className="text-sm text-slate-500">Pensado para móvil: elige edificio, habitación y estado sin bajar por todo el mapa.</p>
                  </div>
                  <Badge tone="blue">{formatDateEs(roomDate)}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
                  <Field label="Edificio / estancia">
                    <select
                      className={inputStyle}
                      value={quickRoomArea}
                      onChange={(e) => {
                        const area = e.target.value;
                        const roomsInArea = groupedRooms[area] || [];
                        const firstRoom = roomsInArea[0];
                        setQuickRoomArea(area);
                        setQuickRoomId(firstRoom?.id || "");
                        setQuickRoomStatus(firstRoom?.status || "Disponible");
                      }}
                    >
                      <option value="">Seleccionar edificio</option>
                      {quickRoomAreaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
                    </select>
                  </Field>
                  <Field label="Habitación">
                    <select
                      className={inputStyle}
                      value={quickRoomId}
                      disabled={!quickRoomArea}
                      onChange={(e) => {
                        const id = e.target.value;
                        const room = quickRoomAreaRooms.find((item) => item.id === id);
                        setQuickRoomId(id);
                        setQuickRoomStatus(room?.status || "Disponible");
                      }}
                    >
                      <option value="">Seleccionar habitación</option>
                      {quickRoomAreaRooms.map((room) => <option key={room.id} value={room.id}>{room.number} · {room.status}</option>)}
                    </select>
                  </Field>
                  <Field label="Nuevo estado">
                    <select className={inputStyle} value={quickRoomStatus} onChange={(e) => setQuickRoomStatus(e.target.value)}>
                      {roomStatusOptions.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </Field>
                  <button className={buttonDark} type="button" onClick={applyQuickRoomStatus}><Icon name="save" size={18} /> Aplicar</button>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  El cambio se aplica a la foto diaria actual. Para dejarlo guardado correctamente, pulsa después <b>Guardar estado</b> arriba.
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Resumen visual por canal</h3>
                    <p className="text-sm text-slate-500">Abre un canal para ver qué habitaciones ocupadas pertenecen a ese origen. Las pendientes indican habitaciones ocupadas sin canal asignado.</p>
                  </div>
                  <Badge tone={roomBookingSummary.pendingChannelCount ? "amber" : "green"}>{roomBookingSummary.pendingChannelCount} pendientes</Badge>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {roomBookingSummary.byChannel.length === 0 && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No hay habitaciones ocupadas para agrupar por canal.</p>}
                  {roomBookingSummary.byChannel.map((channel) => (
                    <details key={channel.channel} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 open:bg-white">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-bold">{channel.channel}</h4>
                            <p className="text-sm text-slate-500">{channel.bookings} habitaciones · {channel.revenue}{hotel.currency}</p>
                          </div>
                          <Badge tone={channel.channel === "Pendiente" ? "amber" : "blue"}>{channel.bookings}</Badge>
                        </div>
                      </summary>
                      <div className="mt-4 space-y-3">
                        {Object.entries(groupRoomsByArea(channel.rooms)).map(([area, areaRooms]) => (
                          <div key={`${channel.channel}-${area}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="font-semibold text-slate-800">{area}</p>
                              <Badge tone="slate">{areaRooms.length}</Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                              {areaRooms.map((room) => (
                                <button key={`${channel.channel}-${room.id}`} type="button" onClick={() => openRoomStatusModal(room)} title={`${room.label || room.number} · ${room.status}`} className={roomChipClass(room)}>
                                  <span className="block truncate">{room.number}</span>
                                  <span className="mt-0.5 hidden text-[10px] font-semibold opacity-75 lg:block">{room.bookingAmount ? `${room.bookingAmount}${hotel.currency}` : room.status}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </Card>

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

                        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h5 className="font-bold">Selección rápida de habitaciones</h5>
                              <p className="text-xs text-slate-500">Pulsa una habitación para cambiar su estado en modal.</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-100 ring-1 ring-emerald-200" /> Disponible</span>
                              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-slate-100 ring-1 ring-slate-300" /> Ocupada</span>
                              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-100 ring-1 ring-red-200" /> Bloq./FDS</span>
                              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-100 ring-1 ring-amber-200" /> Sucia/Pend.</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
                            {areaRooms.map((room) => (
                              <button key={`${room.id}-chip`} type="button" onClick={() => openRoomStatusModal(room)} title={`${room.label || room.number} · ${room.status}`} className={roomChipClass(room)}>
                                <span className="block truncate">{room.number}</span>
                                <span className="mt-0.5 hidden text-[10px] font-semibold opacity-75 lg:block">{room.status === "Fuera de servicio" ? "FDS" : room.status}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {areaRooms.map((room) => (
                            <div key={room.id} className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:block">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="font-bold">{room.label || `Hab. ${room.number}`}</span>
                                <Badge tone={room.tone}>{room.status}</Badge>
                              </div>
                              <Field label="Estado de la habitación">
                                <select
                                  className={inputStyle}
                                  value={room.status}
                                  onChange={(e) => {
                                    updateRoomStatus(room, e.target.value);
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

          {active === "calendar" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Calendario / Planning de reservas</h2>
                    <p className="text-sm text-slate-500">Vista por rangos: entrada, salida, canal y habitación. Esta capa alimenta automáticamente el estado ocupado de habitaciones.</p>
                  </div>
                  <Badge tone={blockingReservationConflicts.length ? "red" : reservationConflicts.length ? "amber" : "green"}>{blockingReservationConflicts.length ? `${blockingReservationConflicts.length} bloqueantes` : reservationConflicts.length ? `${reservationConflicts.length} avisos` : "Sin conflictos"}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto_auto] xl:items-end">
                  <Field label="Ir a fecha"><input className={inputStyle} type="date" value={calendarStartDate} onChange={(e) => setCalendarStartDate(startOfWeekIso(e.target.value))} /></Field>
                  <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(addDaysIso(calendarWeekStart, -30))}><Icon name="calendar" size={18} /> Mes anterior</button>
                  <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(addDaysIso(calendarWeekStart, -7))}><Icon name="calendar" size={18} /> Semana anterior</button>
                  <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(startOfWeekIso(todayIso()))}><Icon name="calendar" size={18} /> Esta semana</button>
                  <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(addDaysIso(calendarWeekStart, 7))}><Icon name="calendar" size={18} /> Semana siguiente</button>
                  <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(addDaysIso(calendarWeekStart, 30))}><Icon name="calendar" size={18} /> Mes siguiente</button>
                </div>
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <b>Regla hotelera:</b> una reserva está ocupada desde la fecha de entrada incluida hasta la fecha de salida no incluida. Ejemplo: entrada 09/05 y salida 11/05 ocupa las noches del 09 y 10.
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Previsión del rango visible</h3>
                    <p className="text-sm text-slate-500">Forecast calculado por noche ocupada en el rango visible de {calendarDays.length} días: {formatDateEs(calendarWeekStart)} → {formatDateEs(calendarWeekEnd)}.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="green">{reservationForecast.total}{hotel.currency}</Badge>
                    <Badge tone="slate">{reservationForecast.roomNights} room nights</Badge>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {reservationForecast.byChannel.map((item) => (
                    <div key={item.channel} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">{item.channel}</p>
                      <p className="mt-1 text-xl font-bold">{item.revenue}{hotel.currency}</p>
                      <p className="text-xs text-slate-500">{item.roomNights} noches · {item.reservations.length} reservas</p>
                    </div>
                  ))}
                  {reservationForecast.byChannel.length === 0 && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No hay ingresos previstos en el rango visible.</p>}
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 font-bold">Añadir reserva al planning</h3>
                <form onSubmit={addReservation} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Habitación">
                    <select className={inputStyle} value={reservationForm.roomLabel} onChange={(e) => setReservationForm({ ...reservationForm, roomLabel: e.target.value })}>
                      <option value="">Seleccionar habitación</option>
                      {roomOptions.map((room) => <option key={room} value={room}>{room}</option>)}
                    </select>
                  </Field>
                  <Field label="Cliente / nombre opcional"><input className={inputStyle} value={reservationForm.guestName} onChange={(e) => setReservationForm({ ...reservationForm, guestName: e.target.value })} placeholder="Ej.: Juan Pérez" /></Field>
                  <Field label="Canal">
                    <select className={inputStyle} value={reservationForm.channel} onChange={(e) => setReservationForm({ ...reservationForm, channel: e.target.value })}>
                      <option value="">Pendiente</option>
                      {channels.filter((channel) => channel.name?.trim()).map((channel) => <option key={channel.name} value={channel.name}>{channel.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Estado"><select className={inputStyle} value={reservationForm.status} onChange={(e) => setReservationForm({ ...reservationForm, status: e.target.value })}><option>Confirmada</option><option>Tentativa</option><option>Cancelada</option><option>No-show</option></select></Field>
                  <Field label="Entrada"><input className={inputStyle} type="date" value={reservationForm.checkinDate} onChange={(e) => setReservationForm({ ...reservationForm, checkinDate: e.target.value, checkoutDate: reservationForm.checkoutDate <= e.target.value ? addDaysIso(e.target.value, 1) : reservationForm.checkoutDate })} /></Field>
                  <Field label="Salida"><input className={inputStyle} type="date" value={reservationForm.checkoutDate} onChange={(e) => setReservationForm({ ...reservationForm, checkoutDate: e.target.value })} /></Field>
                  <Field label={`Precio/noche (${hotel.currency})`}><input className={inputStyle} type="number" value={reservationForm.nightlyRate || ""} onChange={(e) => setReservationForm({ ...reservationForm, nightlyRate: e.target.value, totalAmount: Math.round(((Number(e.target.value) || 0) * Math.max(reservationNights(reservationForm), 1)) * 100) / 100 })} /></Field>
                  <Field label="Referencia"><input className={inputStyle} value={reservationForm.reference} onChange={(e) => setReservationForm({ ...reservationForm, reference: e.target.value })} placeholder="Ej.: BK-12345" /></Field>
                  <Field label="Teléfono opcional"><input className={inputStyle} value={reservationForm.phone || ""} onChange={(e) => setReservationForm({ ...reservationForm, phone: e.target.value })} placeholder="Ej.: +34 600 000 000" /></Field>
                  <Field label="Email opcional"><input className={inputStyle} type="email" value={reservationForm.email || ""} onChange={(e) => setReservationForm({ ...reservationForm, email: e.target.value })} placeholder="cliente@email.com" /></Field>
                  <div className="sm:col-span-2 xl:col-span-4">
                    <Field label="Notas"><input className={inputStyle} value={reservationForm.notes} onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })} placeholder="Observaciones de la reserva" /></Field>
                  </div>
                  <div className="sm:col-span-2 xl:col-span-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2"><Badge tone="blue">Noches: {reservationNights(reservationForm)}</Badge><Badge tone="green">Total: {calculateTotalFromNightly(reservationForm)}{hotel.currency}</Badge></div>
                    <button className={buttonDark} type="submit"><Icon name="plus" size={18} /> Añadir reserva</button>
                  </div>
                </form>
              </Card>

              {reservationConflicts.length > 0 && (
                <Card className={blockingReservationConflicts.length ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className={cls("font-bold", blockingReservationConflicts.length ? "text-red-800" : "text-amber-900")}>{blockingReservationConflicts.length ? "Conflictos bloqueantes" : "Avisos de solape"}</h3>
                      <p className={cls("text-sm", blockingReservationConflicts.length ? "text-red-800" : "text-amber-900")}>Las reservas confirmadas no deberían solaparse. Las tentativas pueden quedar como aviso hasta confirmación o pago.</p>
                    </div>
                    <Badge tone={blockingReservationConflicts.length ? "red" : "amber"}>{reservationConflicts.length} solapes</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    {reservationConflicts.map((reservation) => {
                      const isBlocking = reservations.some((other) => other.id !== reservation.id && reservationsBlockingOverlap(reservation, other));
                      return (
                        <div key={`conflict-${reservation.id}`} className="flex flex-col gap-2 rounded-2xl bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className={isBlocking ? "text-red-800" : "text-amber-900"}>
                            <b>{reservation.roomLabel}</b> · {formatDateEs(reservation.checkinDate)} → {formatDateEs(reservation.checkoutDate)} · {reservation.guestName || "Reserva sin nombre"} · {reservation.status || "Confirmada"}
                          </div>
                          <div className="flex flex-nowrap gap-1 overflow-x-auto pb-1">
                            <button className={buttonTiny} type="button" onClick={() => openReservationModal(reservation)}><Icon name="edit" size={13} /> Editar</button>
                            {isBlocking && <button className={buttonTiny} type="button" onClick={() => updateReservationStatus(reservation.id, "Tentativa")}><Icon name="check" size={13} /> Tentativa</button>}
                            <button className={buttonTinyDanger} type="button" onClick={() => deleteReservation(reservation.id)}><Icon name="trash" size={13} /> Borrar</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              <Card className="lg:hidden">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Agenda móvil de reservas</h3>
                    <p className="text-sm text-slate-500">Vista rápida por día para móvil y tablet. Toca un día para ver entradas, salidas y ocupadas.</p>
                  </div>
                  <Badge tone="blue">{calendarDays.length} días</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {mobileCalendarSummary.map((summary) => {
                    const hasActivity = summary.arrivals.length || summary.departures.length || summary.active.length;
                    return (
                      <button key={`mobile-day-${summary.day}`} type="button" onClick={() => setSelectedCalendarDay(summary.day)} className={cls("rounded-3xl border p-4 text-left shadow-sm transition hover:shadow-md", selectedCalendarDay === summary.day ? "border-[#2f5f7a] bg-sky-100 ring-4 ring-sky-100" : hasActivity ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white")}> 
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{formatWeekdayShort(summary.day)}</p>
                            <h4 className="text-lg font-bold text-slate-900">{formatDateEs(summary.day).slice(0, 5)}</h4>
                          </div>
                          <Badge tone={hasActivity ? "blue" : "slate"}>{summary.touched.length} mov.</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-2xl bg-white p-2"><p className="text-[11px] text-slate-500">Entradas</p><p className="font-bold text-emerald-700">{summary.arrivals.length}</p></div>
                          <div className="rounded-2xl bg-white p-2"><p className="text-[11px] text-slate-500">Salidas</p><p className="font-bold text-amber-700">{summary.departures.length}</p></div>
                          <div className="rounded-2xl bg-white p-2"><p className="text-[11px] text-slate-500">Ocupadas</p><p className="font-bold text-slate-700">{summary.active.length}</p></div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone="green">{Math.round(summary.revenue * 100) / 100}{hotel.currency}</Badge>
                          {summary.arrivals.slice(0, 2).map((reservation) => <Badge key={`arrival-chip-${summary.day}-${reservation.id}`} tone="blue">{reservation.roomLabel.split(" · ").pop()}</Badge>)}
                          {summary.arrivals.length > 2 && <Badge tone="slate">+{summary.arrivals.length - 2}</Badge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card className="lg:hidden">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Reservas del día seleccionado</h3>
                    <p className="text-sm text-slate-500">En móvil solo mostramos las reservas del día elegido para evitar listas demasiado largas.</p>
                  </div>
                  {selectedCalendarDaySummary ? <Badge tone="blue">{formatDateEs(selectedCalendarDaySummary.day)}</Badge> : <Badge tone="slate">Sin día seleccionado</Badge>}
                </div>

                {!selectedCalendarDaySummary ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Selecciona un día en la agenda superior para ver aquí solo sus entradas, salidas y habitaciones ocupadas.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-[11px] text-emerald-700">Entradas</p><p className="font-bold text-emerald-800">{selectedCalendarDaySummary.arrivals.length}</p></div>
                      <div className="rounded-2xl bg-amber-50 p-3"><p className="text-[11px] text-amber-700">Salidas</p><p className="font-bold text-amber-800">{selectedCalendarDaySummary.departures.length}</p></div>
                      <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Ocupadas</p><p className="font-bold text-slate-800">{selectedCalendarDaySummary.active.length}</p></div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button className={buttonLight} type="button" onClick={() => setSelectedCalendarDay(null)}><Icon name="cancel" size={18} /> Quitar selección</button>
                      <button className={buttonDark} type="button" onClick={() => openNewReservationModal(roomOptions[0] || "", selectedCalendarDaySummary.day)}><Icon name="plus" size={18} /> Nueva reserva este día</button>
                    </div>
                    {selectedCalendarDayReservations.map((reservation) => {
                      const movement = reservation.checkinDate === selectedCalendarDaySummary.day ? "Entrada" : reservation.checkoutDate === selectedCalendarDaySummary.day ? "Salida" : "Ocupada";
                      const movementTone = movement === "Entrada" ? "green" : movement === "Salida" ? "amber" : "blue";
                      return (
                        <button key={`mobile-selected-${reservation.id}`} type="button" onClick={() => openReservationModal(reservation)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge tone={movementTone}>{movement}</Badge>
                            <Badge tone={reservation.status === "Tentativa" ? "amber" : "slate"}>{reservation.status || "Confirmada"}</Badge>
                            <Badge tone="blue">{reservation.channel || "Pendiente"}</Badge>
                          </div>
                          <p className="font-bold text-slate-900">{reservation.roomLabel}</p>
                          <p className="text-sm text-slate-600">{reservation.guestName || "Reserva sin nombre"}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDateEs(reservation.checkinDate)} → {formatDateEs(reservation.checkoutDate)} · {reservationNights(reservation)} noches · {reservationNightlyRate(reservation)}{hotel.currency}/noche</p>
                        </button>
                      );
                    })}
                    {selectedCalendarDayReservations.length === 0 && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No hay reservas registradas para este día.</p>}
                  </div>
                )}
              </Card>

              <Card className="hidden lg:block">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Planning visual</h3>
                    <p className="text-sm text-slate-500">Las barras muestran reservas por habitación en {calendarDays.length} días visibles. En escritorio se muestran 15 días; en tablet y móvil se reduce para facilitar la lectura. El importe visible principal es el precio por noche.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Badge tone="slate">{reservations.length} reservas</Badge>
                    <button className={cls(buttonLight, "hidden lg:inline-flex")} type="button" onClick={() => setCalendarFullscreen(true)}><Icon name="view" size={18} /> Pantalla completa</button>
                  </div>
                </div>
                <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200">
                  <div style={{ minWidth: `${150 + calendarDays.length * 70}px` }}>
                    <div className="sticky top-0 z-30 grid border-b bg-slate-50 text-xs font-bold text-slate-600 shadow-sm" style={{ gridTemplateColumns: `150px repeat(${calendarDays.length}, minmax(70px, 1fr))` }}>
                      <div className="sticky left-0 z-40 border-r bg-slate-50 p-3">Habitación</div>
                      {calendarDays.map((day) => <div key={day} className="border-r p-3 text-center last:border-r-0"><span className="block capitalize">{formatWeekdayShort(day)}</span><span className="block text-[11px] font-semibold text-slate-500">{formatDateEs(day).slice(0, 5)}</span></div>)}
                    </div>
                    {roomInventory.map((room) => {
                      const label = room.label || `${room.area} · ${room.number}`;
                      const rowReservations = reservations.filter((reservation) => reservation.roomLabel === label && reservation.status !== "Cancelada" && reservation.status !== "No-show" && reservation.checkinDate < addDaysIso(calendarWeekStart, calendarDays.length) && reservation.checkoutDate > calendarWeekStart);
                      return (
                        <div key={`planning-${room.id}`} className="grid border-b text-xs last:border-b-0" style={{ gridTemplateColumns: "150px 1fr" }}>
                          <div className="sticky left-0 z-20 border-r bg-white p-3 font-bold">
                            <span className="block truncate">{label}</span>
                            <span className="text-[11px] font-normal text-slate-500">{room.area}</span>
                          </div>
                          <div className="relative h-[72px] bg-white">
                            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${calendarDays.length}, minmax(0, 1fr))` }}>
                              {calendarDays.map((day) => {
                                const dayReservations = reservations.filter((reservation) => reservation.roomLabel === label && reservationTouchesDate(reservation, day));
                                const isCheckin = dayReservations.some((reservation) => reservation.checkinDate === day);
                                const isCheckout = dayReservations.some((reservation) => reservation.checkoutDate === day);
                                return (
                                  <button key={`${label}-${day}-free`} type="button" onClick={() => openNewReservationModal(label, day)} className="h-[72px] border-r p-1 text-[10px] text-slate-300 transition hover:bg-sky-50 hover:text-sky-800 last:border-r-0">
                                    {isCheckin ? "Entrada" : isCheckout ? "Salida" : "+"}
                                  </button>
                                );
                              })}
                            </div>
                            {rowReservations.map((reservation) => {
                              const startIndex = Math.max(daysBetweenIso(calendarWeekStart, reservation.checkinDate), 0);
                              const endIndex = Math.min(daysBetweenIso(calendarWeekStart, reservation.checkoutDate), calendarDays.length);
                              const span = Math.max(endIndex - startIndex, 1);
                              return (
                                <button
                                  key={`bar-${reservation.id}`}
                                  type="button"
                                  onClick={() => openReservationModal(reservation)}
                                  className={cls("absolute top-2 z-10 h-14 overflow-hidden rounded-xl border px-2 py-1 text-left text-[10px] font-bold leading-tight shadow-sm", reservation.channel === "Pendiente" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900")}
                                  style={{ left: `${startIndex * (100 / calendarDays.length)}%`, width: `calc(${span * (100 / calendarDays.length)}% - 8px)` }}
                                  title={`${reservation.roomLabel} · ${reservation.guestName} · ${formatDateEs(reservation.checkinDate)} → ${formatDateEs(reservation.checkoutDate)}`}
                                >
                                  <span className="block truncate">{reservation.guestName || "Reserva"}</span>
                                  <span className="block truncate font-normal">{reservation.channel || "Pendiente"} · {reservationNights(reservation)} noches</span>
                                  <span className="block truncate font-normal">{reservationNightlyRate(reservation)}{hotel.currency}/noche · Total {calculateTotalFromNightly(reservation)}{hotel.currency}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card className="hidden lg:block">
                <h3 className="mb-4 font-bold">Reservas registradas</h3>
                <div className="grid gap-3">
                  {reservations.map((reservation) => (
                    <div key={reservation.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap gap-2"><Badge tone="blue">{reservation.channel || "Pendiente"}</Badge><Badge tone="slate">{reservation.status}</Badge><Badge tone="slate">{reservationNights(reservation)} noches</Badge></div>
                          <p className="font-bold">{reservation.roomLabel}</p>
                          <p className="text-sm text-slate-600">{formatDateEs(reservation.checkinDate)} → {formatDateEs(reservation.checkoutDate)} · {reservation.guestName || "Sin nombre"} · {reservationNightlyRate(reservation)}{hotel.currency}/noche · Total {calculateTotalFromNightly(reservation)}{hotel.currency}</p>
                          {reservation.reference && <p className="text-xs text-slate-500">Ref.: {reservation.reference}</p>}
                        </div>
                        <div className="flex flex-nowrap gap-1 overflow-x-auto pb-1">
                          <button className={buttonTiny} type="button" onClick={() => openReservationModal(reservation)}>Editar</button>
                          <button className={buttonTiny} type="button" onClick={() => loadReservationInRooms(reservation)}>Ver día</button>
                          <button className={buttonTinyDanger} type="button" onClick={() => deleteReservation(reservation.id)}>Borrar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reservations.length === 0 && <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay reservas en el planning.</p>}
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

              {selectedCalendarDaySummary && (
        <Modal
          title={`Reservas del ${formatDateEs(selectedCalendarDaySummary.day)}`}
          subtitle={`${formatWeekdayShort(selectedCalendarDaySummary.day)} · entradas, salidas y habitaciones ocupadas`}
          onClose={() => setSelectedCalendarDay(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setSelectedCalendarDay(null)}><Icon name="cancel" size={18} /> Cerrar</button>
              <button className={buttonDark} type="button" onClick={() => { setSelectedCalendarDay(null); openNewReservationModal(roomOptions[0] || "", selectedCalendarDaySummary.day); }}><Icon name="plus" size={18} /> Nueva reserva este día</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-center"><p className="text-xs text-emerald-700">Entradas</p><p className="text-xl font-bold text-emerald-800">{selectedCalendarDaySummary.arrivals.length}</p></div>
              <div className="rounded-2xl bg-amber-50 p-3 text-center"><p className="text-xs text-amber-700">Salidas</p><p className="text-xl font-bold text-amber-800">{selectedCalendarDaySummary.departures.length}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">Ocupadas</p><p className="text-xl font-bold text-slate-800">{selectedCalendarDaySummary.active.length}</p></div>
            </div>

            {[
              ["Entradas", selectedCalendarDaySummary.arrivals, "green"],
              ["Salidas", selectedCalendarDaySummary.departures, "amber"],
              ["Ocupadas durante la noche", selectedCalendarDaySummary.active, "blue"],
            ].map(([title, items, tone]) => (
              <div key={`day-section-${title}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="font-bold">{title}</h4>
                  <Badge tone={tone}>{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((reservation) => (
                    <button key={`${title}-${reservation.id}`} type="button" onClick={() => { setSelectedCalendarDay(null); openReservationModal(reservation); }} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone={reservation.status === "Tentativa" ? "amber" : "blue"}>{reservation.status || "Confirmada"}</Badge>
                        <Badge tone="slate">{reservation.channel || "Pendiente"}</Badge>
                        <span className="text-sm font-bold text-slate-800">{reservation.roomLabel}</span>
                      </div>
                      <p className="font-semibold text-slate-900">{reservation.guestName || "Reserva sin nombre"}</p>
                      <p className="text-sm text-slate-600">{formatDateEs(reservation.checkinDate)} → {formatDateEs(reservation.checkoutDate)} · {reservationNights(reservation)} noches · {reservationNightlyRate(reservation)}{hotel.currency}/noche</p>
                      {(reservation.phone || reservation.email || reservation.reference) && <p className="mt-1 text-xs text-slate-500">{reservation.phone || "Sin teléfono"} · {reservation.email || "Sin email"} · Ref. {reservation.reference || "-"}</p>}
                    </button>
                  ))}
                  {!items.length && <p className="rounded-2xl bg-white p-3 text-sm text-slate-500">Sin registros en este apartado.</p>}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {selectedCalendarDaySummary && active === "calendar" && (
        <Modal
          title={`Reservas del ${formatDateEs(selectedCalendarDaySummary.day)}`}
          subtitle={`${formatWeekdayShort(selectedCalendarDaySummary.day)} · entradas, salidas y habitaciones ocupadas`}
          onClose={() => setSelectedCalendarDay(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setSelectedCalendarDay(null)}><Icon name="cancel" size={18} /> Cerrar</button>
              <button className={buttonDark} type="button" onClick={() => { openNewReservationModal(roomOptions[0] || "", selectedCalendarDaySummary.day); }}><Icon name="plus" size={18} /> Nueva reserva este día</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-center"><p className="text-xs text-emerald-700">Entradas</p><p className="text-xl font-bold text-emerald-800">{selectedCalendarDaySummary.arrivals.length}</p></div>
              <div className="rounded-2xl bg-amber-50 p-3 text-center"><p className="text-xs text-amber-700">Salidas</p><p className="text-xl font-bold text-amber-800">{selectedCalendarDaySummary.departures.length}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">Ocupadas</p><p className="text-xl font-bold text-slate-800">{selectedCalendarDaySummary.active.length}</p></div>
            </div>

            {[
              ["Entradas", selectedCalendarDaySummary.arrivals, "green"],
              ["Salidas", selectedCalendarDaySummary.departures, "amber"],
              ["Ocupadas durante la noche", selectedCalendarDaySummary.active, "blue"],
            ].map(([title, items, tone]) => (
              <div key={`calendar-day-section-${title}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="font-bold">{title}</h4>
                  <Badge tone={tone}>{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((reservation) => (
                    <button key={`calendar-${title}-${reservation.id}`} type="button" onClick={() => openReservationModal(reservation)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-sky-300 hover:bg-sky-50">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone={reservation.status === "Tentativa" ? "amber" : "blue"}>{reservation.status || "Confirmada"}</Badge>
                        <Badge tone="slate">{reservation.channel || "Pendiente"}</Badge>
                        <span className="text-sm font-bold text-slate-800">{reservation.roomLabel}</span>
                      </div>
                      <p className="font-semibold text-slate-900">{reservation.guestName || "Reserva sin nombre"}</p>
                      <p className="text-sm text-slate-600">{formatDateEs(reservation.checkinDate)} → {formatDateEs(reservation.checkoutDate)} · {reservationNights(reservation)} noches · {reservationNightlyRate(reservation)}{hotel.currency}/noche</p>
                    </button>
                  ))}
                  {!items.length && <p className="rounded-2xl bg-white p-3 text-sm text-slate-500">Sin registros en este apartado.</p>}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {reservationModal && (
        <Modal
          title={reservationModal.mode === "new" ? "Nueva reserva" : "Editar reserva"}
          subtitle={`${reservationModal.roomLabel || "Habitación no seleccionada"} · ${formatDateEs(reservationModal.checkinDate)} → ${formatDateEs(reservationModal.checkoutDate)}`}
          onClose={() => setReservationModal(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {reservationModal.mode !== "new" && <button className={buttonTinyDanger} type="button" onClick={() => deleteReservation(reservationModal.id)}><Icon name="trash" size={14} /> Borrar</button>}
              <button className={buttonLight} type="button" onClick={() => setReservationModal(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className={buttonDark} type="button" onClick={saveReservationModal}><Icon name="save" size={18} /> Guardar reserva</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Habitación">
                <select className={inputStyle} value={reservationModal.roomLabel || ""} onChange={(e) => setReservationModal({ ...reservationModal, roomLabel: e.target.value })}>
                  <option value="">Seleccionar habitación</option>
                  {roomOptions.map((room) => <option key={room} value={room}>{room}</option>)}
                </select>
              </Field>
              <Field label="Cliente / nombre"><input className={inputStyle} value={reservationModal.guestName || ""} onChange={(e) => setReservationModal({ ...reservationModal, guestName: e.target.value })} placeholder="Nombre del cliente" /></Field>
              <Field label="Canal">
                <select className={inputStyle} value={reservationModal.channel || ""} onChange={(e) => setReservationModal({ ...reservationModal, channel: e.target.value })}>
                  <option value="">Pendiente</option>
                  {channels.filter((channel) => channel.name?.trim()).map((channel) => <option key={channel.name} value={channel.name}>{channel.name}</option>)}
                </select>
              </Field>
              <Field label="Estado"><select className={inputStyle} value={reservationModal.status || "Confirmada"} onChange={(e) => setReservationModal({ ...reservationModal, status: e.target.value })}><option>Confirmada</option><option>Tentativa</option><option>Cancelada</option><option>No-show</option></select></Field>
              <Field label="Entrada"><input className={inputStyle} type="date" value={reservationModal.checkinDate || todayIso()} onChange={(e) => setReservationModal({ ...reservationModal, checkinDate: e.target.value, checkoutDate: reservationModal.checkoutDate <= e.target.value ? addDaysIso(e.target.value, 1) : reservationModal.checkoutDate })} /></Field>
              <Field label="Salida"><input className={inputStyle} type="date" value={reservationModal.checkoutDate || addDaysIso(todayIso(), 1)} onChange={(e) => setReservationModal({ ...reservationModal, checkoutDate: e.target.value })} /></Field>
              <Field label={`Precio/noche (${hotel.currency})`}><input className={inputStyle} type="number" value={reservationModal.nightlyRate || ""} onChange={(e) => setReservationModal({ ...reservationModal, nightlyRate: e.target.value, totalAmount: Math.round(((Number(e.target.value) || 0) * Math.max(reservationNights(reservationModal), 1)) * 100) / 100 })} /></Field>
              <Field label="Referencia"><input className={inputStyle} value={reservationModal.reference || ""} onChange={(e) => setReservationModal({ ...reservationModal, reference: e.target.value })} placeholder="Ej.: BK-12345" /></Field>
              <Field label="Teléfono opcional"><input className={inputStyle} value={reservationModal.phone || ""} onChange={(e) => setReservationModal({ ...reservationModal, phone: e.target.value })} placeholder="Ej.: +34 600 000 000" /></Field>
              <Field label="Email opcional"><input className={inputStyle} type="email" value={reservationModal.email || ""} onChange={(e) => setReservationModal({ ...reservationModal, email: e.target.value })} placeholder="cliente@email.com" /></Field>
              <div className="sm:col-span-2">
                <Field label="Notas"><input className={inputStyle} value={reservationModal.notes || ""} onChange={(e) => setReservationModal({ ...reservationModal, notes: e.target.value })} placeholder="Observaciones de la reserva" /></Field>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <b>Noches:</b> {reservationNights(reservationModal)} · <b>Precio/noche:</b> {reservationNightlyRate(reservationModal)}{hotel.currency} · <b>Total reserva:</b> {calculateTotalFromNightly(reservationModal)}{hotel.currency}. Puedes mover la reserva cambiando habitación, entrada o salida. Si se solapa con otra reserva, aparecerá aviso de posible overbooking.
            </div>
          </div>
        </Modal>
      )}

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
                      {filteredReports.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="px-3 py-3">{formatDateEs(r.date)}</td><td>{r.manager || "-"}</td><td>{r.newBookings}</td><td>{r.revenue}{hotel.currency}</td><td>{r.pendingPayments}{hotel.currency}</td><td className="max-w-md truncate pr-3">{r.recommendation}</td><td className="pr-3"><div className="flex flex-nowrap gap-1"><button className={buttonTiny} type="button" onClick={() => viewReport(r)}><Icon name="view" size={13} /> Ver</button><button className={buttonTiny} type="button" onClick={() => copySingleReport(r)}><Icon name="copy" size={13} /> {copiedReportId === r.id ? "Copiado" : "Copiar"}</button><button className={buttonTiny} type="button" onClick={() => printSingleReport(r)}><Icon name="print" size={13} /> Imprimir</button><button className={buttonTiny} type="button" onClick={() => editReport(r)}><Icon name="edit" size={13} /> Editar</button><button className={buttonTinyDanger} type="button" onClick={() => askDeleteReport(r)}><Icon name="trash" size={13} /> Borrar</button></div></td></tr>)}
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
                      <div className="mt-3 flex flex-nowrap gap-1 overflow-x-auto pb-1">
                        <button className={buttonTiny} type="button" onClick={() => viewReport(r)}>Ver</button>
                        <button className={buttonTiny} type="button" onClick={() => copySingleReport(r)}>{copiedReportId === r.id ? "Copiado" : "Copiar"}</button>
                        <button className={buttonTiny} type="button" onClick={() => printSingleReport(r)}>Imprimir</button>
                        <button className={buttonTiny} type="button" onClick={() => editReport(r)}>Editar</button>
                        <button className={buttonTinyDanger} type="button" onClick={() => askDeleteReport(r)}>Borrar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {active === "manual" && <ManualOperativoRecepcion />}

          {active === "help" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Ayuda rápida del sistema</h2>
                    <p className="text-sm text-slate-500">Guía práctica para recepción, dirección y mantenimiento.</p>
                  </div>
                  <Badge tone="blue">Manual interno</Badge>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Icon name="chart" size={22} /><h3 className="mt-2 font-bold">Dirección</h3><p className="mt-1 text-sm text-slate-600">Consulta ocupación, ingresos del día, canales y recomendación de cupo Booking.</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Icon name="bed" size={22} /><h3 className="mt-2 font-bold">Habitaciones</h3><p className="mt-1 text-sm text-slate-600">Marca estados rápidos: disponible, sucia, pendiente, bloqueada o fuera de servicio.</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Icon name="calendar" size={22} /><h3 className="mt-2 font-bold">Calendario</h3><p className="mt-1 text-sm text-slate-600">Crea reservas por rango de fechas y evita solapes confirmados.</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><Icon name="check" size={22} /><h3 className="mt-2 font-bold">Checklist</h3><p className="mt-1 text-sm text-slate-600">Cierra tareas por edificio para dejar constancia del trabajo diario.</p></div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 font-bold">Flujo recomendado de recepción</h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><h4 className="font-bold text-sky-950">1. Inicio de turno</h4><p className="mt-1 text-sm text-sky-900">Entrar en Habitaciones, escoger la fecha de hoy y revisar ocupadas, disponibles, sucias y fuera de servicio. Si hay estados antiguos, usar Recalcular desde reservas.</p></div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><h4 className="font-bold text-sky-950">2. Reservas</h4><p className="mt-1 text-sm text-sky-900">En Calendario se crean o editan reservas. Una reserva confirmada bloquea habitación; una tentativa queda como aviso hasta confirmación.</p></div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><h4 className="font-bold text-sky-950">3. Incidencias</h4><p className="mt-1 text-sm text-sky-900">Registrar averías, quejas, limpieza pendiente, pagos, problemas OTA o cambios relevantes. Marcar prioridad y responsable.</p></div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><h4 className="font-bold text-sky-950">4. Cierre</h4><p className="mt-1 text-sm text-sky-900">Completar Checklist por edificio y Parte diario. El parte se puede imprimir o copiar para dirección.</p></div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 font-bold">Qué significan los estados</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl bg-emerald-50 p-4"><b>Disponible</b><p className="mt-1 text-sm text-slate-700">Habitación vendible y sin reserva activa.</p></div>
                  <div className="rounded-2xl bg-slate-100 p-4"><b>Ocupada</b><p className="mt-1 text-sm text-slate-700">Habitación ocupada por reserva activa del calendario.</p></div>
                  <div className="rounded-2xl bg-red-50 p-4"><b>Bloqueada / FDS</b><p className="mt-1 text-sm text-slate-700">No vendible por avería, mantenimiento o decisión interna.</p></div>
                  <div className="rounded-2xl bg-amber-50 p-4"><b>Sucia</b><p className="mt-1 text-sm text-slate-700">Limpieza pendiente antes de poder venderla.</p></div>
                  <div className="rounded-2xl bg-amber-50 p-4"><b>Pendiente</b><p className="mt-1 text-sm text-slate-700">Necesita revisión antes de quedar disponible.</p></div>
                  <div className="rounded-2xl bg-sky-50 p-4"><b>Tentativa</b><p className="mt-1 text-sm text-slate-700">Reserva no confirmada: se ve como aviso, pero no bloquea como confirmada.</p></div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 font-bold">Preguntas rápidas</h3>
                <div className="space-y-3 text-sm text-slate-700">
                  <p><b>¿Dónde veo si una habitación está ocupada?</b> En Habitaciones o en Calendario. Si viene del planning, aparecerá ocupada automáticamente en las fechas de estancia.</p>
                  <p><b>¿Dónde veo los datos del cliente?</b> En Habitaciones, pulsa una habitación ocupada y aparecerá la reserva vinculada con teléfono, email, entrada, salida y canal.</p>
                  <p><b>¿Qué pasa si intento reservar una habitación ocupada?</b> El sistema bloquea el solape si ambas reservas están confirmadas y propone habitaciones libres.</p>
                  <p><b>¿Dónde veo la recomendación de Booking?</b> En Dirección, tarjeta Decisión de cupo Booking.</p>
                </div>
              </Card>
            </div>
          )}

          {active === "setup" && (
            <div className="space-y-5 sm:space-y-6">
              <Card>
                <h2 className="text-lg font-bold sm:text-xl">Configuración del hotel</h2>
                <p className="mb-5 text-sm text-slate-500">Configuración principal del hotel. Estas reglas se usan para generar recomendaciones automáticas en Dirección e Informes.</p>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Badge tone="purple">Reglas de decisión y alertas</Badge>
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
                <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon name="sparkles" size={18} />
                    <h3 className="font-bold text-sky-950">Cómo funcionan las recomendaciones automáticas</h3>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3"><b>Objetivo web directa %</b><p className="mt-1 text-slate-600">Si la venta directa baja de este porcentaje, la app recomienda reforzar reserva directa.</p></div>
                    <div className="rounded-2xl bg-white p-3"><b>Riesgo Booking %</b><p className="mt-1 text-slate-600">Si Booking supera este porcentaje, avisa de dependencia alta de OTA.</p></div>
                    <div className="rounded-2xl bg-white p-3"><b>Alta ocupación %</b><p className="mt-1 text-slate-600">Si la ocupación supera este valor, recomienda subir precios, cerrar descuentos o proteger venta directa.</p></div>
                    <div className="rounded-2xl bg-white p-3"><b>Baja ocupación %</b><p className="mt-1 text-slate-600">Si la ocupación cae por debajo, recomienda revisar precio, abrir canales o activar promoción controlada.</p></div>
                  </div>
                  <p className="mt-3 text-xs text-sky-900">También se generan avisos si hay habitaciones bloqueadas/FDS o cobros pendientes altos.</p>
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
                    <button className={buttonDark} type="button" onClick={addRoomAreaToCatalog}><Icon name="plus" size={18} /> Añadir y preparar guardado</button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Ejemplo: “Anexo”, número inicial “101” y Nº habitaciones “10” generará Anexo · 101 hasta Anexo · 110. Después aparecerá un aviso para guardar el catálogo.</p>

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
                  <button className={buttonDark} type="button" onClick={applyRoomCatalogText}><Icon name="save" size={18} /> Aplicar texto del catálogo</button>
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
                    <h3 className="font-bold">Catálogo de edificios y habitaciones</h3>
                    <p className="text-sm text-slate-500">Este catálogo se usa en Habitaciones, Calendario, Incidencias y Dirección. Al guardarlo, se sincroniza para todos los equipos.</p>
                  </div>
                  <button className={cls(buttonDark, hasUnsavedCatalogChanges ? "ring-4 ring-amber-200" : "")} type="button" onClick={saveRoomCatalogToSupabase}><Icon name="save" size={18} /> {hasUnsavedCatalogChanges ? "Guardar catálogo pendiente" : "Guardar catálogo"}</button>
                </div>
                {hasUnsavedCatalogChanges && (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <b>Cambios de catálogo sin guardar</b>
                        <p>Has modificado edificios o habitaciones. Pulsa Guardar catálogo para sincronizarlo con producción y todos los equipos.</p>
                      </div>
                      <button className={buttonDark} type="button" onClick={saveRoomCatalogToSupabase}><Icon name="save" size={18} /> Guardar ahora</button>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {Object.entries(groupRoomsByArea(roomCatalog)).map(([area, areaRooms], areaIndex, areaList) => (
                    <div key={`catalog-${area}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto_auto] lg:items-center">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edificio / estancia</p>
                          <h4 className="mt-1 text-lg font-bold text-slate-900">{area}</h4>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">{areaRooms.length} habitaciones</div>
                        <button className={buttonTiny} type="button" onClick={() => moveCatalogArea(area, -1)} disabled={areaIndex === 0}><Icon name="calendar" size={14} /> Subir</button>
                        <button className={buttonTiny} type="button" onClick={() => moveCatalogArea(area, 1)} disabled={areaIndex === areaList.length - 1}><Icon name="calendar" size={14} /> Bajar</button>
                        <button className={buttonTiny} type="button" onClick={() => setAreaRenameCandidate({ oldArea: area, newArea: area })}><Icon name="edit" size={14} /> Renombrar</button>
                        <button className={buttonTinyDanger} type="button" onClick={() => requestDeleteCatalogArea(area)}><Icon name="trash" size={14} /> Borrar edificio</button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {areaRooms.slice(0, 18).map((room) => <span key={`${area}-${room.number}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">{room.number}</span>)}
                        {areaRooms.length > 18 && <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">+{areaRooms.length - 18} más</span>}
                      </div>
                    </div>
                  ))}
                  {!roomCatalog.length && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No hay habitaciones configuradas. Añade un edificio/estancia para crear el catálogo.</p>}
                </div>
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <b>Importante:</b> si borras un edificio del catálogo, no se borran reservas históricas. Solo deja de aparecer como edificio disponible para nuevas operaciones.
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold">Canales de venta</h3>
                    <p className="text-sm text-slate-500">Estos canales aparecen al marcar una habitación como ocupada y se usan para calcular la producción del parte diario.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button className={buttonLight} type="button" onClick={addChannel}><Icon name="plus" size={18} /> Añadir canal</button>
                    <button className={buttonDark} type="button" onClick={saveChannels}><Icon name="save" size={18} /> Guardar canales</button>
                  </div>
                </div>
                <div className="grid gap-4">
                  {channels.map((channel, index) => (
                    <div key={channel.id || `channel-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_.6fr_.6fr_.6fr_auto] xl:items-end">
                      <Field label="Canal"><input className={inputStyle} value={channel.name} onChange={(e) => updateChannel(index, "name", e.target.value)} /></Field>
                      <Field label="Reservas"><input className={inputStyle} type="number" value={channel.bookings} onChange={(e) => updateChannel(index, "bookings", e.target.value)} /></Field>
                      <Field label="Ingresos"><input className={inputStyle} type="number" value={channel.revenue} onChange={(e) => updateChannel(index, "revenue", e.target.value)} /></Field>
                      <Field label="Comisión %"><input className={inputStyle} type="number" value={channel.commission} onChange={(e) => updateChannel(index, "commission", e.target.value)} /></Field>
                      <button className={buttonLight} type="button" onClick={() => deleteChannel(index)}><Icon name="trash" size={18} /> Borrar</button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <b>Nota:</b> si añades canales como Teléfono, Walk-in, Agencia, Airbnb o Hotelbeds, aparecerán automáticamente en el selector de habitación ocupada. Para que Web directa, Booking y Expedia alimenten los contadores del parte, mantén esos nombres reconocibles.
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 font-bold">Estado del sistema</h3>
                <p className="text-sm text-slate-600"><b>Estado:</b> {connection.message}</p>
                <p className="mt-2 text-sm text-slate-600">Este bloque es informativo para administración. No muestra claves ni datos técnicos sensibles en pantalla.</p>
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
                <h3 className="mb-3 font-bold">Copias de seguridad</h3>
                <p className="mb-4 text-sm text-slate-500">Descarga una copia JSON de la información cargada en la app. Sirve como respaldo rápido antes de enseñar, modificar o desplegar.</p>
                <button className={buttonDark} type="button" onClick={exportBackup}><Icon name="copy" size={18} /> Descargar copia JSON</button>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <b>Recomendación:</b> en producción conviene complementar esto con backups automáticos del sistema y control de accesos por usuario.
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 font-bold">Datos demo</h3>
                <p className="mb-4 text-sm text-slate-500">Si el sistema trabaja sin sincronización, la app guarda datos localmente en este navegador.</p>
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
            <img src="/vielha-computer-logo.png" alt="Vielha Computer" className="h-7 w-auto max-w-[150px] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>Vielha Computer</span>
          </a>
        </div>
      </footer>

      {calendarFullscreen && planningDays >= 15 && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-2 sm:p-4" role="dialog" aria-modal="true">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold sm:text-xl">Planning visual · Pantalla completa</h3>
                <p className="text-sm text-slate-500">{hotel.name} · {calendarDays.length} días {formatDateEs(calendarWeekStart)} → {formatDateEs(calendarWeekEnd)} · {reservations.length} reservas</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input className={inputStyle} type="date" value={calendarStartDate} onChange={(e) => setCalendarStartDate(startOfWeekIso(e.target.value))} />
                <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(addDaysIso(calendarWeekStart, -30))}><Icon name="calendar" size={18} /> Mes anterior</button>
                <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(addDaysIso(calendarWeekStart, -7))}><Icon name="calendar" size={18} /> Semana anterior</button>
                <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(startOfWeekIso(todayIso()))}><Icon name="calendar" size={18} /> Esta semana</button>
                <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(addDaysIso(calendarWeekStart, 7))}><Icon name="calendar" size={18} /> Semana siguiente</button>
                <button className={buttonLight} type="button" onClick={() => setCalendarStartDate(addDaysIso(calendarWeekStart, 30))}><Icon name="calendar" size={18} /> Mes siguiente</button>
                <button className={buttonDark} type="button" onClick={() => setCalendarFullscreen(false)}><Icon name="cancel" size={18} /> Cerrar</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="rounded-2xl border border-slate-200" style={{ minWidth: `${190 + calendarDays.length * 90}px` }}>
                <div className="sticky top-0 z-30 grid border-b bg-slate-50 text-xs font-bold text-slate-600 shadow-sm" style={{ gridTemplateColumns: `190px repeat(${calendarDays.length}, minmax(90px, 1fr))` }}>
                  <div className="sticky left-0 z-40 border-r bg-slate-50 p-3">Habitación</div>
                  {calendarDays.map((day) => <div key={`full-${day}`} className="border-r p-3 text-center last:border-r-0"><span className="block capitalize">{formatWeekdayShort(day)}</span><span className="block text-[11px] font-semibold text-slate-500">{formatDateEs(day).slice(0, 5)}</span></div>)}
                </div>
                {roomInventory.map((room) => {
                  const label = room.label || `${room.area} · ${room.number}`;
                  const rowReservations = reservations.filter((reservation) => reservation.roomLabel === label && reservation.status !== "Cancelada" && reservation.status !== "No-show" && reservation.checkinDate < addDaysIso(calendarWeekStart, calendarDays.length) && reservation.checkoutDate > calendarWeekStart);
                  return (
                    <div key={`fullscreen-planning-${room.id}`} className="grid border-b text-xs last:border-b-0" style={{ gridTemplateColumns: "190px 1fr" }}>
                      <div className="sticky left-0 z-20 border-r bg-white p-3 font-bold">
                        <span className="block truncate">{label}</span>
                        <span className="text-[11px] font-normal text-slate-500">{room.area}</span>
                      </div>
                      <div className="relative h-[72px] bg-white">
                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${calendarDays.length}, minmax(0, 1fr))` }}>
                          {calendarDays.map((day) => {
                            const dayReservations = reservations.filter((reservation) => reservation.roomLabel === label && reservationTouchesDate(reservation, day));
                            const isCheckin = dayReservations.some((reservation) => reservation.checkinDate === day);
                            const isCheckout = dayReservations.some((reservation) => reservation.checkoutDate === day);
                            return (
                              <button key={`full-${label}-${day}-free`} type="button" onClick={() => openNewReservationModal(label, day)} className="h-[72px] border-r p-1 text-[10px] text-slate-300 transition hover:bg-sky-50 hover:text-sky-800 last:border-r-0">
                                {isCheckin ? "Entrada" : isCheckout ? "Salida" : "+"}
                              </button>
                            );
                          })}
                        </div>
                        {rowReservations.map((reservation) => {
                          const startIndex = Math.max(daysBetweenIso(calendarWeekStart, reservation.checkinDate), 0);
                          const endIndex = Math.min(daysBetweenIso(calendarWeekStart, reservation.checkoutDate), calendarDays.length);
                          const span = Math.max(endIndex - startIndex, 1);
                          return (
                            <button
                              key={`fullscreen-bar-${reservation.id}`}
                              type="button"
                              onClick={() => openReservationModal(reservation)}
                              className={cls("absolute top-2 z-10 h-14 overflow-hidden rounded-xl border px-2 py-1 text-left text-[10px] font-bold leading-tight shadow-sm", reservation.channel === "Pendiente" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900")}
                              style={{ left: `${startIndex * (100 / calendarDays.length)}%`, width: `calc(${span * (100 / calendarDays.length)}% - 8px)` }}
                              title={`${reservation.roomLabel} · ${reservation.guestName} · ${formatDateEs(reservation.checkinDate)} → ${formatDateEs(reservation.checkoutDate)}`}
                            >
                              <span className="block truncate">{reservation.guestName || "Reserva"}</span>
                              <span className="block truncate font-normal">{reservation.channel || "Pendiente"} · {reservationNightlyRate(reservation)}{hotel.currency}/noche</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {hasUnsavedCatalogChanges && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              <b>Cambios de catálogo sin guardar</b>
              <p className="text-xs text-slate-500">Guarda el catálogo para que edificios y habitaciones se vean igual en producción y en todos los equipos.</p>
            </div>
            <button className={buttonDark} type="button" onClick={saveRoomCatalogToSupabase}><Icon name="save" size={18} /> Guardar catálogo</button>
          </div>
        </div>
      )}

      {active === "rooms" && hasUnsavedRoomChanges && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              <b>Cambios de habitaciones sin guardar</b>
              <p className="text-xs text-slate-500">Foto diaria: {formatDateEs(roomDate)}. Guarda para conservar los cambios correctamente.</p>
            </div>
            <button className={buttonDark} type="button" onClick={saveRooms}><Icon name="save" size={18} /> Guardar estado</button>
          </div>
        </div>
      )}

      {reservationModal && (
        <Modal
          title={reservationModal.mode === "new" ? "Nueva reserva" : "Editar reserva"}
          subtitle={`${reservationModal.roomLabel || "Habitación no seleccionada"} · ${formatDateEs(reservationModal.checkinDate)} → ${formatDateEs(reservationModal.checkoutDate)}`}
          onClose={() => setReservationModal(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {reservationModal.mode !== "new" && <button className={buttonTinyDanger} type="button" onClick={() => deleteReservation(reservationModal.id)}><Icon name="trash" size={14} /> Borrar</button>}
              <button className={buttonLight} type="button" onClick={() => setReservationModal(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className={buttonDark} type="button" onClick={saveReservationModal}><Icon name="save" size={18} /> Guardar reserva</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Habitación">
                <select className={inputStyle} value={reservationModal.roomLabel || ""} onChange={(e) => setReservationModal({ ...reservationModal, roomLabel: e.target.value })}>
                  <option value="">Seleccionar habitación</option>
                  {roomOptions.map((room) => <option key={room} value={room}>{room}</option>)}
                </select>
              </Field>
              <Field label="Cliente / nombre"><input className={inputStyle} value={reservationModal.guestName || ""} onChange={(e) => setReservationModal({ ...reservationModal, guestName: e.target.value })} placeholder="Nombre del cliente" /></Field>
              <Field label="Canal">
                <select className={inputStyle} value={reservationModal.channel || ""} onChange={(e) => setReservationModal({ ...reservationModal, channel: e.target.value })}>
                  <option value="">Pendiente</option>
                  {channels.filter((channel) => channel.name?.trim()).map((channel) => <option key={channel.name} value={channel.name}>{channel.name}</option>)}
                </select>
              </Field>
              <Field label="Estado"><select className={inputStyle} value={reservationModal.status || "Confirmada"} onChange={(e) => setReservationModal({ ...reservationModal, status: e.target.value })}><option>Confirmada</option><option>Tentativa</option><option>Cancelada</option><option>No-show</option></select></Field>
              <Field label="Entrada"><input className={inputStyle} type="date" value={reservationModal.checkinDate || todayIso()} onChange={(e) => setReservationModal({ ...reservationModal, checkinDate: e.target.value, checkoutDate: reservationModal.checkoutDate <= e.target.value ? addDaysIso(e.target.value, 1) : reservationModal.checkoutDate })} /></Field>
              <Field label="Salida"><input className={inputStyle} type="date" value={reservationModal.checkoutDate || addDaysIso(todayIso(), 1)} onChange={(e) => setReservationModal({ ...reservationModal, checkoutDate: e.target.value })} /></Field>
              <Field label={`Precio/noche (${hotel.currency})`}><input className={inputStyle} type="number" value={reservationModal.nightlyRate || ""} onChange={(e) => setReservationModal({ ...reservationModal, nightlyRate: e.target.value, totalAmount: Math.round(((Number(e.target.value) || 0) * Math.max(reservationNights(reservationModal), 1)) * 100) / 100 })} /></Field>
              <Field label="Referencia"><input className={inputStyle} value={reservationModal.reference || ""} onChange={(e) => setReservationModal({ ...reservationModal, reference: e.target.value })} placeholder="Ej.: BK-12345" /></Field>
              <Field label="Teléfono opcional"><input className={inputStyle} value={reservationModal.phone || ""} onChange={(e) => setReservationModal({ ...reservationModal, phone: e.target.value })} placeholder="Ej.: +34 600 000 000" /></Field>
              <Field label="Email opcional"><input className={inputStyle} type="email" value={reservationModal.email || ""} onChange={(e) => setReservationModal({ ...reservationModal, email: e.target.value })} placeholder="cliente@email.com" /></Field>
              <div className="sm:col-span-2">
                <Field label="Notas"><input className={inputStyle} value={reservationModal.notes || ""} onChange={(e) => setReservationModal({ ...reservationModal, notes: e.target.value })} placeholder="Observaciones de la reserva" /></Field>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <b>Noches:</b> {reservationNights(reservationModal)} · <b>Precio/noche:</b> {reservationNightlyRate(reservationModal)}{hotel.currency} · <b>Total calculado:</b> {calculateTotalFromNightly(reservationModal)}{hotel.currency}. Puedes mover la reserva cambiando habitación, entrada o salida. Si se solapa con otra reserva, aparecerá aviso de posible overbooking.
            </div>
          </div>
        </Modal>
      )}

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

      {roomStatusModal && (
        <Modal
          title={`${roomStatusModal.area || "Edificio"} · Hab. ${roomStatusModal.number}`}
          subtitle={`Cambio rápido de estado para el ${formatDateEs(roomDate)}`}
          onClose={() => setRoomStatusModal(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setRoomStatusModal(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className={buttonLight} type="button" onClick={() => openNewReservationModal(roomStatusModal.label || `${roomStatusModal.area} · ${roomStatusModal.number}`, roomDate)}><Icon name="calendar" size={18} /> Crear reserva</button>
              <button className={buttonDark} type="button" onClick={saveRoomStatusModal}><Icon name="save" size={18} /> Aplicar estado</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <b>Uso recomendado:</b> este modal sirve para cambios operativos rápidos. Si quieres vender o reservar esta habitación, usa <b>Crear reserva</b> para abrir el planning con esta habitación y fecha ya seleccionadas.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Estado actual / seleccionado</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(roomStatusModal.status)}>{roomStatusModal.status}</Badge>
                <span className="text-sm text-slate-600">{roomStatusModal.detail || statusDetail(roomStatusModal.status)}</span>
              </div>
            </div>

            {roomStatusModal.reservationId && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-bold text-sky-950">Reserva vinculada</h4>
                    <p className="text-sm text-sky-900">Datos útiles para contactar o confirmar la reserva.</p>
                  </div>
                  <Badge tone="blue">{roomStatusModal.reservationChannel || roomStatusModal.bookingChannel || "Pendiente"}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Cliente</p><p className="font-bold">{roomStatusModal.reservationGuest || "Sin nombre"}</p></div>
                  <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Teléfono</p><p className="font-bold">{roomStatusModal.reservationPhone || "No indicado"}</p></div>
                  <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Email</p><p className="font-bold break-all">{roomStatusModal.reservationEmail || "No indicado"}</p></div>
                  <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Referencia</p><p className="font-bold">{roomStatusModal.reservationReference || roomStatusModal.bookingReference || "-"}</p></div>
                  <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Entrada</p><p className="font-bold">{formatDateEs(roomStatusModal.reservationCheckin)}</p></div>
                  <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Salida</p><p className="font-bold">{formatDateEs(roomStatusModal.reservationCheckout)}</p></div>
                  <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Noches</p><p className="font-bold">{daysBetweenIso(roomStatusModal.reservationCheckin, roomStatusModal.reservationCheckout)}</p></div>
                  <div className="rounded-2xl bg-white p-3"><p className="text-xs text-slate-500">Precio/noche</p><p className="font-bold">{roomStatusModal.reservationNightlyRate || roomStatusModal.bookingAmount || 0}{hotel.currency}</p></div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {roomStatusModal.reservationPhone && <a className={buttonLight} href={`tel:${roomStatusModal.reservationPhone}`}><Icon name="user" size={18} /> Llamar</a>}
                  {roomStatusModal.reservationEmail && <a className={buttonLight} href={`mailto:${roomStatusModal.reservationEmail}?subject=${encodeURIComponent(`Reserva ${roomStatusModal.roomLabel || roomStatusModal.label || roomStatusModal.number}`)}`}><Icon name="file" size={18} /> Enviar email</a>}
                  <button className={buttonLight} type="button" onClick={() => { const reservation = reservations.find((item) => item.id === roomStatusModal.reservationId); if (reservation) { setRoomStatusModal(null); window.setTimeout(() => openReservationModal(reservation), 0); } }}><Icon name="edit" size={18} /> Editar reserva</button>
                </div>
              </div>
            )}
            <Field label="Nuevo estado de la habitación">
              <select className={inputStyle} value={roomStatusModal.status} onChange={(e) => setRoomStatusModal({ ...roomStatusModal, status: e.target.value })}>
                {roomStatusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
            </Field>

            {roomStatusModal.status === "Ocupada" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex flex-col gap-1">
                  <h4 className="font-bold text-amber-950">Datos de la reserva</h4>
                  <p className="text-sm text-amber-900">Opcional. Si no se sabe el canal, quedará como pendiente para completarlo después.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Canal de reserva">
                    <select className={inputStyle} value={roomStatusModal.bookingChannel || ""} onChange={(e) => setRoomStatusModal({ ...roomStatusModal, bookingChannel: e.target.value })}>
                      <option value="">Pendiente / no indicado</option>
                      {channels.filter((channel) => channel.name?.trim()).map((channel) => <option key={channel.name} value={channel.name}>{channel.name}</option>)}
                    </select>
                  </Field>
                  <Field label={`Importe (${hotel.currency})`}>
                    <input className={inputStyle} type="number" value={roomStatusModal.bookingAmount || ""} onChange={(e) => setRoomStatusModal({ ...roomStatusModal, bookingAmount: e.target.value })} placeholder="Ej.: 120" />
                  </Field>
                  <Field label="Referencia opcional">
                    <input className={inputStyle} value={roomStatusModal.bookingReference || ""} onChange={(e) => setRoomStatusModal({ ...roomStatusModal, bookingReference: e.target.value })} placeholder="Ej.: BK-12345" />
                  </Field>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              Este cambio actualiza la foto diaria en pantalla. Para guardarlo correctamente, pulsa <b>Guardar estado</b> en Habitaciones.
            </div>
          </div>
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
          <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold">Observaciones</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{cleanChecklistNotes(viewingChecklist.notes) || "Sin observaciones relevantes registradas para este cierre."}</p></div>
        </Modal>
      )}

      {areaRenameCandidate && (
        <Modal
          title="Renombrar edificio / estancia"
          subtitle="El cambio se aplicará al catálogo actual. Después pulsa Guardar catálogo para conservarlo."
          onClose={() => setAreaRenameCandidate(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setAreaRenameCandidate(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className={buttonDark} type="button" onClick={() => renameCatalogArea(areaRenameCandidate.oldArea, areaRenameCandidate.newArea)}><Icon name="save" size={18} /> Aplicar nombre</button>
            </div>
          }
        >
          <div className="space-y-4">
            <Field label="Nombre actual"><input className={inputStyle} value={areaRenameCandidate.oldArea} disabled /></Field>
            <Field label="Nuevo nombre"><input className={inputStyle} value={areaRenameCandidate.newArea} onChange={(e) => setAreaRenameCandidate({ ...areaRenameCandidate, newArea: e.target.value })} autoFocus /></Field>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              Las habitaciones mantendrán su número, pero pasarán a pertenecer al nuevo edificio/estancia.
            </div>
          </div>
        </Modal>
      )}

      {areaDeleteCandidate && (
        <Modal
          title="Borrar edificio del catálogo"
          subtitle="Esta acción elimina el edificio de la configuración de habitaciones."
          onClose={() => setAreaDeleteCandidate(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setAreaDeleteCandidate(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className={buttonTinyDanger} type="button" onClick={confirmDeleteCatalogArea}><Icon name="trash" size={14} /> Sí, borrar edificio</button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Vas a borrar <b>{areaDeleteCandidate.area}</b> del catálogo, junto con <b>{areaDeleteCandidate.count}</b> habitaciones configuradas.
            </div>
            {areaDeleteCandidate.hasData && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">Este edificio tiene datos asociados.</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>{areaDeleteCandidate.reservationsCount} reservas asociadas</li>
                  <li>{areaDeleteCandidate.incidentsCount} incidencias asociadas</li>
                  <li>{areaDeleteCandidate.roomSnapshotsCount} estados diarios de habitaciones asociados</li>
                </ul>
                <p className="mt-2">Por seguridad, esta acción solo elimina el edificio del catálogo disponible. No borra reservas ni incidencias históricas.</p>
              </div>
            )}
            {areaDeleteCandidate.hasData && (
              <Field label="Confirmación obligatoria">
                <input className={inputStyle} value={areaDeleteCandidate.confirmText || ""} onChange={(e) => setAreaDeleteCandidate({ ...areaDeleteCandidate, confirmText: e.target.value })} placeholder="Escribe BORRAR para confirmar" />
              </Field>
            )}
            <p className="text-sm text-slate-600">Después de borrar, pulsa <b>Guardar catálogo</b> para sincronizar el cambio.</p>
          </div>
        </Modal>
      )}

      {catalogSaveReminder && (
        <Modal
          title={catalogSaveReminder.title || "Cambios de catálogo"}
          subtitle="El catálogo de edificios y habitaciones tiene cambios pendientes de guardar."
          onClose={() => setCatalogSaveReminder(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setCatalogSaveReminder(null)}><Icon name="cancel" size={18} /> Seguir editando</button>
              <button className={buttonDark} type="button" onClick={saveRoomCatalogToSupabase}><Icon name="save" size={18} /> Guardar catálogo ahora</button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {catalogSaveReminder.text || "Guarda el catálogo para que se sincronice con todos los equipos."}
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              Hasta que no pulses <b>Guardar catálogo</b>, el cambio puede quedarse solo en este navegador.
            </div>
          </div>
        </Modal>
      )}

      {reservationConflictCandidate && (
        <Modal
          title="Habitación no disponible"
          subtitle="La reserva confirmada se solapa con otra reserva confirmada. Cambia la habitación, modifica las fechas o guárdala como tentativa."
          onClose={() => setReservationConflictCandidate(null)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setReservationConflictCandidate(null)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className={buttonLight} type="button" onClick={convertConflictDraftToTentative}><Icon name="check" size={18} /> Cambiar a tentativa</button>
              <button className={buttonDark} type="button" onClick={() => { setReservationModal({ ...reservationConflictCandidate.draft, mode: reservationConflictCandidate.draft.mode || "new" }); setReservationConflictCandidate(null); }}><Icon name="edit" size={18} /> Editar fechas</button>
            </div>
          }
        >
          {(() => {
            const draft = reservationConflictCandidate.draft;
            const conflict = reservationConflictCandidate.conflict;
            const availableAlternatives = getAvailableRoomsForDraft(draft, draft.id);
            return (
              <div className="space-y-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <h4 className="mb-2 font-bold">No se puede reservar {draft.roomLabel}</h4>
                  <p>La habitación ya tiene una reserva confirmada en parte de este rango:</p>
                  <p className="mt-2"><b>Nueva reserva:</b> {formatDateEs(draft.checkinDate)} → {formatDateEs(draft.checkoutDate)} · {draft.guestName || "Reserva sin nombre"}</p>
                  <p><b>Reserva existente:</b> {formatDateEs(conflict.checkinDate)} → {formatDateEs(conflict.checkoutDate)} · {conflict.guestName || "Reserva sin nombre"} · {conflict.channel || "Pendiente"}</p>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <h4 className="mb-2 font-bold text-sky-950">Cambiar a una habitación disponible</h4>
                  <p className="mb-3 text-sm text-sky-900">Estas habitaciones no tienen reservas confirmadas solapadas en las fechas seleccionadas.</p>
                  {availableAlternatives.length ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {availableAlternatives.slice(0, 18).map((roomLabel) => (
                        <button key={roomLabel} type="button" className="rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50" onClick={() => resolveReservationConflictWithRoom(roomLabel)}>
                          {roomLabel}
                        </button>
                      ))}
                      {availableAlternatives.length > 18 && <p className="rounded-2xl bg-white p-3 text-sm text-slate-500">+{availableAlternatives.length - 18} habitaciones más disponibles.</p>}
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-white p-3 text-sm text-slate-600">No hay habitaciones libres en ese rango. Cambia las fechas o cancela la operación.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {resetRoomsCandidate && (
        <Modal
          title="Confirmar recalculado desde reservas"
          subtitle="Esta acción limpia la foto diaria manual y deja que el Planning marque las habitaciones ocupadas."
          onClose={() => setResetRoomsCandidate(false)}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className={buttonLight} type="button" onClick={() => setResetRoomsCandidate(false)}><Icon name="cancel" size={18} /> Cancelar</button>
              <button className={buttonDark} type="button" onClick={resetRoomDayFromReservations}><Icon name="sync" size={18} /> Sí, recalcular</button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <b>Ojo:</b> se pondrán las habitaciones manuales como disponibles y se borrarán canales/importes/referencias manuales de la foto diaria del {formatDateEs(roomDate)}.
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              Las reservas activas del calendario volverán a marcar automáticamente como ocupadas las habitaciones correspondientes. Después tendrás que pulsar <b>Guardar estado</b>.
            </div>
          </div>
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
