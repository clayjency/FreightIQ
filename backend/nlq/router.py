"""
FreightIQ — NLQ Chat Router
FastAPI endpoint for the Natural Language Query interface.
POST /api/v1/chat/query

Accepts user queries, routes them through the LangChain agent,
and returns structured responses with sources, tool call metadata,
and confidence scoring.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.nlq.config import settings

logger = logging.getLogger("freightiq.nlq.router")


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Request / Response Models
# ─────────────────────────────────────────────────────────────────────────────

class ChatQueryRequest(BaseModel):
    """Request body for the NLQ chat endpoint."""
    query: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Natural language question about freight rates, port constraints, "
                    "or chartering decisions.",
        examples=[
            "What is the 4-week forecasted rate for Supramax from Paradip to Rotterdam?",
            "Can a Capesize vessel enter Haldia port?",
            "What is the current congestion at Vizag port?",
        ],
    )
    session_id: str = Field(
        default="default",
        max_length=128,
        description="Conversation session ID for multi-turn chat history.",
    )
    user_role: str = Field(
        default="chartering_officer",
        max_length=64,
        description="User role for access control and response tailoring. "
                    "Options: chartering_officer, analyst, manager, auditor.",
    )


class SourceDocument(BaseModel):
    """A retrieved document from the vector store or database."""
    content_preview: str = Field(
        description="Preview of the retrieved document content (truncated).",
    )
    source_type: str = Field(
        description="Type of source: 'vector_retrieval', 'tool_output', etc.",
    )
    metadata: Optional[dict] = Field(
        default=None,
        description="Source metadata (document name, port, date, etc.).",
    )


class ToolCallMetadata(BaseModel):
    """Metadata about a tool function invoked during query processing."""
    tool_name: str = Field(description="Name of the tool that was called.")
    tool_input: dict = Field(
        default_factory=dict,
        description="Input parameters passed to the tool.",
    )
    output_preview: str = Field(
        default="",
        description="Truncated preview of the tool's output.",
    )


class ChatQueryResponse(BaseModel):
    """Response from the NLQ chat endpoint."""
    answer: str = Field(
        description="GPT-4o generated response to the user's query.",
    )
    sources: list[SourceDocument] = Field(
        default_factory=list,
        description="List of retrieved documents and data sources used.",
    )
    tool_calls: list[ToolCallMetadata] = Field(
        default_factory=list,
        description="Metadata on tool functions triggered during execution.",
    )
    confidence_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Composite confidence metric (0.0-1.0) indicating model certainty.",
    )
    session_id: str = Field(
        description="Echo of the session ID for client-side tracking.",
    )
    processing_time_ms: int = Field(
        description="Query processing latency in milliseconds.",
    )
    timestamp: str = Field(
        description="ISO 8601 timestamp of the response.",
    )
    model_version: str = Field(
        default="FIQ-NLQ-v1.0",
        description="NLQ module version identifier.",
    )


class NLQHealthResponse(BaseModel):
    """Health check response for the NLQ subsystem."""
    status: str
    openai_configured: bool
    vector_store_backend: str
    model: str
    agent_ready: bool


# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/v1/chat", tags=["NLQ — Natural Language Query"])


@router.post(
    "/query",
    response_model=ChatQueryResponse,
    summary="Natural Language Query Interface",
    description=(
        "Submit a natural language question about freight rates, port constraints, "
        "vessel compatibility, congestion, or chartering decisions. "
        "The query is processed by a GPT-4o-powered LangChain agent with access to "
        "FreightIQ's rate forecasting engine, port registry, and domain knowledge base. "
        "Responses include cited sources and tool call metadata for CVC audit compliance."
    ),
    responses={
        200: {"description": "Successful query response with answer and metadata."},
        422: {"description": "Validation error — query too short or malformed."},
        503: {"description": "NLQ service unavailable — OpenAI API key not configured."},
        500: {"description": "Internal agent execution error."},
    },
)
async def chat_query(request: ChatQueryRequest) -> ChatQueryResponse:
    """
    Process a natural language query through the FreightIQ agent.

    The agent will:
    1. Analyse the query intent
    2. Invoke relevant tools (rate forecast, port-vessel fit, congestion alert)
    3. Retrieve context from the vector knowledge base
    4. Generate a comprehensive, CVC-compliant response
    """

    # ── Guard: Check if OpenAI is configured ────────────────────────────
    if not settings.is_openai_configured:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "NLQ service unavailable",
                "message": (
                    "OpenAI API key is not configured. "
                    "Set OPENAI_API_KEY in your backend/.env file and restart the server."
                ),
                "docs": "See backend/.env.example for the required configuration.",
            },
        )

    # ── Execute query ───────────────────────────────────────────────────
    try:
        from backend.nlq.agent import execute_query

        result = execute_query(
            query=request.query,
            session_id=request.session_id,
            user_role=request.user_role,
        )

        # ── Build response ──────────────────────────────────────────────
        sources = [
            SourceDocument(
                content_preview=s.get("content_preview", ""),
                source_type=s.get("source_type", "unknown"),
                metadata=s.get("metadata"),
            )
            for s in result.get("sources", [])
        ]

        tool_calls = [
            ToolCallMetadata(
                tool_name=tc.get("tool_name", "unknown"),
                tool_input=tc.get("tool_input", {}),
                output_preview=tc.get("output_preview", "")[:500],
            )
            for tc in result.get("tool_calls", [])
        ]

        return ChatQueryResponse(
            answer=result["answer"],
            sources=sources,
            tool_calls=tool_calls,
            confidence_score=result["confidence_score"],
            session_id=request.session_id,
            processing_time_ms=result["processing_time_ms"],
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    except RuntimeError as e:
        logger.error("Agent runtime error: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Agent execution failed",
                "message": str(e),
                "suggestion": "Check server logs for details. Ensure OPENAI_API_KEY is valid.",
            },
        )
    except Exception as e:
        logger.error("Unexpected error in NLQ query: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred while processing your query.",
            },
        )


@router.get(
    "/health",
    response_model=NLQHealthResponse,
    summary="NLQ subsystem health check",
    description="Returns the status of the NLQ module, including OpenAI configuration and agent readiness.",
)
async def nlq_health() -> NLQHealthResponse:
    """Health check for the NLQ subsystem."""
    agent_ready = False
    try:
        from backend.nlq.agent import _agent_executor
        agent_ready = _agent_executor is not None
    except Exception:
        pass

    return NLQHealthResponse(
        status="ready" if settings.is_openai_configured else "awaiting_api_key",
        openai_configured=settings.is_openai_configured,
        vector_store_backend=settings.effective_vector_backend.value,
        model=settings.OPENAI_MODEL,
        agent_ready=agent_ready,
    )
