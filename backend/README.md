# FreightIQ — Backend API

**Smart India Hackathon 2026 • PS-26006**

Production-ready FastAPI backend for the FreightIQ maritime intelligence dashboard.

---

## Quick Start

```bash
# From the project root (SIHHHH!!!!)
python -m uvicorn backend.main:app --reload --port 8000
```

Then open:
- **API Docs (Swagger UI):** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health
- **Dashboard endpoint:** http://localhost:8000/api/dashboard

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health + uptime |
| `GET` | `/api/dashboard` | Full `DashboardState` (primary frontend endpoint) |
| `GET` | `/api/forecast` | `ForecastPoint[]` chart data |
| `GET` | `/api/ports` | `PortConstraint[]` with live congestion |
| `GET` | `/api/decision` | Booking signal + confidence + reasoning |
| `GET` | `/api/routes` | All routes with current spot rates |
| `GET` | `/api/vessel-classes` | Vessel specs (DWT, draft, speed, fuel) |

### Query Parameters

**`/api/dashboard`**
```
?route=Paradip → Rotterdam
&vessel=Supramax (52K DWT)
```

**`/api/forecast`**
```
?route=Haldia → Shanghai
&vessel=Panamax (75K DWT)
&history_weeks=12
&forecast_weeks=8
```

---

## Connecting the React Frontend

In `FreightIQDashboard.tsx`, replace `fetchDashboardData()` with:

```typescript
const API_BASE = "http://localhost:8000";

async function fetchDashboardData(
  route = "Paradip → Rotterdam",
  vessel = "Supramax (52K DWT)"
): Promise<DashboardState> {
  const params = new URLSearchParams({ route, vessel });
  const res = await fetch(`${API_BASE}/api/dashboard?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

---

## ML Architecture

```
fetchDashboardData()
    └── get_full_dashboard_data(route, vessel)
            ├── get_current_spot()         → GBM-seeded spot rate
            ├── predict_signal()           → 5-factor decision scorer
            │       ├── Mean reversion signal
            │       ├── Momentum (WoW pct change)
            │       ├── Volatility regime
            │       ├── Forward curve shape (contango / backwardation)
            │       └── Structural trend bias
            ├── generate_forecast_chart()  → GBM fan P10/P50/P90
            ├── get_port_constraints()     → Draft compliance + congestion
            └── compute_volatility_index() → VIX-style index
```

### Swapping in a Real LSTM

In `backend/models/ml_engine.py`, replace the body of `predict_signal()`:

```python
def predict_signal(route: str, vessel: str) -> dict:
    # Load your trained model
    import torch
    model = torch.load("models/freight_lstm_v3.pt")
    model.eval()

    features = build_feature_vector(route, vessel)   # your preprocessing
    with torch.no_grad():
        output = model(features)

    signal = "Book Now" if output["signal_logit"] > 0.5 else "Wait Mode"
    confidence = int(output["confidence"] * 100)
    reasoning = decode_attention_weights(output["attention"])

    return {
        "signal": signal,
        "confidence": confidence,
        "reasoning": reasoning,
        "spotRate": output["spot_rate"],
        "breakeven": output["breakeven"],
        "expectedGainPct": output["expected_gain"],
    }
```

---

## Data Sources (Production Integration)

| Data | Simulated By | Production Replacement |
|------|-------------|----------------------|
| Freight rates | GBM simulator | Baltic Exchange API / Platts |
| Port congestion | Seeded random | MarineTraffic AIS / Kpler |
| Vessel specs | Static table | IHS Markit / Clarksons |

---

## Project Structure

```
backend/
├── main.py                  ← FastAPI app + CORS + router registration
├── requirements.txt
├── __init__.py
├── models/
│   ├── schemas.py           ← Pydantic v2 models (match TS interfaces)
│   └── ml_engine.py         ← Decision engine + GBM forecasts
├── data/
│   ├── port_data.py         ← Port registry + constraint computation
│   └── rate_simulator.py    ← GBM rate time-series generator
└── routers/
    ├── dashboard.py         ← GET /api/dashboard
    ├── forecast.py          ← GET /api/forecast
    ├── ports.py             ← GET /api/ports, /api/ports/{id}
    ├── decision.py          ← GET /api/decision
    └── routes.py            ← GET /api/routes, /api/vessel-classes
```
