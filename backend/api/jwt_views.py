"""
Custom JWT Token Views with Rate Limiting
Provides rate-limited token obtain and refresh endpoints.
"""

from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


def ratelimit_error_response():
    """
    Return a standardized rate limit error response.
    """
    return Response(
        {
            'error': 'Too many requests',
            'detail': 'You have exceeded the rate limit. Please try again later.',
            'retry_after': '60'  # seconds
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS
    )


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='dispatch')
class RateLimitedTokenObtainPairView(TokenObtainPairView):
    """
    Token obtain view with rate limiting.
    Limited to 5 login attempts per minute per IP address.
    """
    
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except Ratelimited:
            return ratelimit_error_response()


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='dispatch')
class RateLimitedTokenRefreshView(TokenRefreshView):
    """
    Token refresh view with rate limiting.
    Limited to 10 refresh attempts per minute per IP address.
    """
    
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except Ratelimited:
            return ratelimit_error_response()
