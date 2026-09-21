"""
FreightIQ — GET /api/planner
Returns route planning information including distance, base rate, transit days,
and a 35-day forecast calendar of booking days.
"""

from fastapi import APIRouter, Query
from backend.data.rate_simulator import generate_planner_calendar

router = APIRouter(prefix="/api", tags=["Planner"])

@router.get(
    "/planner",
    summary="Route planner data with 35-day calendar",
    description="Returns transit info and a 35-day price calendar for best booking windows."
)
async def get_planner_calendar(
    origin: str = Query(..., description="Origin port"),
    destination: str = Query(..., description="Destination port"),
    vessel: str = Query(..., description="Vessel class"),
    cargo: str = Query(..., description="Cargo type")
) -> dict:
    return generate_planner_calendar(origin, destination, vessel, cargo)
