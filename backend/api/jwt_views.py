"""
Custom JWT Token Views with httpOnly Cookie Support and Rate Limiting
Implements secure refresh token handling via httpOnly cookies.
"""

from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.conf import settings


def get_cookie_settings():
    """Get httpOnly cookie settings from Django settings."""
    return {
        'key': settings.SIMPLE_JWT.get('AUTH_COOKIE', 'refreshToken'),
        'httponly': settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY', True),
        'secure': settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', not settings.DEBUG),
        'samesite': settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Strict'),
        'path': settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/api/'),
        'max_age': int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
    }


def ratelimit_error_response():
    """Return a standardized rate limit error response."""
    return Response(
        {
            'error': 'Too many requests',
            'detail': 'You have exceeded the rate limit. Please try again later.',
            'retry_after': '60'
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS
    )


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='dispatch')
class RateLimitedTokenObtainPairView(TokenObtainPairView):
    """
    Token obtain view with httpOnly cookie support and rate limiting.
    
    ✅ SECURITY IMPROVEMENT:
    - Returns access token in response body
    - Sets refresh token as httpOnly cookie (secure, XSS-protected)
    - Rate limited to 5 attempts per minute per IP
    """
    
    def post(self, request, *args, **kwargs):
        try:
            # Get tokens from parent class
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200:
                # Extract refresh token from response
                refresh_token = response.data.get('refresh')
                
                if refresh_token:
                    # Remove refresh token from response body (security)
                    response.data.pop('refresh', None)
                    
                    # Set refresh token as httpOnly cookie
                    cookie_settings = get_cookie_settings()
                    response.set_cookie(
                        cookie_settings['key'],
                        refresh_token,
                        max_age=cookie_settings['max_age'],
                        httponly=cookie_settings['httponly'],
                        secure=cookie_settings['secure'],
                        samesite=cookie_settings['samesite'],
                        path=cookie_settings['path'],
                    )
            
            return response
            
        except Ratelimited:
            return ratelimit_error_response()


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='dispatch')
class RateLimitedTokenRefreshView(TokenRefreshView):
    """
    Token refresh view with httpOnly cookie support and rate limiting.
    
    ✅ SECURITY IMPROVEMENT:
    - Reads refresh token from httpOnly cookie instead of request body
    - Returns new access token and refreshes the httpOnly cookie
    - Rate limited to 10 attempts per minute per IP
    """
    
    def post(self, request, *args, **kwargs):
        try:
            # Get refresh token from httpOnly cookie
            cookie_settings = get_cookie_settings()
            refresh_token = request.COOKIES.get(cookie_settings['key'])
            
            if not refresh_token:
                return Response(
                    {'detail': 'Refresh token not found in cookies'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Add refresh token to request data for validation
            request.data._mutable = True
            request.data['refresh'] = refresh_token
            request.data._mutable = False
            
            # Get new tokens from parent class
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200:
                # Extract new refresh token if rotation is enabled
                new_refresh_token = response.data.get('refresh')
                
                if new_refresh_token:
                    # Remove refresh token from response body (security)
                    response.data.pop('refresh', None)
                    
                    # Update refresh token cookie
                    response.set_cookie(
                        cookie_settings['key'],
                        new_refresh_token,
                        max_age=cookie_settings['max_age'],
                        httponly=cookie_settings['httponly'],
                        secure=cookie_settings['secure'],
                        samesite=cookie_settings['samesite'],
                        path=cookie_settings['path'],
                    )
            
            return response
            
        except Ratelimited:
            return ratelimit_error_response()
