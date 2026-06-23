import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { parseBeds24File, buildReportFromApi } from "./lib/beds24Parser.js";

// Panel de informes Beds24 — transformar los .xls de Beds24 en un informe visual
// tipo Cloudbeds (Revenue). Tambien soporta conexion en vivo via Edge Function.

const ACCENT = "#2f5f7a";
const ACCENT_SOFT = "#5b8fa8";
const GREEN = "#15803d";
const AMBER = "#b45309";

const cardCls = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
const buttonDark = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2f5f7a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#254b62] active:scale-[0.99] sm:px-5";
const buttonLight = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] sm:px-5";

function fmtMoney(n, symbol = "€") {
  const v = Number(n) || 0;
  return `${v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}
function fmtInt(n) {
  return (Number(n) || 0).toLocaleString("es-ES");
}
function fmtPct(n) {
  const v = Number(n) || 0;
  return `${v.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%`;
}
function fmtDateEs(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function firstDayOfMonthIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ----- KPIs -----
function KpiCard({ label, value, sub, tone = "slate" }) {
  const tones = {
    slate: "from-slate-50 to-white text-slate-900",
    green: "from-emerald-50 to-white text-emerald-900",
    blue: "from-sky-50 to-white text-sky-900",
    amber: "from-amber-50 to-white text-amber-900",
  };
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-b ${tones[tone]} p-4 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ----- Tooltip de graficos -----
function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-bold text-slate-700">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke || p.fill }} className="font-semibold">
          {p.name}: {unit === "money" ? fmtMoney(p.value) : unit === "pct" ? fmtPct(p.value) : fmtInt(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Beds24Reports({ currency = "€", supabaseUrl, anonKey, accessToken }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [range, setRange] = useState({ desde: firstDayOfMonthIso(), hasta: todayIso() });
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiInfo, setApiInfo] = useState("");
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError("");
    setApiError("");
    setApiInfo("");
    setParsing(true);
    setFileName(file.name);
    try {
      const r = await parseBeds24File(file);
      setReport(r);
      setRange({ desde: r.range.desde, hasta: r.range.hasta });
    } catch (e) {
      setReport(null);
      setError(e?.message || "No se pudo leer el archivo.");
    } finally {
      setParsing(false);
    }
  }, []);

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onConsultarBeds24 = async () => {
    setApiError("");
    setApiInfo("");
    if (!range.desde || !range.hasta) {
      setApiError("Indica un rango de fechas válido.");
      return;
    }
    if (range.desde > range.hasta) {
      setApiError("La fecha 'desde' no puede ser posterior a 'hasta'.");
      return;
    }
    if (!supabaseUrl) {
      setApiError("La conexión con Supabase no está configurada. Sube un archivo .xls mientras tanto.");
      return;
    }
    setApiLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/beds24-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || ""}`,
          apikey: anonKey || "",
        },
        body: JSON.stringify({ desde: range.desde, hasta: range.hasta }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `La función Beds24 respondió ${res.status}. ¿Está desplegada y configurada con tus claves?`);
      }
      const json = await res.json();
      setReport(buildReportFromApi(json));
      setFileName(`Beds24 API · ${fmtDateEs(range.desde)} - ${fmtDateEs(range.hasta)}`);
      setApiInfo("Datos obtenidos en vivo desde Beds24.");
    } catch (e) {
      setApiError(e?.message || "No se pudo consultar Beds24. Sube un archivo .xls como alternativa.");
    } finally {
      setApiLoading(false);
    }
  };

  const onClear = () => {
    setReport(null);
    setFileName("");
    setError("");
    setApiError("");
    setApiInfo("");
  };

  const totals = report?.totals;
  const days = report?.days || [];
  const months = report?.months || [];
  const roomTypes = report?.roomTypes;

  const hasData = Boolean(report && days.length);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Cabecera */}
      <div className={cardCls}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold sm:text-xl">Panel de informes Beds24</h2>
          <p className="text-sm text-slate-500">Lector de informes financieros y de ocupación · L'Hostalet de Tossa</p>
        </div>
      </div>

      {/* Zona de carga + consulta API */}
      <div className={cardCls}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Carga de archivo */}
          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-700">Subir informe de Beds24</h3>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragOver ? "border-[#2f5f7a] bg-sky-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2f5f7a] text-white font-bold">xls</div>
              <p className="text-sm font-semibold text-slate-700">
                {parsing ? "Leyendo archivo…" : "Arrastra aquí el archivo o pulsa para seleccionarlo"}
              </p>
              <p className="text-xs text-slate-500">Daily Financial Summary exportado desde Beds24 · .xls, .xlsx, .csv</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/html"
                className="hidden"
                onChange={onInputChange}
              />
            </div>
            {fileName && !error && (
              <p className="mt-2 text-xs text-slate-600">
                Archivo: <span className="font-semibold">{fileName}</span>
                {report?.variant && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5">{report.variant === "granular" ? "por habitación" : "agregado"}</span>}
                {report && <button type="button" onClick={onClear} className="ml-2 text-[#2f5f7a] hover:underline">Limpiar</button>}
              </p>
            )}
            {error && <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs font-semibold text-red-700">{error}</p>}
          </div>

          {/* Consulta en vivo */}
          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-700">Consultar en vivo (API Beds24)</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-500">
                Desde
                <input type="date" value={range.desde} onChange={(e) => setRange((r) => ({ ...r, desde: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2f5f7a] focus:ring-4 focus:ring-sky-100" />
              </label>
              <label className="text-xs text-slate-500">
                Hasta
                <input type="date" value={range.hasta} onChange={(e) => setRange((r) => ({ ...r, hasta: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2f5f7a] focus:ring-4 focus:ring-sky-100" />
              </label>
            </div>
            <button type="button" className={`mt-3 w-full ${buttonDark}`} onClick={onConsultarBeds24} disabled={apiLoading}>
              {apiLoading ? "Consultando Beds24…" : "Consultar Beds24"}
            </button>
            {apiInfo && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">{apiInfo}</p>}
            {apiError && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-700">{apiError}</p>}
            <p className="mt-2 text-xs text-slate-400">Requiere desplegar la Edge Function <code>beds24-report</code> con tus claves de Beds24. Mientras tanto, usa la carga de archivo.</p>
          </div>
        </div>
      </div>

      {!hasData && !parsing && (
        <div className={cardCls}>
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-slate-600">Sin datos que mostrar</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Sube un <strong>Daily Financial Summary</strong> de Beds24 o consulta un rango de fechas en vivo para ver ingresos, ocupación, ADR, RevPAR y evolución.
            </p>
          </div>
        </div>
      )}

      {/* Resumen KPIs */}
      {hasData && totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Ingresos del periodo" value={fmtMoney(totals.revenue, currency)} sub={`${totals.days} días`} tone="green" />
          <KpiCard label="ADR" value={fmtMoney(totals.adr, currency)} sub="ingreso medio/noche vendida" tone="blue" />
          <KpiCard label="RevPAR" value={fmtMoney(totals.revpar, currency)} sub="ingreso/habitación disponible" tone="blue" />
          <KpiCard label="Ocupación media" value={fmtPct(totals.occupancyPct)} sub={`${fmtInt(totals.nightsOccupied)} / ${fmtInt(totals.available)} noches`} tone="amber" />
          <KpiCard label="Noches ocupadas" value={fmtInt(totals.nightsOccupied)} sub="rooms sold" />
          <KpiCard label="Habit. disponibles" value={fmtInt(totals.available)} sub="room-nights" />
        </div>
      )}

      {/* Grafico evolucion ingresos + ocupacion */}
      {hasData && (
        <div className={cardCls}>
          <h3 className="mb-3 text-sm font-bold text-slate-700">Evolución por fecha · ingresos y ocupación</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={ACCENT_SOFT} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#64748b" }} interval="preserveStartEnd" minTickGap={18} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${v}`} width={48} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip content={<ChartTooltip unit="mixed" />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="revenue" name="Ingresos (€)" fill="url(#gradRevenue)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Line yAxisId="right" type="monotone" dataKey="occupancyPct" name="Ocupación (%)" stroke={AMBER} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs text-slate-400">Barras: ingresos diarios (eje izq.). Línea: ocupación (eje der.).</p>
        </div>
      )}

      {/* Grafico ADR y RevPAR */}
      {hasData && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className={cardCls}>
            <h3 className="mb-3 text-sm font-bold text-slate-700">ADR y RevPAR por día</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#64748b" }} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={48} />
                  <Tooltip content={<ChartTooltip unit="money" />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="adr" name="ADR" stroke={ACCENT} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="revpar" name="RevPAR" stroke={GREEN} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resumen mensual */}
          <div className={cardCls}>
            <h3 className="mb-3 text-sm font-bold text-slate-700">Resumen mensual</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500">
                    <th className="pb-2 font-semibold">Mes</th>
                    <th className="pb-2 text-right font-semibold">Ingresos</th>
                    <th className="pb-2 text-right font-semibold">Ocup.</th>
                    <th className="pb-2 text-right font-semibold">ADR</th>
                    <th className="pb-2 text-right font-semibold">RevPAR</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month} className="border-t border-slate-100">
                      <td className="py-2 capitalize text-slate-700">{m.label}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{fmtMoney(m.revenue, currency)}</td>
                      <td className="py-2 text-right text-slate-600">{fmtPct(m.occupancyPct)}</td>
                      <td className="py-2 text-right text-slate-600">{fmtMoney(m.adr, currency)}</td>
                      <td className="py-2 text-right text-slate-600">{fmtMoney(m.revpar, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ingresos por tipo de habitacion (solo granular) */}
      {hasData && roomTypes && roomTypes.length > 0 && (
        <div className={cardCls}>
          <h3 className="mb-1 text-sm font-bold text-slate-700">Ingresos por tipo de habitación</h3>
          <p className="mb-3 text-xs text-slate-500">Desglose del informe granular de Beds24.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={roomTypes} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id="gradRoom" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={ACCENT_SOFT} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => fmtInt(v)} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip content={<ChartTooltip unit="money" />} />
                <Area dataKey="revenue" name="Ingresos" fill="url(#gradRoom)" stroke={ACCENT} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="pb-2 font-semibold">Habitación</th>
                  <th className="pb-2 text-right font-semibold">Ingresos</th>
                  <th className="pb-2 text-right font-semibold">Noches</th>
                  <th className="pb-2 text-right font-semibold">Ocup.</th>
                  <th className="pb-2 text-right font-semibold">ADR</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((r) => (
                  <tr key={r.name} className="border-t border-slate-100">
                    <td className="py-2 pr-2 text-slate-700">{r.name}</td>
                    <td className="py-2 text-right font-semibold text-slate-800">{fmtMoney(r.revenue, currency)}</td>
                    <td className="py-2 text-right text-slate-600">{fmtInt(r.nightsOccupied)}</td>
                    <td className="py-2 text-right text-slate-600">{fmtPct(r.occupancyPct)}</td>
                    <td className="py-2 text-right text-slate-600">{r.adr ? fmtMoney(r.adr, currency) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla diaria */}
      {hasData && (
        <div className={cardCls}>
          <h3 className="mb-3 text-sm font-bold text-slate-700">Detalle diario</h3>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="pb-2 font-semibold">Fecha</th>
                  <th className="pb-2 text-right font-semibold">Ingresos</th>
                  <th className="pb-2 text-right font-semibold">Noches</th>
                  <th className="pb-2 text-right font-semibold">Dispon.</th>
                  <th className="pb-2 text-right font-semibold">Ocup.</th>
                  <th className="pb-2 text-right font-semibold">ADR</th>
                  <th className="pb-2 text-right font-semibold">RevPAR</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date} className="border-t border-slate-100">
                    <td className="py-2 text-slate-700">{fmtDateEs(d.date)}</td>
                    <td className="py-2 text-right font-semibold text-slate-800">{fmtMoney(d.revenue, currency)}</td>
                    <td className="py-2 text-right text-slate-600">{fmtInt(d.nightsOccupied)}</td>
                    <td className="py-2 text-right text-slate-600">{fmtInt(d.available)}</td>
                    <td className="py-2 text-right text-slate-600">{fmtPct(d.occupancyPct)}</td>
                    <td className="py-2 text-right text-slate-600">{d.adr ? fmtMoney(d.adr, currency) : "-"}</td>
                    <td className="py-2 text-right text-slate-600">{d.revpar ? fmtMoney(d.revpar, currency) : "-"}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-bold text-slate-800">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{fmtMoney(totals.revenue, currency)}</td>
                    <td className="py-2 text-right">{fmtInt(totals.nightsOccupied)}</td>
                    <td className="py-2 text-right">{fmtInt(totals.available)}</td>
                    <td className="py-2 text-right">{fmtPct(totals.occupancyPct)}</td>
                    <td className="py-2 text-right">{fmtMoney(totals.adr, currency)}</td>
                    <td className="py-2 text-right">{fmtMoney(totals.revpar, currency)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}