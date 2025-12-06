"""
Shared utility functions for the API module.

This module contains reusable helper functions that are used across
multiple views and services to avoid code duplication.
"""

import logging
from datetime import datetime
from typing import Optional

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def ratelimit_error_response() -> Response:
    """
    Generate a standardized rate limit error response.
    
    Returns a JSON response with 429 status code for rate-limited requests.
    Used by authentication views and other rate-limited endpoints.
    
    Returns:
        Response: DRF Response with rate limit error details
    """
    return Response(
        {
            'error': 'Too many requests',
            'detail': 'You have exceeded the rate limit. Please try again later.',
            'retry_after': '60'  # seconds
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS
    )


def parse_date_param(date_string: Optional[str], param_name: str = 'date') -> Optional[datetime]:
    """
    Safely parse a date string in YYYY-MM-DD format.
    
    Args:
        date_string: The date string to parse (e.g., '2024-01-15')
        param_name: Name of the parameter for logging purposes
        
    Returns:
        datetime.date object if parsing succeeds, None otherwise
    """
    if not date_string:
        return None
    
    try:
        return datetime.strptime(date_string, '%Y-%m-%d').date()
    except ValueError:
        logger.warning(f"Invalid {param_name} format: '{date_string}'. Expected YYYY-MM-DD.")
        return None


def get_cookie_settings() -> dict:
    """
    Get httpOnly cookie settings from Django settings.
    
    Centralizes cookie configuration for JWT refresh tokens to ensure
    consistent security settings across all authentication endpoints.
    
    ✅ CROSS-ORIGIN FIX:
    - In development, SameSite='Lax' allows cookies in cross-origin GET navigation
    - For cross-origin POST requests (like token refresh), we need SameSite='None' + Secure
    - In production with same-origin, SameSite='Strict' is used for maximum security
        
    Returns:
        dict: Cookie configuration with keys: key, httponly, secure, samesite, path, max_age, domain
    """
    # Determine if we're in a cross-origin development setup
    # When frontend and backend are on different ports (e.g., localhost:5173 and localhost:8000)
    is_cross_origin_dev = settings.DEBUG and settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE_FORCE_NONE', False)
    
    # SameSite configuration:
    # - 'None' requires Secure=True, enables cross-origin cookies
    # - 'Lax' allows cookies on same-site navigations (safe default for dev)
    # - 'Strict' maximum security for same-origin production
    if is_cross_origin_dev:
        samesite = 'None'
        secure = True  # Required when SameSite=None
    elif settings.DEBUG:
        # Development: Use Lax for easier testing
        samesite = settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax')
        secure = settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', False)
    else:
        # Production: Maximum security
        samesite = settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Strict')
        secure = settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', True)
    
    return {
        'key': settings.SIMPLE_JWT.get('AUTH_COOKIE', 'refreshToken'),
        'httponly': settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY', True),
        'secure': secure,
        'samesite': samesite,
        'path': settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/api/'),
        'max_age': int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        'domain': settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN', None),
    }
