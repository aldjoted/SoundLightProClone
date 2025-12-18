"""
Shared utility functions for the API module.

This module contains reusable helper functions that are used across
multiple views and services to avoid code duplication.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import TYPE_CHECKING, Final

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

if TYPE_CHECKING:
    from datetime import timedelta

__all__: Final[list[str]] = [
    "ratelimit_error_response",
    "parse_date_param",
    "get_cookie_settings",
]

logger: Final = logging.getLogger(__name__)


def ratelimit_error_response() -> Response:
    """
    Generate a standardized rate limit error response.

    Returns a JSON response with HTTP 429 status code for rate-limited requests.
    Used by authentication views and other rate-limited endpoints.

    Returns:
        A DRF Response with rate limit error details including:
        - error: Short error description
        - detail: User-friendly explanation
        - retry_after: Suggested wait time in seconds
    """
    return Response(
        {
            "error": "Too many requests",
            "detail": "You have exceeded the rate limit. Please try again later.",
            "retry_after": "60",
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS,
    )


def parse_date_param(date_string: str | None, param_name: str = "date") -> date | None:
    """
    Safely parse a date string in YYYY-MM-DD format.

    Args:
        date_string: The date string to parse (e.g., '2024-01-15').
        param_name: Name of the parameter for logging purposes.

    Returns:
        A date object if parsing succeeds, None otherwise.
    """
    if not date_string:
        return None

    try:
        return datetime.strptime(date_string, "%Y-%m-%d").date()
    except ValueError:
        logger.warning(
            f"Invalid {param_name} format: '{date_string}'. Expected YYYY-MM-DD."
        )
        return None


def get_cookie_settings() -> dict[str, str | int | bool | None]:
    """
    Get httpOnly cookie settings from Django settings.

    Centralizes cookie configuration for JWT refresh tokens to ensure
    consistent security settings across all authentication endpoints.

    Cross-Origin Configuration:
        - In development, SameSite='Lax' allows cookies in cross-origin GET navigation.
        - For cross-origin POST requests (like token refresh), set
          AUTH_COOKIE_SAMESITE_FORCE_NONE=True to use SameSite='None' + Secure.
        - In production with same-origin, SameSite='Strict' provides maximum security.

    Returns:
        Dictionary with cookie configuration including:
        - key: Cookie name (default: 'refreshToken')
        - httponly: Whether JavaScript can access the cookie
        - secure: Whether to require HTTPS
        - samesite: SameSite policy ('Strict', 'Lax', or 'None')
        - path: Cookie path scope
        - max_age: Cookie lifetime in seconds
        - domain: Cookie domain (None uses default)
    """
    jwt_settings = settings.SIMPLE_JWT
    is_debug: bool = settings.DEBUG

    # Determine if we're in a cross-origin development setup
    is_cross_origin_dev = is_debug and jwt_settings.get(
        "AUTH_COOKIE_SAMESITE_FORCE_NONE", False
    )

    # SameSite configuration:
    # - 'None' requires Secure=True, enables cross-origin cookies
    # - 'Lax' allows cookies on same-site navigations (safe default for dev)
    # - 'Strict' maximum security for same-origin production
    if is_cross_origin_dev:
        samesite = "None"
        secure = True  # Required when SameSite=None
    elif is_debug:
        samesite = jwt_settings.get("AUTH_COOKIE_SAMESITE", "Lax")
        secure = jwt_settings.get("AUTH_COOKIE_SECURE", False)
    else:
        samesite = jwt_settings.get("AUTH_COOKIE_SAMESITE", "Strict")
        secure = jwt_settings.get("AUTH_COOKIE_SECURE", True)

    # Get refresh token lifetime and convert to seconds
    refresh_lifetime: timedelta = jwt_settings["REFRESH_TOKEN_LIFETIME"]

    return {
        "key": jwt_settings.get("AUTH_COOKIE", "refreshToken"),
        "httponly": jwt_settings.get("AUTH_COOKIE_HTTP_ONLY", True),
        "secure": secure,
        "samesite": samesite,
        "path": jwt_settings.get("AUTH_COOKIE_PATH", "/api/"),
        "max_age": int(refresh_lifetime.total_seconds()),
        "domain": jwt_settings.get("AUTH_COOKIE_DOMAIN"),
    }
