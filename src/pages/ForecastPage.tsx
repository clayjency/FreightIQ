/**
 * FreightIQ — Rate Forecast Page
 * Detailed historical and predicted rate analysis with probability bands.
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { cn } from "../lib/utils";

const API_BASE = "http://localhost:8000";

interface ForecastPoint {
  week: string;
  actual?: number;
  p10?: number;
  p50?: number;
  p90?: number;
}

const TRADE_ROUTES = [
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
  "Handysize (32K DWT)",
  "Supramax (52K DWT)",
  "Panamax (75K DWT)",
  "Capesize (180K DWT)",
  "VLOC (300K DWT)",
];

export function ForecastPage() {
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(TRADE_ROUTES[0]);
  const [vessel, setVessel] = useState(VESSEL_CLASSES[1]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const params = new URLSearchParams({ route, vessel, history_weeks: "12", forecast_weeks: "12" });
    fetch(`${API_BASE}/api/forecast?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        // Fallback or handle error
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [route, vessel]);

  const currentRate = data.find((d) => d.week === "Now")?.actual || 0;
  const forecast4w = data.find((d) => d.week === "W+4")?.p50 || 0;
  const forecast12w = data.find((d) => d.week === "W+12")?.p50 || 0;

  return (
    <div className="min-h-screen bg-neutral-950 relative">
      <div className="absolute inset-0 grid-bg grid-bg-mask pointer-events-none" />
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Rate Forecast</h1>
          </div>
          <p className="text-sm text-neutral-500 ml-11">P10 / P50 / P90 probability bands and historical analysis.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 block mb-1.5">Trade Route</label>
                  <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/[0.06] bg-neutral-800/60 px-4 py-2.5 text-sm text-neutral-200 outline-none focus:border-cyan-500/40 transition-all"
                  >
                    {TRADE_ROUTES.map((r) => (
                      <option key={r} value={r} className="bg-neutral-900">{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 block mb-1.5">Vessel Class</label>
                  <select
                    value={vessel}
                    onChange={(e) => setVessel(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/[0.06] bg-neutral-800/60 px-4 py-2.5 text-sm text-neutral-200 outline-none focus:border-cyan-500/40 transition-all"
                  >
                    {VESSEL_CLASSES.map((v) => (
                      <option key={v} value={v} className="bg-neutral-900">{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {!loading && data.length > 0 && (
              <div className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md p-6 space-y-4">
                <div className="rounded-xl bg-neutral-800/40 p-4 border border-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Current Spot</p>
                  <p className="text-2xl font-bold font-mono text-white">${currentRate.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-neutral-800/40 p-4 border border-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">W+4 Forecast (P50)</p>
                  <p className="text-xl font-bold font-mono text-cyan-400">${forecast4w.toLocaleString()}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    {((forecast4w - currentRate) / currentRate * 100).toFixed(1)}% vs Now
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-800/40 p-4 border border-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">W+12 Forecast (P50)</p>
                  <p className="text-xl font-bold font-mono text-purple-400">${forecast12w.toLocaleString()}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    {((forecast12w - currentRate) / currentRate * 100).toFixed(1)}% vs Now
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-white/[0.06] bg-neutral-900/80 backdrop-blur-md p-6 h-[500px]">
              {loading ? (
                <div className="h-full w-full rounded-2xl bg-neutral-800/40 skeleton-shimmer" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="week" stroke="#525252" tick={{ fill: "#737373", fontSize: 11 }} tickMargin={12} />
                    <YAxis
                      stroke="#525252"
                      tick={{ fill: "#737373", fontSize: 11 }}
                      tickFormatter={(v) => `$${v / 1000}k`}
                      domain={["auto", "auto"]}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(23,23,23,0.9)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "#e5e5e5" }}
                      itemStyle={{ color: "#e5e5e5" }}
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                    <ReferenceLine x="Now" stroke="#525252" strokeDasharray="3 3" label={{ position: "insideTopLeft", value: "NOW", fill: "#737373", fontSize: 10 }} />
                    
                    {/* Forecast Band */}
                    <Area type="monotone" dataKey="p90" stroke="none" fill="url(#colorBand)" />
                    <Area type="monotone" dataKey="p10" stroke="none" fill="#171717" />
                    
                    {/* Forecast P50 Line */}
                    <Area type="monotone" dataKey="p50" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorP50)" connectNulls />
                    
                    {/* Actual History */}
                    <Area type="monotone" dataKey="actual" stroke="#22d3ee" strokeWidth={2.5} fill="url(#colorActual)" connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
