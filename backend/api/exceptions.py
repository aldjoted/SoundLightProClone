"""
Custom exception handlers for consistent error responses across the API.

All API responses follow a consistent format:
- Success: { "data": ..., "status_code": 200 }
- Error: { "error": "message", "status_code": 4xx/5xx }
- Validation Errors: { "errors": { "field": ["messages"] }, "status_code": 400 }

This module provides centralized error handling with proper logging and
user-friendly error messages.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Final

from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler

if TYPE_CHECKING:
    from rest_framework.request import Request

__all__: Final[list[str]] = ["custom_exception_handler"]

logger: Final = logging.getLogger(__name__)


def custom_exception_handler(
    exc: Exception, context: dict[str, Any]
) -> Response | None:
    """
    Custom exception handler for consistent error responses.

    Response Format:
        - Single error: {"error": "message", "status_code": xxx}
        - Validation errors: {"errors": {"field": ["messages"]}, "status_code": 400}
        - All responses include status_code for client convenience

    Features:
        - Consistent error response format across all endpoints
        - Proper logging of exceptions with context
        - User-friendly error messages for clients
        - Detailed logging for debugging

    Args:
        exc: The exception that was raised.
        context: Dictionary containing 'request', 'view', and other context.

    Returns:
        A Response object with standardized error format, or None if the
        exception should not be handled.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    # Get request info for logging
    request: Request | None = context.get("request")
    view = context.get("view")
    request_path = getattr(request, "path", "unknown") if request else "unknown"
    request_method = getattr(request, "method", "unknown") if request else "unknown"
    view_name = view.__class__.__name__ if view else None

    if response is not None:
        # Log based on status code severity
        if response.status_code >= 500:
            logger.error(
                f"Server error at {request_method} {request_path}: {exc}",
                exc_info=True,
                extra={"view": view_name},
            )
        elif response.status_code >= 400:
            logger.warning(
                f"Client error at {request_method} {request_path}: {exc}",
                extra={"view": view_name},
            )

        # Standardize response format
        if isinstance(exc, ValidationError):
            response.data = {"errors": response.data, "status_code": response.status_code}
        elif isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            response.data = {
                "error": str(response.data.get("detail", "Authentication required.")),
                "status_code": response.status_code,
                "code": "authentication_failed",
            }
        elif isinstance(exc, PermissionDenied):
            response.data = {
                "error": str(response.data.get("detail", "Permission denied.")),
                "status_code": response.status_code,
                "code": "permission_denied",
            }
        else:
            # All other errors - standardize to single error message
            error_detail = response.data.get("detail") if isinstance(response.data, dict) else None

            if error_detail:
                response.data = {"error": str(error_detail), "status_code": response.status_code}
            elif isinstance(response.data, dict):
                response.data = {"errors": response.data, "status_code": response.status_code}
            else:
                response.data = {
                    "error": str(response.data) if response.data else "An error occurred.",
                    "status_code": response.status_code,
                }

        return response

    # Handle unexpected exceptions that weren't caught by DRF
    logger.error(
        f"Unhandled exception at {request_method} {request_path}: {exc}",
        exc_info=True,
        extra={"view": view_name, "exception_type": type(exc).__name__},
    )

    return Response(
        {"error": "An unexpected error occurred. Please try again later.", "status_code": 500},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
