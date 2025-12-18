"""
Custom admin views for product management.

This module provides an admin interface for bulk importing products
with embedded images from Excel files.
"""

from __future__ import annotations

import logging
from io import BytesIO
from typing import TYPE_CHECKING, Final

import openpyxl
from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test
from django.core.files.base import ContentFile
from django.db import transaction
from django.shortcuts import redirect, render

from .models import Brand, Category, Product, ProductImage

if TYPE_CHECKING:
    from django.http import HttpRequest, HttpResponse

__all__: Final[list[str]] = [
    "import_products_with_images",
]

logger: Final = logging.getLogger(__name__)


def _is_superuser(user: object) -> bool:
    """Check if user is a superuser (for use with user_passes_test)."""
    return getattr(user, 'is_superuser', False)


@user_passes_test(_is_superuser)
def import_products_with_images(request: HttpRequest) -> HttpResponse:
    """
    Admin view to import products with embedded images from Excel.
    
    Expected Excel format (columns):
        A: Name (required)
        B: Category name
        C: Brand name  
        D: Price
        E: Stock
        F: Description
        
    Images embedded in the worksheet are associated with products
    based on their row position.
    
    Args:
        request: The HTTP request object.
        
    Returns:
        HttpResponse: Rendered template or redirect to product list.
    """
    if request.method != "POST":
        return render(request, "admin/import_products.html")

    excel_file = request.FILES.get("excel_file")
    if not excel_file:
        messages.error(request, "Please upload an Excel file.")
        return redirect("admin:api_product_changelist")

    try:
        wb = openpyxl.load_workbook(excel_file, data_only=True)
        ws = wb.active
        
        # Map embedded images to their row positions
        # openpyxl images have an anchor attribute with row/column info
        images_by_row: dict[int, list] = {}
        for image in ws._images:
            try:
                # anchor._from.row is 0-indexed, convert to 1-based
                row = image.anchor._from.row + 1
                if row not in images_by_row:
                    images_by_row[row] = []
                images_by_row[row].append(image)
            except AttributeError as e:
                logger.warning(f"Could not determine anchor for image: {e}")

        saved_count = 0
        
        with transaction.atomic():
            # Skip header row (row 1), start from row 2
            for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                # Expected columns: 0=Name, 1=Category, 2=Brand, 3=Price, 4=Stock, 5=Description
                name = row[0]
                if not name:
                    continue
                    
                category_name = row[1]
                brand_name = row[2]
                price = row[3]
                stock = row[4]
                description = row[5] if len(row) > 5 else ""
                
                # Get or create Category
                category = None
                if category_name:
                    category, _ = Category.objects.get_or_create(
                        name=category_name, 
                        defaults={'slug': category_name.lower().replace(' ', '-')}
                    )
                
                # Get or create Brand
                brand = None
                if brand_name:
                    brand, _ = Brand.objects.get_or_create(
                        name=brand_name,
                        defaults={'slug': brand_name.lower().replace(' ', '-')}
                    )
                    
                # Create Product
                product = Product.objects.create(
                    name=name,
                    category=category,
                    brand=brand,
                    price=price or 0,
                    stock=stock or 0,
                    description=description or "",
                    available=True
                )
                
                # Attach embedded images for this row
                _attach_images_to_product(product, row_num, images_by_row)
                saved_count += 1

        messages.success(request, f"Successfully imported {saved_count} products.")
        
    except Exception as e:
        logger.exception("Error processing Excel import")
        messages.error(request, f"Error processing file: {e}")
        
    return redirect("admin:api_product_changelist")


def _attach_images_to_product(
    product: Product,
    row_num: int,
    images_by_row: dict[int, list],
) -> None:
    """
    Attach embedded Excel images to a product.
    
    Args:
        product: The product to attach images to.
        row_num: The Excel row number (1-based).
        images_by_row: Mapping of row numbers to image objects.
    """
    if row_num not in images_by_row:
        return
        
    for img_obj in images_by_row[row_num]:
        try:
            pil_image = img_obj.ref
            blob = BytesIO()
            fmt = pil_image.format or 'PNG'
            pil_image.save(blob, format=fmt)
            
            filename = f"{product.id}_{row_num}.{fmt.lower()}"
            
            product_image = ProductImage(product=product)
            product_image.image.save(
                filename, 
                ContentFile(blob.getvalue()), 
                save=True
            )
        except Exception as e:
            logger.error(f"Failed to save image for row {row_num}: {e}")
