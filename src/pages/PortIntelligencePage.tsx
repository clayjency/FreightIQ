/**
 * FreightIQ — Port Intelligence Page
 * Deep-dive port constraint explorer with vessel compatibility matrix.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "../lib/utils";

const API_BASE = "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

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

const VESSEL_CLASSES = [
  { name: "Handysize (32K DWT)", draft: 10.1, color: "#22d3ee" },
  { name: "Supramax (52K DWT)", draft: 12.6, color: "#a78bfa" },
  { name: "Panamax (75K DWT)", draft: 13.6, color: "#fbbf24" },
  { name: "Capesize (180K DWT)", draft: 18.2, color: "#f97316" },
  { name: "VLOC (300K DWT)", draft: 23.0, color: "#f43f5e" },
];

const RISK_CONFIG: Record<string, { badge: string; dot: string; bar: string; glow: string }> = {
  Low: { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400", bar: "bg-emerald-500", glow: "shadow-[0_0_8px_rgba(52,211,153,0.3)]" },
  Moderate: { badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25", dot: "bg-yellow-400", bar: "bg-yellow-500", glow: "shadow-[0_0_8px_rgba(234,179,8,0.3)]" },
  High: { badge: "bg-orange-500/10 text-orange-400 border-orange-500/25", dot: "bg-orange-400", bar: "bg-orange-500", glow: "shadow-[0_0_8px_rgba(249,115,22,0.3)]" },
  Critical: { badge: "bg-rose-500/10 text-rose-400 border-rose-500/25", dot: "bg-rose-400", bar: "bg-rose-500", glow: "shadow-[0_0_8px_rgba(244,63,94,0.4)]" },
};

const FIT_CONFIG = {
  Optimal: { icon: "✓", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  Marginal: { icon: "△", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  Violation: { icon: "✕", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
};

/* ═══════════════════════════════════════════════════════════════════
   Vessel Compatibility Matrix
   ═══════════════════════════════════════════════════════════════════ */

function CompatibilityMatrix({ ports }: { ports: PortConstraint[] }) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Vessel × Port Compatibility Matrix</p>
        <p className="text-xs text-neutral-600 mt-0.5">Draft-based compliance for all vessel classes</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 w-36">Port</th>
              <th className="text-center py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">Draft Limit</th>
              {VESSEL_CLASSES.map(v => (
                <th key={v.name} className="text-center py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 min-w-[90px]">
                  <div>{v.name.split(" ")[0]}</div>
                  <div style={{ color: v.color }} className="font-mono normal-case">{v.draft}m</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ports.map((port, i) => {
              const risk = RISK_CONFIG[port.riskLevel];
              return (
                <motion.tr
                  key={port.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", risk.dot)} />
                      <span className="font-semibold text-white text-xs truncate">{port.portName}</span>
                    </div>
                    <p className="text-[10px] text-neutral-600 ml-4 truncate">{port.region.split(",")[0]}</p>
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-neutral-300 text-xs">
                    {port.draftLimitM}m
                  </td>
                  {VESSEL_CLASSES.map(v => {
                    const fit = v.draft <= port.draftLimitM - 1 ? "Optimal" : v.draft <= port.draftLimitM + 0.5 ? "Marginal" : "Violation";
                    const fitCfg = FIT_CONFIG[fit];
                    return (
                      <td key={v.name} className="py-3 px-3 text-center">
                        <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded-lg text-xs font-bold border", fitCfg.bg, fitCfg.color)}>
                          {fitCfg.icon}
                        </span>
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-white/[0.04] flex items-center gap-5 bg-neutral-900/30">
        {Object.entries(FIT_CONFIG).map(([fit, cfg]) => (
          <div key={fit} className="flex items-center gap-1.5">
            <span className={cn("inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold border", cfg.bg, cfg.color)}>{cfg.icon}</span>
            <span className="text-[10px] text-neutral-500">{fit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Port Detail Card
   ═══════════════════════════════════════════════════════════════════ */

function PortCard({
  port,
  isSelected,
  onClick,
}: {
  port: PortConstraint;
  isSelected: boolean;
  onClick: () => void;
}) {
  const risk = RISK_CONFIG[port.riskLevel];
  const congestionPct = Math.min((port.congestionAlertHrs / 96) * 100, 100);

  return (
    <motion.button
      id={`port-card-${port.id}`}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all duration-200",
        isSelected
          ? "border-cyan-500/30 bg-cyan-500/[0.04]"
          : "border-white/[0.06] bg-neutral-900/60 hover:border-white/[0.1] hover:bg-neutral-800/60"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", risk.dot, port.riskLevel === "Critical" && "animate-pulse")} />
            <p className="font-bold text-white text-sm">{port.portName}</p>
          </div>
          <p className="text-[10px] text-neutral-600 mt-0.5 ml-4">{port.region}</p>
        </div>
        <span className={cn("text-[9px] font-bold uppercase tracking-widest rounded-full border px-2 py-0.5", risk.badge)}>
          {port.riskLevel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Draft", value: `${port.draftLimitM}m` },
          { label: "Wait", value: `${port.berthWaitDays}d` },
          { label: "Congestion", value: `${port.congestionAlertHrs}h` },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-neutral-800/40 px-2 py-1.5 text-center">
            <p className="text-xs font-bold font-mono text-neutral-200">{s.value}</p>
            <p className="text-[9px] text-neutral-600 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Congestion bar */}
      <div>
        <div className="flex justify-between text-[9px] text-neutral-600 mb-1">
          <span>Congestion Level</span>
          <span>{port.congestionAlertHrs}h</span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${congestionPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-full rounded-full", risk.bar)}
          />
        </div>
      </div>

      {port.tideDependency && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-[10px] text-amber-400/70">⚡ Tide-dependent operations</span>
        </div>
      )}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Port Detail Panel
   ═══════════════════════════════════════════════════════════════════ */

function PortDetailPanel({ port }: { port: PortConstraint }) {
  const risk = RISK_CONFIG[port.riskLevel];
  const radarData = [
    { metric: "Congestion", value: Math.min((port.congestionAlertHrs / 96) * 100, 100) },
    { metric: "Draft Risk", value: port.vesselFit === "Violation" ? 90 : port.vesselFit === "Marginal" ? 50 : 15 },
    { metric: "Berth Wait", value: Math.min((port.berthWaitDays / 8) * 100, 100) },
    { metric: "Tidal Risk", value: port.tideDependency ? 70 : 10 },
    { metric: "Overall Risk", value: { Low: 15, Moderate: 40, High: 65, Critical: 90 }[port.riskLevel] },
  ];

  return (
    <motion.div
      key={port.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md p-6 h-full"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white">{port.portName}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{port.region}</p>
        </div>
        <span className={cn("text-[11px] font-bold uppercase tracking-widest rounded-full border px-3 py-1", risk.badge, risk.glow)}>
          {port.riskLevel}
        </span>
      </div>

      {/* Radar chart */}
      <div className="h-48 mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.05)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#6b7280", fontSize: 10 }} />
            <Radar
              name="Risk"
              dataKey="value"
              stroke="#22d3ee"
              fill="#22d3ee"
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Max Draft", value: `${port.draftLimitM}m`, icon: "⚓" },
          { label: "Berth Wait", value: `${port.berthWaitDays} days`, icon: "⏳" },
          { label: "Congestion", value: `${port.congestionAlertHrs}h`, icon: "🚦" },
          { label: "Tidal Ops", value: port.tideDependency ? "Required" : "No", icon: "🌊" },
        ].map(m => (
          <div key={m.label} className="rounded-xl bg-neutral-800/40 border border-white/[0.04] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{m.icon}</span>
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider">{m.label}</span>
            </div>
            <p className="text-sm font-bold font-mono text-white">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Vessel fit across all classes */}
      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">Vessel Fit Assessment</p>
        <div className="space-y-1.5">
          {VESSEL_CLASSES.map(v => {
            const fit = v.draft <= port.draftLimitM - 1 ? "Optimal" : v.draft <= port.draftLimitM + 0.5 ? "Marginal" : "Violation";
            const fitCfg = FIT_CONFIG[fit];
            return (
              <div key={v.name} className="flex items-center justify-between rounded-lg bg-neutral-800/30 px-3 py-1.5">
                <span className="text-[11px] text-neutral-400">{v.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-neutral-600">{v.draft}m draft</span>
                  <span className={cn("text-[10px] font-bold", fitCfg.color)}>{fit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendation */}
      <div className={cn(
        "mt-4 rounded-xl p-3 border text-[11px]",
        port.riskLevel === "Critical" ? "border-rose-500/20 bg-rose-500/[0.04] text-rose-300" :
        port.riskLevel === "High" ? "border-orange-500/20 bg-orange-500/[0.04] text-orange-300" :
        "border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300"
      )}>
        <span className="font-semibold">⚠ Recommendation: </span>
        {port.riskLevel === "Critical"
          ? `Avoid ${port.portName} for Panamax+ vessels. High congestion (${port.congestionAlertHrs}h) and draft constraints make this port operationally high-risk.`
          : port.riskLevel === "High"
          ? `Exercise caution at ${port.portName}. Plan for ${port.berthWaitDays}d berth wait. Smaller vessels preferred.`
          : port.riskLevel === "Moderate"
          ? `${port.portName} is operable with appropriate vessel selection. Monitor congestion updates.`
          : `${port.portName} is clear for operations. Optimal conditions for current vessel traffic.`
        }
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════ */

export function PortIntelligencePage() {
  const [ports, setPorts] = useState<PortConstraint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPort, setSelectedPort] = useState<PortConstraint | null>(null);
  const [selectedVessel, setSelectedVessel] = useState(VESSEL_CLASSES[1].name);
  const [filterRisk, setFilterRisk] = useState<string>("All");
  const [view, setView] = useState<"cards" | "matrix">("cards");

  const loadPorts = async (vessel: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ vessel });
      const res = await fetch(`${API_BASE}/api/ports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPorts(data);
        if (!selectedPort) setSelectedPort(data[0]);
      }
    } catch {
      // Offline: use static fallback
      console.warn("API offline — port data unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPorts(selectedVessel);
  }, [selectedVessel]);

  const filteredPorts = filterRisk === "All" ? ports : ports.filter(p => p.riskLevel === filterRisk);
  const riskCounts = { All: ports.length, Low: 0, Moderate: 0, High: 0, Critical: 0 };
  ports.forEach(p => { (riskCounts as any)[p.riskLevel]++; });

  return (
    <div className="min-h-screen bg-neutral-950 relative">
      <div className="absolute inset-0 grid-bg grid-bg-mask pointer-events-none" />
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Port Intelligence</h1>
                <p className="text-sm text-neutral-500">Real-time constraints, draft compliance & risk across Indian ports</p>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-neutral-900/60 p-1">
              {([["cards", "Cards"], ["matrix", "Matrix"]] as [string, string][]).map(([v, label]) => (
                <button
                  key={v}
                  id={`btn-view-${v}`}
                  onClick={() => setView(v as "cards" | "matrix")}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all",
                    view === v ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Vessel selector */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Vessel:</label>
            <select
              id="select-vessel-ports"
              value={selectedVessel}
              onChange={e => setSelectedVessel(e.target.value)}
              className="appearance-none rounded-xl border border-white/[0.06] bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-200 outline-none focus:border-cyan-500/40 transition-all"
            >
              {VESSEL_CLASSES.map(v => <option key={v.name} value={v.name} className="bg-neutral-900">{v.name}</option>)}
            </select>
          </div>

          {/* Risk filters */}
          <div className="flex items-center gap-1.5">
            {(["All", "Low", "Moderate", "High", "Critical"] as const).map(risk => (
              <button
                key={risk}
                id={`filter-${risk.toLowerCase()}`}
                onClick={() => setFilterRisk(risk)}
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-all border",
                  filterRisk === risk
                    ? risk === "All" ? "bg-neutral-600 text-white border-neutral-500"
                      : RISK_CONFIG[risk]?.badge ?? "bg-neutral-600 text-white border-neutral-500"
                    : "text-neutral-600 border-white/[0.05] hover:text-neutral-400"
                )}
              >
                {risk} {riskCounts[risk] > 0 && riskCounts[risk] !== ports.length ? `(${(riskCounts as any)[risk]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {view === "matrix" ? (
          <AnimatePresence>
            {loading ? (
              <div className="h-64 rounded-3xl bg-neutral-900/60 skeleton-shimmer" />
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CompatibilityMatrix ports={filteredPorts} />
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Port Cards */}
            <div className="xl:col-span-1 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-neutral-900/60 skeleton-shimmer" />
                  ))
                : filteredPorts.map(port => (
                    <PortCard
                      key={port.id}
                      port={port}
                      isSelected={selectedPort?.id === port.id}
                      onClick={() => setSelectedPort(port)}
                    />
                  ))
              }
            </div>

            {/* Detail Panel */}
            <div className="xl:col-span-2">
              {loading ? (
                <div className="h-full rounded-3xl bg-neutral-900/60 skeleton-shimmer min-h-96" />
              ) : selectedPort ? (
                <PortDetailPanel port={selectedPort} />
              ) : (
                <div className="h-full rounded-3xl border border-dashed border-white/[0.06] flex items-center justify-center text-neutral-600 min-h-96">
                  Select a port to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
