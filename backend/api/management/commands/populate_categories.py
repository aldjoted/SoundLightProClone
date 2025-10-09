"""
Django management command to populate categories from productscategory.json
Usage: python manage.py populate_categories
Options:
  --clear: Clear all existing categories before populating
  --dry-run: Preview changes without saving to database
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
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without saving to database',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('🔍 DRY RUN MODE - No changes will be saved\n')
            )
        
        # Get the path to the JSON file
        json_file_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'migrations',
            'productscategory.json'
        )

        # Check if file exists
        if not os.path.exists(json_file_path):
            self.stdout.write(
                self.style.ERROR(f'❌ File not found: {json_file_path}')
            )
            return

        self.stdout.write(f'📂 Reading from: {json_file_path}\n')

        # Clear existing categories if --clear flag is provided
        if options['clear']:
            count = Category.objects.count()
            if not dry_run:
                Category.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f'🗑️  {"Would delete" if dry_run else "Deleted"} {count} existing categories\n')
            )

        # Read the JSON file
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Invalid JSON format: {str(e)}')
            )
            return
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error reading JSON file: {str(e)}')
            )
            return

        # Process categories
        categories_data = data.get('categories', [])
        
        if not categories_data:
            self.stdout.write(
                self.style.WARNING('⚠️  No categories found in JSON file')
            )
            return

        self.stdout.write(f'📊 Found {len(categories_data)} main categories to process\n')

        created_count = 0
        updated_count = 0
        error_count = 0

        # Process each top-level category
        for category_data in categories_data:
            try:
                # Create or update the main category
                cat_result = self._process_category(
                    category_data=category_data,
                    parent=None,
                    dry_run=dry_run,
                    level=0
                )
                
                if cat_result:
                    created_count += cat_result['created']
                    updated_count += cat_result['updated']
                    error_count += cat_result['errors']

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'❌ Error processing category {category_data.get("name", "Unknown")}: {str(e)}')
                )

        # Rebuild MPTT tree
        if not dry_run:
            try:
                Category.objects.rebuild()
                self.stdout.write(
                    self.style.SUCCESS('\n✅ MPTT tree rebuilt successfully')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error rebuilding MPTT tree: {str(e)}')
                )
        else:
            self.stdout.write(
                self.style.WARNING('\n🔍 Would rebuild MPTT tree (dry run)')
            )

        # Summary
        self.stdout.write('\n' + '=' * 60)
        action_prefix = 'Would create' if dry_run else 'Created'
        self.stdout.write(self.style.SUCCESS(f'📦 {action_prefix}: {created_count} categories'))
        self.stdout.write(self.style.SUCCESS(f'🔄 {"Would update" if dry_run else "Updated"}: {updated_count} categories'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'❌ Errors: {error_count}'))
        self.stdout.write('=' * 60)
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\n💡 Run without --dry-run to apply changes')
            )

    def _process_category(self, category_data, parent, dry_run, level=0):
        """
        Recursively process a category and all its subcategories.
        Returns a dict with counts: {'created': int, 'updated': int, 'errors': int}
        """
        created = 0
        updated = 0
        errors = 0
        indent = '  ' * level
        
        # Validate required fields
        if 'name' not in category_data or 'id' not in category_data:
            self.stdout.write(
                self.style.ERROR(f'{indent}❌ Missing required fields (name or id) in category data')
            )
            return {'created': 0, 'updated': 0, 'errors': 1}
        
        try:
            # Create or update the category
            cat_result = self._create_or_update_category(
                name=category_data['name'],
                slug=category_data['id'],
                parent=parent,
                dry_run=dry_run
            )
            
            if cat_result['created']:
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(f'{indent}✅ {"Would create" if dry_run else "Created"}: {category_data["name"]} (id: {category_data["id"]})')
                )
            else:
                updated += 1
                self.stdout.write(
                    self.style.SUCCESS(f'{indent}🔄 {"Would update" if dry_run else "Updated"}: {category_data["name"]} (id: {category_data["id"]})')
                )
            
            # Process subcategories recursively
            subcategories = category_data.get('subcategories', [])
            if subcategories:
                parent_category = cat_result.get('category')
                for subcat_data in subcategories:
                    subcat_result = self._process_category(
                        category_data=subcat_data,
                        parent=parent_category,
                        dry_run=dry_run,
                        level=level + 1
                    )
                    created += subcat_result['created']
                    updated += subcat_result['updated']
                    errors += subcat_result['errors']
        
        except Exception as e:
            errors += 1
            self.stdout.write(
                self.style.ERROR(f'{indent}❌ Error processing {category_data.get("name", "Unknown")}: {str(e)}')
            )
        
        return {'created': created, 'updated': updated, 'errors': errors}

    def _create_or_update_category(self, name, slug, parent=None, dry_run=False):
        """
        Create or update a category.
        Returns a dict with 'category' and 'created' keys.
        """
        if dry_run:
            # In dry run mode, check if category exists but don't modify
            try:
                category = Category.objects.get(slug=slug, parent=parent)
                return {'category': category, 'created': False}
            except Category.DoesNotExist:
                # Return a mock object for dry run
                return {'category': None, 'created': True}
        
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
