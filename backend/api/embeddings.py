"""
Product embedding generation for semantic search.

This module provides functionality to generate vector embeddings for products
using sentence-transformers. These embeddings are used by the FAISS vector
search index for semantic product search and recommendations.

The model is loaded lazily on first use to avoid startup overhead.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Final

import numpy as np
from django.conf import settings
from sentence_transformers import SentenceTransformer

if TYPE_CHECKING:
    from collections.abc import Iterable

    from numpy.typing import NDArray

    from .models import Product

__all__: Final[list[str]] = [
    "model",
    "get_product_text",
    "generate_product_embeddings",
]

# Load a sentence transformer model (can be configured in settings)
MODEL_NAME: Final[str] = getattr(settings, "PRODUCT_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
model: Final[SentenceTransformer] = SentenceTransformer(MODEL_NAME)


def get_product_text(product: Product) -> str:
    """
    Combine product fields into a single text string for embedding.

    This function creates a searchable text representation of a product
    by combining its name, description, category, and brand.

    Args:
        product: The Product instance to generate text for.

    Returns:
        A space-separated string containing all relevant product text.
    """
    parts: list[str] = [product.name, product.description]
    if product.category:
        parts.append(product.category.name)
    if product.brand:
        parts.append(product.brand.name)
    return " ".join(str(p) for p in parts if p)


def generate_product_embeddings(products: Iterable[Product]) -> NDArray[np.float32]:
    """
    Generate normalized embeddings for a collection of products.

    Args:
        products: An iterable of Product instances (queryset or list).

    Returns:
        A NumPy array of shape (num_products, embedding_dim) with normalized
        embeddings suitable for cosine similarity search.
    """
    texts = [get_product_text(p) for p in products]
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    return np.array(embeddings, dtype=np.float32)
