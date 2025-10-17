#!/usr/bin/env python
"""
Test script to register a new user via the API
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from django.contrib.auth.models import User
from api.serializers import RegisterSerializer
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

print("=" * 60)
print("REGISTRATION API TEST")
print("=" * 60)

# Test data
test_data = {
    'username': 'testuser123',
    'email': 'testuser@example.com',
    'first_name': 'Test',
    'last_name': 'User',
    'password': 'SecurePass123!',
    'password2': 'SecurePass123!',
}

print("\nTest data:")
for key, value in test_data.items():
    if 'password' in key:
        print(f"  {key}: {'*' * len(value)}")
    else:
        print(f"  {key}: {value}")

print("\n" + "-" * 60)
print("Testing registration serializer...")
print("-" * 60)

# Create a mock request
factory = APIRequestFactory()
request = factory.post('/api/register/')
request = Request(request)

# Test serializer
serializer = RegisterSerializer(data=test_data, context={'request': request})

if serializer.is_valid():
    print("✅ Validation PASSED")
    print("\nCreating user...")
    try:
        user = serializer.save()
        print(f"✅ User created successfully!")
        print(f"  - ID: {user.id}")
        print(f"  - Username: {user.username}")
        print(f"  - Email: {user.email}")
        print(f"  - Name: {user.first_name} {user.last_name}")
        print(f"  - Password is hashed: {user.password[:20]}...")
    except Exception as e:
        print(f"❌ Error creating user: {e}")
else:
    print("❌ Validation FAILED")
    print("\nErrors:")
    for field, errors in serializer.errors.items():
        print(f"  {field}: {errors}")

print("\n" + "-" * 60)
print("Current users in database:")
print("-" * 60)
users = User.objects.all().order_by('-id')
for user in users:
    print(f"  - {user.username} ({user.email})")

print("\n" + "=" * 60)
