from django.core.management.base import BaseCommand
from api.models import Category


class Command(BaseCommand):
    help = 'Rebuild the MPTT tree for Category model'

    def handle(self, *args, **options):
        self.stdout.write('Rebuilding MPTT tree for Category model...')
        
        # Rebuild the tree structure
        Category.objects.rebuild()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully rebuilt MPTT tree for Category model')
        )