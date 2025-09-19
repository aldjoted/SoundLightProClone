import numpy as np
from sentence_transformers import SentenceTransformer
from django.conf import settings
from .models import Product

# Load a sentence transformer model (can be changed to a more powerful one if needed)
MODEL_NAME = getattr(settings, 'PRODUCT_EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
model = SentenceTransformer(MODEL_NAME)


def get_product_text(product):
    """
    Combine product fields into a single string for embedding.
    """
    parts = [product.name, product.description]
    if product.category:
        parts.append(product.category.name)
    if product.brand:
        parts.append(product.brand.name)
    return ' '.join([str(p) for p in parts if p])


def generate_product_embeddings(products):
    """
    Generate embeddings for a queryset or list of products.
    Returns a NumPy array of shape (num_products, embedding_dim).
    """
    texts = [get_product_text(p) for p in products]
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    return np.array(embeddings)
