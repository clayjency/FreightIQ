"""
FreightIQ — GET /api/decision
Returns the Book Now / Wait Mode signal with full reasoning chain.
This is the dedicated decision endpoint — lighter than /api/dashboard
for UI components that only need the signal badge.
"""

from fastapi import APIRouter, Query

from backend.models.ml_engine import predict_signal
from backend.data.rate_simulator import ROUTE_BASE_RATES, VESSEL_DWT_MULTIPLIERS

router = APIRouter(prefix="/api", tags=["Decision"])


@router.get(
    "/decision",
    summary="Freight booking decision signal",
    description=(
        "Runs the multi-factor scoring model and returns the booking "
        "decision signal ('Book Now' or 'Wait Mode'), a confidence score "
        "(0-100), and a human-readable reasoning chain explaining the signal."
    ),
)
async def get_decision(
    route: str = Query(default="Paradip → Rotterdam", description="Trade route"),
    vessel: str = Query(default="Supramax (52K DWT)", description="Vessel class"),
) -> dict:
    if route not in ROUTE_BASE_RATES:
        route = "Paradip → Rotterdam"
    if vessel not in VESSEL_DWT_MULTIPLIERS:
        vessel = "Supramax (52K DWT)"

    return predict_signal(route, vessel)
