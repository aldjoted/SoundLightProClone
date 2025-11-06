import os
import numpy as np
import faiss
from django.conf import settings
from .models import Product
from .embeddings import generate_product_embeddings

EMBEDDINGS_PATH = os.path.join(settings.BASE_DIR, 'product_embeddings.npy')
INDEX_PATH = os.path.join(settings.BASE_DIR, 'product_faiss.index')

# ✅ IMPROVEMENT: Cache loaded index and embeddings in memory
_cached_index = None
_cached_embeddings = None


def build_and_save_faiss_index():
    """
    Generate embeddings for all products and build a Faiss index.
    Save both the embeddings and the index to disk.
    """
    products = list(Product.objects.filter(available=True).select_related('brand', 'category'))
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
    
    # ✅ IMPROVEMENT: Clear cache to force reload with new index
    global _cached_index, _cached_embeddings
    _cached_index = None
    _cached_embeddings = None
    
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
    global _cached_index, _cached_embeddings
    
    if force_reload or _cached_index is None or _cached_embeddings is None:
        if not os.path.exists(EMBEDDINGS_PATH) or not os.path.exists(INDEX_PATH):
            return None, None
        
        _cached_embeddings = np.load(EMBEDDINGS_PATH)
        _cached_index = faiss.read_index(INDEX_PATH)
    
    return _cached_index, _cached_embeddings
