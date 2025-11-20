import openpyxl
from openpyxl.drawing.image import Image as OpenPyXLImage
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test
from django.core.files.base import ContentFile
from django.db import transaction
from io import BytesIO
from .models import Product, Category, Brand, ProductImage
import logging

logger = logging.getLogger(__name__)

@user_passes_test(lambda u: u.is_superuser)
def import_products_with_images(request):
    if request.method == "POST":
        excel_file = request.FILES.get("excel_file")
        if not excel_file:
            messages.error(request, "Please upload an Excel file.")
            return redirect("admin:api_product_changelist")

        try:
            wb = openpyxl.load_workbook(excel_file, data_only=True)
            ws = wb.active
            
            # Map images to rows
            # openpyxl images have an 'anchor' attribute. 
            # For OneCellAnchor, it has _from.row. For TwoCellAnchor, it has _from.row.
            # Note: openpyxl rows are 0-indexed in anchors usually, but let's verify.
            # Actually, openpyxl anchors are a bit complex.
            # Let's try a simplified approach: iterate images and check their anchor.
            
            images_by_row = {}
            for image in ws._images:
                # anchor can be OneCellAnchor or TwoCellAnchor
                # We need the row index.
                try:
                    # This depends on openpyxl version and anchor type
                    # Usually image.anchor._from.row (0-indexed)
                    row = image.anchor._from.row + 1 # Convert to 1-based to match iteration
                    if row not in images_by_row:
                        images_by_row[row] = []
                    images_by_row[row].append(image)
                except Exception as e:
                    logger.warning(f"Could not determine anchor for image: {e}")

            saved_count = 0
            
            with transaction.atomic():
                # Skip header row
                for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                    # Expected columns: Name, Category, Brand, Price, Stock, Description
                    # Adjust indices as needed. Let's assume:
                    # 0: Name, 1: Category, 2: Brand, 3: Price, 4: Stock, 5: Description
                    
                    name = row[0]
                    if not name:
                        continue
                        
                    category_name = row[1]
                    brand_name = row[2]
                    price = row[3]
                    stock = row[4]
                    description = row[5]
                    
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
                    
                    # Handle Images for this row
                    if i in images_by_row:
                        for img_obj in images_by_row[i]:
                            # img_obj.ref is the PIL Image
                            # We need to save it
                            try:
                                pil_image = img_obj.ref
                                blob = BytesIO()
                                # Determine format
                                fmt = pil_image.format or 'PNG'
                                pil_image.save(blob, format=fmt)
                                
                                filename = f"{product.id}_{i}.{fmt.lower()}"
                                
                                product_image = ProductImage(product=product)
                                product_image.image.save(filename, ContentFile(blob.getvalue()), save=True)
                            except Exception as e:
                                logger.error(f"Failed to save image for row {i}: {e}")
                                
                    saved_count += 1

            messages.success(request, f"Successfully imported {saved_count} products.")
            
        except Exception as e:
            messages.error(request, f"Error processing file: {str(e)}")
            
        return redirect("admin:api_product_changelist")

    return render(request, "admin/import_products.html")
