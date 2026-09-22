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

@router.get(
    "/vessel-recommendation",
    summary="Auto-recommend vessel based on cargo volume",
    description="Returns the best vessel class based on cargo volume and port constraints."
)
async def recommend_vessel(
    volume: float = Query(..., description="Cargo volume in MT"),
    constraints: str = Query(default="", description="Port draft or beam constraints")
) -> dict:
    # Basic logic to match volume to DWT
    vessel_capacities = {
        "Handysize (32K DWT)": 32000,
        "Supramax (52K DWT)": 52000,
        "Panamax (75K DWT)": 75000,
        "Capesize (180K DWT)": 180000,
        "VLOC (300K DWT)": 300000,
    }
    
    # Simple rule: find the smallest vessel that can carry the volume
    recommended = None
    for v_class, capacity in sorted(vessel_capacities.items(), key=lambda x: x[1]):
        if volume <= capacity * 0.95: # 95% util factor
            recommended = v_class
            break
            
    if not recommended:
        recommended = "VLOC (300K DWT)" # max out
        
    return {
        "recommendedVessel": recommended,
        "inputVolume": volume,
        "utilizationPct": round((volume / vessel_capacities[recommended]) * 100, 1),
        "reasoning": f"Volume {volume} MT fits optimally in a {recommended} with constraints [{constraints}]"
    }
