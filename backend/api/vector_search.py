import os
import numpy as np
import faiss
from django.conf import settings
from .models import Product
from .embeddings import generate_product_embeddings

EMBEDDINGS_PATH = os.path.join(settings.BASE_DIR, 'product_embeddings.npy')
INDEX_PATH = os.path.join(settings.BASE_DIR, 'product_faiss.index')


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
    np.save(EMBEDDINGS_PATH, embeddings)
    index = faiss.IndexFlatIP(dim)  # Cosine similarity (if embeddings are normalized)
    index.add(x=embeddings)
    faiss.write_index(index, INDEX_PATH)
    faiss.write_index(index, INDEX_PATH)
    return len(products)


def load_faiss_index_and_embeddings():
    """
    Load the Faiss index and embeddings from disk.
    Returns (index, embeddings) tuple.
    """
    if not os.path.exists(EMBEDDINGS_PATH) or not os.path.exists(INDEX_PATH):
        return None, None
    embeddings = np.load(EMBEDDINGS_PATH)
    index = faiss.read_index(INDEX_PATH)
    return index, embeddings
