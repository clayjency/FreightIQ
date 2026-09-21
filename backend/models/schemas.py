"""
FreightIQ — Pydantic v2 Schemas
Mirrors the TypeScript interfaces in FreightIQDashboard.tsx exactly.
"""

from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Chart / Forecast
# ─────────────────────────────────────────────────────────────────────────────

class ForecastPoint(BaseModel):
    week: str
    actual: Optional[float] = None
    p10: Optional[float] = None
    p50: Optional[float] = None
    p90: Optional[float] = None


# ─────────────────────────────────────────────────────────────────────────────
# Port Constraints
# ─────────────────────────────────────────────────────────────────────────────

VesselFitType = Literal["Optimal", "Marginal", "Violation"]
RiskLevelType = Literal["Low", "Moderate", "High", "Critical"]

class PortConstraint(BaseModel):
    id: str
    port_name: str = Field(alias="portName")
    region: str
    draft_limit_m: float = Field(alias="draftLimitM")
    vessel_fit: VesselFitType = Field(alias="vesselFit")
    congestion_alert_hrs: int = Field(alias="congestionAlertHrs")
    berth_wait_days: float = Field(alias="berthWaitDays")
    tide_dependency: bool = Field(alias="tideDependency")
    risk_level: RiskLevelType = Field(alias="riskLevel")

    model_config = {"populate_by_name": True}


# ─────────────────────────────────────────────────────────────────────────────
# Main Dashboard State  (matches DashboardState in TS)
# ─────────────────────────────────────────────────────────────────────────────

DecisionSignalType = Literal["Book Now", "Wait Mode"]
DataFreshnessType = Literal["Live", "Delayed", "Stale"]
VolatilityTrendType = Literal["up", "down", "stable"]

class DashboardState(BaseModel):
    current_spot_rate: float = Field(alias="currentSpotRate")
    spot_rate_change: float = Field(alias="spotRateChange")
    decision_signal: DecisionSignalType = Field(alias="decisionSignal")
    confidence_score: int = Field(alias="confidenceScore")
    selected_route: str = Field(alias="selectedRoute")
    selected_vessel_class: str = Field(alias="selectedVesselClass")
    forecast_4w: float = Field(alias="forecast4w")
    forecast_4w_delta: float = Field(alias="forecast4wDelta")
    forecast_8w: float = Field(alias="forecast8w")
    forecast_8w_delta: float = Field(alias="forecast8wDelta")
    volatility_index: float = Field(alias="volatilityIndex")
    volatility_trend: VolatilityTrendType = Field(alias="volatilityTrend")
    chart_data: list[ForecastPoint] = Field(alias="chartData")
    port_constraints: list[PortConstraint] = Field(alias="portConstraints")
    last_updated: str = Field(alias="lastUpdated")
    model_version: str = Field(alias="modelVersion")
    data_freshness: DataFreshnessType = Field(alias="dataFreshness")

    model_config = {"populate_by_name": True}


# ─────────────────────────────────────────────────────────────────────────────
# Request / Query Params
# ─────────────────────────────────────────────────────────────────────────────

class ForecastRequest(BaseModel):
    route: str
    vessel: str
    weeks: int = 8


class DecisionResponse(BaseModel):
    signal: DecisionSignalType
    confidence: int
    reasoning: list[str]
    spot_rate: float = Field(alias="spotRate")
    breakeven: float
    expected_gain_pct: float = Field(alias="expectedGainPct")

    model_config = {"populate_by_name": True}


class RouteInfo(BaseModel):
    name: str
    origin: str
    destination: str
    current_spot: float = Field(alias="currentSpot")
    change_pct: float = Field(alias="changePct")
    cargo_type: str = Field(alias="cargoType")

    model_config = {"populate_by_name": True}


class VesselClassInfo(BaseModel):
    name: str
    dwt_k: int = Field(alias="dwtK")
    max_draft_m: float = Field(alias="maxDraftM")
    typical_speed_kn: float = Field(alias="typicalSpeedKn")
    daily_fuel_mt: float = Field(alias="dailyFuelMt")

    model_config = {"populate_by_name": True}


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float = Field(alias="uptimeSeconds")
    model_loaded: bool = Field(alias="modelLoaded")

    model_config = {"populate_by_name": True}
