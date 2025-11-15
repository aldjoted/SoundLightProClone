import logging
import os
from functools import lru_cache
from typing import List, Optional, Tuple

import faiss
import numpy as np
from django.conf import settings

from .models import Product
from .embeddings import generate_product_embeddings

logger = logging.getLogger(__name__)

EMBEDDINGS_PATH = os.path.join(settings.BASE_DIR, 'product_embeddings.npy')
INDEX_PATH = os.path.join(settings.BASE_DIR, 'product_faiss.index')
PRODUCT_IDS_PATH = os.path.join(settings.BASE_DIR, 'product_ids.npy')

# ✅ IMPROVEMENT: Cache loaded index and embeddings in memory
_cached_index = None
_cached_embeddings = None
_cached_product_ids: Optional[List[int]] = None


def build_and_save_faiss_index():
    """
    Generate embeddings for all products and build a Faiss index.
    Save both the embeddings and the index to disk.
    """
    products = list(
        Product.objects.filter(available=True)
        .select_related('brand', 'category')
        .order_by('id')
    )
    if not products:
        return None
    embeddings = generate_product_embeddings(products)
    embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)
    # Determine embedding dimension from the computed embeddings (shape: [N, D])
    if embeddings.ndim != 2 or embeddings.shape[0] == 0:
        return None
    dim = embeddings.shape[1]
    np.save(EMBEDDINGS_PATH, embeddings)
    # Using inner product; with normalized embeddings this corresponds to cosine similarity
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    faiss.write_index(index, INDEX_PATH)

    product_ids = np.array([p.id for p in products], dtype=np.int64)
    np.save(PRODUCT_IDS_PATH, product_ids)
    
    # ✅ IMPROVEMENT: Clear cache to force reload with new index
    global _cached_index, _cached_embeddings, _cached_product_ids
    _cached_index = None
    _cached_embeddings = None
    _cached_product_ids = None
    get_search_index_data.cache_clear()
    
    return len(products)


def load_faiss_index_and_embeddings(force_reload=False):
    """
    Load the Faiss index and embeddings from disk with caching.
    
    ✅ IMPROVEMENT: Caches index and embeddings in memory to avoid repeated disk I/O.
    
    Args:
        force_reload: Force reload from disk even if cached
        
    Returns:
        Tuple of (index, embeddings) or (None, None) if not found
    """
    global _cached_index, _cached_embeddings, _cached_product_ids
    
    if force_reload or _cached_index is None or _cached_embeddings is None or _cached_product_ids is None:
        if not os.path.exists(EMBEDDINGS_PATH) or not os.path.exists(INDEX_PATH) or not os.path.exists(PRODUCT_IDS_PATH):
            return None, None
        
        _cached_embeddings = np.load(EMBEDDINGS_PATH)
        _cached_index = faiss.read_index(INDEX_PATH)
        _cached_product_ids = np.load(PRODUCT_IDS_PATH).astype(np.int64).tolist()
    
    return _cached_index, _cached_embeddings


@lru_cache(maxsize=None)
def get_search_index_data() -> Tuple[Optional[faiss.Index], Optional[List[int]]]:
    """Load FAISS index and the immutable product ID mapping once per process."""
    if not (os.path.exists(INDEX_PATH) and os.path.exists(EMBEDDINGS_PATH) and os.path.exists(PRODUCT_IDS_PATH)):
        logger.info("FAISS resources are incomplete. Run 'build_product_index' to regenerate embeddings and index.")
        return None, None

    index = faiss.read_index(INDEX_PATH)
    product_ids = np.load(PRODUCT_IDS_PATH).astype(np.int64).tolist()

    if index.ntotal != len(product_ids):
        logger.warning(
            "FAISS index size (%s) does not match stored product id mapping (%s).",
            index.ntotal,
            len(product_ids),
        )
        return None, None

    return index, product_ids
