"""
FreightIQ — Freight Rate Time-Series Simulator
Generates realistic Baltic Exchange-style freight rate series.
In production: replace fetch_live_rates() with real API calls to
Baltic Exchange API / Platts / Kpler.
"""

from __future__ import annotations
import math
import random
from datetime import datetime, timezone

from backend.database import get_route_rate_from_db, get_all_routes_from_db

# ─────────────────────────────────────────────────────────────────────────────
# Route Base Rates  ($/day TCE equivalent)
# ─────────────────────────────────────────────────────────────────────────────

ROUTE_BASE_RATES: dict[str, dict] = {
    "Paradip → Rotterdam": {
        "base": 14200,
        "volatility": 0.18,
        "trend_bias": 0.004,      # slight upward drift per week
        "cargo": "Iron Ore",
        "distance_nm": 7800,
    },
    "Haldia → Shanghai": {
        "base": 12800,
        "volatility": 0.22,
        "trend_bias": 0.006,
        "cargo": "Coal",
        "distance_nm": 4200,
    },
    "Mundra → Fujairah": {
        "base": 9500,
        "volatility": 0.12,
        "trend_bias": 0.002,
        "cargo": "POL / Crude",
        "distance_nm": 850,
    },
    "Vizag → Yokohama": {
        "base": 16500,
        "volatility": 0.20,
        "trend_bias": 0.003,
        "cargo": "Iron Ore",
        "distance_nm": 5100,
    },
    "Kandla → Houston": {
        "base": 19800,
        "volatility": 0.25,
        "trend_bias": -0.002,     # slight headwind
        "cargo": "Chemicals",
        "distance_nm": 10200,
    },
}

# DWT multiplier: smaller vessels → higher $/day due to slot premium
VESSEL_DWT_MULTIPLIERS: dict[str, float] = {
    "Supramax (52K DWT)":  1.00,
    "Panamax (75K DWT)":   0.92,
    "Capesize (180K DWT)": 0.75,
    "Handysize (32K DWT)": 1.14,
    "VLOC (300K DWT)":     0.62,
}


# ─────────────────────────────────────────────────────────────────────────────
# Seeded GBM (Geometric Brownian Motion) rate generator
# ─────────────────────────────────────────────────────────────────────────────

def _gbm_series(
    base: float,
    mu: float,          # weekly drift
    sigma: float,       # weekly volatility
    weeks: int,
    seed: int,
) -> list[float]:
    """Generate a Geometric Brownian Motion rate series."""
    rng = random.Random(seed)
    rates = [base]
    for _ in range(weeks - 1):
        z = rng.gauss(0, 1)
        rates.append(rates[-1] * math.exp((mu - 0.5 * sigma**2) + sigma * z))
    return rates


def get_current_spot(route: str, vessel: str) -> tuple[float, float]:
    """
    Returns (spot_rate, pct_change_vs_last_week).
    Seeded on UTC day so it's stable within a day.
    """
    # Check database first, fallback to hardcoded
    db_route = get_route_rate_from_db(route)
    route_data = db_route or ROUTE_BASE_RATES.get(route, list(ROUTE_BASE_RATES.values())[0])
    vessel_mult = VESSEL_DWT_MULTIPLIERS.get(vessel, 1.0)

    day_seed = int(datetime.now(timezone.utc).strftime("%Y%m%d"))
    rng = random.Random(day_seed + hash(route) % 10_000)

    base = route_data["base"] * vessel_mult
    spot = base * (1 + rng.gauss(0, route_data["volatility"] * 0.3))

    # Last week rate (day-1 seed)
    rng_prev = random.Random(day_seed - 1 + hash(route) % 10_000)
    spot_prev = base * (1 + rng_prev.gauss(0, route_data["volatility"] * 0.3))

    pct = (spot - spot_prev) / spot_prev * 100
    return round(spot, 0), round(pct, 2)


def generate_forecast_chart(
    route: str,
    vessel: str,
    history_weeks: int = 8,
    forecast_weeks: int = 8,
) -> list[dict]:
    """
    Generate combined historical + forecast chart data.
    Returns list of ForecastPoint-compatible dicts.
    """
    db_route = get_route_rate_from_db(route)
    route_data = db_route or ROUTE_BASE_RATES.get(route, list(ROUTE_BASE_RATES.values())[0])
    vessel_mult = VESSEL_DWT_MULTIPLIERS.get(vessel, 1.0)

    base = route_data["base"] * vessel_mult
    mu = route_data["trend_bias"]
    sigma = route_data["volatility"] / math.sqrt(52)   # weekly σ

    day_seed = int(datetime.now(timezone.utc).strftime("%Y%m%d"))
    total_weeks = history_weeks + 1 + forecast_weeks   # +1 for "Now"

    # Simulate full series
    series = _gbm_series(base, mu, sigma, total_weeks, seed=day_seed + hash(route) % 10_000)

    points: list[dict] = []
    for i in range(total_weeks):
        week_offset = i - history_weeks   # negative = past, 0 = now, positive = future

        if week_offset < 0:
            label = f"W{week_offset}"    # W-8, W-7, ...
        elif week_offset == 0:
            label = "Now"
        else:
            label = f"W+{week_offset}"  # W+1, W+2, ...

        if week_offset <= 0:
            # Historical / current: actual values only
            points.append({
                "week": label,
                "actual": round(series[i], 0),
                "p10": None,
                "p50": None,
                "p90": None,
            })
        else:
            # Forecast: P10 / P50 / P90 via GBM fan
            # Confidence interval widens with horizon
            spread_factor = 1 + (week_offset * 0.18)
            p50 = round(series[i], 0)
            spread = base * sigma * spread_factor * 52**0.5   # annualised σ scaled
            points.append({
                "week": label,
                "actual": None,
                "p10": round(max(p50 - spread, base * 0.5), 0),
                "p50": p50,
                "p90": round(p50 + spread, 0),
            })

    return points


def get_all_route_rates() -> list[dict]:
    """Current spot rates for all routes (for /api/routes)."""
    day_seed = int(datetime.now(timezone.utc).strftime("%Y%m%d"))
    results = []
    
    # Merge DB routes and hardcoded routes
    db_routes = get_all_routes_from_db()
    all_routes = {}
    for name, data in ROUTE_BASE_RATES.items():
        all_routes[name] = data
    for db_route in db_routes:
        all_routes[db_route["route_name"]] = db_route
        
    for name, data in all_routes.items():
        parts = name.split(" → ")
        origin = parts[0]
        dest = parts[1] if len(parts) > 1 else "Unknown"
        rng = random.Random(day_seed + hash(name) % 10_000)
        spot = data["base"] * (1 + rng.gauss(0, data["volatility"] * 0.25))
        rng_prev = random.Random(day_seed - 1 + hash(name) % 10_000)
        prev = data["base"] * (1 + rng_prev.gauss(0, data["volatility"] * 0.25))
        change = (spot - prev) / prev * 100
        results.append({
            "name": name,
            "origin": origin,
            "destination": dest.strip(),
            "currentSpot": round(spot, 0),
            "changePct": round(change, 2),
            "cargoType": data.get("cargo", "General"),
        })
    return results

def generate_planner_calendar(origin: str, destination: str, vessel: str, cargo: str) -> dict:
    """Generate deterministic 35-day calendar of rates and route info for RoutePlannerPage."""
    o_name = origin.split(" (")[0]
    d_name = destination.split(" (")[0]
    route_name = f"{o_name} → {d_name}"
    
    # lookup or fallback
    db_route = get_route_rate_from_db(route_name)
    if db_route:
        base_rate = db_route["base"]
        distance = db_route["distance_nm"]
    elif route_name in ROUTE_BASE_RATES:
        base_rate = ROUTE_BASE_RATES[route_name]["base"]
        distance = ROUTE_BASE_RATES[route_name]["distance_nm"]
    else:
        # fallback based on random but seeded
        rng = random.Random(hash(route_name))
        distance = 6500 + rng.randint(0, 3000)
        base_rate = 12000 + (distance / 100) * 180
    
    vessel_mult = VESSEL_DWT_MULTIPLIERS.get(vessel, 1.0)
    base_rate *= vessel_mult

    speed_kn = 14.5
    transit_days = max(1, round(distance / (speed_kn * 24)))

    # generate 35 days calendar
    from datetime import timedelta
    day_seed = int(datetime.now(timezone.utc).strftime("%Y%m%d"))
    rng = random.Random(day_seed + hash(route_name) % 10_000)
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    rate = base_rate
    rates = []
    
    for i in range(35):
        drift = math.sin(i * 0.4) * 600 + math.sin(i * 0.15) * 400
        noise = (rng.random() - 0.5) * 500
        rate = base_rate + drift + noise
        rates.append(max(rate, base_rate * 0.75))
        
    min_rate = min(rates)
    max_rate = max(rates)
    peak = max_rate
    
    days = []
    for i, r in enumerate(rates):
        d = today + timedelta(days=i)
        pct = ((r - min_rate) / (max_rate - min_rate)) * 100 if max_rate > min_rate else 50
        
        if pct < 15: label = "Best"
        elif pct < 35: label = "Good"
        elif pct < 60: label = "Fair"
        elif pct < 80: label = "High"
        else: label = "Peak"
        
        days.append({
            "dateStr": d.strftime("%Y-%m-%d"),
            "rate": round(r),
            "percentile": round(pct),
            "label": label,
            "savings": round(peak - r)
        })
        
    return {
        "routeInfo": {
            "distance": distance,
            "transitDays": transit_days,
            "baseRate": round(base_rate)
        },
        "calendarDays": days
    }
