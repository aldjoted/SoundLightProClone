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
    
    # Clear lru_cache to force reload with new index on next call
    get_search_index_data.cache_clear()
    
    return len(products)


@lru_cache(maxsize=None)
def get_search_index_data() -> Tuple[Optional[faiss.Index], Optional[List[int]]]:
    """
    Load FAISS index and the immutable product ID mapping once per process.
    
    Uses @lru_cache for efficient in-memory caching. The cache is cleared
    when build_and_save_faiss_index() rebuilds the index.
    
    Returns:
        Tuple of (faiss.Index, List[int]) or (None, None) if resources are unavailable
    """
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
