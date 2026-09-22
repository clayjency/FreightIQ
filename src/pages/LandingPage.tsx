import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Navigation, Anchor, FileText, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);

  const features = [
    {
      title: "Route & Vessel Planning",
      description: "Analyze trade routes, calculate voyage duration, and optimize vessel assignment across bulk carrier classes.",
      icon: <Navigation className="h-4 w-4" />,
      tag: "Navigation",
      link: "/planner",
      image: "/card_route_planning.jpg",
    },
    {
      title: "Port Operational Intelligence",
      description: "Monitor real-time draft restrictions, berth waiting times, and congestion risk factors across global ports.",
      icon: <Anchor className="h-4 w-4" />,
      tag: "Ports",
      link: "/ports",
      image: "/card_port_intelligence.jpg",
    },
    {
      title: "Freight Rate Forecasting",
      description: "Statistical econometric forecasting models (P10, P50, P90) to inform spot and period booking decisions.",
      icon: <BarChart3 className="h-4 w-4" />,
      tag: "Forecasting",
      link: "/forecast",
      image: "/card_rate_forecasting.jpg",
    },
    {
      title: "Chartering Intelligence",
      description: "Data-driven chartering insights grounded in historical fixture data and port authority circulars.",
      icon: <FileText className="h-4 w-4" />,
      tag: "Chartering",
      link: "/chat",
      image: "/card_chartering_intelligence.jpg",
    },
  ];

  const visibleFeatures = features.slice(currentPage * 2, currentPage * 2 + 2);

  const handleNext = () => {
    setCurrentPage((prev) => (prev === 0 ? 1 : 0));
  };

  const handlePrev = () => {
    setCurrentPage((prev) => (prev === 0 ? 1 : 0));
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col font-sans text-neutral-400 selection:bg-neutral-800 selection:text-neutral-200">
      
      {/* ── Top Header Navigation ── */}
      <header className="relative z-50 border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4c29d]/10 border border-[#d4c29d]/25 shadow-sm shrink-0">
              <span className="text-[11px] font-black font-mono tracking-tight text-[#d4c29d] select-none">
                FIQ
              </span>
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Freight<span className="text-[#d4c29d]">IQ</span>
            </span>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <Link to="/planner" className="hover:text-white transition-colors">
              Route Planner
            </Link>
            <Link to="/ports" className="hover:text-white transition-colors">
              Port Intelligence
            </Link>
            <Link to="/forecast" className="hover:text-white transition-colors">
              Rate Forecast
            </Link>
            <Link to="/chat" className="hover:text-white transition-colors">
              Assistant
            </Link>
          </nav>

          {/* Auth CTA */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors"
              >
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-neutral-400 hover:text-neutral-200 px-3 py-1.5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium px-4 py-2 bg-neutral-100 text-neutral-950 rounded-lg hover:bg-white transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section (Seamlessly Fading into Page Background) ── */}
      <section className="relative min-h-[72vh] flex flex-col justify-center items-center text-center px-6 py-24 overflow-hidden">
        
        {/* Cargo Ship Background with Smooth Bottom Gradient Fade */}
        <div className="absolute inset-0 z-0">
          <img
            src="/cargo_ship_hero.jpg"
            alt="Commercial Cargo Ship"
            className="w-full h-full object-cover object-center filter brightness-[0.60] contrast-[1.05]"
          />
          {/* Smooth Dissolve into #09090b */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/55 to-[#09090b]/65" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090b] to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          
          {/* Subtle Enterprise Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-white/[0.08] bg-neutral-900/60 backdrop-blur-md text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
            Commercial Maritime Analytics &middot; PS-26006
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.15] mb-6 drop-shadow-md">
            Next-Generation Maritime Freight Intelligence
          </h1>

          <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mb-10 leading-relaxed font-normal drop-shadow">
            Predictive freight rate models, dynamic route planning, and real-time port constraint analytics tailored for commercial shipping operations.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-6 py-3 bg-neutral-100 hover:bg-white text-neutral-950 text-sm font-semibold rounded-lg transition-colors"
              >
                Open Dashboard &rarr;
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-6 py-3 bg-neutral-100 hover:bg-white text-neutral-950 text-sm font-semibold rounded-lg transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-6 py-3 bg-neutral-900/60 hover:bg-neutral-800 border border-white/[0.08] backdrop-blur-md text-neutral-200 text-sm font-medium rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── Capabilities Carousel Section (2-at-a-time with Next/Prev Arrow Controls) ── */}
      <section className="relative z-10 px-6 pt-6 pb-24 bg-[#09090b]">
        <div className="max-w-6xl mx-auto">
          
          {/* Header with Title and Next/Prev Arrow Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Platform Capabilities
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Showing {currentPage * 2 + 1}–{currentPage * 2 + 2} of {features.length} core operations modules
              </p>
            </div>

            {/* Slider Controls */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrev}
                  aria-label="Previous features"
                  className="h-8 w-8 rounded-lg border border-white/[0.08] bg-neutral-900/60 hover:bg-neutral-800 hover:border-white/[0.16] flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNext}
                  aria-label="Next features"
                  className="h-8 w-8 rounded-lg border border-white/[0.08] bg-neutral-900/60 hover:bg-neutral-800 hover:border-white/[0.16] flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Minimal Pagination Dots */}
              <div className="flex items-center gap-1.5 pl-1">
                <span className={cn("h-1.5 rounded-full transition-all duration-300", currentPage === 0 ? "w-5 bg-[#d4c29d]" : "w-1.5 bg-white/20")} />
                <span className={cn("h-1.5 rounded-full transition-all duration-300", currentPage === 1 ? "w-5 bg-[#d4c29d]" : "w-1.5 bg-white/20")} />
              </div>
            </div>
          </div>

          {/* Exactly 2 Cards Shown Side-by-Side with Photos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300">
            {visibleFeatures.map((feat) => (
              <Link
                key={feat.title}
                to={feat.link}
                className="group rounded-2xl border border-white/[0.08] bg-neutral-900/50 backdrop-blur-md overflow-hidden hover:border-white/[0.18] transition-all flex flex-col justify-between"
              >
                {/* Photo Top Container */}
                <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-neutral-950">
                  <img
                    src={feat.image}
                    alt={feat.title}
                    className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.05] group-hover:scale-105 group-hover:brightness-100 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-black/25" />
                  
                  {/* Subtle Floating Category Tag */}
                  <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-neutral-950/80 backdrop-blur-md border border-white/[0.1] text-[10px] font-mono uppercase tracking-widest text-neutral-300 shadow-lg">
                    {feat.icon}
                    <span>{feat.tag}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-white mb-2 group-hover:text-neutral-100 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                      {feat.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white transition-colors">
                    <span className="font-medium text-xs">Launch Module</span>
                    <span className="font-mono text-[#d4c29d] group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#09090b] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#d4c29d]/10 border border-[#d4c29d]/25 text-[9px] font-mono font-black text-[#d4c29d] select-none">
              FIQ
            </div>
            <span className="font-medium text-neutral-300">Freight<span className="text-[#d4c29d]">IQ</span></span>
            <span className="text-neutral-600">&middot;</span>
            <span>&copy; 2026 FreightIQ. All rights reserved.</span>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
            SMART INDIA HACKATHON 2026 &middot; PS-26006
          </p>
        </div>
      </footer>
    </div>
  );
};



