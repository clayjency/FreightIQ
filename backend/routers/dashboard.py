"""
FreightIQ — GET /api/dashboard
Returns the full DashboardState payload. This is the primary endpoint
consumed by the React frontend on every page load and refresh.
"""

from fastapi import APIRouter, Query

from backend.models.ml_engine import get_full_dashboard_data
from backend.data.rate_simulator import ROUTE_BASE_RATES, VESSEL_DWT_MULTIPLIERS

router = APIRouter(prefix="/api", tags=["Dashboard"])

_DEFAULT_ROUTE = "Paradip → Rotterdam"
_DEFAULT_VESSEL = "Supramax (52K DWT)"


@router.get(
    "/dashboard",
    summary="Full dashboard state",
    description=(
        "Returns the complete DashboardState object consumed by the React "
        "FreightIQ dashboard. Includes spot rate, decision signal, forecast "
        "chart data, port constraints, and model metadata."
    ),
    response_model_by_alias=True,
)
async def get_dashboard(
    route: str = Query(default=_DEFAULT_ROUTE, description="Trade route name"),
    vessel: str = Query(default=_DEFAULT_VESSEL, description="Vessel class name"),
) -> dict:
    # Validate inputs
    if route not in ROUTE_BASE_RATES:
        route = _DEFAULT_ROUTE
    if vessel not in VESSEL_DWT_MULTIPLIERS:
        vessel = _DEFAULT_VESSEL

    return get_full_dashboard_data(route, vessel)
