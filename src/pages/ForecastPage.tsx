/**
 * FreightIQ — Rate Forecast Page
 * Detailed historical and predicted rate analysis with probability bands.
 */

import React, { useState, useEffect } from "react";
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
  "Paradip → Rotterdam",
  "Haldia → Shanghai",
  "Mundra → Fujairah",
  "Vizag → Yokohama",
  "Kandla → Houston",
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
    <div className="flex flex-col h-screen bg-[#0B0D0F] text-[#9AA3AA] overflow-hidden">
      {/* ── Top Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-[#252A2E] bg-[#111417] shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F4]">Rate Forecast</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#9AA3AA]">
            P10 / P50 / P90 probability bands and historical analysis.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full min-h-[600px]">
            {/* Left Column: Controls & Summary */}
            <div className="xl:col-span-1 flex flex-col gap-6">
              
              {/* Forecast Controls */}
              <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-[#68727A] block mb-2">Trade Route</label>
                    <select
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      className="w-full appearance-none rounded-md border border-[#252A2E] bg-[#171B1F] px-3 py-2.5 text-sm text-[#F1F3F4] outline-none focus:border-[#19A7CE] transition-colors"
                    >
                      {TRADE_ROUTES.map((r) => (
                        <option key={r} value={r} className="bg-[#171B1F]">{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-[#68727A] block mb-2">Vessel Class</label>
                    <select
                      value={vessel}
                      onChange={(e) => setVessel(e.target.value)}
                      className="w-full appearance-none rounded-md border border-[#252A2E] bg-[#171B1F] px-3 py-2.5 text-sm text-[#F1F3F4] outline-none focus:border-[#19A7CE] transition-colors"
                    >
                      {VESSEL_CLASSES.map((v) => (
                        <option key={v} value={v} className="bg-[#171B1F]">{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Analytical Summary */}
              {!loading && data.length > 0 && (
                <div className="rounded-lg border border-[#252A2E] bg-[#111417] p-5 space-y-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#68727A]">Current Spot</p>
                    <p className="text-xl font-bold text-[#F1F3F4]">${currentRate.toLocaleString()}</p>
                  </div>
                  
                  <div className="h-px bg-[#252A2E]" />

                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#68727A]">4-Week Outlook (P50)</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-[#F1F3F4]">${forecast4w.toLocaleString()}</p>
                      <span className={cn(
                        "text-[11px] font-medium px-1.5 py-0.5 rounded-sm",
                        forecast4w >= currentRate ? "bg-[#22A06B]/10 text-[#22A06B]" : "bg-[#D94A4A]/10 text-[#D94A4A]"
                      )}>
                        {forecast4w >= currentRate ? "+" : ""}{((forecast4w - currentRate) / currentRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-[#252A2E]" />

                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#68727A]">12-Week Outlook (P50)</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-[#F1F3F4]">${forecast12w.toLocaleString()}</p>
                      <span className={cn(
                        "text-[11px] font-medium px-1.5 py-0.5 rounded-sm",
                        forecast12w >= currentRate ? "bg-[#22A06B]/10 text-[#22A06B]" : "bg-[#D94A4A]/10 text-[#D94A4A]"
                      )}>
                        {forecast12w >= currentRate ? "+" : ""}{((forecast12w - currentRate) / currentRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Chart */}
            <div className="xl:col-span-3 flex flex-col rounded-lg border border-[#252A2E] bg-[#111417] overflow-hidden min-h-[500px]">
              
              {/* Chart Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-[#252A2E]">
                <div>
                  <h2 className="text-sm font-bold text-[#F1F3F4]">Freight Rate Forecast</h2>
                  <p className="text-[11px] text-[#9AA3AA] mt-0.5">P50 trajectory with P10–P90 uncertainty range</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#68727A] font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3 bg-[#19A7CE]" />
                    <span>Actual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3 border-t-2 border-dashed border-[#19A7CE]" />
                    <span>P50 Forecast</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-3 bg-[#19A7CE] opacity-15 rounded-sm" />
                    <span>P10–P90 Range</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-5">
                {loading ? (
                  <div className="h-full w-full rounded-md bg-[#171B1F] animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#19A7CE" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#19A7CE" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#19A7CE" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#19A7CE" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#252A2E" vertical={false} />
                      <XAxis dataKey="week" stroke="#3A4147" tick={{ fill: "#68727A", fontSize: 11 }} tickMargin={12} axisLine={false} tickLine={false} />
                      <YAxis
                        stroke="#3A4147"
                        tick={{ fill: "#68727A", fontSize: 11 }}
                        tickFormatter={(v) => `$${v / 1000}k`}
                        domain={["auto", "auto"]}
                        width={60}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#171B1F", borderColor: "#252A2E", borderRadius: "6px", color: "#F1F3F4", fontSize: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                        itemStyle={{ color: "#F1F3F4" }}
                        formatter={(value) => `$${Number(value).toLocaleString()}`}
                        labelStyle={{ color: "#9AA3AA", marginBottom: "4px" }}
                      />
                      <ReferenceLine x="Now" stroke="#68727A" strokeDasharray="3 3" label={{ position: "insideTopLeft", value: "NOW", fill: "#68727A", fontSize: 10 }} />
                      
                      {/* Forecast Band */}
                      <Area type="monotone" dataKey="p90" stroke="none" fill="url(#colorBand)" />
                      <Area type="monotone" dataKey="p10" stroke="none" fill="#111417" />
                      
                      {/* Forecast P50 Line */}
                      <Area type="monotone" dataKey="p50" stroke="#19A7CE" strokeWidth={2} strokeDasharray="5 5" fill="none" connectNulls />
                      
                      {/* Actual History */}
                      <Area type="monotone" dataKey="actual" stroke="#19A7CE" strokeWidth={2} fill="url(#colorActual)" connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
