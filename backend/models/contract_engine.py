"""
FreightIQ — Multi-Voyage Contract Comparison Engine
SIH 2026 • PS-26006 — Core Objective

Compares three chartering strategies for a given route/vessel/cargo:
  1. Spot Strategy:  N individual spot bookings at forecasted rates
  2. COA (Contract of Affreightment): Fixed rate for M voyages
  3. Short-term Time Charter: Daily hire × duration

The engine outputs actionable recommendations with break-even analysis
and explainable reasoning — fully CVC audit-trail compliant.
"""

from __future__ import annotations
import math
import random
from datetime import datetime, timezone
from typing import Optional

from backend.data.rate_simulator import (
    ROUTE_BASE_RATES,
    VESSEL_DWT_MULTIPLIERS,
    get_current_spot,
    generate_forecast_chart,
)
from backend.data.port_data import VESSEL_DRAFT_SPECS
from backend.models.ml_engine import compute_volatility_index


# ─────────────────────────────────────────────────────────────────────────────
# Vessel cargo capacity (approximate MT per vessel class)
# ─────────────────────────────────────────────────────────────────────────────

VESSEL_CARGO_CAPACITY_MT: dict[str, int] = {
    "Handysize (32K DWT)": 28_000,
    "Supramax (52K DWT)": 48_000,
    "Panamax (75K DWT)": 70_000,
    "Capesize (180K DWT)": 170_000,
    "VLOC (300K DWT)": 280_000,
}


# ─────────────────────────────────────────────────────────────────────────────
# COA discount model
# ─────────────────────────────────────────────────────────────────────────────

def _compute_coa_discount(
    num_voyages: int,
    duration_months: int,
    cargo_volume_mt: int,
    volatility: float,
) -> float:
    """
    Compute the COA discount rate (%) based on volume commitment,
    contract duration, and market volatility.

    Discount factors:
      - Volume commitment: more voyages → higher discount (owner gets guaranteed cargo)
      - Duration: longer contract → higher discount (revenue visibility)
      - Volatility: higher vol → larger discount (owner prefers stability)

    Returns discount as a fraction (e.g., 0.08 = 8% discount).
    """
    # Base discount for any COA vs spot
    base = 0.03

    # Volume bonus: +1% per 2 voyages beyond 3, capped at +6%
    volume_bonus = min(0.06, max(0, (num_voyages - 3)) * 0.01)

    # Duration bonus: +0.5% per month beyond 3, capped at +4%
    duration_bonus = min(0.04, max(0, (duration_months - 3)) * 0.005)

    # Volatility premium: owners give bigger discounts in volatile markets
    # to lock in guaranteed cargo
    vol_bonus = min(0.05, volatility * 0.15)

    total = base + volume_bonus + duration_bonus + vol_bonus
    return round(min(total, 0.18), 4)  # cap at 18%


# ─────────────────────────────────────────────────────────────────────────────
# Time Charter daily hire model
# ─────────────────────────────────────────────────────────────────────────────

def _compute_tc_daily_hire(spot_rate: float, volatility: float) -> float:
    """
    Estimate Time Charter daily hire rate from spot.
    TC rates are typically at a premium to spot in contango markets
    and at a discount in backwardation.
    """
    # TC premium factor: lower volatility → tighter spread
    tc_premium = 1.0 + (0.05 - volatility * 0.08)
    return round(spot_rate * tc_premium, 0)


# ─────────────────────────────────────────────────────────────────────────────
# Main comparison engine
# ─────────────────────────────────────────────────────────────────────────────

def compare_contracts(
    route: str,
    vessel: str,
    num_voyages: int = 6,
    duration_months: int = 6,
    cargo_volume_mt: int = 0,
) -> dict:
    """
    Compare Spot vs COA vs Time Charter strategies.

    Parameters
    ----------
    route : str
        Trade route (e.g., "Newcastle → Paradip")
    vessel : str
        Vessel class (e.g., "Capesize (180K DWT)")
    num_voyages : int
        Number of planned voyages over the contract period
    duration_months : int
        Contract duration in months
    cargo_volume_mt : int
        Total cargo volume in metric tonnes (0 = auto-calculate from vessel)

    Returns
    -------
    dict
        Complete contract comparison with recommendation
    """
    from backend.data.rate_simulator import get_route_rate_from_db

    # ── Resolve route and vessel ─────────────────────────────────────
    db_route = get_route_rate_from_db(route) if hasattr(get_route_rate_from_db, '__call__') else None
    route_data = db_route or ROUTE_BASE_RATES.get(
        route, list(ROUTE_BASE_RATES.values())[0]
    )
    vessel_mult = VESSEL_DWT_MULTIPLIERS.get(vessel, 1.0)
    vessel_capacity = VESSEL_CARGO_CAPACITY_MT.get(vessel, 50_000)

    # Auto-calculate cargo volume if not provided
    if cargo_volume_mt <= 0:
        cargo_volume_mt = vessel_capacity * num_voyages

    # ── Current market data ──────────────────────────────────────────
    spot_rate, pct_change = get_current_spot(route, vessel)
    chart = generate_forecast_chart(route, vessel, history_weeks=4, forecast_weeks=26)
    vix, vix_trend = compute_volatility_index(route, vessel)
    volatility = route_data["volatility"]

    base_rate = route_data["base"] * vessel_mult
    distance_nm = route_data.get("distance_nm", 5000)
    speed_kn = 14.0
    voyage_days = max(1, round(distance_nm / (speed_kn * 24)))

    # ── Strategy 1: Spot ─────────────────────────────────────────────
    # Project spot rates for each voyage using forecast data
    weeks_per_voyage = max(1, (duration_months * 4) // num_voyages)
    spot_rates_per_voyage = []
    
    for v in range(num_voyages):
        target_week = (v + 1) * weeks_per_voyage
        label = f"W+{min(target_week, 26)}"
        point = next((p for p in chart if p["week"] == label), None)
        if point and point.get("p50"):
            spot_rates_per_voyage.append(point["p50"])
        else:
            # Extrapolate with drift
            drift = 1 + route_data["trend_bias"] * target_week
            spot_rates_per_voyage.append(round(spot_rate * drift, 0))

    spot_cost_per_voyage = [r * voyage_days for r in spot_rates_per_voyage]
    spot_total_cost = sum(spot_cost_per_voyage)
    spot_avg_rate = sum(spot_rates_per_voyage) / len(spot_rates_per_voyage)

    # Spot risk: variance of projected rates
    spot_variance = sum((r - spot_avg_rate) ** 2 for r in spot_rates_per_voyage) / len(spot_rates_per_voyage)
    spot_std = math.sqrt(spot_variance)
    spot_risk_pct = round(spot_std / spot_avg_rate * 100, 1)

    # ── Strategy 2: COA ──────────────────────────────────────────────
    discount = _compute_coa_discount(
        num_voyages, duration_months, cargo_volume_mt, volatility
    )
    coa_locked_rate = round(spot_rate * (1 - discount), 0)
    coa_cost_per_voyage = coa_locked_rate * voyage_days
    coa_total_cost = coa_cost_per_voyage * num_voyages

    # ── Strategy 3: Time Charter ─────────────────────────────────────
    tc_daily = _compute_tc_daily_hire(spot_rate, volatility)
    tc_total_days = voyage_days * num_voyages
    # Add repositioning days (ballast legs between voyages)
    repo_days_per_voyage = max(1, round(voyage_days * 0.3))
    tc_total_days_with_repo = tc_total_days + repo_days_per_voyage * (num_voyages - 1)
    tc_total_cost = tc_daily * tc_total_days_with_repo
    tc_cost_per_voyage = tc_total_cost / num_voyages

    # ── Break-even analysis ──────────────────────────────────────────
    # At which voyage does COA become cheaper than cumulative spot?
    cumulative_spot = 0
    cumulative_coa = 0
    break_even_voyage = num_voyages  # default: never breaks even within plan

    cumulative_spot_series = []
    cumulative_coa_series = []
    cumulative_tc_series = []

    for v in range(num_voyages):
        cumulative_spot += spot_cost_per_voyage[v]
        cumulative_coa += coa_cost_per_voyage
        tc_v_cost = tc_daily * (voyage_days + (repo_days_per_voyage if v > 0 else 0))
        cumulative_tc = sum(
            tc_daily * (voyage_days + (repo_days_per_voyage if i > 0 else 0))
            for i in range(v + 1)
        )

        cumulative_spot_series.append({
            "voyage": v + 1,
            "spot": round(cumulative_spot, 0),
            "coa": round(cumulative_coa, 0),
            "tc": round(cumulative_tc, 0),
        })

        if cumulative_coa < cumulative_spot and break_even_voyage == num_voyages:
            break_even_voyage = v + 1

    # ── Savings calculation ──────────────────────────────────────────
    spot_vs_coa_savings = spot_total_cost - coa_total_cost
    spot_vs_coa_pct = round(spot_vs_coa_savings / spot_total_cost * 100, 1) if spot_total_cost > 0 else 0
    spot_vs_tc_savings = spot_total_cost - tc_total_cost
    spot_vs_tc_pct = round(spot_vs_tc_savings / spot_total_cost * 100, 1) if spot_total_cost > 0 else 0

    # ── Recommendation engine ────────────────────────────────────────
    recommendation, confidence, reasoning = _generate_recommendation(
        spot_total=spot_total_cost,
        coa_total=coa_total_cost,
        tc_total=tc_total_cost,
        discount=discount,
        volatility=volatility,
        vix=vix,
        num_voyages=num_voyages,
        duration_months=duration_months,
        spot_risk_pct=spot_risk_pct,
        break_even_voyage=break_even_voyage,
    )

    return {
        "route": route,
        "vessel": vessel,
        "cargoType": route_data.get("cargo", "General"),
        "distanceNm": distance_nm,
        "voyageDays": voyage_days,
        "numVoyages": num_voyages,
        "durationMonths": duration_months,
        "cargoVolumeMt": cargo_volume_mt,
        "currentSpotRate": spot_rate,
        "spotStrategy": {
            "avgRate": round(spot_avg_rate, 0),
            "totalCost": round(spot_total_cost, 0),
            "perVoyageCosts": [round(c, 0) for c in spot_cost_per_voyage],
            "riskPct": spot_risk_pct,
            "riskLevel": "High" if spot_risk_pct > 8 else ("Moderate" if spot_risk_pct > 4 else "Low"),
        },
        "coaStrategy": {
            "lockedRate": coa_locked_rate,
            "discountPct": round(discount * 100, 1),
            "totalCost": round(coa_total_cost, 0),
            "perVoyageCost": round(coa_cost_per_voyage, 0),
            "riskLevel": "Low",
        },
        "tcStrategy": {
            "dailyHire": tc_daily,
            "totalDays": tc_total_days_with_repo,
            "totalCost": round(tc_total_cost, 0),
            "perVoyageCost": round(tc_cost_per_voyage, 0),
            "repoDaysPerVoyage": repo_days_per_voyage,
            "riskLevel": "Low-Moderate",
        },
        "breakEvenAnalysis": {
            "breakEvenVoyage": break_even_voyage,
            "cumulativeSeries": cumulative_spot_series,
        },
        "savings": {
            "coaVsSpot": round(spot_vs_coa_savings, 0),
            "coaVsSpotPct": spot_vs_coa_pct,
            "tcVsSpot": round(spot_vs_tc_savings, 0),
            "tcVsSpotPct": spot_vs_tc_pct,
        },
        "recommendation": recommendation,
        "confidence": confidence,
        "reasoning": reasoning,
        "volatilityIndex": vix,
        "volatilityTrend": vix_trend,
        "modelVersion": "FIQ-CONTRACT-v1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Recommendation logic
# ─────────────────────────────────────────────────────────────────────────────

def _generate_recommendation(
    spot_total: float,
    coa_total: float,
    tc_total: float,
    discount: float,
    volatility: float,
    vix: float,
    num_voyages: int,
    duration_months: int,
    spot_risk_pct: float,
    break_even_voyage: int,
) -> tuple[str, int, list[str]]:
    """
    Generate an explainable recommendation with confidence score.
    Returns (recommendation, confidence, reasoning_list).
    """
    scores = {"COA": 0, "Spot": 0, "Time Charter": 0}
    reasoning = []

    # Factor 1: Total cost comparison
    costs = {"COA": coa_total, "Spot": spot_total, "Time Charter": tc_total}
    cheapest = min(costs, key=costs.get)
    savings_pct = round((1 - costs[cheapest] / max(costs.values())) * 100, 1)

    if cheapest == "COA":
        scores["COA"] += 3
        reasoning.append(
            f"COA is the cheapest strategy — saves {savings_pct}% vs the most expensive option "
            f"(${costs[cheapest]:,.0f} vs ${max(costs.values()):,.0f})"
        )
    elif cheapest == "Time Charter":
        scores["Time Charter"] += 3
        reasoning.append(
            f"Time Charter is the cheapest for {num_voyages} voyages over {duration_months} months"
        )
    else:
        scores["Spot"] += 2
        reasoning.append("Spot strategy is currently cheapest — market rates are favorable")

    # Factor 2: Risk / volatility
    if vix > 25:
        scores["COA"] += 2
        scores["Time Charter"] += 1
        reasoning.append(
            f"High market volatility (VIX={vix:.0f}) — fixed-rate contracts strongly preferred "
            f"to hedge against rate swings"
        )
    elif vix > 15:
        scores["COA"] += 1
        reasoning.append(f"Moderate volatility (VIX={vix:.0f}) — COA provides useful hedging")
    else:
        scores["Spot"] += 1
        reasoning.append(
            f"Low volatility (VIX={vix:.0f}) — spot market is stable, less need for hedging"
        )

    # Factor 3: Spot rate risk
    if spot_risk_pct > 8:
        scores["COA"] += 2
        reasoning.append(
            f"Forecasted spot rate variance is high ({spot_risk_pct}%) — "
            f"locking a COA rate eliminates this uncertainty"
        )
    elif spot_risk_pct > 4:
        scores["COA"] += 1
        reasoning.append(f"Moderate rate forecast variance ({spot_risk_pct}%)")

    # Factor 4: Volume commitment benefit
    if num_voyages >= 8:
        scores["COA"] += 2
        reasoning.append(
            f"Large volume commitment ({num_voyages} voyages) commands a strong COA discount "
            f"of {discount * 100:.1f}%"
        )
    elif num_voyages >= 5:
        scores["COA"] += 1
        reasoning.append(
            f"Multi-voyage commitment ({num_voyages} voyages) secures {discount * 100:.1f}% COA discount"
        )
    else:
        scores["Spot"] += 1
        reasoning.append(
            f"Low voyage count ({num_voyages}) — COA discount of {discount * 100:.1f}% is modest"
        )

    # Factor 5: Break-even analysis
    if break_even_voyage <= 2:
        scores["COA"] += 2
        reasoning.append(
            f"COA breaks even by voyage {break_even_voyage} — early payback confirms value"
        )
    elif break_even_voyage <= num_voyages // 2:
        scores["COA"] += 1
        reasoning.append(f"COA breaks even at voyage {break_even_voyage} of {num_voyages}")

    # Factor 6: TC suitability for long durations
    if duration_months >= 9 and num_voyages >= 6:
        scores["Time Charter"] += 2
        reasoning.append(
            f"Long contract ({duration_months} months) with frequent voyages — "
            f"Time Charter eliminates per-voyage negotiation overhead"
        )

    # Determine winner
    recommendation = max(scores, key=scores.get)
    total_score = sum(scores.values())
    winner_score = scores[recommendation]

    # Confidence: how dominant is the winner?
    if total_score > 0:
        confidence = int(55 + (winner_score / total_score) * 40)
    else:
        confidence = 60
    confidence = max(55, min(97, confidence))

    return recommendation, confidence, reasoning
