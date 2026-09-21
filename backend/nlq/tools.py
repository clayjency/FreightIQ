"""
FreightIQ — LangChain Tool Functions
Three @tool-wrapped functions that bridge natural language queries to the
existing FreightIQ backend engines (rate_simulator, ml_engine, port_data).

These tools are registered with the LangChain agent and invoked via
OpenAI function calling when the user asks structured data questions.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from langchain_core.tools import tool

logger = logging.getLogger("freightiq.nlq.tools")


# ─────────────────────────────────────────────────────────────────────────────
# Helper: Fuzzy port name matching
# ─────────────────────────────────────────────────────────────────────────────

def _match_port(port_name: str) -> Optional[dict]:
    """
    Fuzzy-match a user-provided port name against the PORT_REGISTRY.
    Handles common variations like 'Vizag', 'Visakhapatnam', 'JNPT', etc.
    """
    from backend.data.port_data import PORT_REGISTRY

    port_lower = port_name.strip().lower()

    # Direct match on portName
    for port in PORT_REGISTRY:
        if port["portName"].lower() == port_lower:
            return port

    # Partial / alias matching
    aliases = {
        "visakhapatnam": "Vizag",
        "vishakhapatnam": "Vizag",
        "vizag": "Vizag",
        "nhava sheva": "Nhava Sheva (JNPT)",
        "jnpt": "Nhava Sheva (JNPT)",
        "nhavasheva": "Nhava Sheva (JNPT)",
        "kolkata": "Haldia",
        "calcutta": "Haldia",
        "mangalore": "New Mangalore",
        "new mangalore": "New Mangalore",
        "nmpt": "New Mangalore",
        "deen dayal": "Kandla",
        "deendayal": "Kandla",
    }
    resolved = aliases.get(port_lower)
    if resolved:
        for port in PORT_REGISTRY:
            if port["portName"] == resolved:
                return port

    # Substring match fallback
    for port in PORT_REGISTRY:
        if port_lower in port["portName"].lower() or port["portName"].lower() in port_lower:
            return port

    return None


def _match_route(route_hint: str) -> Optional[str]:
    """
    Fuzzy-match a user-provided route string to the closest known route.
    Handles partial names like 'Paradip Rotterdam' or 'Newcastle Paradip'.
    """
    from backend.data.rate_simulator import ROUTE_BASE_RATES

    route_lower = route_hint.strip().lower()

    # Direct match
    for route_name in ROUTE_BASE_RATES:
        if route_name.lower() == route_lower:
            return route_name

    # Substring match (check if key words appear in any route)
    for route_name in ROUTE_BASE_RATES:
        route_words = route_name.lower().replace("→", " ").split()
        if all(w in route_lower for w in route_words):
            return route_name
        # Check if user's words appear in route
        user_words = route_lower.replace("→", " ").replace(" to ", " ").replace("-", " ").split()
        if sum(1 for w in user_words if w in route_name.lower()) >= 2:
            return route_name

    # Single keyword match (origin or destination)
    for route_name in ROUTE_BASE_RATES:
        parts = route_name.lower().replace("→", " ").split()
        for part in parts:
            if part.strip() and part.strip() in route_lower:
                return route_name

    return None


def _match_vessel(vessel_hint: str) -> Optional[str]:
    """
    Fuzzy-match a vessel class name from user input.
    Handles 'supramax', 'Panamax 75K', 'cape', etc.
    """
    from backend.data.rate_simulator import VESSEL_DWT_MULTIPLIERS

    hint_lower = vessel_hint.strip().lower()

    # Direct match
    for v_name in VESSEL_DWT_MULTIPLIERS:
        if v_name.lower() == hint_lower:
            return v_name

    # Keyword match
    keywords = {
        "handysize": "Handysize (32K DWT)",
        "handy": "Handysize (32K DWT)",
        "32k": "Handysize (32K DWT)",
        "supramax": "Supramax (52K DWT)",
        "supra": "Supramax (52K DWT)",
        "52k": "Supramax (52K DWT)",
        "panamax": "Panamax (75K DWT)",
        "pmax": "Panamax (75K DWT)",
        "75k": "Panamax (75K DWT)",
        "capesize": "Capesize (180K DWT)",
        "cape": "Capesize (180K DWT)",
        "180k": "Capesize (180K DWT)",
        "vloc": "VLOC (300K DWT)",
        "300k": "VLOC (300K DWT)",
        "valemax": "VLOC (300K DWT)",
    }
    for kw, v_name in keywords.items():
        if kw in hint_lower:
            return v_name

    return None


# ─────────────────────────────────────────────────────────────────────────────
# Tool 1: Freight Rate Forecast
# ─────────────────────────────────────────────────────────────────────────────

@tool
def get_freight_rate_forecast(
    route: str,
    vessel_class: str,
    horizon_weeks: int = 4,
) -> str:
    """Get the freight rate forecast for a given trade route and vessel class.

    Returns the current spot rate, predicted rates at the target horizon
    (P10 pessimistic, P50 median, P90 optimistic), volatility score,
    week-on-week rate change, and a Book Now / Wait Mode decision signal
    with confidence score and reasoning.

    Args:
        route: Trade route name or description (e.g., 'Paradip to Rotterdam',
               'Haldia Shanghai', 'Vizag Yokohama').
        vessel_class: Vessel class name (e.g., 'Supramax', 'Panamax',
                      'Capesize', 'Handysize', 'VLOC').
        horizon_weeks: Number of weeks ahead to forecast (1-26, default 4).
    """
    from backend.data.rate_simulator import get_current_spot, generate_forecast_chart
    from backend.models.ml_engine import predict_signal, compute_volatility_index

    logger.info("Tool: get_freight_rate_forecast(route=%s, vessel=%s, weeks=%d)",
                route, vessel_class, horizon_weeks)

    # Resolve fuzzy inputs to exact known names
    matched_route = _match_route(route)
    matched_vessel = _match_vessel(vessel_class)

    if not matched_route:
        return json.dumps({
            "error": f"Route '{route}' not found in database. "
                     "Available routes: Paradip → Rotterdam, Haldia → Shanghai, "
                     "Mundra → Fujairah, Vizag → Yokohama, Kandla → Houston."
        })

    if not matched_vessel:
        return json.dumps({
            "error": f"Vessel class '{vessel_class}' not recognised. "
                     "Available: Handysize (32K), Supramax (52K), Panamax (75K), "
                     "Capesize (180K), VLOC (300K)."
        })

    # Fetch data from existing engines
    spot, pct_change = get_current_spot(matched_route, matched_vessel)
    chart = generate_forecast_chart(
        matched_route, matched_vessel,
        history_weeks=8, forecast_weeks=max(horizon_weeks, 8),
    )
    decision = predict_signal(matched_route, matched_vessel)
    vix, vix_trend = compute_volatility_index(matched_route, matched_vessel)

    # Extract the forecast point at the target horizon
    target_label = f"W+{horizon_weeks}"
    target_point = next((p for p in chart if p["week"] == target_label), None)

    result = {
        "route": matched_route,
        "vessel_class": matched_vessel,
        "horizon_weeks": horizon_weeks,
        "current_spot_rate_usd_day": spot,
        "week_on_week_change_pct": pct_change,
        "forecast": {
            "week_label": target_label,
            "p10_pessimistic": target_point["p10"] if target_point else None,
            "p50_median": target_point["p50"] if target_point else None,
            "p90_optimistic": target_point["p90"] if target_point else None,
        },
        "volatility_index": vix,
        "volatility_trend": vix_trend,
        "decision": {
            "signal": decision["signal"],
            "confidence_pct": decision["confidence"],
            "reasoning": decision["reasoning"],
            "breakeven_usd_day": decision["breakeven"],
            "expected_gain_pct": decision["expectedGainPct"],
        },
        "data_source": "FreightIQ GBM-v3.2 simulation engine",
    }

    return json.dumps(result, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 2: Port-Vessel Fit Check
# ─────────────────────────────────────────────────────────────────────────────

@tool
def check_port_vessel_fit(
    port_name: str,
    loa_m: float = 0.0,
    draft_m: float = 0.0,
    beam_m: float = 0.0,
) -> str:
    """Check if a vessel's dimensions comply with a specific port's constraints.

    Returns the port's draft limit, max DWT, vessel fit status
    (Optimal / Marginal / Violation), berth count, tide dependency,
    and clearance margin. If vessel dimensions are not provided (0.0),
    only port constraints are returned.

    Args:
        port_name: Port name (e.g., 'Paradip', 'Vizag', 'Haldia', 'Dhamra',
                   'Mundra', 'Kandla', 'JNPT', 'Chennai').
        loa_m: Vessel LOA (Length Overall) in metres. Use 0.0 if unknown.
        draft_m: Vessel maximum draft in metres. Use 0.0 if unknown.
        beam_m: Vessel beam (width) in metres. Use 0.0 if unknown.
    """
    from backend.data.port_data import PORT_REGISTRY

    logger.info("Tool: check_port_vessel_fit(port=%s, loa=%.1f, draft=%.1f, beam=%.1f)",
                port_name, loa_m, draft_m, beam_m)

    port = _match_port(port_name)
    if not port:
        available = [p["portName"] for p in PORT_REGISTRY]
        return json.dumps({
            "error": f"Port '{port_name}' not found. Available ports: {', '.join(available)}"
        })

    port_draft = port["draftLimitM"]

    # Compute vessel fit status
    if draft_m > 0:
        clearance = port_draft - draft_m
        if clearance >= 1.0:
            fit_status = "Optimal"
            fit_detail = f"Vessel draft {draft_m}m is well within port limit of {port_draft}m (clearance: {clearance:.1f}m)"
        elif clearance >= -0.5:
            fit_status = "Marginal"
            fit_detail = (
                f"Vessel draft {draft_m}m is close to port limit of {port_draft}m "
                f"(clearance: {clearance:.1f}m). May require tidal window or part-loading."
            )
        else:
            fit_status = "Violation"
            fit_detail = (
                f"VIOLATION: Vessel draft {draft_m}m EXCEEDS port limit of {port_draft}m "
                f"by {abs(clearance):.1f}m. Vessel CANNOT enter this port at full load."
            )
    else:
        fit_status = "Not assessed (no vessel draft provided)"
        fit_detail = "Provide vessel draft in metres to check compliance."
        clearance = None

    result = {
        "port_name": port["portName"],
        "port_id": port["id"],
        "region": port["region"],
        "imo_port_code": port.get("imoPortCode", "N/A"),
        "constraints": {
            "draft_limit_m": port_draft,
            "max_vessel_dwt": port["maxVesselDWT"],
            "berth_count": port["berthCount"],
            "tide_dependent": port["tideDependency"],
            "primary_cargo": port.get("primaryCargo", []),
        },
        "vessel_assessment": {
            "provided_draft_m": draft_m if draft_m > 0 else None,
            "provided_loa_m": loa_m if loa_m > 0 else None,
            "provided_beam_m": beam_m if beam_m > 0 else None,
            "fit_status": fit_status,
            "fit_detail": fit_detail,
            "clearance_m": round(clearance, 1) if clearance is not None else None,
        },
        "data_source": "FreightIQ Port Registry (synced with port authority circulars)",
    }

    return json.dumps(result, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 3: Congestion Alert
# ─────────────────────────────────────────────────────────────────────────────

@tool
def get_congestion_alert(port_name: str) -> str:
    """Get current congestion status, turnaround times, and demurrage risk for a port.

    Returns waiting time in hours and days, berth wait, tide dependency,
    risk level, and an estimated demurrage risk premium based on current
    congestion levels.

    Args:
        port_name: Port name (e.g., 'Paradip', 'Vizag', 'Haldia', 'Mundra',
                   'Kandla', 'JNPT', 'Chennai', 'New Mangalore').
    """
    from backend.data.port_data import PORT_REGISTRY, _congestion_hours, _berth_wait, _risk_level

    logger.info("Tool: get_congestion_alert(port=%s)", port_name)

    port = _match_port(port_name)
    if not port:
        available = [p["portName"] for p in PORT_REGISTRY]
        return json.dumps({
            "error": f"Port '{port_name}' not found. Available ports: {', '.join(available)}"
        })

    congestion_hrs = _congestion_hours(port)
    berth_wait_days = _berth_wait(port, congestion_hrs)
    risk = _risk_level("Optimal", congestion_hrs, port["tideDependency"])

    # Demurrage risk premium estimate ($/day based on congestion level)
    # Higher congestion → higher expected demurrage cost → higher risk premium
    if congestion_hrs >= 48:
        demurrage_risk = "High"
        demurrage_premium_pct = 12.0
        advisory = (
            "ALERT: Severe congestion detected. Expect significant demurrage exposure. "
            "Consider alternative ports or delay vessel nomination."
        )
    elif congestion_hrs >= 24:
        demurrage_risk = "Moderate"
        demurrage_premium_pct = 6.0
        advisory = (
            "Moderate congestion. Budget for 1-2 days demurrage. "
            "Monitor closely for further deterioration."
        )
    elif congestion_hrs >= 12:
        demurrage_risk = "Low-Moderate"
        demurrage_premium_pct = 3.0
        advisory = "Congestion within normal range. Standard demurrage provisions apply."
    else:
        demurrage_risk = "Low"
        demurrage_premium_pct = 0.0
        advisory = "Port operating normally. Minimal demurrage risk."

    result = {
        "port_name": port["portName"],
        "port_id": port["id"],
        "region": port["region"],
        "congestion": {
            "current_wait_hours": congestion_hrs,
            "berth_wait_days": berth_wait_days,
            "base_berth_wait_days": port["berthBaseWaitDays"],
            "tide_dependent": port["tideDependency"],
            "risk_level": risk,
        },
        "demurrage_risk": {
            "risk_category": demurrage_risk,
            "estimated_premium_pct": demurrage_premium_pct,
            "advisory": advisory,
        },
        "port_details": {
            "berth_count": port["berthCount"],
            "primary_cargo": port.get("primaryCargo", []),
        },
        "data_source": "FreightIQ Port Congestion Monitor (simulated for demo)",
    }

    return json.dumps(result, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# Tool registry for the agent
# ─────────────────────────────────────────────────────────────────────────────

def get_all_tools() -> list:
    """Returns the list of all LangChain tools for the FreightIQ agent."""
    return [
        get_freight_rate_forecast,
        check_port_vessel_fit,
        get_congestion_alert,
    ]
