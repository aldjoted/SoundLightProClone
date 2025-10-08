"""
Django management command to populate categories from productscategory.json
Usage: python manage.py populate_categories
"""
import json
import os
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from api.models import Category


class Command(BaseCommand):
    help = 'Populate categories and subcategories from productscategory.json file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing categories before populating',
        )

    def handle(self, *args, **options):
        # Get the path to the JSON file
        json_file_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'migrations',
            'productscategory.json'
        )

        # Check if file exists
        if not os.path.exists(json_file_path):
            self.stdout.write(
                self.style.ERROR(f'File not found: {json_file_path}')
            )
            return

        # Clear existing categories if --clear flag is provided
        if options['clear']:
            count = Category.objects.count()
            Category.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f'Deleted {count} existing categories')
            )

        # Read the JSON file
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error reading JSON file: {str(e)}')
            )
            return

        # Process categories
        categories_data = data.get('categories', [])
        
        if not categories_data:
            self.stdout.write(
                self.style.WARNING('No categories found in JSON file')
            )
            return

        created_count = 0
        updated_count = 0
        error_count = 0

        # Process each top-level category
        for category_data in categories_data:
            try:
                # Create or update the main category
                cat_result = self._create_or_update_category(
                    name=category_data['name'],
                    slug=category_data['id'],
                    parent=None
                )
                
                if cat_result['created']:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Created category: {category_data["name"]}')
                    )
                else:
                    updated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'↻ Updated category: {category_data["name"]}')
                    )
                
                parent_category = cat_result['category']

                # Process subcategories
                subcategories = category_data.get('subcategories', [])
                for subcat_data in subcategories:
                    try:
                        subcat_result = self._create_or_update_category(
                            name=subcat_data['name'],
                            slug=subcat_data['id'],
                            parent=parent_category
                        )
                        
                        if subcat_result['created']:
                            created_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(f'  ✓ Created subcategory: {subcat_data["name"]}')
                            )
                        else:
                            updated_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(f'  ↻ Updated subcategory: {subcat_data["name"]}')
                            )

                        # Process nested subcategories (if any)
                        nested_subcats = subcat_data.get('subcategories', [])
                        if nested_subcats:
                            sub_parent = subcat_result['category']
                            for nested_subcat_data in nested_subcats:
                                try:
                                    nested_result = self._create_or_update_category(
                                        name=nested_subcat_data['name'],
                                        slug=nested_subcat_data['id'],
                                        parent=sub_parent
                                    )
                                    
                                    if nested_result['created']:
                                        created_count += 1
                                        self.stdout.write(
                                            self.style.SUCCESS(f'    ✓ Created nested subcategory: {nested_subcat_data["name"]}')
                                        )
                                    else:
                                        updated_count += 1
                                        self.stdout.write(
                                            self.style.SUCCESS(f'    ↻ Updated nested subcategory: {nested_subcat_data["name"]}')
                                        )
                                except Exception as e:
                                    error_count += 1
                                    self.stdout.write(
                                        self.style.ERROR(f'    ✗ Error creating nested subcategory {nested_subcat_data["name"]}: {str(e)}')
                                    )

                    except Exception as e:
                        error_count += 1
                        self.stdout.write(
                            self.style.ERROR(f'  ✗ Error creating subcategory {subcat_data["name"]}: {str(e)}')
                        )

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'✗ Error creating category {category_data.get("name", "Unknown")}: {str(e)}')
                )

        # Rebuild MPTT tree
        try:
            Category.objects.rebuild()
            self.stdout.write(
                self.style.SUCCESS('\n✓ MPTT tree rebuilt successfully')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error rebuilding MPTT tree: {str(e)}')
            )

        # Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Categories created: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'Categories updated: {updated_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write('=' * 50)

    def _create_or_update_category(self, name, slug, parent=None):
        """
        Create or update a category.
        Returns a dict with 'category' and 'created' keys.
        """
        # Try to find existing category by slug and parent
        try:
            category = Category.objects.get(slug=slug, parent=parent)
            # Update the name if it has changed
            if category.name != name:
                category.name = name
                category.save()
            return {'category': category, 'created': False}
        except Category.DoesNotExist:
            # Create new category
            category = Category.objects.create(
                name=name,
                slug=slug,
                parent=parent
            )
            return {'category': category, 'created': True}
