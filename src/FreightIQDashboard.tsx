import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { motion, useMotionTemplate, useMotionValue, animate } from "framer-motion";
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

const DEFAULT_TRADE_ROUTES = [
  "Newcastle → Paradip",
  "Paradip → Rotterdam",
  "Haldia → Shanghai",
  "Mundra → Fujairah",
  "Vizag → Yokohama",
  "Kandla → Houston",
  "Newcastle → Gangavaram",
  "Hay Point → Dhamra",
  "Port Hedland → Dhamra",
  "Nacala → Vizag",
  "Richards Bay → Vizag",
  "Banjarmasin → Haldia",
  "Samarinda → Paradip",
  "Hampton Roads → Paradip",
  "Vostochny → Gangavaram",
];

const VESSEL_CLASSES = [
  "Supramax (52K DWT)",
  "Panamax (75K DWT)",
  "Capesize (180K DWT)",
  "Handysize (32K DWT)",
  "VLOC (300K DWT)",
];

/** Fetch route names from backend, fallback to defaults */
async function fetchRouteNames(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/routes/names`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return res.json();
  } catch {}
  return DEFAULT_TRADE_ROUTES;
}

/**
 * Fetches the full DashboardState from the FastAPI backend.
 * Falls back to a brief error state if the API is unreachable.
 * Swap API_BASE to your production URL for deployment.
 */
async function fetchDashboardData(
  route: string = DEFAULT_TRADE_ROUTES[0],
  vessel: string = VESSEL_CLASSES[0]
): Promise<DashboardState> {
  const params = new URLSearchParams({ route, vessel });
  const res = await fetch(`${API_BASE}/api/dashboard?${params}`, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(15_000),   // 15s timeout
  });
  if (!res.ok) throw new Error(`FreightIQ API error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<DashboardState>;
}

/* ═══════════════════════════════════════════════════════════════════
   3. Aceternity-style Sub-components
   ═══════════════════════════════════════════════════════════════════ */

// ──── Moving Border Component ────
function MovingBorder({
  children,
  duration = 4000,
  borderRadius = "1.5rem",
  colors = ["#22d3ee", "#f59e0b", "#22d3ee"],
  className,
}: {
  children: React.ReactNode;
  duration?: number;
  borderRadius?: string;
  colors?: string[];
  className?: string;
}) {
  const pathRef = useRef<SVGRectElement>(null);
  const progress = useMotionValue(0);

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: duration / 1000,
      repeat: Infinity,
      ease: "linear",
    });
    return () => controls.stop();
  }, [duration, progress]);

  const background = useMotionTemplate`conic-gradient(from ${
    // Rotate 360 deg continuously
    useMotionValue(0)
  }turn at 50% 50%, ${colors.join(", ")})`;

  // Simpler approach: use a rotating gradient overlay
  return (
    <div className={cn("relative", className)} style={{ borderRadius }}>
      {/* Animated gradient border */}
      <div
        className="absolute -inset-[1.5px] rounded-[inherit] overflow-hidden"
        style={{ borderRadius }}
      >
        <motion.div
          className="absolute inset-[-200%] w-[500%] h-[500%]"
          style={{
            background: `conic-gradient(from 0deg, ${colors[0]}, ${colors[1]}, ${colors[2]}, transparent, transparent, transparent, ${colors[0]})`,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: duration / 1000,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      {/* Content */}
      <div className="relative rounded-[inherit] bg-neutral-900 h-full" style={{ borderRadius }}>
        {children}
      </div>
    </div>
  );
}

// ──── Grid Background Component ────
function GridBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-neutral-950 overflow-hidden">
      {/* Grid lines */}
      <div className="absolute inset-0 grid-bg grid-bg-mask pointer-events-none" />
      {/* Subtle radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-amber-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ──── Focus Card Wrapper ────
function FocusCards({
  children,
  hoveredIndex,
  totalItems,
}: {
  children: React.ReactNode;
  hoveredIndex: number | null;
  totalItems: number;
}) {
  return <div className="space-y-3">{children}</div>;
}

function FocusCardItem({
  index,
  hoveredIndex,
  onHoverStart,
  onHoverEnd,
  children,
  className,
}: {
  index: number;
  hoveredIndex: number | null;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      animate={{
        filter: hoveredIndex !== null && hoveredIndex !== index ? "blur(3px)" : "blur(0px)",
        opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.4 : 1,
        scale: hoveredIndex === index ? 1.02 : 1,
      }}
      transition={{ duration: 0.3 }}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </motion.div>
  );
}

// ──── Bento Grid Item ────
function BentoGridItem({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "row-span-1 rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md",
        "transition-all duration-300 hover:border-white/[0.12]",
        "group/bento overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   4. Skeleton Loaders
   ═══════════════════════════════════════════════════════════════════ */

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-xl", className)} />;
}

function Tile1Skeleton() {
  return (
    <div className="p-6 space-y-5">
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="h-12 w-48" />
      <SkeletonBlock className="h-10 w-36 rounded-full" />
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
      </div>
    </div>
  );
}

function Tile2Skeleton() {
  return (
    <div className="p-6 space-y-4">
      <SkeletonBlock className="h-4 w-28" />
      <div className="grid grid-cols-2 gap-4">
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20 col-span-2" />
      </div>
    </div>
  );
}

function Tile3Skeleton() {
  return (
    <div className="p-6 space-y-4">
      <SkeletonBlock className="h-4 w-40" />
      <SkeletonBlock className="h-64 w-full" />
    </div>
  );
}

function Tile4Skeleton() {
  return (
    <div className="p-6 space-y-3">
      <SkeletonBlock className="h-4 w-36" />
      {[...Array(4)].map((_, i) => (
        <SkeletonBlock key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   5. Styled Dropdown
   ═══════════════════════════════════════════════════════════════════ */

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
      <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none rounded-xl border border-white/[0.06] bg-neutral-800/60",
            "px-4 py-2.5 pr-10 text-sm text-neutral-200",
            "outline-none transition-all duration-200",
            "focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20",
            "hover:border-white/[0.12]"
          )}
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-neutral-900">
              {opt}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none"
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

/* ═══════════════════════════════════════════════════════════════════
   6. Trend Indicator
   ═══════════════════════════════════════════════════════════════════ */

function TrendArrow({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const isUp = value > 0;
  const color = isUp ? "text-emerald-400" : "text-rose-400";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-sm font-semibold", color)}>
      <svg
        className={cn("h-3.5 w-3.5", !isUp && "rotate-180")}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   7. Custom Recharts Tooltip
   ═══════════════════════════════════════════════════════════════════ */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-neutral-900/95 backdrop-blur-xl px-4 py-3 shadow-2xl">
      <p className="text-[11px] font-mono font-semibold text-neutral-400 mb-2 uppercase tracking-wider">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-neutral-400">{entry.name}:</span>
          <span className="font-mono font-semibold text-neutral-100">
            ${entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   8. Risk Level Badge
   ═══════════════════════════════════════════════════════════════════ */

function RiskBadge({ level }: { level: PortConstraint["riskLevel"] }) {
  const styles: Record<string, string> = {
    Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Moderate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Critical: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", styles[level])}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        level === "Low" && "bg-emerald-400",
        level === "Moderate" && "bg-yellow-400",
        level === "High" && "bg-orange-400",
        level === "Critical" && "bg-rose-400 animate-pulse",
      )} />
      {level}
    </span>
  );
}

function VesselFitBadge({ fit }: { fit: PortConstraint["vesselFit"] }) {
  const styles: Record<string, string> = {
    Optimal: "text-emerald-400",
    Marginal: "text-yellow-400",
    Violation: "text-rose-400",
  };
  return (
    <span className={cn("font-semibold text-xs", styles[fit])}>
      {fit === "Optimal" && "✓ "}
      {fit === "Violation" && "✕ "}
      {fit === "Marginal" && "⚠ "}
      {fit}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   9. Main Dashboard Component
   ═══════════════════════════════════════════════════════════════════ */

export function FreightIQDashboard() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [tradeRoutes, setTradeRoutes] = useState<string[]>(DEFAULT_TRADE_ROUTES);
  const [selectedRoute, setSelectedRoute] = useState(DEFAULT_TRADE_ROUTES[0]);
  const [selectedVessel, setSelectedVessel] = useState(VESSEL_CLASSES[0]);
  const [hoveredPortIndex, setHoveredPortIndex] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load routes dynamically from backend
  useEffect(() => {
    fetchRouteNames().then(setTradeRoutes);
  }, []);

  // Core fetch — called on mount, route/vessel change, and auto-refresh
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

  // Fetch on mount and whenever route/vessel changes
  useEffect(() => {
    loadData(selectedRoute, selectedVessel);
  }, [loadData, selectedRoute, selectedVessel]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(selectedRoute, selectedVessel);
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadData, selectedRoute, selectedVessel]);

  // ──── Determine amber highlight for Port Risk tile ────
  const hasPortAlert = data?.portConstraints.some(
    (p) => p.congestionAlertHrs > 0 || p.vesselFit === "Violation"
  );

  return (
    <GridBackground>
      {/* ── Header Bar ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-neutral-950/70 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
              <svg className="h-5 w-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Freight<span className="text-cyan-400">IQ</span>
              </h1>
              <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                Maritime Intelligence • PS-26006
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Ask GPT-4o AI Quick Launcher Button */}
            <Link
              to="/chat"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold transition-all shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>Ask GPT-4o AI</span>
            </Link>

            {/* Status indicators */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  data?.dataFreshness === "Live" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                )} />
                {data?.dataFreshness ?? "—"}
              </span>
              <span className="text-neutral-700">|</span>
              <span>{data?.modelVersion ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Bento Grid ── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 auto-rows-auto">
          {/* ═══ TILE 1 — Decision Engine (Top Left, 4 cols) ═══ */}
          <div className="lg:col-span-4">
            {loading ? (
              <BentoGridItem id="tile-decision-engine" className="h-full"><Tile1Skeleton /></BentoGridItem>
            ) : (
              <MovingBorder
                duration={6000}
                colors={[
                  data!.decisionSignal === "Book Now" ? "#22d3ee" : "#f59e0b",
                  "#0a0a0a",
                  data!.decisionSignal === "Book Now" ? "#22d3ee" : "#f59e0b",
                ]}
                className="h-full"
              >
                <div className="p-6 sm:p-7 h-full flex flex-col" id="tile-decision-engine">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                        Decision Engine
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-600">
                      CONF: {data!.confidenceScore}%
                    </span>
                  </div>

                  {/* Spot Rate */}
                  <div className="mb-2">
                    <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                      Current Spot Rate
                    </span>
                  </div>
                  <div className="flex items-end gap-3 mb-5">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
                      ${data!.currentSpotRate.toLocaleString()}
                    </span>
                    <span className="text-sm text-neutral-400 mb-1">/day</span>
                    <TrendArrow value={data!.spotRateChange} />
                  </div>

                  {/* Decision Badge */}
                  <motion.div
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-5 py-2.5 mb-6 w-fit",
                      "font-semibold text-sm tracking-wide",
                      data!.decisionSignal === "Book Now"
                        ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/20",
                    )}
                    animate={{
                      boxShadow: data!.decisionSignal === "Book Now"
                        ? [
                            "0 0 8px rgba(34,211,238,0.3), 0 0 20px rgba(34,211,238,0.1)",
                            "0 0 16px rgba(34,211,238,0.6), 0 0 40px rgba(34,211,238,0.2)",
                            "0 0 8px rgba(34,211,238,0.3), 0 0 20px rgba(34,211,238,0.1)",
                          ]
                        : [
                            "0 0 8px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.1)",
                            "0 0 16px rgba(245,158,11,0.6), 0 0 40px rgba(245,158,11,0.2)",
                            "0 0 8px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.1)",
                          ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      data!.decisionSignal === "Book Now" ? "bg-cyan-400" : "bg-amber-400"
                    )} />
                    {data!.decisionSignal}
                  </motion.div>

                  {/* Dropdowns */}
                  <div className="space-y-3 mt-auto">
                    <StyledSelect
                      id="select-trade-route"
                      label="Trade Route"
                      value={selectedRoute}
                      options={tradeRoutes}
                      onChange={setSelectedRoute}
                    />
                    <StyledSelect
                      id="select-vessel-class"
                      label="Vessel Class"
                      value={selectedVessel}
                      options={VESSEL_CLASSES}
                      onChange={setSelectedVessel}
                    />
                  </div>
                </div>
              </MovingBorder>
            )}
          </div>

          {/* ═══ TILE 2 — Forecasts (Top Right, 4 cols) ═══ */}
          <div className="lg:col-span-4">
            {loading ? (
              <BentoGridItem id="tile-forecasts"><Tile2Skeleton /></BentoGridItem>
            ) : (
              <BentoGridItem id="tile-forecasts">
                <div className="p-6 sm:p-7">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-5">
                    <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                      Rate Forecasts
                    </span>
                  </div>

                  {/* Forecast cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* 4-week */}
                    <div className="rounded-2xl border border-white/[0.04] bg-neutral-800/40 p-4">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                        4-Week Outlook
                      </span>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-2xl font-bold font-mono text-white">
                          ${data!.forecast4w.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1">
                        <TrendArrow value={data!.forecast4wDelta} />
                      </div>
                    </div>

                    {/* 8-week */}
                    <div className="rounded-2xl border border-white/[0.04] bg-neutral-800/40 p-4">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                        8-Week Outlook
                      </span>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-2xl font-bold font-mono text-white">
                          ${data!.forecast8w.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1">
                        <TrendArrow value={data!.forecast8wDelta} />
                      </div>
                    </div>

                    {/* Volatility */}
                    <div className="col-span-2 rounded-2xl border border-white/[0.04] bg-neutral-800/40 p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                          Volatility Index
                        </span>
                        <div className="mt-1 flex items-end gap-2">
                          <span className="text-3xl font-extrabold font-mono text-white">
                            {data!.volatilityIndex}
                          </span>
                          <span className="text-sm text-neutral-500 mb-0.5">VIX</span>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold",
                        data!.volatilityTrend === "up"
                          ? "bg-rose-500/10 text-rose-400"
                          : data!.volatilityTrend === "down"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-neutral-700/40 text-neutral-400"
                      )}>
                        <svg
                          className={cn("h-3 w-3", data!.volatilityTrend === "down" && "rotate-180")}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                        Trending {data!.volatilityTrend}
                      </div>
                    </div>
                  </div>
                </div>
              </BentoGridItem>
            )}
          </div>

          {/* ═══ TILE 4 — Port Risk Detector (Right Sidebar, 4 cols spanning 2 rows) ═══ */}
          <div className="lg:col-span-4 lg:row-span-2">
            {loading ? (
              <BentoGridItem
                id="tile-port-risk"
                className="h-full"
              >
                <Tile4Skeleton />
              </BentoGridItem>
            ) : (
              <BentoGridItem
                id="tile-port-risk"
                className={cn(
                  "h-full",
                  hasPortAlert && "border-amber-500/20"
                )}
              >
                <div className="p-6 sm:p-7 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.998L13.732 4.005c-.77-1.333-2.694-1.333-3.464 0L3.34 16.005c-.77 1.331.192 2.998 1.732 2.998z" />
                      </svg>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                        Port Risk Detector
                      </span>
                    </div>
                    {hasPortAlert && (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        ALERTS ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Focus Cards — Port Constraints */}
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                    {data!.portConstraints.map((port, idx) => (
                      <FocusCardItem
                        key={port.id}
                        index={idx}
                        hoveredIndex={hoveredPortIndex}
                        onHoverStart={() => setHoveredPortIndex(idx)}
                        onHoverEnd={() => setHoveredPortIndex(null)}
                      >
                        <div
                          className={cn(
                            "rounded-2xl border p-4 transition-all duration-200",
                            port.congestionAlertHrs > 0 || port.vesselFit === "Violation"
                              ? "border-amber-500/20 bg-amber-500/[0.03]"
                              : "border-white/[0.04] bg-neutral-800/30",
                          )}
                        >
                          {/* Port header */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-sm font-bold text-white">{port.portName}</h3>
                              <p className="text-[10px] text-neutral-500">{port.region}</p>
                            </div>
                            <RiskBadge level={port.riskLevel} />
                          </div>

                          {/* Stats grid */}
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-neutral-500 block">Draft</span>
                              <span className="font-mono font-semibold text-neutral-200">
                                {port.draftLimitM}m
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block">Vessel</span>
                              <VesselFitBadge fit={port.vesselFit} />
                            </div>
                            <div>
                              <span className="text-neutral-500 block">Congestion</span>
                              <span className={cn(
                                "font-mono font-semibold",
                                port.congestionAlertHrs > 0 ? "text-amber-400" : "text-neutral-200"
                              )}>
                                {port.congestionAlertHrs}h
                              </span>
                            </div>
                          </div>

                          {/* Extra info */}
                          <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-500">
                            <span>Berth Wait: {port.berthWaitDays}d</span>
                            {port.tideDependency && (
                              <span className="flex items-center gap-1 text-cyan-400/60">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Tide-dependent
                              </span>
                            )}
                          </div>
                        </div>
                      </FocusCardItem>
                    ))}
                  </div>
                </div>
              </BentoGridItem>
            )}
          </div>

          {/* ═══ TILE 3 — Prediction Chart (Center Hero, 8 cols) ═══ */}
          <div className="lg:col-span-8">
            {loading ? (
              <BentoGridItem id="tile-prediction-chart"><Tile3Skeleton /></BentoGridItem>
            ) : (
              <BentoGridItem id="tile-prediction-chart">
                <div className="p-6 sm:p-7">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                        Predictive Freight Outlook
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-6 rounded-full bg-cyan-400" /> Actual
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-6 rounded-full bg-gradient-to-r from-cyan-400/40 to-cyan-400/10" /> P10–P90
                      </span>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-[280px] sm:h-[340px] -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data!.chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradP50" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.06} />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.03)"
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="week"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fontFamily: "JetBrains Mono", fill: "#525252" }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fontFamily: "JetBrains Mono", fill: "#525252" }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          dx={-4}
                          width={50}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />

                        {/* Reference line at "Now" */}
                        <ReferenceLine
                          x="Now"
                          stroke="rgba(255,255,255,0.12)"
                          strokeDasharray="4 4"
                          label={{
                            value: "NOW",
                            position: "top",
                            fill: "#737373",
                            fontSize: 10,
                            fontFamily: "JetBrains Mono",
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
                          stroke="rgba(34,211,238,0.15)"
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
                          stroke="#22d3ee"
                          strokeWidth={2}
                          fill="url(#gradP50)"
                          strokeDasharray="6 3"
                          name="P50 Forecast"
                          connectNulls={false}
                        />

                        {/* Actual historical rates */}
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stroke="#22d3ee"
                          strokeWidth={2.5}
                          fill="url(#gradActual)"
                          name="Actual"
                          connectNulls={false}
                          dot={{
                            r: 2.5,
                            fill: "#22d3ee",
                            stroke: "#0a0a0a",
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 5,
                            fill: "#22d3ee",
                            stroke: "#0a0a0a",
                            strokeWidth: 3,
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Chart footer */}
                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-neutral-600">
                    <span>Source: Baltic Exchange / AIS Correlation Model</span>
                    <span>
                      Updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                </div>
              </BentoGridItem>
            )}
          </div>

          {/* ═══ TILE 5 — Bottom Stats Row ═══ */}
          <div className="lg:col-span-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {loading
                ? [...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-white/[0.04] bg-neutral-900/60 backdrop-blur-md p-4">
                      <SkeletonBlock className="h-3 w-20 mb-3" />
                      <SkeletonBlock className="h-8 w-28" />
                    </div>
                  ))
                : [
                    { label: "Model Accuracy", value: "94.2%", sub: "Last 30 days", icon: "🎯" },
                    { label: "Routes Analyzed", value: "2,847", sub: "This week", icon: "🌊" },
                    { label: "Ports Monitored", value: "156", sub: "Real-time AIS", icon: "📡" },
                    { label: "Cost Savings", value: "$1.2M", sub: "YTD Optimized", icon: "💰" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i, duration: 0.5 }}
                      className={cn(
                        "rounded-2xl border border-white/[0.04] bg-neutral-900/60 backdrop-blur-md p-4",
                        "transition-all duration-300 hover:border-white/[0.1] hover:bg-neutral-900/80",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold text-neutral-500 uppercase tracking-widest">
                          {stat.label}
                        </span>
                        <span className="text-base">{stat.icon}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
                          {stat.value}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-600 mt-1 block">{stat.sub}</span>
                    </motion.div>
                  ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.03] py-6 mt-8">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between text-[10px] font-mono text-neutral-600">
          <span>© 2026 FreightIQ — Smart India Hackathon • PS-26006</span>
          <span>LSTM + Transformer Ensemble • v3.2</span>
        </div>
      </footer>
    </GridBackground>
  );
}
