# FreightIQ

**Smart India Hackathon 2026 • PS-26006**

[![Video Prototype](https://img.shields.io/badge/YouTube-Video_Prototype-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/v5jnSZUUc8Y?si=ZdDVaeHJ4yzKyeDn)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Source_Code-181717?style=for-the-badge&logo=github)](https://github.com/clayjency/FreightIQ.git)

FreightIQ is a maritime intelligence dashboard built to help optimize shipping and freight decisions. By bringing together real-time data insights, freight rate forecasting, port congestion tracking, and a Natural Language Querying (NLQ) interface, the platform gives operators the tools they need to make informed, data-driven booking choices.

### Watch the Demo
[Click here to watch the full prototype demo on YouTube](https://youtu.be/v5jnSZUUc8Y?si=ZdDVaeHJ4yzKyeDn)

## Key Features

- **Maritime Intelligence Dashboard**: A centralized view of global freight operations, helping users spot trends and track routes easily.
- **Freight Rate Forecasting**: We currently use a Geometric Brownian Motion simulator to predict future spot rates, but the architecture is built to easily plug in a production-ready PyTorch LSTM model.
- **Port Congestion Tracking**: Live monitoring of port constraints like draft, speed, and fuel, alongside congestion metrics.
- **Booking Decision Engine**: A 5-factor scoring system that evaluates mean reversion, momentum, volatility, forward curve shape, and structural trend bias to recommend whether to book now or wait.
- **Natural Language Querying (NLQ)**: An integrated AI assistant powered by LangChain and Google Gemini. Users can ask plain English questions about maritime documents, current rates, and routes.
- **Secure Authentication**: Standard user authentication with secure password hashing.

## Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 and Framer Motion for smooth animations
- **Data Visualization**: Recharts for graphs, React Leaflet for interactive maps
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (using raw SQL stored locally in `freightiq_data.db`)
- **AI/ML & NLQ**: 
  - LangChain & Google Gemini for the chat interface
  - Scikit-learn, Pandas, NumPy for data handling
  - FAISS for vector storage
- **Security**: python-jose, passlib, bcrypt

## Project Structure

```text
FreightIQ/
├── backend/                  # FastAPI Application
│   ├── main.py               # Entry point and routing hub
│   ├── auth.py               # Authentication and token generation
│   ├── database.py           # SQLite connection and schema setup
│   ├── models/               # Pydantic models and ML logic
│   ├── nlq/                  # LangChain + Gemini agents and vector store
│   ├── routers/              # API routes (dashboard, forecast, etc.)
│   └── data/                 # Mocked/simulated data generation
├── src/                      # React Frontend Application
│   ├── components/           # Reusable UI components
│   ├── pages/                # Main application pages
│   └── ...                   
├── public/                   # Static assets
├── package.json              # Frontend dependencies
└── BACKEND_ARCHITECTURE.md   # Detailed backend documentation
```

## Getting Started

### Prerequisites

- Node.js: v18 or higher
- Python: v3.9 or higher

### 1. Backend Setup

First, navigate to the `backend` directory and set up a virtual environment:

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Next, set up your environment variables. Copy the example file and add your keys (you will specifically need a `GEMINI_API_KEY` for the NLQ module):

```bash
cp .env.example .env
```

Start the backend server:

```bash
# Run from the project root or backend directory
python -m uvicorn backend.main:app --reload --port 8000
```
- API Docs (Swagger UI): http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 2. Frontend Setup

Open a new terminal, stay in the root `FreightIQ` directory, and install the frontend dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```
The application will be available at http://localhost:5173 (or the port Vite provides).

## How to Use the App

1. **Authentication:** Log in to the dashboard using your credentials.
2. **Dashboard Overview:** Look around the main dashboard to get a high-level summary of global freight operations, active vessels, and current spot rates.
3. **Route Analysis:** Pick an origin and destination to see real-time port congestion and check vessel compatibility.
4. **Rate Forecasting:** View the forecast charts for your chosen route to analyze historical trends and future predictions.
5. **Decision Engine:** Check the 5-factor decision scorer for a clear "Book Now" or "Wait Mode" recommendation.
6. **NLQ Assistant:** Use the chat assistant to ask questions like "What is the forecast for Haldia to Shanghai next week?" or "Summarize the latest Baltic Exchange report."

## ML Architecture & Data Sources

Right now, the app uses a Geometric Brownian Motion (GBM) simulator to generate mock freight rates and port congestion data for demonstration purposes. However, the architecture is specifically designed so that a trained PyTorch LSTM model can be swapped in without friction.

To do this, you just need to replace the simulation logic in `backend/models/ml_engine.py` with your PyTorch `.pt` model inference pipeline.

### Production Data Integration Plan:
| Data Category | Current Simulated Source | Planned Production Source |
|---------------|--------------------------|-----------------------------|
| Freight Rates | GBM Simulator            | Baltic Exchange API / Platts |
| Port Congestion | Seeded Random Data     | MarineTraffic AIS / Kpler    |
| Vessel Specs  | Static Local Tables      | IHS Markit / Clarksons       |

## Database Considerations

We are currently using SQLite for rapid prototyping and local testing. The database (`freightiq_data.db`) initializes automatically when the server starts.

For production, we highly recommend migrating from SQLite to a more robust database. Depending on how the data model evolves, we plan to move to PostgreSQL + SQLAlchemy for relational data, or MongoDB if we need more flexibility for unstructured data like IoT tracking and NLP logs.

You can read more about this in our [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) document.

## Future Scope & Roadmap

Moving past the current prototype, here is what we plan to implement for a full release:

1. **Live Data APIs**: Replacing simulated data with live feeds from the Baltic Exchange and MarineTraffic.
2. **Deep Learning Models**: Deploying our custom PyTorch LSTM models for more accurate rate forecasting.
3. **Weather Integrations**: Adding real-time weather overlays to adjust congestion and delay predictions dynamically.
4. **Automated Alerts**: Setting up email and SMS notifications for sudden rate drops or severe port congestion.
5. **Database Migration**: Fully transitioning to a distributed MongoDB or PostgreSQL cluster.

## Team & Contributors

- **Harsh Saini** - Full Stack Developer & Project Lead
- **Yasharth Soubhari** - Backend Developer (FastAPI) & Database Architect
- **Shivam Gupta** - Frontend Developer (React/Vite) & UI/UX Designer
- **Shreyansh Singh** - Machine Learning Engineer (Rate Forecasting)
- **Kunal Chobdar** - AI Integration Specialist (LangChain & Gemini)
- **Saanvi Tyagi** - Data Analyst & QA Engineer

---
*Built for Smart India Hackathon 2026*
