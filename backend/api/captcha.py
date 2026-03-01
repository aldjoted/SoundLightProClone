"""
CAPTCHA verification utilities.

This module provides CAPTCHA verification support using multiple providers:
- hCaptcha (privacy-focused, GDPR compliant, recommended)
- reCAPTCHA v2/v3 (Google)

Usage:
    from api.captcha import verify_captcha

    # In your view:
    is_valid = verify_captcha(request.data.get('captcha_token'))
    if not is_valid:
        return Response({'error': 'CAPTCHA verification failed'}, status=400)

Configuration:
    Set environment variables for your chosen provider. See get_captcha_config()
    for details on the required variables.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import TYPE_CHECKING, Any, Final

import requests

if TYPE_CHECKING:
    from django.http import HttpRequest

__all__: Final[list[str]] = [
    "verify_captcha",
    "get_captcha_config",
    "is_captcha_enabled",
    "get_captcha_site_key",
    "get_captcha_provider",
    "get_client_ip",
]

logger: Final = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_captcha_config() -> dict[str, Any]:
    """
    Get CAPTCHA configuration from environment variables.

    Priority order:
    1. hCaptcha (privacy-focused, GDPR compliant)
    2. reCAPTCHA v3 (invisible, score-based)
    3. reCAPTCHA v2 (checkbox)

    Environment Variables:
        hCaptcha:
            - HCAPTCHA_SITE_KEY
            - HCAPTCHA_SECRET_KEY

        reCAPTCHA v3:
            - RECAPTCHA_V3_SITE_KEY
            - RECAPTCHA_V3_SECRET_KEY
            - RECAPTCHA_MIN_SCORE (optional, default 0.5)

        reCAPTCHA v2:
            - RECAPTCHA_SITE_KEY
            - RECAPTCHA_SECRET_KEY

    Returns:
        Dictionary with keys:
        - provider: 'hcaptcha', 'recaptcha_v2', 'recaptcha_v3', or None
        - secret_key: The secret key for verification
        - site_key: The site key for frontend
        - verify_url: The verification API endpoint
        - min_score: Minimum score for reCAPTCHA v3 (default 0.5)
    """
    # Try hCaptcha first (privacy-focused alternative)
    hcaptcha_secret = os.getenv("HCAPTCHA_SECRET_KEY")
    hcaptcha_site = os.getenv("HCAPTCHA_SITE_KEY")

    if hcaptcha_secret and hcaptcha_site:
        return {
            "provider": "hcaptcha",
            "secret_key": hcaptcha_secret,
            "site_key": hcaptcha_site,
            "verify_url": "https://hcaptcha.com/siteverify",
        }

    # Try reCAPTCHA v3
    recaptcha_v3_secret = os.getenv("RECAPTCHA_V3_SECRET_KEY")
    recaptcha_v3_site = os.getenv("RECAPTCHA_V3_SITE_KEY")

    if recaptcha_v3_secret and recaptcha_v3_site:
        return {
            "provider": "recaptcha_v3",
            "secret_key": recaptcha_v3_secret,
            "site_key": recaptcha_v3_site,
            "verify_url": "https://www.google.com/recaptcha/api/siteverify",
            "min_score": float(os.getenv("RECAPTCHA_MIN_SCORE", "0.5")),
        }

    # Try reCAPTCHA v2
    recaptcha_secret = os.getenv("RECAPTCHA_SECRET_KEY")
    recaptcha_site = os.getenv("RECAPTCHA_SITE_KEY")

    if recaptcha_secret and recaptcha_site:
        return {
            "provider": "recaptcha_v2",
            "secret_key": recaptcha_secret,
            "site_key": recaptcha_site,
            "verify_url": "https://www.google.com/recaptcha/api/siteverify",
        }

    # No CAPTCHA configured
    return {
        "provider": None,
        "secret_key": None,
        "site_key": None,
    }


def is_captcha_enabled() -> bool:
    """Check if CAPTCHA is configured and enabled."""
    config = get_captcha_config()
    return config["provider"] is not None


def get_captcha_site_key() -> str | None:
    """Get the site key for frontend integration."""
    config = get_captcha_config()
    return config.get("site_key")


def get_captcha_provider() -> str | None:
    """Get the configured CAPTCHA provider name."""
    config = get_captcha_config()
    return config.get("provider")


def verify_hcaptcha(
    token: str, secret_key: str, remote_ip: str | None = None
) -> bool:
    """
    Verify hCaptcha token.

    Args:
        token: The hCaptcha response token from frontend.
        secret_key: Your hCaptcha secret key.
        remote_ip: Optional IP address of the user.

    Returns:
        True if verification succeeded, False otherwise.
    """
    try:
        data: dict[str, str] = {"secret": secret_key, "response": token}
        if remote_ip:
            data["remoteip"] = remote_ip

        response = requests.post(
            "https://hcaptcha.com/siteverify", data=data, timeout=10
        )
        result = response.json()

        if result.get("success"):
            logger.debug("hCaptcha verification successful")
            return True

        error_codes = result.get("error-codes", [])
        logger.warning(f"hCaptcha verification failed: {error_codes}")
        return False

    except requests.RequestException as e:
        logger.error(f"hCaptcha verification request failed: {e}")
        return False
    except Exception as e:
        logger.error(f"hCaptcha verification error: {e}")
        return False


def verify_recaptcha_v2(
    token: str, secret_key: str, remote_ip: str | None = None
) -> bool:
    """
    Verify reCAPTCHA v2 token.

    Args:
        token: The reCAPTCHA response token from frontend.
        secret_key: Your reCAPTCHA secret key.
        remote_ip: Optional IP address of the user.

    Returns:
        True if verification succeeded, False otherwise.
    """
    try:
        data: dict[str, str] = {"secret": secret_key, "response": token}
        if remote_ip:
            data["remoteip"] = remote_ip

        response = requests.post(
            "https://www.google.com/recaptcha/api/siteverify", data=data, timeout=10
        )
        result = response.json()

        if result.get("success"):
            logger.debug("reCAPTCHA v2 verification successful")
            return True

        error_codes = result.get("error-codes", [])
        logger.warning(f"reCAPTCHA v2 verification failed: {error_codes}")
        return False

    except requests.RequestException as e:
        logger.error(f"reCAPTCHA v2 verification request failed: {e}")
        return False
    except Exception as e:
        logger.error(f"reCAPTCHA v2 verification error: {e}")
        return False


def verify_recaptcha_v3(
    token: str,
    secret_key: str,
    min_score: float = 0.5,
    expected_action: str | None = None,
    remote_ip: str | None = None,
) -> bool:
    """
    Verify reCAPTCHA v3 token.

    Args:
        token: The reCAPTCHA response token from frontend.
        secret_key: Your reCAPTCHA secret key.
        min_score: Minimum acceptable score (0.0 to 1.0, default 0.5).
        expected_action: Expected action name to verify.
        remote_ip: Optional IP address of the user.

    Returns:
        True if verification succeeded and score >= min_score, False otherwise.
    """
    try:
        data: dict[str, str] = {"secret": secret_key, "response": token}
        if remote_ip:
            data["remoteip"] = remote_ip

        response = requests.post(
            "https://www.google.com/recaptcha/api/siteverify", data=data, timeout=10
        )
        result = response.json()

        if not result.get("success"):
            error_codes = result.get("error-codes", [])
            logger.warning(f"reCAPTCHA v3 verification failed: {error_codes}")
            return False

        # Check score
        score = result.get("score", 0)
        if score < min_score:
            logger.warning(f"reCAPTCHA v3 score too low: {score} < {min_score}")
            return False

        # Optionally verify action
        if expected_action and result.get("action") != expected_action:
            logger.warning(
                f"reCAPTCHA v3 action mismatch: expected '{expected_action}', "
                f"got '{result.get('action')}'"
            )
            return False

        logger.debug(f"reCAPTCHA v3 verification successful (score: {score})")
        return True

    except requests.RequestException as e:
        logger.error(f"reCAPTCHA v3 verification request failed: {e}")
        return False
    except Exception as e:
        logger.error(f"reCAPTCHA v3 verification error: {e}")
        return False


def verify_captcha(
    token: str,
    remote_ip: str | None = None,
    expected_action: str | None = None,
) -> bool:
    """
    Verify CAPTCHA token using the configured provider.

    This is the main entry point for CAPTCHA verification. It automatically
    uses the correct provider based on environment configuration.

    Args:
        token: The CAPTCHA response token from frontend.
        remote_ip: Optional IP address of the user (for additional security).
        expected_action: Expected action name (only used for reCAPTCHA v3).

    Returns:
        True if verification succeeded, False otherwise.

    Note:
        If CAPTCHA is not configured, this returns True (allowing requests through).
        This is intentional for development environments without CAPTCHA setup.
    """
    config = get_captcha_config()
    provider = config["provider"]

    # If CAPTCHA not configured, allow the request
    if not provider:
        from django.conf import settings as _settings
        if not getattr(_settings, 'DEBUG', True):
            logger.critical(
                "CAPTCHA is not configured in production! "
                "Registration is unprotected against bots. "
                "Set HCAPTCHA_SITE_KEY/HCAPTCHA_SECRET_KEY or RECAPTCHA_* environment variables."
            )
        logger.debug("CAPTCHA not configured, skipping verification")
        return True

    # Token is required when CAPTCHA is enabled
    if not token:
        logger.warning("CAPTCHA token missing")
        return False

    secret_key = config["secret_key"]

    if provider == "hcaptcha":
        return verify_hcaptcha(token, secret_key, remote_ip)

    if provider == "recaptcha_v2":
        return verify_recaptcha_v2(token, secret_key, remote_ip)

    if provider == "recaptcha_v3":
        min_score = config.get("min_score", 0.5)
        return verify_recaptcha_v3(token, secret_key, min_score, expected_action, remote_ip)

    logger.error(f"Unknown CAPTCHA provider: {provider}")
    return False


def get_client_ip(request: HttpRequest) -> str | None:
    """
    Extract client IP address from Django request.

    Handles both direct connections and proxied requests (behind nginx,
    load balancers, etc.).

    Args:
        request: The Django HttpRequest object.

    Returns:
        The client IP address, or None if it cannot be determined.
    """
    # Check for forwarded header (behind proxy/load balancer)
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # Take the first IP in the chain (original client)
        ip = x_forwarded_for.split(",")[0].strip()
        return ip

    # Fall back to direct connection IP
    return request.META.get("REMOTE_ADDR")
