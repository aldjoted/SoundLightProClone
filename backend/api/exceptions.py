"""
Custom exception handlers for consistent error responses across the API.
✅ IMPROVEMENT: Centralized error handling with proper logging

All API responses follow a consistent format:
- Success: { "data": ..., "status_code": 200 }
- Error: { "error": "message", "status_code": 4xx/5xx }
- Validation Errors: { "errors": { "field": ["messages"] }, "status_code": 400 }
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, AuthenticationFailed, NotAuthenticated, PermissionDenied
from django.http import Http404
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for consistent error responses.
    
    Response Format:
    - Single error: {"error": "message", "status_code": xxx}
    - Validation errors: {"errors": {"field": ["messages"]}, "status_code": 400}
    - All responses include status_code for client convenience
    
    Provides:
    - Consistent error response format across all endpoints
    - Proper logging of exceptions with context
    - User-friendly error messages
    - Detailed logging for debugging
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Get request info for logging
    request = context.get('request')
    view = context.get('view')
    request_path = getattr(request, 'path', 'unknown') if request else 'unknown'
    request_method = getattr(request, 'method', 'unknown') if request else 'unknown'
    
    if response is not None:
        # Log based on status code severity
        if response.status_code >= 500:
            logger.error(
                f"Server error at {request_method} {request_path}: {exc}",
                exc_info=True,
                extra={'view': view.__class__.__name__ if view else None}
            )
        elif response.status_code >= 400:
            logger.warning(
                f"Client error at {request_method} {request_path}: {exc}",
                extra={'view': view.__class__.__name__ if view else None}
            )
        
        # Standardize response format
        if isinstance(exc, ValidationError):
            # Validation errors: keep field-level detail
            response.data = {
                'errors': response.data,
                'status_code': response.status_code
            }
        elif isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            # Authentication errors
            response.data = {
                'error': str(response.data.get('detail', 'Authentication required.')),
                'status_code': response.status_code,
                'code': 'authentication_failed'
            }
        elif isinstance(exc, PermissionDenied):
            # Permission errors
            response.data = {
                'error': str(response.data.get('detail', 'Permission denied.')),
                'status_code': response.status_code,
                'code': 'permission_denied'
            }
        else:
            # All other errors - standardize to single error message
            error_detail = response.data.get('detail', None)
            
            if error_detail:
                # Simple error with detail field
                response.data = {
                    'error': str(error_detail),
                    'status_code': response.status_code
                }
            elif isinstance(response.data, dict):
                # Complex error with multiple fields (treat as validation-like)
                response.data = {
                    'errors': response.data,
                    'status_code': response.status_code
                }
            else:
                # Fallback for unexpected formats
                response.data = {
                    'error': str(response.data) if response.data else 'An error occurred.',
                    'status_code': response.status_code
                }
        
        return response
    
    # Handle unexpected exceptions that weren't caught by DRF
    logger.error(
        f"Unhandled exception at {request_method} {request_path}: {exc}",
        exc_info=True,
        extra={
            'view': view.__class__.__name__ if view else None,
            'exception_type': type(exc).__name__,
        }
    )
    
    return Response({
        'error': 'An unexpected error occurred. Please try again later.',
        'status_code': 500
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
