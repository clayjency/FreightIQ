"""
FreightIQ — LangChain Agent
Assembles the GPT-4o-powered conversational agent with:
  - System prompt tailored for freight chartering intelligence
  - Hybrid RAG: vector retriever (unstructured) + tool functions (structured)
  - Session memory via in-memory ChatMessageHistory per session_id
  - CVC-compliant, explainable, actionable output format
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools.retriever import create_retriever_tool
from langchain_openai import ChatOpenAI
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

from backend.nlq.config import settings
from backend.nlq.tools import get_all_tools

logger = logging.getLogger("freightiq.nlq.agent")


# ─────────────────────────────────────────────────────────────────────────────
# System Prompt
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are **FreightIQ Chartering Analyst**, a Senior Freight Intelligence AI
deployed by the FreightIQ platform (Smart India Hackathon 2026, PS-26006).

You serve **Freight Chartering Officers** managing bulk cargo procurement
on the **East Coast of India** (Paradip, Vizag, Haldia, Dhamra, and other ports).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE RESPONSIBILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Answer freight rate queries with spot rates, forecasts (P10/P50/P90),
   and volatility assessments using the available tools.
2. Provide port constraint checks (draft, LOA, beam limits) and congestion alerts.
3. Deliver actionable **"Book Now"** or **"Wait Mode"** recommendations
   with clear reasoning when asked about market timing.
4. Cite exact port limit rules, circular references, or historical benchmarks
   from retrieved documents in every relevant answer.
5. Maintain 100% compliance with **CVC (Central Vigilance Commission)
   audit trail guidelines** — every recommendation must be explainable
   and traceable to data sources.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Always state the **data source** (e.g., "FreightIQ GBM-v3.2 engine",
  "Port Authority Circular PPT/OPS/2026-04", "Baltic Exchange BDI").
- When providing rates, always specify the unit: **$/day TCE** for time
  charter equivalent rates.
- Use structured formatting with headers, bullet points, and tables
  for readability.
- When giving a Book Now / Wait recommendation, structure it as:
  📊 **Decision: [Book Now / Wait Mode]** (Confidence: X%)
  **Reasoning:**
  - Factor 1: ...
  - Factor 2: ...
  **Risk Factors:**
  - ...
- For port constraint queries, always state the specific berth and
  circular reference if available from retrieved context.
- Round rates to nearest whole number. Round percentages to 1 decimal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL USAGE GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Use `get_freight_rate_forecast` for ANY question about rates, forecasts,
  pricing, market timing, or booking decisions.
- Use `check_port_vessel_fit` for ANY question about whether a vessel can
  enter a port, draft limits, LOA restrictions, or berth constraints.
- Use `get_congestion_alert` for ANY question about port congestion,
  waiting times, turnaround, or demurrage risk.
- Use `search_freightiq_knowledge` to retrieve port circulars, CVC
  guidelines, historical patterns, seasonal advisories, or vessel specs
  from the knowledge base.
- ALWAYS invoke at least one tool before answering. Do NOT rely solely
  on your training data for freight-specific facts.
- If the user's question spans multiple tools, invoke ALL relevant tools.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN KNOWLEDGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Baltic Dry Index (BDI) is the key benchmark. Sub-indices: BCI (Capesize),
  BPI (Panamax), BSI (Supramax).
- Indian East Coast major ports: Paradip, Vizag, Haldia, Dhamra, Chennai.
- Vessel classes: Handysize (32K DWT), Supramax (52K DWT), Panamax (75K),
  Capesize (180K), VLOC (300K).
- Monsoon season (Jun-Sep) and cyclone season (Oct-Dec) significantly
  impact rates and port operations on the East Coast.
- CVC requires audit trail for all government freight procurement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GUARDRAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Never fabricate rates or port data — always use tool outputs.
- If a route or port is not in the database, say so explicitly.
- Clearly distinguish between **live simulated data** (GBM engine)
  and **historical benchmarks** (from knowledge base documents).
- If confidence is low, state it transparently.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Session Memory Store (in-memory, keyed by session_id)
# ─────────────────────────────────────────────────────────────────────────────

_session_histories: dict[str, ChatMessageHistory] = {}


def _get_session_history(session_id: str) -> ChatMessageHistory:
    """Get or create a ChatMessageHistory for the given session."""
    if session_id not in _session_histories:
        _session_histories[session_id] = ChatMessageHistory()
        logger.info("Created new chat session: %s", session_id)
    return _session_histories[session_id]


# ─────────────────────────────────────────────────────────────────────────────
# Agent Builder
# ─────────────────────────────────────────────────────────────────────────────

_agent_executor: Optional[AgentExecutor] = None


def _build_agent() -> AgentExecutor:
    """
    Build the LangChain agent with:
      - GPT-4o as the LLM
      - 3 structured tools (forecast, port-fit, congestion)
      - 1 retriever tool (vector store knowledge base)
      - System prompt for freight chartering intelligence
    """
    from backend.nlq.vector_store import get_retriever

    logger.info("Building FreightIQ LangChain agent...")

    # ── LLM ─────────────────────────────────────────────────────────────
    llm = ChatOpenAI(
        model=settings.OPENAI_MODEL,
        temperature=settings.OPENAI_TEMPERATURE,
        openai_api_key=settings.OPENAI_API_KEY,
        streaming=False,
    )

    # ── Tools ───────────────────────────────────────────────────────────
    structured_tools = get_all_tools()

    # Wrap the vector retriever as a LangChain tool
    retriever = get_retriever()
    retriever_tool = create_retriever_tool(
        retriever,
        name="search_freightiq_knowledge",
        description=(
            "Search the FreightIQ knowledge base for port authority circulars, "
            "CVC compliance guidelines, vessel specifications, historical "
            "chartering patterns, seasonal advisories, demurrage references, "
            "and Baltic index descriptions. Use this tool when you need "
            "regulatory context, historical benchmarks, or port-specific "
            "circular references to cite in your answers."
        ),
    )

    all_tools = structured_tools + [retriever_tool]

    # ── Prompt Template ─────────────────────────────────────────────────
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # ── Agent ───────────────────────────────────────────────────────────
    agent = create_openai_tools_agent(llm, all_tools, prompt)

    executor = AgentExecutor(
        agent=agent,
        tools=all_tools,
        verbose=settings.AGENT_VERBOSE,
        max_iterations=settings.AGENT_MAX_ITERATIONS,
        return_intermediate_steps=True,
        handle_parsing_errors=True,
    )

    logger.info("FreightIQ agent built successfully with %d tools.", len(all_tools))
    return executor


def get_agent() -> AgentExecutor:
    """Returns the cached agent executor, building it on first call."""
    global _agent_executor

    if _agent_executor is not None:
        return _agent_executor

    if not settings.is_openai_configured:
        raise RuntimeError(
            "OpenAI API key is not configured. "
            "Set OPENAI_API_KEY in your .env file to enable the NLQ module."
        )

    _agent_executor = _build_agent()
    return _agent_executor


# ─────────────────────────────────────────────────────────────────────────────
# Query Execution
# ─────────────────────────────────────────────────────────────────────────────

def execute_query(
    query: str,
    session_id: str = "default",
    user_role: str = "chartering_officer",
) -> dict[str, Any]:
    """
    Execute a natural language query against the FreightIQ agent.

    Returns a dict containing:
      - answer: str — the agent's text response
      - sources: list[dict] — retrieved documents with metadata
      - tool_calls: list[dict] — metadata on tools invoked
      - confidence_score: float — composite certainty metric (0.0-1.0)
      - processing_time_ms: int — query latency
    """
    start_time = time.time()

    logger.info("Query [session=%s, role=%s]: %s", session_id, user_role, query[:200])

    executor = get_agent()
    history = _get_session_history(session_id)

    try:
        # Invoke the agent with chat history
        result = executor.invoke(
            {
                "input": query,
                "chat_history": history.messages,
            }
        )

        # Extract answer
        answer = result.get("output", "I could not generate a response.")

        # Extract intermediate steps (tool calls and their results)
        intermediate_steps = result.get("intermediate_steps", [])

        # ── Parse tool calls ────────────────────────────────────────────
        tool_calls = []
        sources = []
        tools_succeeded = 0

        for step in intermediate_steps:
            if len(step) >= 2:
                action = step[0]
                observation = step[1]

                tool_meta = {
                    "tool_name": getattr(action, "tool", "unknown"),
                    "tool_input": getattr(action, "tool_input", {}),
                    "output_preview": str(observation)[:500],
                }
                tool_calls.append(tool_meta)

                # Track success for confidence scoring
                if "error" not in str(observation).lower():
                    tools_succeeded += 1

                # If the tool is the retriever, extract source documents
                if getattr(action, "tool", "") == "search_freightiq_knowledge":
                    # The retriever tool returns text; parse source metadata
                    # from the observation if possible
                    sources.append({
                        "content_preview": str(observation)[:300],
                        "source_type": "vector_retrieval",
                    })

        # ── Compute confidence score ────────────────────────────────────
        confidence_score = _compute_confidence(
            answer=answer,
            tool_calls=tool_calls,
            tools_succeeded=tools_succeeded,
            sources=sources,
        )

        # ── Update session history ──────────────────────────────────────
        history.add_user_message(query)
        history.add_ai_message(answer)

        processing_time_ms = int((time.time() - start_time) * 1000)

        logger.info(
            "Query completed [session=%s] in %dms (confidence=%.2f, tools=%d)",
            session_id, processing_time_ms, confidence_score, len(tool_calls),
        )

        return {
            "answer": answer,
            "sources": sources,
            "tool_calls": tool_calls,
            "confidence_score": confidence_score,
            "processing_time_ms": processing_time_ms,
        }

    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.error("Agent execution failed [session=%s]: %s", session_id, str(e))
        raise RuntimeError(f"Agent execution failed: {str(e)}") from e


def _compute_confidence(
    answer: str,
    tool_calls: list[dict],
    tools_succeeded: int,
    sources: list[dict],
) -> float:
    """
    Compute a composite confidence score (0.0-1.0) based on:
      1. Tool invocation success rate (40% weight)
      2. Number of retrieved sources (30% weight)
      3. Answer length and structure (20% weight)
      4. Absence of uncertainty language (10% weight)
    """
    # Factor 1: Tool success rate
    if len(tool_calls) > 0:
        tool_score = tools_succeeded / len(tool_calls)
    else:
        tool_score = 0.3  # No tools used → lower confidence

    # Factor 2: Source retrieval
    source_count = len(sources)
    if source_count >= 3:
        source_score = 1.0
    elif source_count >= 1:
        source_score = 0.7
    else:
        source_score = 0.4

    # Factor 3: Answer quality (length proxy)
    answer_len = len(answer)
    if answer_len > 500:
        quality_score = 1.0
    elif answer_len > 200:
        quality_score = 0.7
    elif answer_len > 50:
        quality_score = 0.5
    else:
        quality_score = 0.3

    # Factor 4: Uncertainty language detection
    uncertainty_phrases = [
        "i'm not sure", "i don't know", "i cannot", "uncertain",
        "no data available", "not found in database", "unable to",
    ]
    has_uncertainty = any(phrase in answer.lower() for phrase in uncertainty_phrases)
    certainty_score = 0.3 if has_uncertainty else 1.0

    # Weighted composite
    confidence = (
        0.40 * tool_score
        + 0.30 * source_score
        + 0.20 * quality_score
        + 0.10 * certainty_score
    )

    # Clamp to [0.1, 0.99]
    return round(max(0.1, min(0.99, confidence)), 2)


def reset_agent():
    """Reset the cached agent (useful for testing or config changes)."""
    global _agent_executor
    _agent_executor = None
    _session_histories.clear()
    logger.info("Agent and session histories cleared.")
