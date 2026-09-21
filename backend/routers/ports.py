"""
FreightIQ — GET /api/ports
Returns PortConstraint[] for all monitored Indian ports.
Optionally filter by vessel class for vessel-specific draft compliance.
"""

from fastapi import APIRouter, Query

from backend.data.port_data import get_port_constraints, get_port_by_id, VESSEL_DRAFT_SPECS

router = APIRouter(prefix="/api", tags=["Ports"])


@router.get(
    "/ports",
    summary="Port constraint data",
    description=(
        "Returns live-computed port constraints for all monitored Indian ports, "
        "including draft limits, vessel fit status, congestion alerts, and risk levels. "
        "Pass a vessel class to get vessel-specific draft compliance."
    ),
)
async def get_ports(
    vessel: str = Query(default="Supramax (52K DWT)", description="Vessel class for draft compliance check"),
) -> list[dict]:
    if vessel not in VESSEL_DRAFT_SPECS:
        vessel = "Supramax (52K DWT)"
    return get_port_constraints(vessel)


@router.get(
    "/ports/{port_id}",
    summary="Single port detail",
    description="Returns static registry data for a single port by its ID.",
)
async def get_port_detail(port_id: str) -> dict:
    port = get_port_by_id(port_id)
    if not port:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Port '{port_id}' not found")
    return port
