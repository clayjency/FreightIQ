/**
 * FreightIQ — Port Intelligence Page
 * Deep-dive port constraint explorer with vessel compatibility matrix.
 */

import React, { useState, useEffect } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
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
  { name: "Handysize (32K DWT)", draft: 10.1 },
  { name: "Supramax (52K DWT)", draft: 12.6 },
  { name: "Panamax (75K DWT)", draft: 13.6 },
  { name: "Capesize (180K DWT)", draft: 18.2 },
  { name: "VLOC (300K DWT)", draft: 23.0 },
];

const RISK_CONFIG: Record<string, { color: string; bg: string; dot: string; }> = {
  Low: { color: "text-[#22A06B]", bg: "bg-[#22A06B]", dot: "bg-[#22A06B]" },
  Moderate: { color: "text-[#D99A24]", bg: "bg-[#D99A24]", dot: "bg-[#D99A24]" },
  High: { color: "text-[#EA580C]", bg: "bg-[#EA580C]", dot: "bg-[#EA580C]" },
  Critical: { color: "text-[#D94A4A]", bg: "bg-[#D94A4A]", dot: "bg-[#D94A4A]" },
};

/* ═══════════════════════════════════════════════════════════════════
   Helpers & Components
   ═══════════════════════════════════════════════════════════════════ */

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-md bg-[#171B1F]", className)} />;
}

// Compact Port Card
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
    <button
      id={`port-card-${port.id}`}
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md border p-3 transition-colors duration-150",
        isSelected
          ? "border-[#19A7CE] bg-[#171B1F]"
          : "border-[#252A2E] bg-[#111417] hover:border-[#3A4147] hover:bg-[#171B1F]"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", risk.dot)} />
            <p className="font-semibold text-[#F1F3F4] text-sm">{port.portName}</p>
          </div>
          <p className="text-xs text-[#68727A] mt-0.5 ml-3.5">{port.region.split(",")[0]}</p>
        </div>
        {port.tideDependency && (
          <span className="text-[10px] text-[#19A7CE] border border-[#19A7CE]/30 bg-[#19A7CE]/10 px-1.5 py-0.5 rounded-sm">
            Tidal
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2.5 ml-3.5">
        <div>
          <span className="text-[10px] text-[#68727A] block">Draft</span>
          <span className="text-xs font-mono text-[#F1F3F4] font-medium">{port.draftLimitM}m</span>
        </div>
        <div>
          <span className="text-[10px] text-[#68727A] block">Wait</span>
          <span className="text-xs font-mono text-[#F1F3F4] font-medium">{port.berthWaitDays}d</span>
        </div>
        <div>
          <span className="text-[10px] text-[#68727A] block">Congestion</span>
          <span className="text-xs font-mono text-[#F1F3F4] font-medium">{port.congestionAlertHrs}h</span>
        </div>
      </div>

      <div className="ml-3.5 mt-1">
        <div className="h-1 rounded-full bg-[#0B0D0F] overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", risk.bg)}
            style={{ width: `${congestionPct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

// Right Panel
function PortDetailPanel({ port, vesselClass }: { port: PortConstraint, vesselClass: string }) {
  const risk = RISK_CONFIG[port.riskLevel];
  const radarData = [
    { metric: "Congestion", value: Math.min((port.congestionAlertHrs / 96) * 100, 100) },
    { metric: "Draft Risk", value: port.vesselFit === "Violation" ? 90 : port.vesselFit === "Marginal" ? 50 : 15 },
    { metric: "Berth Wait", value: Math.min((port.berthWaitDays / 8) * 100, 100) },
    { metric: "Tidal Risk", value: port.tideDependency ? 70 : 10 },
    { metric: "Overall Risk", value: { Low: 15, Moderate: 40, High: 65, Critical: 90 }[port.riskLevel] },
  ];

  return (
    <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#F1F3F4]">{port.portName}</h2>
          <p className="text-xs text-[#9AA3AA] mt-0.5">{port.region}</p>
        </div>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-sm border border-[#252A2E] bg-[#171B1F]", risk.color)}>
          {port.riskLevel} Risk
        </span>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 mb-6">
        <div className="w-full xl:w-1/2 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke="#252A2E" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#68727A", fontSize: 10 }} />
              <Radar
                name="Risk"
                dataKey="value"
                stroke="#19A7CE"
                fill="#19A7CE"
                fillOpacity={0.15}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full xl:w-1/2 flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Max Draft", value: `${port.draftLimitM}m`, icon: "⚓" },
                { label: "Berth Wait", value: `${port.berthWaitDays} days`, icon: "⏳" },
                { label: "Congestion", value: `${port.congestionAlertHrs}h`, icon: "🚦" },
                { label: "Tidal Ops", value: port.tideDependency ? "Required" : "No", icon: "🌊" },
              ].map(m => (
                <div key={m.label} className="rounded-md border border-[#252A2E] bg-[#171B1F] p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[#68727A] text-sm">{m.icon}</span>
                    <span className="text-xs text-[#68727A] font-medium">{m.label}</span>
                  </div>
                  <p className="text-lg font-bold font-mono text-[#F1F3F4]">{m.value}</p>
                </div>
              ))}
            </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-[#F1F3F4] mb-3">Vessel Fit Assessment</h3>
        <div className="overflow-hidden rounded-md border border-[#252A2E]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#252A2E] bg-[#171B1F]">
                <th className="py-2.5 px-4 font-medium text-[#68727A]">Vessel Class</th>
                <th className="py-2.5 px-4 font-medium text-[#68727A]">Draft</th>
                <th className="py-2.5 px-4 font-medium text-[#68727A]">Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252A2E]">
              {VESSEL_CLASSES.map(v => {
                const fit = v.draft <= port.draftLimitM - 1 ? "OPTIMAL" : v.draft <= port.draftLimitM + 0.5 ? "MARGINAL" : "VIOLATION";
                const fitColor = fit === "OPTIMAL" ? "text-[#22A06B]" : fit === "MARGINAL" ? "text-[#D99A24]" : "text-[#D94A4A]";
                
                return (
                  <tr key={v.name} className={cn(v.name === vesselClass ? "bg-[#171B1F]/50" : "")}>
                    <td className="py-2.5 px-4 font-medium text-[#F1F3F4]">{v.name}</td>
                    <td className="py-2.5 px-4 font-mono text-[#9AA3AA]">{v.draft.toFixed(1)}m</td>
                    <td className="py-2.5 px-4">
                      <span className={cn("font-semibold text-[10px] tracking-wide", fitColor)}>{fit}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cn(
        "mt-auto rounded-md border p-4 text-sm",
        port.riskLevel === "Critical" ? "border-[#D94A4A]/30 bg-[#D94A4A]/10 text-[#D94A4A]" :
        port.riskLevel === "High" ? "border-[#EA580C]/30 bg-[#EA580C]/10 text-[#EA580C]" :
        port.riskLevel === "Moderate" ? "border-[#D99A24]/30 bg-[#D99A24]/10 text-[#D99A24]" :
        "border-[#22A06B]/30 bg-[#22A06B]/10 text-[#22A06B]"
      )}>
        <span className="font-semibold block mb-1 text-xs uppercase tracking-wider">Recommendation</span>
        {port.riskLevel === "Critical"
          ? `Avoid ${port.portName} for Panamax+ vessels. High congestion (${port.congestionAlertHrs}h) and draft constraints make this port operationally high-risk.`
          : port.riskLevel === "High"
          ? `Exercise caution at ${port.portName}. Plan for ${port.berthWaitDays}d berth wait. Smaller vessels preferred.`
          : port.riskLevel === "Moderate"
          ? `${port.portName} is operable with appropriate vessel selection. Monitor congestion updates.`
          : `${port.portName} is clear for operations. Optimal conditions for current vessel traffic.`
        }
      </div>
    </div>
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
      console.warn("API offline — port data unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPorts(selectedVessel);
  }, [selectedVessel]);

  useEffect(() => {
      if (ports.length > 0 && selectedPort) {
          const updatedSelected = ports.find(p => p.id === selectedPort.id);
          if (updatedSelected) {
              setSelectedPort(updatedSelected);
          } else {
              setSelectedPort(ports[0]);
          }
      }
  }, [ports]);

  const filteredPorts = filterRisk === "All" ? ports : ports.filter(p => p.riskLevel === filterRisk);
  
  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#9AA3AA]">
      {/* ── Header ── */}
      <header className="border-b border-[#252A2E] bg-[#111417]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F4]">
                Port Intelligence
              </h1>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#9AA3AA]">
              Real-time constraints, draft compliance & risk across Indian ports
            </p>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 sm:py-6">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label htmlFor="select-vessel" className="text-xs font-medium text-[#68727A]">Vessel:</label>
            <div className="relative">
              <select
                id="select-vessel"
                value={selectedVessel}
                onChange={e => setSelectedVessel(e.target.value)}
                className={cn(
                  "appearance-none rounded-md border border-[#252A2E] bg-[#171B1F]",
                  "px-3 py-1.5 pr-8 text-xs text-[#F1F3F4]",
                  "outline-none transition-colors duration-150",
                  "hover:border-[#3A4147] focus:border-[#19A7CE] focus:ring-1 focus:ring-[#19A7CE]/20"
                )}
              >
                {VESSEL_CLASSES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#68727A]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="hidden sm:block w-px h-5 bg-[#252A2E]" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-[#68727A] mr-1">Risk filters:</span>
            {(["All", "Low", "Moderate", "High", "Critical"] as const).map(risk => (
              <button
                key={risk}
                id={`filter-${risk.toLowerCase()}`}
                onClick={() => setFilterRisk(risk)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors border",
                  filterRisk === risk
                    ? "bg-[#171B1F] text-[#F1F3F4] border-[#3A4147]"
                    : "bg-transparent text-[#9AA3AA] border-transparent hover:bg-[#171B1F]/50"
                )}
              >
                {risk.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: Port List (4 cols) */}
          <section aria-label="Port Monitoring List" className="lg:col-span-4 xl:col-span-3 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
            {loading
              ? [...Array(6)].map((_, i) => (
                  <SkeletonBlock key={i} className="h-[104px] w-full" />
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
            {!loading && filteredPorts.length === 0 && (
                <div className="text-xs text-[#68727A] py-4 text-center border border-dashed border-[#252A2E] rounded-md">
                    No ports match the selected filter.
                </div>
            )}
          </section>

          {/* RIGHT: Detail Panel (8 cols) */}
          <section aria-label="Port Intelligence Details" className="lg:col-span-8 xl:col-span-9 h-full">
            {loading ? (
              <SkeletonBlock className="h-full min-h-[500px] w-full" />
            ) : selectedPort ? (
              <PortDetailPanel port={selectedPort} vesselClass={selectedVessel} />
            ) : (
              <div className="h-full rounded-lg border border-dashed border-[#252A2E] flex items-center justify-center text-xs text-[#68727A] min-h-[500px]">
                Select a port to view detailed intelligence
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
