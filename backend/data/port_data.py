"""
FreightIQ — Port Constraint Data Store
Static + dynamic port data for Indian major ports.
In production: swap with AIS / port authority API calls.
"""

from __future__ import annotations
import random
import math
from datetime import datetime, timezone


# ─────────────────────────────────────────────────────────────────────────────
# Master Port Registry
# ─────────────────────────────────────────────────────────────────────────────

PORT_REGISTRY: list[dict] = [
    {
        "id": "pc-paradip",
        "portName": "Paradip",
        "region": "East Coast, India",
        "draftLimitM": 14.5,
        "maxVesselDWT": 120_000,
        "berthCount": 14,
        "berthBaseWaitDays": 1.2,
        "tideDependency": False,
        "latitude": 20.26,
        "longitude": 86.68,
        "primaryCargo": ["Iron Ore", "Coal", "POL"],
        "imoPortCode": "INPRD",
    },
    {
        "id": "pc-haldia",
        "portName": "Haldia",
        "region": "East Coast, India",
        "draftLimitM": 8.5,
        "maxVesselDWT": 45_000,
        "berthCount": 10,
        "berthBaseWaitDays": 3.5,
        "tideDependency": True,
        "latitude": 22.03,
        "longitude": 88.10,
        "primaryCargo": ["Coal", "POL", "Fertiliser"],
        "imoPortCode": "INHAL",
    },
    {
        "id": "pc-mundra",
        "portName": "Mundra",
        "region": "West Coast, India",
        "draftLimitM": 17.0,
        "maxVesselDWT": 180_000,
        "berthCount": 22,
        "berthBaseWaitDays": 0.8,
        "tideDependency": False,
        "latitude": 22.84,
        "longitude": 69.72,
        "primaryCargo": ["Containers", "Coal", "Crude"],
        "imoPortCode": "INMUN",
    },
    {
        "id": "pc-vizag",
        "portName": "Vizag",
        "region": "East Coast, India",
        "draftLimitM": 18.1,
        "maxVesselDWT": 200_000,
        "berthCount": 26,
        "berthBaseWaitDays": 2.1,
        "tideDependency": False,
        "latitude": 17.69,
        "longitude": 83.29,
        "primaryCargo": ["Iron Ore", "Coal", "Fertiliser"],
        "imoPortCode": "INVTZ",
    },
    {
        "id": "pc-kandla",
        "portName": "Kandla",
        "region": "West Coast, India",
        "draftLimitM": 12.5,
        "maxVesselDWT": 85_000,
        "berthCount": 18,
        "berthBaseWaitDays": 2.8,
        "tideDependency": True,
        "latitude": 23.02,
        "longitude": 70.22,
        "primaryCargo": ["POL", "Fertiliser", "Salt"],
        "imoPortCode": "INKDL",
    },
    {
        "id": "pc-nhava-sheva",
        "portName": "Nhava Sheva (JNPT)",
        "region": "West Coast, India",
        "draftLimitM": 13.5,
        "maxVesselDWT": 100_000,
        "berthCount": 20,
        "berthBaseWaitDays": 1.5,
        "tideDependency": False,
        "latitude": 18.95,
        "longitude": 72.95,
        "primaryCargo": ["Containers", "General Cargo"],
        "imoPortCode": "INJNP",
    },
    {
        "id": "pc-chennai",
        "portName": "Chennai",
        "region": "South East Coast, India",
        "draftLimitM": 15.3,
        "maxVesselDWT": 130_000,
        "berthCount": 24,
        "berthBaseWaitDays": 1.8,
        "tideDependency": False,
        "latitude": 13.09,
        "longitude": 80.29,
        "primaryCargo": ["Automobiles", "Coal", "Containers"],
        "imoPortCode": "INMAA",
    },
    {
        "id": "pc-new-mangalore",
        "portName": "New Mangalore",
        "region": "West Coast, India",
        "draftLimitM": 14.2,
        "maxVesselDWT": 100_000,
        "berthCount": 12,
        "berthBaseWaitDays": 2.2,
        "tideDependency": True,
        "latitude": 12.92,
        "longitude": 74.82,
        "primaryCargo": ["POL", "Iron Ore", "Coal"],
        "imoPortCode": "INMNG",
    },
    # ── SIH East Coast Ports (PS-26006 requirement) ──────────────────
    {
        "id": "pc-gangavaram",
        "portName": "Gangavaram",
        "region": "East Coast, India",
        "draftLimitM": 21.0,
        "maxVesselDWT": 200_000,
        "berthCount": 6,
        "berthBaseWaitDays": 1.0,
        "tideDependency": False,
        "latitude": 17.62,
        "longitude": 83.24,
        "primaryCargo": ["Coal", "Iron Ore", "Limestone"],
        "imoPortCode": "INGGV",
    },
    {
        "id": "pc-gopalpur",
        "portName": "Gopalpur",
        "region": "East Coast, India",
        "draftLimitM": 14.0,
        "maxVesselDWT": 80_000,
        "berthCount": 4,
        "berthBaseWaitDays": 1.5,
        "tideDependency": False,
        "latitude": 19.26,
        "longitude": 84.89,
        "primaryCargo": ["Coal", "Iron Ore", "Bauxite"],
        "imoPortCode": "INGOP",
    },
    {
        "id": "pc-dhamra",
        "portName": "Dhamra",
        "region": "East Coast, India",
        "draftLimitM": 18.0,
        "maxVesselDWT": 180_000,
        "berthCount": 4,
        "berthBaseWaitDays": 0.9,
        "tideDependency": True,
        "latitude": 20.78,
        "longitude": 86.94,
        "primaryCargo": ["Coal", "Iron Ore", "Limestone"],
        "imoPortCode": "INDHA",
    },
    {
        "id": "pc-sagar-sandheads",
        "portName": "Sagar-Sandheads",
        "region": "East Coast, India",
        "draftLimitM": 10.0,
        "maxVesselDWT": 55_000,
        "berthCount": 8,
        "berthBaseWaitDays": 4.0,
        "tideDependency": True,
        "latitude": 21.65,
        "longitude": 88.05,
        "primaryCargo": ["Coal", "General Cargo", "Fertiliser"],
        "imoPortCode": "INSAG",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Vessel Draft Specs
# ─────────────────────────────────────────────────────────────────────────────

VESSEL_DRAFT_SPECS: dict[str, float] = {
    "Supramax (52K DWT)": 12.6,
    "Panamax (75K DWT)": 13.6,
    "Capesize (180K DWT)": 18.2,
    "Handysize (32K DWT)": 10.1,
    "VLOC (300K DWT)": 23.0,
}


# ─────────────────────────────────────────────────────────────────────────────
# Dynamic constraint computation
# ─────────────────────────────────────────────────────────────────────────────

def _congestion_hours(port: dict, seed_offset: int = 0) -> int:
    """Simulate realistic congestion based on port capacity + time-of-day."""
    # Seed on port id + current hour for stable-ish values
    hour = datetime.now(timezone.utc).hour
    rng = random.Random(hash(port["id"]) + hour + seed_offset)

    # Haldia structurally congested due to draft + tidal constraints
    base: dict[str, int] = {
        "pc-haldia": 60,
        "pc-kandla": 24,
        "pc-nhava-sheva": 18,
        "pc-paradip": 6,
        "pc-mundra": 6,
        "pc-vizag": 0,
        "pc-chennai": 12,
        "pc-new-mangalore": 8,
        "pc-gangavaram": 4,
        "pc-gopalpur": 10,
        "pc-dhamra": 6,
        "pc-sagar-sandheads": 48,
    }
    base_val = base.get(port["id"], 0)
    jitter = rng.randint(-base_val // 4, base_val // 4) if base_val > 0 else rng.randint(0, 6)
    return max(0, base_val + jitter)


def _berth_wait(port: dict, congestion_hrs: int) -> float:
    """Compute berth wait in days — base + congestion factor + tidal penalty."""
    tidal_penalty = 0.5 if port["tideDependency"] else 0.0
    congestion_factor = congestion_hrs / 24.0 * 0.6
    return round(port["berthBaseWaitDays"] + congestion_factor + tidal_penalty, 1)


def _vessel_fit(port: dict, vessel_class: str) -> str:
    vessel_draft = VESSEL_DRAFT_SPECS.get(vessel_class, 13.0)
    port_limit = port["draftLimitM"]

    if vessel_draft <= port_limit - 1.0:
        return "Optimal"
    elif vessel_draft <= port_limit + 0.5:
        return "Marginal"
    else:
        return "Violation"


def _risk_level(vessel_fit: str, congestion_hrs: int, tide: bool) -> str:
    score = 0
    if vessel_fit == "Violation":
        score += 4
    elif vessel_fit == "Marginal":
        score += 2

    if congestion_hrs >= 48:
        score += 3
    elif congestion_hrs >= 24:
        score += 2
    elif congestion_hrs >= 12:
        score += 1

    if tide:
        score += 1

    if score >= 6:
        return "Critical"
    elif score >= 4:
        return "High"
    elif score >= 2:
        return "Moderate"
    return "Low"


def get_port_constraints(vessel_class: str = "Supramax (52K DWT)") -> list[dict]:
    """Return live-computed port constraints for all registered ports."""
    constraints = []
    for port in PORT_REGISTRY:
        congestion = _congestion_hours(port)
        fit = _vessel_fit(port, vessel_class)
        wait = _berth_wait(port, congestion)
        risk = _risk_level(fit, congestion, port["tideDependency"])

        constraints.append({
            "id": port["id"],
            "portName": port["portName"],
            "region": port["region"],
            "draftLimitM": port["draftLimitM"],
            "vesselFit": fit,
            "congestionAlertHrs": congestion,
            "berthWaitDays": wait,
            "tideDependency": port["tideDependency"],
            "riskLevel": risk,
        })
    return constraints


def get_port_by_id(port_id: str) -> dict | None:
    return next((p for p in PORT_REGISTRY if p["id"] == port_id), None)
