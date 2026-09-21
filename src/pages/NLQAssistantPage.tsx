/* ─── FreightIQ — Natural Language Chartering Assistant Page ─── */

import React, { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";

const API_BASE = "http://localhost:8000";

interface ToolStep {
  tool: string;
  args: Record<string, any>;
  result: Record<string, any>;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  confidenceScore?: number;
  sources?: string[];
  intermediateSteps?: ToolStep[];
  error?: boolean;
}

interface HealthStatus {
  status: "ok" | "awaiting_api_key" | "error";
  openai_configured: boolean;
  vector_store_backend: string;
  model: string;
  agent_ready: boolean;
}

const SAMPLE_PROMPTS = [
  "What is the 4-week freight rate forecast for Capesize on Vizag to Yokohama?",
  "Check draft compliance for a vessel with 14.5m draft at Paradip port.",
  "Are there any severe congestion alerts or demurrage risks at Paradip or Vizag?",
  "What are the CVC guidelines regarding private charter negotiations?",
];

export function NLQAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Welcome to the FreightIQ Natural Language Chartering Interface. I am your GPT-4o-powered assistant trained on historical freight rates, port authority circulars (Paradip, Vizag, Haldia, Dhamra), vessel specifications, and CVC chartering guidelines. How can I assist your chartering operations today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch NLQ health status on load
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/chat/health`)
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch(() =>
        setHealth({
          status: "error",
          openai_configured: false,
          vector_store_backend: "faiss",
          model: "gpt-4o",
          agent_ready: false,
        })
      );
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorDetail = typeof data.detail === "object" ? data.detail.message || JSON.stringify(data.detail) : data.detail;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-err-${Date.now()}`,
            sender: "assistant",
            text: `⚠️ **Service Notice:** ${errorDetail || "Unable to complete request."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            error: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: "assistant",
            text: data.answer,
            confidenceScore: data.confidence_score,
            sources: data.sources,
            intermediateSteps: data.intermediate_steps,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-err-${Date.now()}`,
          sender: "assistant",
          text: `⚠️ **Network Error:** Could not connect to FreightIQ NLQ backend at ${API_BASE}. Ensure the backend server is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* ── Top Header ── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06] bg-neutral-950/80 backdrop-blur-md shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white">Natural Language Query Assistant</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              GPT-4o + Hybrid RAG
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Intelligent freight forecasting & vessel chartering query interface for East Coast India ports
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/[0.08] text-xs font-mono">
            <span className="text-neutral-500">Vector Store:</span>
            <span className="text-cyan-400 font-semibold uppercase">{health?.vector_store_backend || "FAISS"}</span>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
              health?.openai_configured
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                health?.openai_configured ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
              )}
            />
            <span>{health?.openai_configured ? "GPT-4o Engine Online" : "Awaiting OPENAI_API_KEY"}</span>
          </div>
        </div>
      </header>

      {/* ── API Key Banner Notice (If Key is Missing) ── */}
      {health && !health.openai_configured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-3 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>OpenAI API Key Not Detected:</strong> Backend is running in standby mode. Add your <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-200 font-mono">OPENAI_API_KEY</code> in <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-200 font-mono">backend/.env</code> to enable live GPT-4o synthesis.
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-400/70">Endpoint: POST /api/v1/chat/query</span>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-4 max-w-4xl",
              msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold",
                msg.sender === "user"
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                  : msg.error
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-neutral-900 text-cyan-400 border-white/[0.1]"
              )}
            >
              {msg.sender === "user" ? "YOU" : "GPT"}
            </div>

            {/* Bubble */}
            <div className="space-y-2 max-w-2xl">
              <div
                className={cn(
                  "p-4 rounded-2xl border text-sm leading-relaxed whitespace-pre-line shadow-sm",
                  msg.sender === "user"
                    ? "bg-cyan-600/15 text-cyan-50 border-cyan-500/30 rounded-tr-none"
                    : msg.error
                    ? "bg-amber-950/30 text-amber-200 border-amber-500/30 rounded-tl-none"
                    : "bg-neutral-900/90 text-neutral-200 border-white/[0.08] rounded-tl-none"
                )}
              >
                {msg.text}
              </div>

              {/* Tool Execution Cards */}
              {msg.intermediateSteps && msg.intermediateSteps.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Executed Intelligence Tools ({msg.intermediateSteps.length}):</p>
                  {msg.intermediateSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-neutral-950/80 border border-cyan-500/20 text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between text-cyan-400">
                        <span className="font-semibold">🛠️ {step.tool}</span>
                        <span className="text-[10px] text-neutral-500">Structured Data Tool</span>
                      </div>
                      <p className="text-neutral-400 text-[11px]">Inputs: {JSON.stringify(step.args)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Source Attribution & Confidence */}
              {(msg.sources?.length || msg.confidenceScore) && (
                <div className="flex items-center justify-between gap-4 pt-1 text-[11px] text-neutral-500 font-mono">
                  {msg.sources && msg.sources.length > 0 && (
                    <span className="truncate">
                      📚 Sources: {msg.sources.join(" | ")}
                    </span>
                  )}
                  {msg.confidenceScore !== undefined && (
                    <span className="shrink-0 text-cyan-400/90">
                      🎯 Confidence: {(msg.confidenceScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              )}

              <span className="text-[10px] text-neutral-600 block">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-4 max-w-4xl mr-auto">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-neutral-900 text-cyan-400 border border-white/[0.1] text-xs font-bold animate-pulse">
              GPT
            </div>
            <div className="p-4 rounded-2xl bg-neutral-900/90 border border-white/[0.08] text-sm text-neutral-400 flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              Executing hybrid RAG retrieval & function calling...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggested Prompts ── */}
      <div className="px-8 py-3 border-t border-white/[0.04] bg-neutral-950/50 shrink-0">
        <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">Suggested Chartering Queries:</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/[0.06] hover:border-cyan-500/30 transition-all shrink-0 text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Query Input Box ── */}
      <div className="p-6 border-t border-white/[0.06] bg-neutral-950 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-3 max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything (e.g. 'What is the freight rate forecast for Capesize from Vizag to Yokohama?')"
            disabled={loading}
            className="flex-1 bg-neutral-900/90 border border-white/[0.1] focus:border-cyan-500/50 text-white rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-neutral-600"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className={cn(
              "px-6 py-3.5 rounded-2xl font-medium text-sm transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-cyan-500/10",
              loading || !inputQuery.trim()
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/[0.05]"
                : "bg-cyan-500 text-neutral-950 font-semibold hover:bg-cyan-400 active:scale-95"
            )}
          >
            <span>Ask GPT-4o</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
