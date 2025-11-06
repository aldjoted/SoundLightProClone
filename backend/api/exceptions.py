"""
Custom exception handlers for consistent error responses across the API.
✅ IMPROVEMENT: Centralized error handling with proper logging
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for consistent error responses.
    
    Provides:
    - Consistent error response format
    - Proper logging of exceptions
    - User-friendly error messages
    - Detailed logging for debugging
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Customize response format for consistency
        error_detail = response.data.get('detail', None)
        
        if error_detail:
            # Simple error with detail field
            response.data = {
                'error': str(error_detail),
                'status_code': response.status_code
            }
        else:
            # Complex error with multiple fields
            response.data = {
                'errors': response.data,
                'status_code': response.status_code
            }
        
        return response
    
    # Handle unexpected exceptions that weren't caught by DRF
    logger.error(
        f"Unhandled exception: {exc}",
        exc_info=True,
        extra={
            'view': context.get('view'),
            'request': context.get('request'),
        }
    )
    
    return Response({
        'error': 'An unexpected error occurred. Please try again later.',
        'status_code': 500
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
