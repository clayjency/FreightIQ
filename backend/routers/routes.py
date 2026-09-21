"""
FreightIQ — GET /api/routes  &  GET /api/vessel-classes
Reference data endpoints — trade routes and vessel class specifications.
"""

from fastapi import APIRouter

from backend.data.rate_simulator import get_all_route_rates, ROUTE_BASE_RATES, VESSEL_DWT_MULTIPLIERS
from backend.data.port_data import VESSEL_DRAFT_SPECS

router = APIRouter(prefix="/api", tags=["Reference Data"])

# Vessel spec reference table
VESSEL_SPECS: list[dict] = [
    {
        "name": "Handysize (32K DWT)",
        "dwtK": 32,
        "maxDraftM": 10.1,
        "typicalSpeedKn": 13.5,
        "dailyFuelMt": 18.0,
    },
    {
        "name": "Supramax (52K DWT)",
        "dwtK": 52,
        "maxDraftM": 12.6,
        "typicalSpeedKn": 14.0,
        "dailyFuelMt": 25.0,
    },
    {
        "name": "Panamax (75K DWT)",
        "dwtK": 75,
        "maxDraftM": 13.6,
        "typicalSpeedKn": 14.5,
        "dailyFuelMt": 30.0,
    },
    {
        "name": "Capesize (180K DWT)",
        "dwtK": 180,
        "maxDraftM": 18.2,
        "typicalSpeedKn": 15.0,
        "dailyFuelMt": 52.0,
    },
    {
        "name": "VLOC (300K DWT)",
        "dwtK": 300,
        "maxDraftM": 23.0,
        "typicalSpeedKn": 14.8,
        "dailyFuelMt": 78.0,
    },
]


@router.get(
    "/routes",
    summary="All available trade routes with current spot rates",
    description="Returns all supported trade routes with current spot rates, WoW change, and cargo type.",
)
async def get_routes() -> list[dict]:
    return get_all_route_rates()


@router.get(
    "/vessel-classes",
    summary="Vessel class specifications",
    description="Returns all supported vessel classes with DWT, draft limit, speed, and daily fuel consumption.",
)
async def get_vessel_classes() -> list[dict]:
    return VESSEL_SPECS


@router.get(
    "/routes/names",
    summary="Route names only",
    description="Lightweight endpoint returning only route name strings (for dropdown population).",
)
async def get_route_names() -> list[str]:
    return list(ROUTE_BASE_RATES.keys())


@router.get(
    "/vessel-classes/names",
    summary="Vessel class names only",
    description="Lightweight endpoint returning only vessel class name strings (for dropdown population).",
)
async def get_vessel_class_names() -> list[str]:
    return list(VESSEL_DWT_MULTIPLIERS.keys())
