import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ship, Anchor, BarChart3, MessageSquareText, Navigation } from 'lucide-react';
import { cn } from '../lib/utils';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      title: "AI Assistant",
      description: "Ask natural language questions about routes, rates, and port intelligence and get instant, context-aware answers.",
      icon: <MessageSquareText className="h-6 w-6 text-cyan-400" />,
      color: "from-cyan-500/20 to-cyan-500/5",
      border: "border-cyan-500/20"
    },
    {
      title: "Route Planner",
      description: "Optimize your maritime routes with our smart price calendar and compare costs across different vessel classes.",
      icon: <Navigation className="h-6 w-6 text-purple-400" />,
      color: "from-purple-500/20 to-purple-500/5",
      border: "border-purple-500/20"
    },
    {
      title: "Port Intelligence",
      description: "Real-time tracking of port constraints, congestion alerts, wait times, and risk levels across global hubs.",
      icon: <Anchor className="h-6 w-6 text-amber-400" />,
      color: "from-amber-500/20 to-amber-500/5",
      border: "border-amber-500/20"
    },
    {
      title: "Rate Forecast",
      description: "P10, P50, and P90 predictive models for freight rates. Make data-driven booking decisions with high confidence.",
      icon: <BarChart3 className="h-6 w-6 text-emerald-400" />,
      color: "from-emerald-500/20 to-emerald-500/5",
      border: "border-emerald-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col font-sans text-neutral-200 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* ── Background Effects ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-50 border-b border-white/[0.04] bg-neutral-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
              <Ship className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Freight<span className="text-cyan-400">IQ</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                Go to Dashboard &rarr;
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
                  Log in
                </Link>
                <Link to="/register" className="text-sm font-semibold px-4 py-2 bg-white text-neutral-950 rounded-lg hover:bg-neutral-200 transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold tracking-wide uppercase mb-8 shadow-lg shadow-cyan-500/10">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          Smart India Hackathon 2026
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Next-Generation <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
            Maritime Intelligence
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-10 leading-relaxed">
          AI-powered freight rate predictions, dynamic route planning, and real-time port constraint analytics tailored for the modern shipping industry.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {isAuthenticated ? (
            <Link to="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:-translate-y-0.5">
              Launch Dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:-translate-y-0.5">
                Get Started for Free
              </Link>
              <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all">
                Sign In
              </Link>
            </>
          )}
        </div>
      </main>

      {/* ── Features Section ── */}
      <section className="relative z-10 px-6 pb-24 border-t border-white/[0.02] bg-neutral-950/50">
        <div className="max-w-7xl mx-auto pt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Powerful tools for smart decisions</h2>
            <p className="text-neutral-500 max-w-2xl mx-auto">
              Equip your fleet operations with state-of-the-art predictive models, NLP-driven insights, and live constraint monitoring.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => (
              <div key={idx} className="group relative rounded-3xl border border-white/[0.05] bg-neutral-900/40 p-6 hover:bg-neutral-900/80 transition-all duration-300 hover:border-white/[0.1]">
                <div className={cn("inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br border mb-6", feat.color, feat.border)}>
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.04] bg-neutral-950 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-600">
            &copy; 2026 FreightIQ Team. All rights reserved.
          </p>
          <p className="text-xs font-mono text-neutral-500">
            Smart India Hackathon 2026 &middot; PS-26006
          </p>
        </div>
      </footer>
    </div>
  );
};
