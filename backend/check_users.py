#!/usr/bin/env python
"""
Simple script to check users in the database
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from django.contrib.auth.models import User

print("=" * 60)
print("USER DATABASE CHECK")
print("=" * 60)
print(f"\nTotal users in database: {User.objects.count()}")
print("\nRecent users (last 10):")
print("-" * 60)

users = User.objects.order_by('-date_joined')[:10]
if users:
    for user in users:
        print(f"  ID: {user.id}")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Name: {user.first_name} {user.last_name}")
        print(f"  Created: {user.date_joined}")
        print(f"  Is Staff: {user.is_staff}")
        print(f"  Is Active: {user.is_active}")
        print("-" * 60)
else:
    print("  No users found in database.")

print("\n" + "=" * 60)
