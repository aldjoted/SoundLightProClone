"""
Custom middleware for security enhancements.

This module provides:
- CSP nonce generation and injection
- Security header management
"""

import secrets
import logging
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class CSPNonceMiddleware(MiddlewareMixin):
    """
    Middleware that generates a unique nonce for each request and adds it to
    the Content-Security-Policy header for inline script protection.
    
    The nonce is stored in request.csp_nonce for use in templates.
    
    Usage in templates:
        <script nonce="{{ request.csp_nonce }}">
            // Your inline script
        </script>
    
    This allows removal of 'unsafe-inline' from CSP while still supporting
    necessary inline scripts.
    """
    
    def process_request(self, request):
        """Generate a unique nonce for this request."""
        # Generate a cryptographically secure nonce (128-bit, base64 encoded)
        request.csp_nonce = secrets.token_urlsafe(16)
        return None
    
    def process_response(self, request, response):
        """
        Add the nonce to the Content-Security-Policy header.
        
        This modifies any existing CSP header to include the nonce in script-src.
        """
        # Skip if no nonce was generated (shouldn't happen, but defensive)
        if not hasattr(request, 'csp_nonce'):
            return response
        
        nonce = request.csp_nonce
        nonce_directive = f"'nonce-{nonce}'"
        
        # Check if we have an existing CSP header (from django-csp)
        csp_header = response.get('Content-Security-Policy')
        csp_report_only = response.get('Content-Security-Policy-Report-Only')
        
        if csp_header:
            # Modify existing CSP to include nonce
            response['Content-Security-Policy'] = self._add_nonce_to_csp(
                csp_header, nonce_directive
            )
        
        if csp_report_only:
            # Also modify report-only CSP if present
            response['Content-Security-Policy-Report-Only'] = self._add_nonce_to_csp(
                csp_report_only, nonce_directive
            )
        
        # Also expose nonce as a custom header for SPA frontends
        # This allows JavaScript to read the nonce for dynamic script loading
        # Note: This is safe because the nonce changes per-request
        response['X-CSP-Nonce'] = nonce
        
        return response
    
    def _add_nonce_to_csp(self, csp_header: str, nonce_directive: str) -> str:
        """
        Add nonce to script-src directive in CSP header.
        
        Args:
            csp_header: The existing CSP header value
            nonce_directive: The nonce directive (e.g., "'nonce-abc123'")
        
        Returns:
            Modified CSP header with nonce added to script-src
        """
        directives = csp_header.split(';')
        modified_directives = []
        script_src_found = False
        
        for directive in directives:
            directive = directive.strip()
            if not directive:
                continue
            
            if directive.lower().startswith('script-src'):
                script_src_found = True
                # Remove 'unsafe-inline' if present (nonce replaces it)
                parts = directive.split()
                new_parts = [parts[0]]  # Keep 'script-src'
                
                for part in parts[1:]:
                    # Skip 'unsafe-inline' - nonce provides better security
                    if part.lower() != "'unsafe-inline'":
                        new_parts.append(part)
                
                # Add nonce
                new_parts.append(nonce_directive)
                modified_directives.append(' '.join(new_parts))
            else:
                modified_directives.append(directive)
        
        # If no script-src was found, add one with self and nonce
        if not script_src_found:
            modified_directives.append(f"script-src 'self' {nonce_directive}")
        
        return '; '.join(modified_directives)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Additional security headers middleware.
    
    Adds headers that complement Django's built-in security middleware.
    """
    
    def process_response(self, request, response):
        """Add additional security headers to response."""
        
        # Permissions-Policy (formerly Feature-Policy)
        # Restricts access to browser features
        if 'Permissions-Policy' not in response:
            response['Permissions-Policy'] = (
                "accelerometer=(), "
                "camera=(), "
                "geolocation=(), "
                "gyroscope=(), "
                "magnetometer=(), "
                "microphone=(), "
                "payment=(self), "  # Allow Stripe payments
                "usb=()"
            )
        
        # Cross-Origin-Embedder-Policy
        # Helps with isolation for SharedArrayBuffer etc.
        # Note: This can break some third-party integrations
        # Only enable in production after thorough testing
        if not settings.DEBUG and 'Cross-Origin-Embedder-Policy' not in response:
            # Using 'credentialless' for better compatibility
            response['Cross-Origin-Embedder-Policy'] = 'credentialless'
        
        # Cross-Origin-Resource-Policy
        # Prevents other origins from reading resources
        if 'Cross-Origin-Resource-Policy' not in response:
            # Use 'cross-origin' to allow CDN and API access
            response['Cross-Origin-Resource-Policy'] = 'cross-origin'
        
        return response
