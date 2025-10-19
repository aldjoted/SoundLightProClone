"""
Test script to verify registration and login functionality.
Run this from the backend directory: python test_auth_flow.py
"""

import os
import sys
import django
import json
from datetime import datetime

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from django.contrib.auth.models import User
from django.test import RequestFactory, Client
from api.serializers import RegisterSerializer
from api.models import UserProfile


def test_registration():
    """Test user registration process"""
    print("\n" + "="*60)
    print("TESTING REGISTRATION")
    print("="*60)
    
    # Create a unique test user
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_data = {
        'username': f'testuser_{timestamp}',
        'email': f'test_{timestamp}@example.com',
        'first_name': 'Test',
        'last_name': 'User',
        'password': 'TestPass123!@#',
        'password2': 'TestPass123!@#'
    }
    
    print(f"\n1. Testing with data:")
    print(f"   Username: {test_data['username']}")
    print(f"   Email: {test_data['email']}")
    print(f"   Name: {test_data['first_name']} {test_data['last_name']}")
    
    # Test serializer validation
    serializer = RegisterSerializer(data=test_data)
    
    if not serializer.is_valid():
        print("\n❌ FAILED: Serializer validation failed")
        print(f"   Errors: {serializer.errors}")
        return None
    
    print("\n✅ PASSED: Serializer validation successful")
    
    # Create user
    try:
        user = serializer.save()
        print(f"\n✅ PASSED: User created successfully")
        print(f"   User ID: {user.id}")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Full Name: {user.first_name} {user.last_name}")
        print(f"   Password hashed: {user.password[:20]}...")
    except Exception as e:
        print(f"\n❌ FAILED: User creation failed")
        print(f"   Error: {str(e)}")
        return None
    
    # Check if UserProfile was created
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"\n✅ PASSED: UserProfile auto-created")
        print(f"   Profile ID: {profile.id}")
        print(f"   Phone: {profile.phone or 'Not set'}")
        print(f"   Preferred Language: {profile.preferred_language}")
        print(f"   Email Notifications: {profile.email_notifications}")
    except UserProfile.DoesNotExist:
        print(f"\n❌ FAILED: UserProfile was NOT auto-created")
        return None
    
    # Verify password was hashed correctly
    if user.check_password('TestPass123!@#'):
        print(f"\n✅ PASSED: Password hashed and verified correctly")
    else:
        print(f"\n❌ FAILED: Password verification failed")
        return None
    
    return user


def test_login(username, password):
    """Test user login process"""
    print("\n" + "="*60)
    print("TESTING LOGIN")
    print("="*60)
    
    client = Client()
    
    print(f"\n1. Attempting login:")
    print(f"   Username: {username}")
    print(f"   Password: {'*' * len(password)}")
    
    # Test login endpoint
    response = client.post(
        '/api/token/',
        data=json.dumps({'username': username, 'password': password}),
        content_type='application/json'
    )
    
    print(f"\n   Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ PASSED: Login successful")
        print(f"   Access token received: {data.get('access', 'N/A')[:50]}...")
        print(f"   Refresh token received: {'Yes' if data.get('refresh') else 'No'}")
        return True
    else:
        print(f"\n❌ FAILED: Login failed")
        try:
            error_data = response.json()
            print(f"   Error: {error_data}")
        except:
            print(f"   Response: {response.content}")
        return False


def test_duplicate_registration():
    """Test that duplicate usernames and emails are rejected"""
    print("\n" + "="*60)
    print("TESTING DUPLICATE REGISTRATION PREVENTION")
    print("="*60)
    
    # Create first user
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_data = {
        'username': f'duptest_{timestamp}',
        'email': f'duptest_{timestamp}@example.com',
        'first_name': 'Dup',
        'last_name': 'Test',
        'password': 'TestPass123!@#',
        'password2': 'TestPass123!@#'
    }
    
    serializer1 = RegisterSerializer(data=test_data)
    if serializer1.is_valid():
        user1 = serializer1.save()
        print(f"\n1. First user created: {user1.username}")
    else:
        print(f"\n❌ FAILED: Could not create first user")
        return
    
    # Try to create duplicate username
    test_data2 = test_data.copy()
    test_data2['email'] = f'different_{timestamp}@example.com'
    
    serializer2 = RegisterSerializer(data=test_data2)
    if not serializer2.is_valid():
        if 'username' in serializer2.errors:
            print(f"\n✅ PASSED: Duplicate username rejected")
            print(f"   Error: {serializer2.errors['username']}")
        else:
            print(f"\n⚠️  WARNING: Username not rejected but validation failed")
            print(f"   Errors: {serializer2.errors}")
    else:
        print(f"\n❌ FAILED: Duplicate username was NOT rejected")
    
    # Try to create duplicate email
    test_data3 = {
        'username': f'different_{timestamp}',
        'email': test_data['email'],  # Same email as first user
        'first_name': 'Dup',
        'last_name': 'Test',
        'password': 'TestPass123!@#',
        'password2': 'TestPass123!@#'
    }
    
    serializer3 = RegisterSerializer(data=test_data3)
    if not serializer3.is_valid():
        if 'email' in serializer3.errors:
            print(f"\n✅ PASSED: Duplicate email rejected")
            print(f"   Error: {serializer3.errors['email']}")
        else:
            print(f"\n⚠️  WARNING: Email not rejected but validation failed")
            print(f"   Errors: {serializer3.errors}")
    else:
        print(f"\n❌ FAILED: Duplicate email was NOT rejected")


def test_password_mismatch():
    """Test that mismatched passwords are rejected"""
    print("\n" + "="*60)
    print("TESTING PASSWORD MISMATCH VALIDATION")
    print("="*60)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_data = {
        'username': f'pwtest_{timestamp}',
        'email': f'pwtest_{timestamp}@example.com',
        'first_name': 'PW',
        'last_name': 'Test',
        'password': 'TestPass123!@#',
        'password2': 'DifferentPass123!@#'  # Intentionally different
    }
    
    serializer = RegisterSerializer(data=test_data)
    if not serializer.is_valid():
        if 'password' in serializer.errors:
            print(f"\n✅ PASSED: Password mismatch detected")
            print(f"   Error: {serializer.errors['password']}")
        else:
            print(f"\n⚠️  WARNING: Password mismatch not caught properly")
            print(f"   Errors: {serializer.errors}")
    else:
        print(f"\n❌ FAILED: Password mismatch was NOT detected")


def cleanup_test_users():
    """Clean up test users created during testing"""
    print("\n" + "="*60)
    print("CLEANING UP TEST USERS")
    print("="*60)
    
    test_users = User.objects.filter(username__startswith='testuser_')
    test_users_dup = User.objects.filter(username__startswith='duptest_')
    test_users_pw = User.objects.filter(username__startswith='pwtest_')
    
    all_test_users = test_users | test_users_dup | test_users_pw
    count = all_test_users.count()
    
    if count > 0:
        all_test_users.delete()
        print(f"\n✅ Deleted {count} test user(s)")
    else:
        print(f"\n   No test users to clean up")


if __name__ == '__main__':
    print("\n" + "="*60)
    print("AUTHENTICATION FLOW TEST SUITE")
    print("="*60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests
    user = test_registration()
    
    if user:
        test_login(user.username, 'TestPass123!@#')
        
        # Test wrong password
        print("\n" + "="*60)
        print("TESTING LOGIN WITH WRONG PASSWORD")
        print("="*60)
        test_login(user.username, 'WrongPassword123')
    
    test_duplicate_registration()
    test_password_mismatch()
    
    # Cleanup
    cleanup_test_users()
    
    print("\n" + "="*60)
    print("TEST SUITE COMPLETED")
    print("="*60)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
