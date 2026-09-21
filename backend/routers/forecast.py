"""
FreightIQ — GET /api/forecast
Returns the forecast chart data (ForecastPoint[]) for a given
route/vessel combination. Useful for refreshing the chart independently.
"""

from fastapi import APIRouter, Query

from backend.data.rate_simulator import (
    generate_forecast_chart,
    ROUTE_BASE_RATES,
    VESSEL_DWT_MULTIPLIERS,
)

router = APIRouter(prefix="/api", tags=["Forecast"])


@router.get(
    "/forecast",
    summary="Freight rate forecast chart data",
    description=(
        "Returns a list of ForecastPoint objects (historical + P10/P50/P90 "
        "forecast bands) for the specified trade route and vessel class. "
        "history_weeks controls the historical look-back window."
    ),
)
async def get_forecast(
    route: str = Query(default="Paradip → Rotterdam", description="Trade route"),
    vessel: str = Query(default="Supramax (52K DWT)", description="Vessel class"),
    history_weeks: int = Query(default=8, ge=4, le=52, description="Historical weeks to include"),
    forecast_weeks: int = Query(default=8, ge=2, le=26, description="Weeks to forecast ahead"),
) -> list[dict]:
    if route not in ROUTE_BASE_RATES:
        route = "Paradip → Rotterdam"
    if vessel not in VESSEL_DWT_MULTIPLIERS:
        vessel = "Supramax (52K DWT)"

    return generate_forecast_chart(
        route=route,
        vessel=vessel,
        history_weeks=history_weeks,
        forecast_weeks=forecast_weeks,
    )
