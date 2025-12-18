"""
FAISS vector search index for semantic product search.

This module provides functionality to build, persist, and query a FAISS
index for semantic similarity search across products. The index uses
inner product similarity (equivalent to cosine similarity for normalized
vectors) for fast nearest-neighbor lookups.

Usage:
    # Build and save the index (run as management command)
    from api.vector_search import build_and_save_faiss_index
    build_and_save_faiss_index()

    # Query the index
    from api.vector_search import get_search_index_data
    index, product_ids = get_search_index_data()
    if index:
        D, I = index.search(query_embedding, k=5)
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import TYPE_CHECKING, Final

import faiss
import numpy as np
from django.conf import settings

from .embeddings import generate_product_embeddings
from .models import Product

if TYPE_CHECKING:
    from numpy.typing import NDArray

__all__: Final[list[str]] = [
    "build_and_save_faiss_index",
    "get_search_index_data",
    "EMBEDDINGS_PATH",
    "INDEX_PATH",
    "PRODUCT_IDS_PATH",
]

logger: Final = logging.getLogger(__name__)

# File paths for persisted index data
EMBEDDINGS_PATH: Final[str] = os.path.join(settings.BASE_DIR, "product_embeddings.npy")
INDEX_PATH: Final[str] = os.path.join(settings.BASE_DIR, "product_faiss.index")
PRODUCT_IDS_PATH: Final[str] = os.path.join(settings.BASE_DIR, "product_ids.npy")


def build_and_save_faiss_index() -> int | None:
    """
    Generate embeddings for all available products and build a FAISS index.

    This function:
    1. Fetches all available products from the database
    2. Generates normalized embeddings for each product
    3. Builds a FAISS IndexFlatIP (inner product) index
    4. Saves embeddings, index, and product ID mapping to disk
    5. Clears the LRU cache to force reload on next query

    Returns:
        The number of products indexed, or None if no products are available.
    """
    products = list(
        Product.objects.filter(available=True)
        .select_related("brand", "category")
        .order_by("id")
    )
    if not products:
        logger.warning("No available products found for indexing")
        return None

    embeddings = generate_product_embeddings(products)
    embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)

    # Validate embedding shape
    if embeddings.ndim != 2 or embeddings.shape[0] == 0:
        logger.error(f"Invalid embeddings shape: {embeddings.shape}")
        return None

    dim = embeddings.shape[1]

    # Save embeddings to disk
    np.save(EMBEDDINGS_PATH, embeddings)

    # Build FAISS index (inner product = cosine similarity for normalized vectors)
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    faiss.write_index(index, INDEX_PATH)

    # Save product ID mapping
    product_ids = np.array([p.id for p in products], dtype=np.int64)
    np.save(PRODUCT_IDS_PATH, product_ids)

    # Clear LRU cache to force reload with new index on next call
    get_search_index_data.cache_clear()

    logger.info(f"Successfully indexed {len(products)} products")
    return len(products)


@lru_cache(maxsize=None)
def get_search_index_data() -> tuple[faiss.Index | None, list[int] | None]:
    """
    Load FAISS index and product ID mapping from disk.

    Uses @lru_cache for efficient in-memory caching. The cache is cleared
    automatically when build_and_save_faiss_index() rebuilds the index.

    Returns:
        A tuple of (faiss.Index, list[int]) if resources are available,
        or (None, None) if the index hasn't been built or is corrupted.
    """
    required_files = [INDEX_PATH, EMBEDDINGS_PATH, PRODUCT_IDS_PATH]
    if not all(os.path.exists(f) for f in required_files):
        logger.info(
            "FAISS resources are incomplete. "
            "Run 'python manage.py build_product_index' to generate."
        )
        return None, None

    index = faiss.read_index(INDEX_PATH)
    product_ids: list[int] = np.load(PRODUCT_IDS_PATH).astype(np.int64).tolist()

    if index.ntotal != len(product_ids):
        logger.warning(
            f"FAISS index size ({index.ntotal}) does not match "
            f"product ID mapping ({len(product_ids)}). Rebuild required."
        )
        return None, None

    return index, product_ids
