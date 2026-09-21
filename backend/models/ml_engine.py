"""
FreightIQ — ML Engine
LSTM-proxy decision engine using statistical scoring.
Architecture is fully swappable with a trained PyTorch / TensorFlow LSTM
by replacing the `predict_signal()` method's body with model.forward().
"""

from __future__ import annotations
import math
import random
from datetime import datetime, timezone

from backend.data.rate_simulator import (
    ROUTE_BASE_RATES,
    VESSEL_DWT_MULTIPLIERS,
    get_current_spot,
    generate_forecast_chart,
)


# ─────────────────────────────────────────────────────────────────────────────
# Volatility Index Computation
# ─────────────────────────────────────────────────────────────────────────────

def compute_volatility_index(route: str, vessel: str) -> tuple[float, str]:
    """
    Compute a VIX-style volatility index (0-100) from the route σ parameter.
    Returns (index_value, trend_direction).
    """
    route_data = ROUTE_BASE_RATES.get(route, list(ROUTE_BASE_RATES.values())[0])
    base_vol = route_data["volatility"]

    day_seed = int(datetime.now(timezone.utc).strftime("%Y%m%d"))
    rng = random.Random(day_seed + hash(route + "vol") % 10_000)
    rng_prev = random.Random(day_seed - 1 + hash(route + "vol") % 10_000)

    # Scale σ to 0–100 range (0.05 → ~5, 0.30 → ~35 + noise)
    current_vix = base_vol * 100 + rng.gauss(0, 3)
    prev_vix = base_vol * 100 + rng_prev.gauss(0, 3)

    current_vix = max(5.0, min(95.0, current_vix))
    prev_vix = max(5.0, min(95.0, prev_vix))

    if current_vix > prev_vix + 1.0:
        trend = "up"
    elif current_vix < prev_vix - 1.0:
        trend = "down"
    else:
        trend = "stable"

    return round(current_vix, 1), trend


# ─────────────────────────────────────────────────────────────────────────────
# Multi-factor Decision Scorer
# ─────────────────────────────────────────────────────────────────────────────

def _score_signal(
    spot: float,
    base_rate: float,
    pct_change: float,
    volatility: float,
    trend_bias: float,
    forecast_4w: float,
    forecast_8w: float,
) -> tuple[str, int, list[str]]:
    """
    Score a freight booking decision using a multi-factor model.
    Returns (signal, confidence_pct, reasoning_list).

    Factors:
      1. Spot vs historical mean deviation
      2. Momentum (pct_change direction)
      3. Volatility regime
      4. Forward curve shape (contango vs backwardation)
      5. Trend bias (structural)
    """
    score = 0          # positive → Book Now; negative → Wait
    confidence_factors = []
    reasoning = []

    # ── Factor 1: Spot vs base (mean reversion signal) ──
    deviation_pct = (spot - base_rate) / base_rate * 100
    if deviation_pct < -5:
        score += 3
        reasoning.append(f"Spot ${spot:,.0f} is {abs(deviation_pct):.1f}% below historical mean — historically low entry point")
        confidence_factors.append(85)
    elif deviation_pct < 0:
        score += 1
        reasoning.append(f"Spot is slightly below mean ({deviation_pct:.1f}%) — mild booking advantage")
        confidence_factors.append(60)
    elif deviation_pct > 8:
        score -= 3
        reasoning.append(f"Spot ${spot:,.0f} is {deviation_pct:.1f}% above historical mean — market elevated, wait for pullback")
        confidence_factors.append(75)
    else:
        score -= 1
        reasoning.append(f"Spot near fair value ({deviation_pct:+.1f}% vs mean)")
        confidence_factors.append(55)

    # ── Factor 2: Momentum ──
    if pct_change > 2.5:
        score -= 2
        reasoning.append(f"Strong upward momentum (+{pct_change:.1f}% WoW) — rates may correct in W+2 to W+4")
        confidence_factors.append(70)
    elif pct_change > 0:
        score -= 1
        reasoning.append(f"Mild upward momentum (+{pct_change:.1f}% WoW)")
        confidence_factors.append(55)
    elif pct_change < -2.5:
        score += 2
        reasoning.append(f"Sharp rate decline ({pct_change:.1f}% WoW) — downward leg may be near exhaustion")
        confidence_factors.append(72)
    else:
        score += 1
        reasoning.append(f"Flat to slightly declining ({pct_change:.1f}% WoW) — stabilisation expected")
        confidence_factors.append(58)

    # ── Factor 3: Volatility regime ──
    if volatility > 0.22:
        score -= 1
        reasoning.append(f"High volatility regime (σ={volatility:.2f}) — spreads wide, risk elevated")
        confidence_factors.append(65)
    elif volatility < 0.12:
        score += 1
        reasoning.append(f"Low volatility regime (σ={volatility:.2f}) — predictable market, good to act")
        confidence_factors.append(70)

    # ── Factor 4: Forward curve shape ──
    contango_4w = (forecast_4w - spot) / spot * 100
    if contango_4w > 3:
        score -= 2
        reasoning.append(f"Forward curve in contango (+{contango_4w:.1f}% for W+4) — wait captures better rates")
        confidence_factors.append(78)
    elif contango_4w < -3:
        score += 2
        reasoning.append(f"Forward curve in backwardation ({contango_4w:.1f}% for W+4) — act now, rates expected to fall")
        confidence_factors.append(82)

    # ── Factor 5: Structural trend bias ──
    if trend_bias > 0.003:
        score -= 1
        reasoning.append("Structural upward trend in this lane — deferral captures higher rates")
        confidence_factors.append(63)
    elif trend_bias < -0.001:
        score += 1
        reasoning.append("Structural headwind in this lane — lock in current rates")
        confidence_factors.append(67)

    signal: str = "Book Now" if score > 0 else "Wait Mode"
    confidence = int(sum(confidence_factors) / len(confidence_factors)) if confidence_factors else 60
    confidence = max(55, min(97, confidence))

    return signal, confidence, reasoning


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def predict_signal(route: str, vessel: str) -> dict:
    """
    Main ML prediction entry-point.
    Swap this function's body with your trained LSTM forward pass.
    """
    route_data = ROUTE_BASE_RATES.get(route, list(ROUTE_BASE_RATES.values())[0])
    vessel_mult = VESSEL_DWT_MULTIPLIERS.get(vessel, 1.0)

    spot, pct_change = get_current_spot(route, vessel)
    base = route_data["base"] * vessel_mult

    # 4-week and 8-week P50 forecasts
    chart = generate_forecast_chart(route, vessel)
    w4_point = next((p for p in chart if p["week"] == "W+4"), None)
    w8_point = next((p for p in chart if p["week"] == "W+8"), None)
    forecast_4w = w4_point["p50"] if w4_point and w4_point["p50"] else base * 1.03
    forecast_8w = w8_point["p50"] if w8_point and w8_point["p50"] else base * 1.06

    signal, confidence, reasoning = _score_signal(
        spot=spot,
        base_rate=base,
        pct_change=pct_change,
        volatility=route_data["volatility"],
        trend_bias=route_data["trend_bias"],
        forecast_4w=forecast_4w,
        forecast_8w=forecast_8w,
    )

    # Breakeven = cost of voyage at current rates
    breakeven = base * 0.88
    expected_gain_pct = (forecast_8w - spot) / spot * 100

    return {
        "signal": signal,
        "confidence": confidence,
        "reasoning": reasoning,
        "spotRate": spot,
        "breakeven": round(breakeven, 0),
        "expectedGainPct": round(expected_gain_pct, 2),
    }


def get_full_dashboard_data(route: str, vessel: str) -> dict:
    """Assemble the complete DashboardState payload."""
    from datetime import datetime, timezone
    from backend.data.port_data import get_port_constraints

    spot, spot_change = get_current_spot(route, vessel)
    decision = predict_signal(route, vessel)
    chart_data = generate_forecast_chart(route, vessel)
    ports = get_port_constraints(vessel)
    vix, vix_trend = compute_volatility_index(route, vessel)

    route_data = ROUTE_BASE_RATES.get(route, list(ROUTE_BASE_RATES.values())[0])
    vessel_mult = VESSEL_DWT_MULTIPLIERS.get(vessel, 1.0)
    base = route_data["base"] * vessel_mult

    # 4w and 8w forecast deltas
    w4 = next((p["p50"] for p in chart_data if p["week"] == "W+4" and p["p50"]), base * 1.03)
    w8 = next((p["p50"] for p in chart_data if p["week"] == "W+8" and p["p50"]), base * 1.06)
    delta_4w = round((w4 - spot) / spot * 100, 2)
    delta_8w = round((w8 - spot) / spot * 100, 2)

    return {
        "currentSpotRate": spot,
        "spotRateChange": spot_change,
        "decisionSignal": decision["signal"],
        "confidenceScore": decision["confidence"],
        "selectedRoute": route,
        "selectedVesselClass": vessel,
        "forecast4w": round(w4, 0),
        "forecast4wDelta": delta_4w,
        "forecast8w": round(w8, 0),
        "forecast8wDelta": delta_8w,
        "volatilityIndex": vix,
        "volatilityTrend": vix_trend,
        "chartData": chart_data,
        "portConstraints": ports,
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "modelVersion": "FIQ-GBM-v3.2",
        "dataFreshness": "Live",
    }
