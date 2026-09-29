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
    <div className="flex flex-col h-screen bg-[#0B0D0F] text-[#9AA3AA] overflow-hidden">
      {/* ── Top Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-[#252A2E] bg-[#111417] shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F3F4]">Freight Intelligence Assistant</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#9AA3AA]">
            Natural-language access to freight rates, port conditions, vessel constraints & chartering intelligence.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[#171B1F] border border-[#252A2E] text-[#9AA3AA]">
            <span className="text-[#68727A]">Engine:</span>
            <span className="text-[#F1F3F4] font-medium">GPT-4o + Hybrid RAG</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[#171B1F] border border-[#252A2E] text-[#9AA3AA]">
            <span className="text-[#68727A]">Vector Store:</span>
            <span className="text-[#F1F3F4] font-medium uppercase">{health?.vector_store_backend || "FAISS"}</span>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-sm border text-xs font-medium transition-all",
              health?.openai_configured
                ? "bg-[#171B1F] text-[#22A06B] border-[#252A2E]"
                : "bg-[#D99A24]/10 text-[#D99A24] border-[#D99A24]/30"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                health?.openai_configured ? "bg-[#22A06B]" : "bg-[#D99A24] animate-pulse"
              )}
            />
            <span>{health?.openai_configured ? "OpenAI Connected" : "Awaiting API Key"}</span>
          </div>
        </div>
      </header>

      {/* ── API Key Banner Notice (If Key is Missing) ── */}
      {health && !health.openai_configured && (
        <div className="bg-[#D99A24]/10 border-b border-[#D99A24]/20 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-[#D99A24] shrink-0">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong className="font-semibold text-[#D99A24]">OpenAI API Key Not Detected:</strong> Backend is running in standby mode. Add your <code className="bg-[#D99A24]/20 border border-[#D99A24]/30 px-1 py-0.5 rounded text-[#D99A24] font-mono mx-0.5">OPENAI_API_KEY</code> in <code className="bg-[#D99A24]/20 border border-[#D99A24]/30 px-1 py-0.5 rounded text-[#D99A24] font-mono mx-0.5">backend/.env</code> to enable live GPT-4o synthesis.
            </span>
          </div>
          <span className="text-[10px] font-mono opacity-80 hidden sm:block">Endpoint: POST /api/v1/chat/query</span>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 overflow-hidden flex justify-center p-4 sm:p-6">
        <div className="w-full max-w-5xl bg-[#111417] border border-[#252A2E] rounded-lg shadow-sm flex flex-col h-full overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.map((msg) => {
              if (msg.id === "welcome-1") {
                return (
                  <div key={msg.id} className="pb-1">
                    <div className="mb-3">
                      <h2 className="text-lg font-bold text-[#F1F3F4] mb-1.5">FreightIQ Intelligence Assistant</h2>
                      <p className="text-sm text-[#9AA3AA] max-w-2xl leading-relaxed">
                        I am your GPT-4o-powered assistant trained on historical freight rates, port authority circulars (Paradip, Vizag, Haldia, Dhamra), vessel specifications, and CVC chartering guidelines.
                      </p>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-semibold text-[#F1F3F4] mb-1.5">Ask questions about:</p>
                      <ul className="text-sm text-[#9AA3AA] space-y-1 list-disc list-inside marker:text-[#3A4147]">
                        <li>Freight rate forecasts</li>
                        <li>Port congestion & constraints</li>
                        <li>Vessel draft compliance</li>
                        <li>Chartering conditions</li>
                      </ul>
                    </div>

                    {messages.length === 1 && (
                      <div className="mt-4 pt-3 border-t border-[#252A2E]">
                        <p className="text-xs font-semibold text-[#68727A] uppercase tracking-wider mb-2.5">Suggested Queries</p>
                        <div className="flex flex-wrap gap-2">
                          {SAMPLE_PROMPTS.map((prompt, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(prompt)}
                              disabled={loading}
                              className="text-xs bg-[#171B1F] hover:bg-[#1E2328] text-[#9AA3AA] hover:text-[#F1F3F4] px-3.5 py-2 rounded-md border border-[#252A2E] hover:border-[#3A4147] transition-colors text-left"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1.5 max-w-3xl",
                    msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {/* Sender Name / Timestamp */}
                  <div className="flex items-center gap-2 text-[10px] text-[#68727A] px-1">
                    {msg.sender === "assistant" && <span className="font-semibold text-[#19A7CE]">FREIGHTIQ ASSISTANT</span>}
                    {msg.sender === "assistant" && <span>•</span>}
                    <span>{msg.timestamp}</span>
                    {msg.sender === "user" && <span>•</span>}
                    {msg.sender === "user" && <span className="font-semibold text-[#F1F3F4]">YOU</span>}
                  </div>

                  {/* Message Body */}
                  <div
                    className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap shadow-sm break-words",
                      msg.sender === "user"
                        ? "bg-[#171B1F] text-[#F1F3F4] border border-[#252A2E] px-4 py-3 rounded-md max-w-full"
                        : msg.error
                        ? "bg-[#D94A4A]/10 text-[#D94A4A] border-l-2 border-[#D94A4A] px-4 py-3 max-w-full"
                        : "text-[#F1F3F4] border-l-2 border-[#19A7CE] pl-4 py-1 max-w-full"
                    )}
                  >
                    {msg.text}

                    {/* Tool Execution Cards */}
                    {msg.intermediateSteps && msg.intermediateSteps.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#68727A]">Intelligence Tools Utilized ({msg.intermediateSteps.length}):</p>
                        {msg.intermediateSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-md bg-[#171B1F] border border-[#252A2E] text-xs font-mono space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[#19A7CE]">
                              <span className="font-semibold">🛠️ {step.tool}</span>
                            </div>
                            <p className="text-[#9AA3AA] text-[11px] truncate">Inputs: {JSON.stringify(step.args)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Source Attribution & Confidence */}
                    {(msg.sources?.length || msg.confidenceScore) && (
                      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-[#252A2E] text-[10px] text-[#68727A] font-mono">
                        {msg.sources && msg.sources.length > 0 && (
                          <span className="truncate max-w-[400px]">
                            📚 Sources: {msg.sources.join(" | ")}
                          </span>
                        )}
                        {msg.confidenceScore !== undefined && (
                          <span className="shrink-0 text-[#19A7CE]">
                            🎯 Confidence: {(msg.confidenceScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex flex-col gap-1.5 max-w-3xl mr-auto items-start">
                <div className="flex items-center gap-2 text-[10px] text-[#68727A] px-1">
                  <span className="font-semibold text-[#19A7CE]">FREIGHTIQ ASSISTANT</span>
                </div>
                <div className="border-l-2 border-[#19A7CE] pl-4 py-2 text-sm text-[#9AA3AA] flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#19A7CE] animate-ping" />
                  Compiling intelligence report...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ── */}
          <div className="p-4 sm:p-6 border-t border-[#252A2E] bg-[#111417]">
            <label className="block text-xs font-semibold text-[#F1F3F4] uppercase tracking-widest mb-3">
              Ask FreightIQ
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="What is the freight rate forecast for Capesize from Vizag to Yokohama?"
                disabled={loading}
                className="flex-1 bg-[#171B1F] border border-[#252A2E] focus:border-[#19A7CE] text-[#F1F3F4] rounded-md px-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#19A7CE]/20 transition-all placeholder:text-[#68727A]"
              />
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className={cn(
                  "px-6 py-3.5 rounded-md font-semibold text-sm transition-colors flex items-center gap-2 shrink-0 border",
                  loading || !inputQuery.trim()
                    ? "bg-[#171B1F] text-[#68727A] cursor-not-allowed border-[#252A2E]"
                    : "bg-[#19A7CE] text-[#0B0D0F] border-[#19A7CE] hover:bg-[#1694b8] hover:border-[#1694b8] shadow-sm"
                )}
              >
                <span>Ask &rarr;</span>
              </button>
            </form>
            <div className="mt-4 text-center flex flex-wrap items-center justify-center gap-2 text-[10px] text-[#68727A]">
              <span>Freight rates</span>
              <span className="hidden sm:inline">•</span>
              <span>Port intelligence</span>
              <span className="hidden sm:inline">•</span>
              <span>Vessel constraints</span>
              <span className="hidden sm:inline">•</span>
              <span>Chartering</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
