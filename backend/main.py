"""
FreightIQ — FastAPI Application Entry Point
Smart India Hackathon 2026 • PS-26006

Run with:
    python -m uvicorn backend.main:app --reload --port 8000

Or from backend/ directory:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations
import time
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.routers import dashboard, forecast, ports, decision, routes, planner

# ─────────────────────────────────────────────────────────────────────────────
# App Init
# ─────────────────────────────────────────────────────────────────────────────

_START_TIME = time.time()

app = FastAPI(
    title="FreightIQ API",
    description=(
        "AI-powered freight rate prediction and port risk intelligence API. "
        "Smart India Hackathon 2026 — PS-26006. "
        "Provides LSTM-based rate forecasts, multi-factor booking decisions, "
        "and real-time port constraint data for Indian maritime routes."
    ),
    version="3.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "FreightIQ Team",
        "url": "https://github.com/freightiq-sih2026",
    },
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS — allow the React dev server and any production domains
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",    # CRA / Next.js dev
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        # Add your production domain here:
        # "https://freightiq.yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Register Routers
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(dashboard.router)
app.include_router(forecast.router)
app.include_router(ports.router)
app.include_router(decision.router)
app.include_router(routes.router)
app.include_router(planner.router)

# ─────────────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/health",
    tags=["System"],
    summary="API health check",
    description="Returns service status, version, uptime, and model load state.",
)
async def health_check() -> dict:
    return {
        "status": "healthy",
        "version": "3.2.0",
        "uptimeSeconds": round(time.time() - _START_TIME, 1),
        "modelLoaded": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "endpoints": {
            "dashboard": "/api/dashboard",
            "forecast": "/api/forecast",
            "ports": "/api/ports",
            "decision": "/api/decision",
            "routes": "/api/routes",
            "planner": "/api/planner",
            "vesselClasses": "/api/vessel-classes",
            "docs": "/docs",
        },
    }


@app.get("/", tags=["System"], include_in_schema=False)
async def root() -> dict:
    return {
        "service": "FreightIQ API",
        "version": "3.2.0",
        "docs": "/docs",
        "health": "/health",
    }
