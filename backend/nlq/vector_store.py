"""
FreightIQ — Vector Store Manager
FAISS-based vector store (with Pinecone adapter path) for storing and
retrieving domain knowledge documents (port circulars, CVC guidelines,
vessel specs, historical chartering patterns).

The vector store is initialised lazily on first query and cached
in-memory for the lifetime of the process.
"""

from __future__ import annotations

import logging
from typing import Optional

from langchain_core.vectorstores import VectorStoreRetriever

from backend.nlq.config import settings, VectorStoreBackend

logger = logging.getLogger("freightiq.nlq.vector_store")

# ─────────────────────────────────────────────────────────────────────────────
# Module-level cache for the vector store instance
# ─────────────────────────────────────────────────────────────────────────────

_vector_store = None
_retriever: Optional[VectorStoreRetriever] = None


def _build_faiss_store():
    """
    Build a FAISS vector store from mock domain documents.
    Uses OpenAI embeddings (text-embedding-3-small by default).
    """
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import FAISS
    from backend.nlq.mock_documents import get_mock_documents

    logger.info("Building FAISS vector store from %d domain documents...", 
                len(get_mock_documents()))

    embeddings = OpenAIEmbeddings(
        model=settings.OPENAI_EMBEDDING_MODEL,
        openai_api_key=settings.OPENAI_API_KEY,
    )

    documents = get_mock_documents()
    store = FAISS.from_documents(documents, embeddings)

    logger.info("FAISS vector store built successfully with %d vectors.", len(documents))
    return store


def _build_pinecone_store():
    """
    Build a Pinecone-backed vector store.
    Requires PINECONE_API_KEY and PINECONE_INDEX_NAME in settings.
    
    NOTE: This is a production-path adapter. For the SIH demo,
    FAISS is the recommended default.
    """
    try:
        from langchain_openai import OpenAIEmbeddings
        from langchain_pinecone import PineconeVectorStore
        from pinecone import Pinecone
        from backend.nlq.mock_documents import get_mock_documents

        logger.info("Initialising Pinecone vector store (index: %s)...",
                     settings.PINECONE_INDEX_NAME)

        # Initialise Pinecone client
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        index = pc.Index(settings.PINECONE_INDEX_NAME)

        embeddings = OpenAIEmbeddings(
            model=settings.OPENAI_EMBEDDING_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
        )

        # Check if index is empty — if so, seed with mock documents
        stats = index.describe_index_stats()
        if stats.get("total_vector_count", 0) == 0:
            logger.info("Pinecone index is empty — seeding with mock documents...")
            documents = get_mock_documents()
            store = PineconeVectorStore.from_documents(
                documents,
                embeddings,
                index_name=settings.PINECONE_INDEX_NAME,
            )
        else:
            logger.info("Pinecone index already populated (%d vectors).",
                         stats["total_vector_count"])
            store = PineconeVectorStore(
                index=index,
                embedding=embeddings,
            )

        logger.info("Pinecone vector store initialised successfully.")
        return store

    except ImportError as e:
        logger.warning(
            "Pinecone dependencies not installed (%s). Falling back to FAISS.", e
        )
        return _build_faiss_store()
    except Exception as e:
        logger.error(
            "Pinecone initialisation failed (%s). Falling back to FAISS.", e
        )
        return _build_faiss_store()


def get_vector_store():
    """
    Returns the cached vector store instance, building it on first call.
    Thread-safe for FastAPI's async context (single event loop).
    """
    global _vector_store

    if _vector_store is not None:
        return _vector_store

    if not settings.is_openai_configured:
        raise RuntimeError(
            "OpenAI API key is not configured. "
            "Set OPENAI_API_KEY in your .env file to enable the NLQ module."
        )

    backend = settings.effective_vector_backend
    logger.info("Initialising vector store with backend: %s", backend.value)

    if backend == VectorStoreBackend.PINECONE:
        _vector_store = _build_pinecone_store()
    else:
        _vector_store = _build_faiss_store()

    return _vector_store


def get_retriever() -> VectorStoreRetriever:
    """
    Returns a LangChain retriever configured for the FreightIQ knowledge base.
    Uses MMR (Maximal Marginal Relevance) search by default for diverse results.
    """
    global _retriever

    if _retriever is not None:
        return _retriever

    store = get_vector_store()

    search_kwargs = {"k": settings.RETRIEVER_TOP_K}

    # MMR requires fetch_k > k for diversity sampling
    if settings.RETRIEVER_SEARCH_TYPE == "mmr":
        search_kwargs["fetch_k"] = settings.RETRIEVER_TOP_K * 3

    _retriever = store.as_retriever(
        search_type=settings.RETRIEVER_SEARCH_TYPE,
        search_kwargs=search_kwargs,
    )

    logger.info(
        "Retriever configured: search_type=%s, top_k=%d",
        settings.RETRIEVER_SEARCH_TYPE,
        settings.RETRIEVER_TOP_K,
    )
    return _retriever


def reset_store():
    """
    Reset the cached vector store and retriever.
    Useful for testing or when documents are updated.
    """
    global _vector_store, _retriever
    _vector_store = None
    _retriever = None
    logger.info("Vector store and retriever cache cleared.")
