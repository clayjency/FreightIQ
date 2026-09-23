/* ─── FreightIQ App Layout — with sidebar + React Router ─── */

import React from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { cn } from "./lib/utils";
import { FreightIQDashboard } from "./FreightIQDashboard";
import { RoutePlannerPage } from "./pages/RoutePlannerPage";
import { PortIntelligencePage } from "./pages/PortIntelligencePage";
import { ForecastPage } from "./pages/ForecastPage";
import { NLQAssistantPage } from "./pages/NLQAssistantPage";
import { ContractComparisonPage } from "./pages/ContractComparisonPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LandingPage } from "./pages/LandingPage";
import { Outlet } from "react-router-dom";

/* ═══ Nav Items ═══ */
const NAV_ITEMS = [
  {
    path: "/dashboard",
    end: true,
    label: "Dashboard",
    sublabel: "Overview",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: "/chat",
    end: false,
    label: "AI Assistant",
    sublabel: "Natural Language Query",
    icon: (
      <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    path: "/planner",
    end: false,
    label: "Route Planner",
    sublabel: "Price Calendar",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    path: "/ports",
    end: false,
    label: "Port Intelligence",
    sublabel: "Constraints & Risk",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    path: "/forecast",
    end: false,
    label: "Rate Forecast",
    sublabel: "P10 / P50 / P90",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    path: "/contracts",
    end: false,
    label: "Contracts",
    sublabel: "Spot / COA / TC",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

/* ═══ Sidebar ═══ */
function Sidebar() {
  const location = useLocation();
  const { logout, username } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[220px] flex flex-col border-r border-white/[0.05] bg-neutral-950">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.04]">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-cyan-500/5 border border-cyan-500/20 shrink-0">
          <svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight">Freight<span className="text-cyan-400">IQ</span></p>
          <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">SIH-2026</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 px-3 mb-3">Navigation</p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group",
                isActive
                  ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04] border border-transparent"
              )
            }
          >
            <span className="shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none truncate">{item.label}</p>
              <p className="text-[10px] text-neutral-600 mt-0.5 truncate">{item.sublabel}</p>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-600 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>API: localhost:8000</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-300 font-medium truncate max-w-[120px]">{username}</p>
            <p className="text-[9px] text-neutral-700">v3.2.0</p>
          </div>
          <button 
            onClick={logout}
            className="text-[10px] text-neutral-400 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ═══ Protected Layout ═══ */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-neutral-950">
        <Sidebar />
        <main className="flex-1 ml-[220px] min-h-screen">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

/* ═══ Main App ═══ */
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<FreightIQDashboard />} />
            <Route path="/chat" element={<NLQAssistantPage />} />
            <Route path="/planner" element={<RoutePlannerPage />} />
            <Route path="/ports" element={<PortIntelligencePage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/contracts" element={<ContractComparisonPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
