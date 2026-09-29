"""
FreightIQ — GET /api/contract/compare
Multi-voyage contract comparison endpoint.
Returns Spot vs COA vs Time Charter analysis with recommendation.
"""

from fastapi import APIRouter, Query

from backend.models.contract_engine import compare_contracts
from backend.data.rate_simulator import ROUTE_BASE_RATES, VESSEL_DWT_MULTIPLIERS

router = APIRouter(prefix="/api", tags=["Contract Comparison"])


@router.get(
    "/contract/compare",
    summary="Compare chartering strategies (Spot vs COA vs Time Charter)",
    description=(
        "Runs the multi-voyage contract comparison engine for a given route, "
        "vessel class, number of voyages, and contract duration. Returns total "
        "costs, per-voyage costs, break-even analysis, savings percentages, "
        "and an explainable recommendation with confidence score."
    ),
)
async def get_contract_comparison(
    route: str = Query(
        default="Newcastle → Paradip",
        description="Trade route (e.g., 'Newcastle → Paradip')",
    ),
    vessel: str = Query(
        default="Capesize (180K DWT)",
        description="Vessel class (e.g., 'Capesize (180K DWT)')",
    ),
    num_voyages: int = Query(
        default=6, ge=2, le=24,
        description="Number of planned voyages",
    ),
    duration_months: int = Query(
        default=6, ge=1, le=24,
        description="Contract duration in months",
    ),
    cargo_volume_mt: int = Query(
        default=0, ge=0,
        description="Total cargo volume in MT (0 = auto-calculate from vessel capacity)",
    ),
) -> dict:
    # Validate route and vessel, fallback to defaults
    if route not in ROUTE_BASE_RATES:
        route = "Newcastle → Paradip"
    if vessel not in VESSEL_DWT_MULTIPLIERS:
        vessel = "Capesize (180K DWT)"

    return compare_contracts(
        route=route,
        vessel=vessel,
        num_voyages=num_voyages,
        duration_months=duration_months,
        cargo_volume_mt=cargo_volume_mt,
    )
