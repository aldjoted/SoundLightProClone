from django.core.management.base import BaseCommand
from api.vector_search import build_and_save_faiss_index

class Command(BaseCommand):
    help = 'Generate product embeddings and build the Faiss index for all products.'

    def handle(self, *args, **options):
        count = build_and_save_faiss_index()
        if count is not None:
            self.stdout.write(self.style.SUCCESS(f'Successfully generated embeddings and built Faiss index for {count} products.'))
        else:
            self.stdout.write(self.style.WARNING('No products found to index.'))
