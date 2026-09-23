/**
 * FreightIQ — Route Planner Page
 * A→B journey planner with 30-day price calendar showing cheapest booking days.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

const API_BASE = "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface CalendarDay {
  date: Date;
  dateStr: string;
  rate: number;
  percentile: number;  // 0–100: lower = cheaper
  label: "Best" | "Good" | "Fair" | "High" | "Peak";
  savings: number;     // $ saved vs peak
}

interface RouteOption {
  from: string;
  to: string;
  distance: number;
  transitDays: number;
  cargo: string;
}

const ORIGINS = [
  "Newcastle (AUNEW)",
  "Hay Point (AUHPT)",
  "Port Hedland (AUPHE)",
  "Nacala (MZNAC)",
  "Richards Bay (ZARBA)",
  "Banjarmasin (IDBMS)",
  "Samarinda (IDSMR)",
  "Hampton Roads (USHRP)",
  "Vostochny (RUVOS)",
  "Paradip (INPRD)",
  "Haldia (INHAL)",
  "Mundra (INMUN)",
  "Vizag (INVTZ)",
  "Kandla (INKDL)",
  "Nhava Sheva / JNPT (INJNP)",
  "Chennai (INMAA)",
  "New Mangalore (INMNG)",
];

const DESTINATIONS = [
  "Paradip (INPRD)",
  "Vizag (INVTZ)",
  "Gangavaram (INGGV)",
  "Haldia (INHAL)",
  "Dhamra (INDHA)",
  "Gopalpur (INGPL)",
  "Sagar-Sandheads (INSGS)",
  "Rotterdam (NLRTM)",
  "Shanghai (CNSHA)",
  "Fujairah (AEFUJ)",
  "Yokohama (JPYOK)",
  "Houston (USHOU)",
  "Singapore (SGSIN)",
  "Hamburg (DEHAM)",
  "Busan (KRPUS)",
];

const VESSEL_CLASSES = [
  "Handysize (32K DWT)",
  "Supramax (52K DWT)",
  "Panamax (75K DWT)",
  "Capesize (180K DWT)",
];

const CARGO_TYPES = [
  "Iron Ore",
  "Coal",
  "Grain",
  "Fertiliser",
  "Bauxite",
  "POL / Crude",
  "Containers",
  "General Cargo",
];

/* ═══════════════════════════════════════════════════════════════════
   Calendar Grid Component
   ═══════════════════════════════════════════════════════════════════ */

const DAY_COLORS: Record<CalendarDay["label"], string> = {
  Best: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30",
  Good: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25",
  Fair: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20",
  High: "bg-orange-500/10 border-orange-500/20 text-orange-300 hover:bg-orange-500/20",
  Peak: "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20",
};

const DOT_COLORS: Record<CalendarDay["label"], string> = {
  Best: "bg-emerald-400",
  Good: "bg-cyan-400",
  Fair: "bg-yellow-400",
  High: "bg-orange-400",
  Peak: "bg-rose-400",
};

function PriceCalendar({
  days,
  selectedDate,
  onSelect,
}: {
  days: CalendarDay[];
  selectedDate: string | null;
  onSelect: (day: CalendarDay) => void;
}) {
  // Build week rows
  const firstDay = days[0]?.date;
  const startDow = firstDay ? firstDay.getDay() : 0;
  const padded: (CalendarDay | null)[] = [
    ...Array(startDow).fill(null),
    ...days,
  ];
  while (padded.length % 7 !== 0) padded.push(null);
  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-mono font-semibold text-neutral-600 uppercase py-2">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((day, di) =>
              day ? (
                <motion.button
                  key={day.dateStr}
                  id={`cal-day-${day.dateStr}`}
                  onClick={() => onSelect(day)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "relative rounded-xl border p-2 text-center cursor-pointer transition-all duration-150",
                    DAY_COLORS[day.label],
                    selectedDate === day.dateStr && "ring-2 ring-white/30 ring-offset-1 ring-offset-neutral-950",
                    day.date.toDateString() === new Date().toDateString() && "ring-1 ring-cyan-500/40"
                  )}
                >
                  <div className="text-[11px] font-mono font-semibold">
                    {day.date.getDate()}
                  </div>
                  <div className="text-[9px] font-mono mt-0.5 opacity-80">
                    ${Math.round(day.rate / 1000)}k
                  </div>
                  <div className={cn("absolute top-1 right-1 h-1.5 w-1.5 rounded-full", DOT_COLORS[day.label])} />
                </motion.button>
              ) : (
                <div key={`empty-${wi}-${di}`} />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Legend
   ═══════════════════════════════════════════════════════════════════ */
function CalendarLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {(["Best", "Good", "Fair", "High", "Peak"] as CalendarDay["label"][]).map((label) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", DOT_COLORS[label])} />
          <span className="text-[10px] font-mono text-neutral-500">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Transit Timeline
   ═══════════════════════════════════════════════════════════════════ */

function TransitTimeline({
  departure,
  transitDays,
}: {
  departure: CalendarDay;
  transitDays: number;
}) {
  const arrival = new Date(departure.date);
  arrival.setDate(arrival.getDate() + transitDays);

  const milestones = [
    { label: "Departure", days: 0, icon: "⚓" },
    { label: "Open Ocean", days: Math.floor(transitDays * 0.3), icon: "🌊" },
    { label: "Mid-voyage", days: Math.floor(transitDays * 0.55), icon: "📡" },
    { label: "Approach", days: transitDays - 1, icon: "🗼" },
    { label: "Arrival ETA", days: transitDays, icon: "🏭" },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-neutral-900/60 p-5 backdrop-blur-md">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 mb-4">
        Transit Timeline
      </h3>
      {/* Track */}
      <div className="relative">
        <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-cyan-500/40 to-transparent" />
        <div className="space-y-5">
          {milestones.map((m, i) => {
            const d = new Date(departure.date);
            d.setDate(d.getDate() + m.days);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 pl-1"
              >
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-lg z-10",
                  i === 0 ? "bg-cyan-500/20 border border-cyan-500/40" :
                  i === milestones.length - 1 ? "bg-emerald-500/20 border border-emerald-500/40" :
                  "bg-neutral-800 border border-white/[0.06]"
                )}>
                  {m.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{m.label}</p>
                  <p className="text-[11px] font-mono text-neutral-500">
                    {d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    {m.days > 0 && <span className="ml-2 text-neutral-600">Day +{m.days}</span>}
                  </p>
                </div>
                {m.days === 0 && (
                  <span className="text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5">
                    DEPART
                  </span>
                )}
                {m.days === transitDays && (
                  <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                    ETA
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════ */

export function RoutePlannerPage() {
  const [origin, setOrigin] = useState(ORIGINS[0]);
  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [vessel, setVessel] = useState(VESSEL_CLASSES[1]);
  const [cargo, setCargo] = useState(CARGO_TYPES[0]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; transitDays: number; baseRate: number } | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setShowCalendar(false);
    setSelectedDay(null);
    try {
      const params = new URLSearchParams({
        origin,
        destination,
        vessel,
        cargo,
      });
      const res = await fetch(`${API_BASE}/api/planner?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch planner data");
      const data = await res.json();
      
      setRouteInfo(data.routeInfo);
      
      const parsedDays = data.calendarDays.map((d: any) => ({
        ...d,
        date: new Date(d.dateStr + "T12:00:00Z")
      }));
      setCalendarDays(parsedDays);
      setShowCalendar(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [origin, destination, vessel, cargo]);

  const bestDays = calendarDays.filter(d => d.label === "Best" || d.label === "Good").slice(0, 3);

  return (
    <div className="min-h-screen bg-neutral-950 relative">
      {/* Grid bg */}
      <div className="absolute inset-0 grid-bg grid-bg-mask pointer-events-none" />
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
        {/* Page Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Route Planner</h1>
          </div>
          <p className="text-sm text-neutral-500 ml-11">Select origin, destination and vessel class to see the cheapest booking days on a 35-day price calendar.</p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* ── Left Panel: Search Form ── */}
          <div className="xl:col-span-1 space-y-4">
            <div className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 mb-5">Journey Details</p>

              {/* Origin */}
              <div className="space-y-1.5 mb-4">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                  Origin Port
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/60">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <select
                    id="select-origin"
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/[0.06] bg-neutral-800/60 pl-9 pr-4 py-2.5 text-sm text-neutral-200 outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  >
                    {ORIGINS.map(o => <option key={o} value={o} className="bg-neutral-900">{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Swap button */}
              <div className="flex justify-center my-2">
                <button
                  id="btn-swap-route"
                  onClick={() => { const t = origin; setOrigin(destination.replace(/\(.*\)/, "").trim() + " " + "(" + (destination.match(/\(([^)]+)\)/)?.[1] ?? "??") + ")"); setDestination(t); }}
                  className="h-8 w-8 rounded-full border border-white/[0.08] bg-neutral-800/60 flex items-center justify-center text-neutral-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* Destination */}
              <div className="space-y-1.5 mb-4">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                  Destination Port
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/60">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <select
                    id="select-destination"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/[0.06] bg-neutral-800/60 pl-9 pr-4 py-2.5 text-sm text-neutral-200 outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all"
                  >
                    {DESTINATIONS.map(d => <option key={d} value={d} className="bg-neutral-900">{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Vessel & Cargo */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Vessel</label>
                  <select id="select-vessel-planner" value={vessel} onChange={e => setVessel(e.target.value)} className="w-full appearance-none rounded-xl border border-white/[0.06] bg-neutral-800/60 px-3 py-2.5 text-xs text-neutral-200 outline-none focus:border-cyan-500/40 transition-all">
                    {VESSEL_CLASSES.map(v => <option key={v} value={v} className="bg-neutral-900">{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Cargo</label>
                  <select id="select-cargo" value={cargo} onChange={e => setCargo(e.target.value)} className="w-full appearance-none rounded-xl border border-white/[0.06] bg-neutral-800/60 px-3 py-2.5 text-xs text-neutral-200 outline-none focus:border-cyan-500/40 transition-all">
                    {CARGO_TYPES.map(c => <option key={c} value={c} className="bg-neutral-900">{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <motion.button
                id="btn-find-routes"
                onClick={runSearch}
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full rounded-xl py-3 text-sm font-semibold tracking-wide transition-all duration-200",
                  "bg-gradient-to-r from-cyan-500/80 to-cyan-600/80 hover:from-cyan-500 hover:to-cyan-600",
                  "text-white border border-cyan-500/30",
                  "shadow-[0_0_20px_rgba(34,211,238,0.15)]",
                  loading && "opacity-60 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Analysing market…
                  </span>
                ) : "Find Best Booking Days →"}
              </motion.button>
            </div>

            {/* Route Summary */}
            {routeInfo && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 mb-4">Route Summary</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Distance", value: `${routeInfo.distance.toLocaleString()} nm`, icon: "📐" },
                    { label: "Transit", value: `~${routeInfo.transitDays}d`, icon: "⏱️" },
                    { label: "Base Rate", value: `$${Math.round(routeInfo.baseRate / 1000)}k/d`, icon: "💲" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-neutral-800/40 border border-white/[0.04] p-3">
                      <div className="text-lg mb-1">{s.icon}</div>
                      <div className="text-sm font-bold font-mono text-white">{s.value}</div>
                      <div className="text-[9px] text-neutral-600 uppercase tracking-wider mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Best Days Summary */}
            {bestDays.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-md p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500/70 mb-3">⚡ Top 3 Booking Windows</p>
                <div className="space-y-2">
                  {bestDays.map((d, i) => (
                    <button
                      key={d.dateStr}
                      id={`btn-best-day-${i}`}
                      onClick={() => setSelectedDay(d)}
                      className="w-full flex items-center justify-between rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] hover:bg-emerald-500/10 px-3 py-2.5 transition-all"
                    >
                      <div className="text-left">
                        <p className="text-xs font-semibold text-white">
                          {d.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                        <p className="text-[10px] font-mono text-emerald-400">${d.rate.toLocaleString()}/day</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          Save ${d.savings.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ── Right Panel: Calendar + Timeline ── */}
          <div className="xl:col-span-2 space-y-5">
            {/* Calendar */}
            <AnimatePresence>
              {(showCalendar || loading) && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">35-Day Price Calendar</p>
                      <p className="text-xs text-neutral-600 mt-0.5">Click a date to select departure</p>
                    </div>
                    <CalendarLegend />
                  </div>

                  {loading ? (
                    <div className="h-64 rounded-2xl bg-neutral-800/40 skeleton-shimmer" />
                  ) : (
                    <PriceCalendar
                      days={calendarDays}
                      selectedDate={selectedDay?.dateStr ?? null}
                      onSelect={setSelectedDay}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected Day Detail */}
            <AnimatePresence>
              {selectedDay && (
                <motion.div
                  key="day-detail"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                >
                  {/* Pricing Detail */}
                  <div className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 mb-4">Selected Departure</p>
                    <div className="mb-4">
                      <p className="text-2xl font-extrabold font-mono text-white">
                        {selectedDay.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold mt-2",
                        selectedDay.label === "Best" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25" :
                        selectedDay.label === "Good" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25" :
                        selectedDay.label === "Peak" ? "bg-rose-500/15 text-rose-300 border border-rose-500/25" :
                        "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25"
                      )}>
                        <span className={cn("h-2 w-2 rounded-full", DOT_COLORS[selectedDay.label])} />
                        {selectedDay.label} Rate Window
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-neutral-800/40 border border-white/[0.04] p-3">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Daily TCE Rate</p>
                        <p className="text-xl font-bold font-mono text-white mt-1">${selectedDay.rate.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-neutral-800/40 border border-white/[0.04] p-3">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Savings vs Peak</p>
                        <p className={cn("text-xl font-bold font-mono mt-1", selectedDay.savings > 0 ? "text-emerald-400" : "text-rose-400")}>
                          {selectedDay.savings > 0 ? "+" : ""}${selectedDay.savings.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {routeInfo && (
                      <div className="mt-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/10 p-3">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Total Voyage Cost Est.</p>
                        <p className="text-lg font-bold font-mono text-cyan-300">
                          ${(selectedDay.rate * routeInfo.transitDays).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-neutral-600">{routeInfo.transitDays} days × ${selectedDay.rate.toLocaleString()}/day</p>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  {routeInfo && (
                    <TransitTimeline departure={selectedDay} transitDays={routeInfo.transitDays} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!showCalendar && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-3xl border border-dashed border-white/[0.06] bg-neutral-900/40 p-16 flex flex-col items-center justify-center text-center"
              >
                <div className="text-5xl mb-4">🧭</div>
                <p className="text-lg font-semibold text-neutral-400">Select a route and find best days</p>
                <p className="text-sm text-neutral-600 mt-2">Choose origin, destination, vessel class and cargo type, then click "Find Best Booking Days"</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
