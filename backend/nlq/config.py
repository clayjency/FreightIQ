"""
FreightIQ — NLQ Configuration
Loads environment variables for OpenAI, Pinecone, and vector store settings.
Uses pydantic-settings for validation with .env file support.

Usage:
    from backend.nlq.config import settings
    print(settings.OPENAI_API_KEY)
"""

from __future__ import annotations

import os
from enum import Enum
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic import Field


class VectorStoreBackend(str, Enum):
    """Supported vector store backends."""
    FAISS = "faiss"
    PINECONE = "pinecone"


class NLQSettings(BaseSettings):
    """
    Configuration for the Natural Language Query module.
    All values can be overridden via environment variables or a .env file
    located in the backend/ directory.
    """

    # ── OpenAI ──────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = Field(
        default="",
        description="OpenAI API key for GPT-4o and embeddings. "
                    "Leave empty to start server without NLQ capability.",
    )
    OPENAI_MODEL: str = Field(
        default="gpt-4o",
        description="OpenAI chat model name.",
    )
    OPENAI_EMBEDDING_MODEL: str = Field(
        default="text-embedding-3-small",
        description="OpenAI embedding model for vector store.",
    )
    OPENAI_TEMPERATURE: float = Field(
        default=0.1,
        ge=0.0,
        le=2.0,
        description="LLM temperature (lower = more deterministic).",
    )

    # ── Vector Store ────────────────────────────────────────────────────────
    VECTOR_STORE_BACKEND: VectorStoreBackend = Field(
        default=VectorStoreBackend.FAISS,
        description="Which vector store to use: 'faiss' (local) or 'pinecone' (cloud).",
    )

    # ── Pinecone (optional — only needed if VECTOR_STORE_BACKEND=pinecone) ─
    PINECONE_API_KEY: str = Field(
        default="",
        description="Pinecone API key (required only when using Pinecone backend).",
    )
    PINECONE_INDEX_NAME: str = Field(
        default="freightiq-knowledge",
        description="Pinecone index name.",
    )
    PINECONE_ENVIRONMENT: str = Field(
        default="us-east-1",
        description="Pinecone cloud environment/region.",
    )

    # ── Retrieval Settings ──────────────────────────────────────────────────
    RETRIEVER_TOP_K: int = Field(
        default=4,
        ge=1,
        le=20,
        description="Number of documents to retrieve per query.",
    )
    RETRIEVER_SEARCH_TYPE: str = Field(
        default="mmr",
        description="Search strategy: 'similarity' or 'mmr' (Maximal Marginal Relevance).",
    )

    # ── Agent Settings ──────────────────────────────────────────────────────
    AGENT_MAX_ITERATIONS: int = Field(
        default=8,
        ge=1,
        le=25,
        description="Max tool-calling iterations before the agent must return.",
    )
    AGENT_VERBOSE: bool = Field(
        default=False,
        description="Enable verbose LangChain agent logging (useful for debugging).",
    )

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

    # ── Derived helpers ─────────────────────────────────────────────────────

    @property
    def is_openai_configured(self) -> bool:
        """True if a non-empty OpenAI API key is present."""
        return bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY.strip()
                     and self.OPENAI_API_KEY != "your-key-here")

    @property
    def is_pinecone_configured(self) -> bool:
        """True if Pinecone credentials are present."""
        return bool(self.PINECONE_API_KEY and self.PINECONE_API_KEY.strip()
                     and self.PINECONE_API_KEY != "your-key-here")

    @property
    def effective_vector_backend(self) -> VectorStoreBackend:
        """
        Returns the actual backend to use — falls back to FAISS
        if Pinecone is requested but credentials are missing.
        """
        if self.VECTOR_STORE_BACKEND == VectorStoreBackend.PINECONE:
            if not self.is_pinecone_configured:
                return VectorStoreBackend.FAISS
        return self.VECTOR_STORE_BACKEND


@lru_cache(maxsize=1)
def get_settings() -> NLQSettings:
    """Singleton accessor for NLQ settings (cached)."""
    return NLQSettings()


# Convenience alias
settings = get_settings()
