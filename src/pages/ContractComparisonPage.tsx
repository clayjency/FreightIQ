/**
 * FreightIQ — Multi-Voyage Contract Comparison Page
 * Compares Spot, COA (Contract of Affreightment), and Time Charter strategies.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

const API_BASE = "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface StrategyResult {
  strategy: string;
  total_cost: number;
  cost_per_mt: number;
  risk_score: number;
  flexibility: string;
  break_even_voyages: number | null;
  savings_vs_spot: number;
  details: string;
}

interface ComparisonResult {
  route: string;
  vessel_class: string;
  cargo_mt: number;
  voyages_per_year: number;
  results: StrategyResult[];
  recommendation: string;
  analysis_timestamp: string;
}

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════
   Utility Components
   ═══════════════════════════════════════════════════════════════════ */

function GlassCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function StyledSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-neutral-200 outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-neutral-900">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberInput({
  id,
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  unit,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-neutral-200 outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 font-mono">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Strategy Card
   ═══════════════════════════════════════════════════════════════════ */

function StrategyCard({
  result,
  isRecommended,
  index,
}: {
  result: StrategyResult;
  isRecommended: boolean;
  index: number;
}) {
  const strategyColors: Record<string, { border: string; glow: string; badge: string; icon: string }> = {
    Spot: {
      border: "border-amber-500/30",
      glow: "shadow-amber-500/10",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: "⚡",
    },
    COA: {
      border: "border-cyan-500/30",
      glow: "shadow-cyan-500/10",
      badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      icon: "📋",
    },
    "Time Charter": {
      border: "border-violet-500/30",
      glow: "shadow-violet-500/10",
      badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
      icon: "🕐",
    },
  };

  const colors = strategyColors[result.strategy] || strategyColors.Spot;

  const riskLabels: Record<number, { text: string; color: string }> = {
    1: { text: "Very Low", color: "text-emerald-400" },
    2: { text: "Low", color: "text-emerald-400" },
    3: { text: "Medium", color: "text-yellow-400" },
    4: { text: "High", color: "text-orange-400" },
    5: { text: "Very High", color: "text-rose-400" },
  };

  const risk = riskLabels[result.risk_score] || { text: "N/A", color: "text-neutral-400" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
    >
      <div
        className={cn(
          "relative rounded-2xl border bg-white/[0.02] backdrop-blur-xl p-6 transition-all duration-300 hover:bg-white/[0.04]",
          colors.border,
          isRecommended && `shadow-lg ${colors.glow}`
        )}
      >
        {/* Recommended badge */}
        {isRecommended && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              ★ Recommended
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">{colors.icon}</span>
          <div>
            <h3 className="text-lg font-bold text-white">{result.strategy}</h3>
            <span
              className={cn(
                "inline-block mt-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                colors.badge
              )}
            >
              {result.flexibility} Flexibility
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Total Cost
            </p>
            <p className="text-xl font-bold text-white font-mono">
              ${(result.total_cost / 1_000_000).toFixed(2)}
              <span className="text-xs text-neutral-500 ml-1">M</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Cost / MT
            </p>
            <p className="text-xl font-bold text-white font-mono">
              ${result.cost_per_mt.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Risk Level
            </p>
            <p className={cn("text-sm font-bold", risk.color)}>
              {risk.text}
              <span className="text-xs text-neutral-500 ml-1.5">({result.risk_score}/5)</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              vs Spot
            </p>
            <p
              className={cn(
                "text-sm font-bold font-mono",
                result.savings_vs_spot > 0
                  ? "text-emerald-400"
                  : result.savings_vs_spot < 0
                  ? "text-rose-400"
                  : "text-neutral-400"
              )}
            >
              {result.savings_vs_spot > 0 ? "+" : ""}
              ${(result.savings_vs_spot / 1000).toFixed(0)}K
            </p>
          </div>
        </div>

        {/* Break-even */}
        {result.break_even_voyages && (
          <div className="mb-4 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-1">
              Break-Even Point
            </p>
            <p className="text-sm text-neutral-300">
              <span className="font-bold text-white font-mono">{result.break_even_voyages}</span>{" "}
              voyages to recover commitment cost
            </p>
          </div>
        )}

        {/* Details */}
        <p className="text-xs text-neutral-500 leading-relaxed">{result.details}</p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════ */

export function ContractComparisonPage() {
  const [route, setRoute] = useState(TRADE_ROUTES[0]);
  const [vessel, setVessel] = useState(VESSEL_CLASSES[1]);
  const [cargoMT, setCargoMT] = useState(50000);
  const [voyagesPerYear, setVoyagesPerYear] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  const runComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        route,
        vessel_class: vessel,
        cargo_mt: String(cargoMT),
        voyages_per_year: String(voyagesPerYear),
      });
      const res = await fetch(`${API_BASE}/api/contract/compare?${params}`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setComparison(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch comparison");
    } finally {
      setLoading(false);
    }
  }, [route, vessel, cargoMT, voyagesPerYear]);

  const recommendedStrategy = comparison?.recommendation
    ?.split("**")[1]
    ?.trim();

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20">
            <svg
              className="h-5 w-5 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Contract <span className="text-cyan-400">Comparison</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Spot vs COA vs Time Charter — find the optimal chartering strategy
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input Panel */}
      <GlassCard className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <StyledSelect
            id="contract-route"
            label="Trade Route"
            value={route}
            options={TRADE_ROUTES}
            onChange={setRoute}
          />
          <StyledSelect
            id="contract-vessel"
            label="Vessel Class"
            value={vessel}
            options={VESSEL_CLASSES}
            onChange={setVessel}
          />
          <NumberInput
            id="cargo-mt"
            label="Cargo Volume"
            value={cargoMT}
            onChange={setCargoMT}
            min={5000}
            max={500000}
            unit="MT"
          />
          <NumberInput
            id="voyages-year"
            label="Voyages / Year"
            value={voyagesPerYear}
            onChange={setVoyagesPerYear}
            min={1}
            max={52}
          />
          <button
            id="btn-compare-contracts"
            onClick={runComparison}
            disabled={loading}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 mt-5",
              loading
                ? "bg-neutral-800 text-neutral-500 cursor-wait"
                : "bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Analyzing…
              </span>
            ) : (
              "Compare Strategies"
            )}
          </button>
        </div>
      </GlassCard>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-3"
          >
            <p className="text-sm text-rose-400">⚠ {error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence mode="wait">
        {comparison && (
          <motion.div
            key={comparison.analysis_timestamp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Recommendation Banner */}
            <GlassCard className="mb-6 border-emerald-500/20 bg-emerald-500/[0.03]">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧠</span>
                <div>
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-1">
                    AI Recommendation
                  </h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {comparison.recommendation}
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Strategy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {comparison.results.map((r, i) => (
                <StrategyCard
                  key={r.strategy}
                  result={r}
                  isRecommended={
                    recommendedStrategy?.toLowerCase() === r.strategy.toLowerCase()
                  }
                  index={i}
                />
              ))}
            </div>

            {/* Summary Table */}
            <GlassCard>
              <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-4">
                Side-by-Side Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                        Metric
                      </th>
                      {comparison.results.map((r) => (
                        <th
                          key={r.strategy}
                          className="text-right py-3 px-4 text-[10px] font-semibold uppercase tracking-widest text-neutral-500"
                        >
                          {r.strategy}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-neutral-400">Total Cost</td>
                      {comparison.results.map((r) => (
                        <td key={r.strategy} className="text-right py-3 px-4 text-white">
                          ${(r.total_cost / 1_000_000).toFixed(2)}M
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-neutral-400">Cost / MT</td>
                      {comparison.results.map((r) => (
                        <td key={r.strategy} className="text-right py-3 px-4 text-white">
                          ${r.cost_per_mt.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-neutral-400">Risk Score</td>
                      {comparison.results.map((r) => (
                        <td key={r.strategy} className="text-right py-3 px-4 text-white">
                          {r.risk_score}/5
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-neutral-400">Flexibility</td>
                      {comparison.results.map((r) => (
                        <td key={r.strategy} className="text-right py-3 px-4 text-white font-sans">
                          {r.flexibility}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-neutral-400">Savings vs Spot</td>
                      {comparison.results.map((r) => (
                        <td
                          key={r.strategy}
                          className={cn(
                            "text-right py-3 px-4",
                            r.savings_vs_spot > 0
                              ? "text-emerald-400"
                              : r.savings_vs_spot < 0
                              ? "text-rose-400"
                              : "text-neutral-400"
                          )}
                        >
                          {r.savings_vs_spot > 0 ? "+" : ""}
                          ${(r.savings_vs_spot / 1000).toFixed(0)}K
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!comparison && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-white/[0.06] flex items-center justify-center mb-5">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-lg font-bold text-neutral-300 mb-2">
            Ready to Compare
          </h3>
          <p className="text-sm text-neutral-500 max-w-md">
            Select a trade route, vessel class, and cargo parameters above, then click{" "}
            <span className="text-cyan-400 font-semibold">Compare Strategies</span>{" "}
            to see a Spot vs COA vs Time Charter breakdown.
          </p>
        </motion.div>
      )}
    </div>
  );
}
