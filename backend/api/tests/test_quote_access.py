from decimal import Decimal

from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import Category, Product


class QuoteAccessControlTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Cat', slug='cat')
        self.product = Product.objects.create(
            category=self.category,
            name='Test Product',
            price=Decimal('10.00'),
            stock=10,
            available=True,
        )

    def _create_quote(self):
        url = reverse('create_quote')
        payload = {
            'items': [{'id': self.product.id, 'quantity': 1}],
            'customer_name': 'Jane Doe',
            'email': 'jane@example.com',
            'billing_address': {
                'address_line_1': '123 Main',
                'address_line_2': '',
                'city': 'Douala',
                'postal_code': '00000',
                'country': 'Cameroon',
                'state': '',
            },
            'same_as_billing': True,
            'shipping_cost': '0.00',
            'tax_rate': '21.00',
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIn('quote_number', res.data)
        self.assertIn('access_token', res.data)
        return res.data['quote_number'], res.data['access_token']

    def test_quote_detail_requires_token_when_anonymous(self):
        quote_number, access_token = self._create_quote()

        url = reverse('quote_detail', kwargs={'quote_number': quote_number})

        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)

        res_ok = self.client.get(url, {'token': access_token})
        self.assertEqual(res_ok.status_code, 200)

    def test_quote_pdf_requires_token_when_anonymous(self):
        quote_number, access_token = self._create_quote()

        url = reverse('quote_pdf', kwargs={'quote_number': quote_number})

        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)

        res_ok = self.client.get(url, {'token': access_token})
        # PDF engine may fail on some environments; we only assert access control.
        self.assertNotEqual(res_ok.status_code, 403)
