import React, { useState, useCallback } from "react";
import { cn } from "../lib/utils";
import { VesselRecommender } from "../components/VesselRecommender";
import { RouteMap } from "../components/RouteMap";

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
   Components
   ═══════════════════════════════════════════════════════════════════ */

const DOT_COLORS: Record<CalendarDay["label"], string> = {
  Best: "bg-[#22A06B]",
  Good: "bg-[#19A7CE]",
  Fair: "bg-[#D99A24]",
  High: "bg-[#EA580C]",
  Peak: "bg-[#D94A4A]",
};

function StyledSelect({
  label,
  value,
  options,
  onChange,
  id,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-[#9AA3AA]">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none rounded-md border border-[#252A2E] bg-[#171B1F]",
            "px-3.5 py-2 pr-10 text-sm text-[#F1F3F4]",
            "outline-none transition-colors duration-150",
            "hover:border-[#3A4147] focus:border-[#19A7CE] focus:ring-1 focus:ring-[#19A7CE]/20"
          )}
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-[#171B1F] text-[#F1F3F4]">
              {opt}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#68727A]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function PriceCalendar({
  days,
  selectedDate,
  onSelect,
}: {
  days: CalendarDay[];
  selectedDate: string | null;
  onSelect: (day: CalendarDay) => void;
}) {
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
      <div className="grid grid-cols-7 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-[#68727A] uppercase py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((day, di) =>
              day ? (
                <button
                  key={day.dateStr}
                  id={`cal-day-${day.dateStr}`}
                  onClick={() => onSelect(day)}
                  className={cn(
                    "relative rounded-md border p-2 text-center cursor-pointer transition-colors duration-150",
                    "bg-[#171B1F] border-[#252A2E] hover:border-[#3A4147] hover:bg-[#1E2328]",
                    selectedDate === day.dateStr && "border-[#19A7CE] bg-[#19A7CE]/10",
                    day.date.toDateString() === new Date().toDateString() && "ring-1 ring-[#19A7CE]/30"
                  )}
                >
                  <div className="text-xs font-medium text-[#F1F3F4]">
                    {day.date.getDate()}
                  </div>
                  <div className="text-[10px] text-[#9AA3AA] mt-0.5">
                    ${Math.round(day.rate / 1000)}k
                  </div>
                  <div className={cn("absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full", DOT_COLORS[day.label])} />
                </button>
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

function CalendarLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {(["Best", "Good", "Fair", "High", "Peak"] as CalendarDay["label"][]).map((label) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", DOT_COLORS[label])} />
          <span className="text-[11px] text-[#9AA3AA]">{label}</span>
        </div>
      ))}
    </div>
  );
}

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
    { label: "Departure", days: 0 },
    { label: "Open Ocean", days: Math.floor(transitDays * 0.3) },
    { label: "Mid-voyage", days: Math.floor(transitDays * 0.55) },
    { label: "Approach", days: transitDays - 1 },
    { label: "Arrival ETA", days: transitDays },
  ];

  return (
    <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-5">
      <h3 className="text-xs font-medium text-[#9AA3AA] mb-4">Transit Timeline</h3>
      <div className="relative">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-[#252A2E]" />
        <div className="space-y-4">
          {milestones.map((m, i) => {
            const d = new Date(departure.date);
            d.setDate(d.getDate() + m.days);
            return (
              <div key={i} className="flex items-start gap-3 relative">
                <div className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10 bg-[#111417]",
                  i === 0 ? "border border-[#19A7CE]" :
                  i === milestones.length - 1 ? "border border-[#22A06B]" :
                  "border border-[#68727A]"
                )}>
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i === 0 ? "bg-[#19A7CE]" :
                    i === milestones.length - 1 ? "bg-[#22A06B]" :
                    "bg-[#68727A]"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#F1F3F4]">{m.label}</p>
                  <p className="text-xs text-[#9AA3AA]">
                    {d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    {m.days > 0 && <span className="ml-1 text-[#68727A]">Day +{m.days}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#9AA3AA]">
      {/* ── Page Header ── */}
      <header className="border-b border-[#252A2E] bg-[#111417]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F4]">
            Route Planner
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#9AA3AA]">
            Plan routes and identify optimal booking windows based on predictive spot rates.
          </p>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 sm:py-6">
        
        {/* ── TOP WORKSPACE: Journey & Vessel Fit ── */}
        <section className="rounded-lg border border-[#252A2E] bg-[#111417] mb-5">
          <div className="border-b border-[#252A2E] px-5 py-4">
            <h2 className="text-base font-semibold text-[#F1F3F4]">Planning Workspace</h2>
          </div>
          
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Left: Journey Form */}
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[#F1F3F4]">Journey Details</h3>
                  <p className="text-xs text-[#9AA3AA] mt-0.5">Select origin and destination</p>
                </div>
                
                <div className="space-y-4">
                  <StyledSelect
                    id="select-origin"
                    label="Origin Port"
                    value={origin}
                    options={ORIGINS}
                    onChange={setOrigin}
                  />

                  <div className="flex justify-center -my-1 relative z-10">
                    <button
                      id="btn-swap-route"
                      onClick={() => { 
                        const t = origin; 
                        const cleanDest = destination.replace(/\(.*\)/, "").trim();
                        const destCode = destination.match(/\(([^)]+)\)/)?.[1] ?? "??";
                        setOrigin(`${cleanDest} (${destCode})`); 
                        setDestination(t); 
                      }}
                      className="h-7 w-7 rounded border border-[#252A2E] bg-[#171B1F] flex items-center justify-center text-[#68727A] hover:text-[#F1F3F4] hover:border-[#3A4147] transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                  </div>

                  <StyledSelect
                    id="select-destination"
                    label="Destination Port"
                    value={destination}
                    options={DESTINATIONS}
                    onChange={setDestination}
                  />

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <StyledSelect
                      id="select-vessel-planner"
                      label="Vessel Class"
                      value={vessel}
                      options={VESSEL_CLASSES}
                      onChange={setVessel}
                    />
                    <StyledSelect
                      id="select-cargo"
                      label="Cargo Type"
                      value={cargo}
                      options={CARGO_TYPES}
                      onChange={setCargo}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  id="btn-find-routes"
                  onClick={runSearch}
                  disabled={loading}
                  className={cn(
                    "w-full rounded-md py-2.5 text-sm font-semibold transition-colors",
                    "bg-[#19A7CE] hover:bg-[#158C9B] text-[#111417]",
                    loading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {loading ? "Analysing market…" : "Find Best Booking Days"}
                </button>
              </div>
            </div>

            {/* Right: Vessel Recommendation */}
            <div className="relative">
              <div className="hidden lg:block absolute -left-6 xl:-left-8 top-0 bottom-0 w-px bg-[#252A2E]" />
              <VesselRecommender />
            </div>

          </div>
        </section>

        {/* ── Empty State before search ── */}
        {!showCalendar && !loading && !routeInfo && (
          <div className="py-8 text-center text-[#9AA3AA] text-sm">
            Configure your route and find the best booking days.
          </div>
        )}

        {/* ── Route Summary (Only appears after search) ── */}
        {routeInfo && (
          <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-[#F1F3F4]">Route Summary</h3>
            <div className="flex items-center gap-8 text-center">
              <div>
                <div className="text-[#68727A] text-xs mb-1">Distance</div>
                <div className="text-[#F1F3F4] font-semibold text-sm">{routeInfo.distance.toLocaleString()} nm</div>
              </div>
              <div className="w-px h-8 bg-[#252A2E]" />
              <div>
                <div className="text-[#68727A] text-xs mb-1">Transit</div>
                <div className="text-[#F1F3F4] font-semibold text-sm">~{routeInfo.transitDays}d</div>
              </div>
              <div className="w-px h-8 bg-[#252A2E]" />
              <div>
                <div className="text-[#68727A] text-xs mb-1">Base Rate</div>
                <div className="text-[#F1F3F4] font-semibold text-sm">${Math.round(routeInfo.baseRate / 1000)}k/d</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Results Area (Map, Calendar, Timeline) ── */}
        {(showCalendar || loading) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Calendar */}
            <section className="lg:col-span-8 rounded-lg border border-[#252A2E] bg-[#111417] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-[#F1F3F4]">35-Day Price Calendar</h2>
                  <p className="text-xs text-[#9AA3AA] mt-0.5">Select a date to view departure details</p>
                </div>
                <CalendarLegend />
              </div>

              {loading ? (
                <div className="h-64 rounded-md bg-[#171B1F] animate-pulse" />
              ) : (
                <PriceCalendar
                  days={calendarDays}
                  selectedDate={selectedDay?.dateStr ?? null}
                  onSelect={setSelectedDay}
                />
              )}
            </section>

            {/* Map & Timeline */}
            <section className="lg:col-span-4 space-y-5">
              {showCalendar && (
                <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-5">
                  <h3 className="text-xs font-medium text-[#9AA3AA] mb-3">Live Trade Lane</h3>
                  <div className="h-[200px]">
                    <RouteMap origin={origin} destination={destination} />
                  </div>
                </div>
              )}

              {selectedDay ? (
                <div className="space-y-5">
                  <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-5">
                    <h3 className="text-xs font-medium text-[#9AA3AA] mb-4">Selected Departure</h3>
                    <div className="mb-5">
                      <p className="text-lg font-bold text-[#F1F3F4]">
                        {selectedDay.date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", DOT_COLORS[selectedDay.label])} />
                        <span className="text-sm font-medium text-[#F1F3F4]">
                          {selectedDay.label} Rate Window
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="rounded-md border border-[#252A2E] bg-[#171B1F] p-3">
                        <span className="text-[#68727A] block text-xs">Daily TCE Rate</span>
                        <span className="font-semibold text-[#F1F3F4] mt-0.5 block">
                          ${selectedDay.rate.toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded-md border border-[#252A2E] bg-[#171B1F] p-3">
                        <span className="text-[#68727A] block text-xs">Savings vs Peak</span>
                        <span className={cn(
                          "font-semibold mt-0.5 block",
                          selectedDay.savings > 0 ? "text-[#22A06B]" : "text-[#D94A4A]"
                        )}>
                          {selectedDay.savings > 0 ? "+" : ""}${selectedDay.savings.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {routeInfo && (
                      <div className="rounded-md bg-[#19A7CE]/10 border border-[#19A7CE]/20 p-3">
                        <p className="text-[#19A7CE] block text-xs mb-1">Total Voyage Cost Est.</p>
                        <p className="text-base font-semibold text-[#F1F3F4]">
                          ${(selectedDay.rate * routeInfo.transitDays).toLocaleString()}
                        </p>
                        <p className="text-xs text-[#9AA3AA] mt-0.5">
                          {routeInfo.transitDays} days × ${selectedDay.rate.toLocaleString()}/day
                        </p>
                      </div>
                    )}
                  </div>

                  {routeInfo && (
                    <TransitTimeline departure={selectedDay} transitDays={routeInfo.transitDays} />
                  )}
                </div>
              ) : (
                showCalendar && (
                  <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-8 text-center text-[#9AA3AA] text-sm h-[320px] flex items-center justify-center">
                    Select a date on the calendar to view departure details and timeline.
                  </div>
                )
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
