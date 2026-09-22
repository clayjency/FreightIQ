import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "./lib/utils";

/* ═══════════════════════════════════════════════════════════════════
   1. TypeScript Interfaces
   ═══════════════════════════════════════════════════════════════════ */

interface ForecastPoint {
  week: string;
  actual?: number;
  p10?: number;
  p50?: number;
  p90?: number;
}

interface PortConstraint {
  id: string;
  portName: string;
  region: string;
  draftLimitM: number;
  vesselFit: "Optimal" | "Marginal" | "Violation";
  congestionAlertHrs: number;
  berthWaitDays: number;
  tideDependency: boolean;
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
}

interface DashboardState {
  currentSpotRate: number;
  spotRateChange: number;
  decisionSignal: "Book Now" | "Wait Mode";
  confidenceScore: number;
  selectedRoute: string;
  selectedVesselClass: string;
  forecast4w: number;
  forecast4wDelta: number;
  forecast8w: number;
  forecast8wDelta: number;
  volatilityIndex: number;
  volatilityTrend: "up" | "down" | "stable";
  chartData: ForecastPoint[];
  portConstraints: PortConstraint[];
  lastUpdated: string;
  modelVersion: string;
  dataFreshness: "Live" | "Delayed" | "Stale";
}

/* ═══════════════════════════════════════════════════════════════════
   2. API Config & Data Fetch
   ═══════════════════════════════════════════════════════════════════ */

const API_BASE = "http://localhost:8000";

const TRADE_ROUTES = [
  "Paradip → Rotterdam",
  "Haldia → Shanghai",
  "Mundra → Fujairah",
  "Vizag → Yokohama",
  "Kandla → Houston",
];

const VESSEL_CLASSES = [
  "Supramax (52K DWT)",
  "Panamax (75K DWT)",
  "Capesize (180K DWT)",
  "Handysize (32K DWT)",
  "VLOC (300K DWT)",
];

async function fetchDashboardData(
  route: string = TRADE_ROUTES[0],
  vessel: string = VESSEL_CLASSES[0]
): Promise<DashboardState> {
  const params = new URLSearchParams({ route, vessel });
  const res = await fetch(`${API_BASE}/api/dashboard?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`FreightIQ API error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<DashboardState>;
}

/* ═══════════════════════════════════════════════════════════════════
   3. Sub-components & Helpers
   ═══════════════════════════════════════════════════════════════════ */

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-md bg-[#171B1F]", className)} />;
}

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

function TrendArrow({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const isUp = value > 0;
  const isZero = value === 0;
  const color = isZero ? "text-[#9AA3AA]" : isUp ? "text-[#22A06B]" : "text-[#D94A4A]";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", color)}>
      {!isZero && (
        <svg
          className={cn("h-3 w-3", !isUp && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      )}
      {isUp ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[#252A2E] bg-[#171B1F] px-3.5 py-2.5 shadow-lg text-xs">
      <p className="font-medium text-[#9AA3AA] mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#9AA3AA]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-semibold text-[#F1F3F4]">
              ${entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskIndicator({ level }: { level: PortConstraint["riskLevel"] }) {
  const dotColor: Record<string, string> = {
    Low: "bg-[#22A06B]",
    Moderate: "bg-[#D99A24]",
    High: "bg-[#EA580C]",
    Critical: "bg-[#D94A4A]",
  };
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[#F1F3F4]">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor[level])} />
      <span>{level}</span>
    </span>
  );
}

function VesselFitText({ fit }: { fit: PortConstraint["vesselFit"] }) {
  const textColor: Record<string, string> = {
    Optimal: "text-[#22A06B]",
    Marginal: "text-[#D99A24]",
    Violation: "text-[#D94A4A]",
  };
  return <span className={cn("text-xs font-medium", textColor[fit])}>{fit}</span>;
}

/* ═══════════════════════════════════════════════════════════════════
   4. Main Dashboard Component
   ═══════════════════════════════════════════════════════════════════ */

export function FreightIQDashboard() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState(TRADE_ROUTES[0]);
  const [selectedVessel, setSelectedVessel] = useState(VESSEL_CLASSES[0]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = useCallback(async (route: string, vessel: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const result = await fetchDashboardData(route, vessel);
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Unable to reach FreightIQ API. Is the backend running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedRoute, selectedVessel);
  }, [loadData, selectedRoute, selectedVessel]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData(selectedRoute, selectedVessel);
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadData, selectedRoute, selectedVessel]);

  const hasPortAlert = data?.portConstraints.some(
    (p) => p.congestionAlertHrs > 0 || p.vesselFit === "Violation"
  );

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#9AA3AA]">
      {/* ── 1. Page Header ── */}
      <header className="border-b border-[#252A2E] bg-[#111417]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F4]">
                Freight Operations & Decision Engine
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#171B1F] border border-[#252A2E] text-[#9AA3AA]">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    data?.dataFreshness === "Live" ? "bg-[#22A06B]" : "bg-[#D99A24]"
                  )}
                />
                {data?.dataFreshness ?? "Live"}
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#9AA3AA]">
              Predictive spot rate intelligence, charter signals, and maritime port constraint monitoring.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Secondary status metadata */}
            <div className="hidden lg:flex items-center gap-3 text-xs text-[#68727A]">
              <span>
                Model:{" "}
                <span className="text-[#9AA3AA]">{data?.modelVersion ?? "LSTM-Ensemble v3.2"}</span>
              </span>
              <span>•</span>
              <span>
                Updated:{" "}
                <span className="text-[#9AA3AA]">
                  {data?.lastUpdated
                    ? new Date(data.lastUpdated).toLocaleTimeString()
                    : lastRefresh.toLocaleTimeString()}
                </span>
              </span>
            </div>

            {/* Quick Action: Ask AI */}
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#171B1F] hover:bg-[#1E2328] border border-[#252A2E] hover:border-[#19A7CE]/50 text-[#F1F3F4] text-xs font-medium transition-colors"
            >
              <svg
                className="h-3.5 w-3.5 text-[#19A7CE]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span>Ask AI Assistant</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">
        {apiError && (
          <div className="rounded-md border border-[#D94A4A]/30 bg-[#D94A4A]/10 p-3.5 text-xs text-[#D94A4A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => loadData(selectedRoute, selectedVessel)}
              className="underline hover:text-[#F1F3F4] ml-4 font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══ 2. Key Market Metrics (Compact Metric Row) ═══ */}
        <section aria-label="Key Market Metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Current Spot Rate */}
            <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#9AA3AA]">Current spot rate</span>
                <span className="text-xs text-[#68727A]">Daily charter</span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                {loading ? (
                  <SkeletonBlock className="h-7 w-28" />
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#F1F3F4]">
                      ${data!.currentSpotRate.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#68727A]">/day</span>
                  </div>
                )}
                {!loading && <TrendArrow value={data!.spotRateChange} />}
              </div>
            </div>

            {/* 2. 4-Week Forecast */}
            <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#9AA3AA]">4-week forecast</span>
                <span className="text-xs text-[#68727A]">Projected</span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                {loading ? (
                  <SkeletonBlock className="h-7 w-28" />
                ) : (
                  <span className="text-2xl font-bold text-[#F1F3F4]">
                    ${data!.forecast4w.toLocaleString()}
                  </span>
                )}
                {!loading && <TrendArrow value={data!.forecast4wDelta} />}
              </div>
            </div>

            {/* 3. 8-Week Forecast */}
            <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#9AA3AA]">8-week forecast</span>
                <span className="text-xs text-[#68727A]">Projected</span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                {loading ? (
                  <SkeletonBlock className="h-7 w-28" />
                ) : (
                  <span className="text-2xl font-bold text-[#F1F3F4]">
                    ${data!.forecast8w.toLocaleString()}
                  </span>
                )}
                {!loading && <TrendArrow value={data!.forecast8wDelta} />}
              </div>
            </div>

            {/* 4. Volatility Index */}
            <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#9AA3AA]">Volatility index</span>
                <span className="text-xs text-[#68727A]">Freight VIX</span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                {loading ? (
                  <SkeletonBlock className="h-7 w-20" />
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#F1F3F4]">
                      {data!.volatilityIndex}
                    </span>
                    <span className="text-xs text-[#68727A]">VIX</span>
                  </div>
                )}
                {!loading && (
                  <span className="text-xs text-[#9AA3AA] inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        data!.volatilityTrend === "up"
                          ? "bg-[#D94A4A]"
                          : data!.volatilityTrend === "down"
                          ? "bg-[#22A06B]"
                          : "bg-[#68727A]"
                      )}
                    />
                    <span className="capitalize">{data!.volatilityTrend}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Primary Operations Grid: 3. Trading Decision + 5. Rate Outlook Chart ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ─── 3. TRADING DECISION (Left 5 Cols) ─── */}
          <section
            aria-label="Trading Decision Engine"
            className="lg:col-span-5 rounded-lg border border-[#252A2E] bg-[#111417] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-[#19A7CE]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <h2 className="text-base font-semibold text-[#F1F3F4]">
                  Trading Decision Recommendation
                </h2>
              </div>
              {!loading && (
                <span className="text-xs text-[#68727A]">
                  Confidence: <span className="text-[#F1F3F4] font-medium">{data!.confidenceScore}%</span>
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-3.5">
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-14 w-full" />
                <SkeletonBlock className="h-11 w-full" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Decision Box — Restrained, calm, no neon or glow */}
                <div className="rounded-md border border-[#252A2E] bg-[#171B1F] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#68727A] block">Recommendation</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          data!.decisionSignal === "Book Now" ? "bg-[#22A06B]" : "bg-[#D99A24]"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xl font-bold tracking-tight",
                          data!.decisionSignal === "Book Now" ? "text-[#22A06B]" : "text-[#D99A24]"
                        )}
                      >
                        {data!.decisionSignal === "Book Now" ? "Book Now" : "Wait Mode"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[#68727A] block">Model Confidence</span>
                    <span className="text-base font-semibold text-[#F1F3F4]">
                      {data!.confidenceScore}%
                    </span>
                  </div>
                </div>

                {/* Spot Rate Context Box */}
                <div className="rounded-md border border-[#252A2E] bg-[#171B1F] p-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#68727A] block">Current spot rate</span>
                    <span className="font-semibold text-[#F1F3F4] text-sm mt-0.5 block">
                      ${data!.currentSpotRate.toLocaleString()}/day
                    </span>
                  </div>
                  <div>
                    <span className="text-[#68727A] block">24h movement</span>
                    <div className="mt-1">
                      <TrendArrow value={data!.spotRateChange} />
                    </div>
                  </div>
                </div>

                {/* Route & Vessel Selectors */}
                <div className="space-y-2.5 pt-1">
                  <StyledSelect
                    id="select-trade-route"
                    label="Trade route"
                    value={selectedRoute}
                    options={TRADE_ROUTES}
                    onChange={setSelectedRoute}
                  />
                  <StyledSelect
                    id="select-vessel-class"
                    label="Vessel class"
                    value={selectedVessel}
                    options={VESSEL_CLASSES}
                    onChange={setSelectedVessel}
                  />
                </div>

                {/* Selection Footer Note */}
                <div className="pt-2 border-t border-[#252A2E] flex items-center justify-between text-xs text-[#68727A]">
                  <span>Active parameters</span>
                  <span className="text-[#9AA3AA] truncate max-w-[240px]">
                    {selectedRoute} • {selectedVessel.split(" ")[0]}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ─── 5. FREIGHT RATE OUTLOOK (Right 7 Cols) ─── */}
          <section
            aria-label="Freight Rate Outlook"
            className="lg:col-span-7 rounded-lg border border-[#252A2E] bg-[#111417] p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-semibold text-[#F1F3F4]">
                  Freight Rate Forecast Trajectory
                </h2>
                <p className="text-xs text-[#9AA3AA] mt-0.5">
                  12-week predictive modeling with P10–P90 uncertainty intervals
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs text-[#9AA3AA]">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-3.5 rounded-sm bg-[#19A7CE]" />
                  <span>Actual</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 border-t-2 border-dashed border-[#19A7CE]" />
                  <span>P50 forecast</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-3.5 rounded-sm bg-[#19A7CE]/20" />
                  <span>P10–P90 range</span>
                </span>
              </div>
            </div>

            {loading ? (
              <div className="h-[340px] flex items-center justify-center">
                <SkeletonBlock className="h-full w-full" />
              </div>
            ) : (
              <div>
                <div className="h-[310px] sm:h-[340px] -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data!.chartData}
                      margin={{ top: 10, right: 12, left: -4, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#19A7CE" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#19A7CE" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradP50" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#19A7CE" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#19A7CE" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#19A7CE" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#19A7CE" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid stroke="#252A2E" strokeDasharray="3 3" vertical={false} />

                      <XAxis
                        dataKey="week"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#68727A" }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#68727A" }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        dx={-4}
                        width={46}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3A4147" }} />

                      {/* Reference line at "Now" */}
                      <ReferenceLine
                        x="Now"
                        stroke="#68727A"
                        strokeDasharray="4 4"
                        label={{
                          value: "Today",
                          position: "top",
                          fill: "#9AA3AA",
                          fontSize: 11,
                        }}
                      />

                      {/* P10-P90 band */}
                      <Area
                        type="monotone"
                        dataKey="p90"
                        stroke="none"
                        fill="url(#gradBand)"
                        fillOpacity={1}
                        name="P90"
                        connectNulls={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="p10"
                        stroke="rgba(25, 167, 206, 0.25)"
                        strokeWidth={1}
                        fill="transparent"
                        strokeDasharray="4 2"
                        name="P10"
                        connectNulls={false}
                      />

                      {/* P50 median forecast */}
                      <Area
                        type="monotone"
                        dataKey="p50"
                        stroke="#19A7CE"
                        strokeWidth={2}
                        fill="url(#gradP50)"
                        strokeDasharray="5 3"
                        name="P50 Forecast"
                        connectNulls={false}
                      />

                      {/* Actual historical rates */}
                      <Area
                        type="monotone"
                        dataKey="actual"
                        stroke="#19A7CE"
                        strokeWidth={2.5}
                        fill="url(#gradActual)"
                        name="Actual"
                        connectNulls={false}
                        dot={{
                          r: 2.5,
                          fill: "#19A7CE",
                          stroke: "#0B0D0F",
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 4.5,
                          fill: "#19A7CE",
                          stroke: "#0B0D0F",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-[#252A2E] flex items-center justify-between text-xs text-[#68727A]">
                  <span>Source: Baltic Exchange Benchmark & AIS Correlation Model</span>
                  <span>
                    Updated:{" "}
                    {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : "—"}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ═══ 4. PORT CONDITIONS (Operational Table Layout) ═══ */}
        <section
          aria-label="Port Conditions and Risk Monitoring"
          className="rounded-lg border border-[#252A2E] bg-[#111417] p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-[#D99A24]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <h2 className="text-base font-semibold text-[#F1F3F4]">
                  Port Conditions & Constraints
                </h2>
              </div>
              <p className="text-xs text-[#9AA3AA] mt-0.5">
                Operational draft limits, congestion levels, and berth delays
              </p>
            </div>

            {hasPortAlert && (
              <span className="text-xs text-[#D99A24] inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D99A24] shrink-0" />
                Congestion alerts active
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2.5">
              <SkeletonBlock className="h-9 w-full" />
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#252A2E] text-[#68727A]">
                    <th className="pb-2.5 pr-4 font-medium">Port</th>
                    <th className="pb-2.5 px-4 font-medium">Risk</th>
                    <th className="pb-2.5 px-4 font-medium">Draft</th>
                    <th className="pb-2.5 px-4 font-medium">Vessel fit</th>
                    <th className="pb-2.5 px-4 font-medium">Congestion</th>
                    <th className="pb-2.5 px-4 font-medium">Berth wait</th>
                    <th className="pb-2.5 pl-4 font-medium">Tide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252A2E]/60">
                  {data!.portConstraints.map((port) => (
                    <tr
                      key={port.id}
                      className="transition-colors hover:bg-[#171B1F]/50"
                    >
                      {/* Port & Region */}
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[#F1F3F4] text-sm">
                          {port.portName}
                        </div>
                        <div className="text-xs text-[#68727A] mt-0.5">{port.region}</div>
                      </td>

                      {/* Risk */}
                      <td className="py-3 px-4">
                        <RiskIndicator level={port.riskLevel} />
                      </td>

                      {/* Draft */}
                      <td className="py-3 px-4 text-[#F1F3F4]">
                        {port.draftLimitM} m
                      </td>

                      {/* Vessel Fit */}
                      <td className="py-3 px-4">
                        <VesselFitText fit={port.vesselFit} />
                      </td>

                      {/* Congestion */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            port.congestionAlertHrs > 0
                              ? "text-[#D99A24] font-medium"
                              : "text-[#9AA3AA]"
                          )}
                        >
                          {port.congestionAlertHrs} hrs
                        </span>
                      </td>

                      {/* Berth Wait */}
                      <td className="py-3 px-4 text-[#9AA3AA]">
                        {port.berthWaitDays} days
                      </td>

                      {/* Tide */}
                      <td className="py-3 pl-4 text-[#9AA3AA]">
                        {port.tideDependency ? (
                          <span className="text-[#19A7CE]">Tide-dependent</span>
                        ) : (
                          <span>Standard</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ═══ Operational Performance & Platform KPIs (Tile 5) ═══ */}
        <section aria-label="Platform Key Performance Indicators">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[
              { label: "Model accuracy", value: "94.2%", sub: "Last 30 days" },
              { label: "Routes analyzed", value: "2,847", sub: "Active pairs" },
              { label: "Ports monitored", value: "156", sub: "Real-time AIS" },
              { label: "Cost savings", value: "$1.2M", sub: "Year to date" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-[#252A2E] bg-[#111417] p-4 flex flex-col justify-between"
              >
                <span className="text-xs text-[#9AA3AA]">{kpi.label}</span>
                <div className="mt-2">
                  <div className="text-xl font-bold text-[#F1F3F4]">
                    {kpi.value}
                  </div>
                  <span className="text-xs text-[#68727A] mt-0.5 block">{kpi.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#252A2E] py-4 mt-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#68727A]">
          <span>© 2026 FreightIQ • Maritime Operations & Rate Intelligence</span>
          <span>LSTM + Transformer Ensemble • v3.2.0</span>
        </div>
      </footer>
    </div>
  );
}

export default FreightIQDashboard;
