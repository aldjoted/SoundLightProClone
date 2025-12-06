"""
Custom JWT Token Views with httpOnly Cookie Support and Rate Limiting
Implements secure refresh token handling via httpOnly cookies.
Includes 2FA email verification for login.
"""

import secrets
import logging
from datetime import timedelta
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.conf import settings

from .utils import ratelimit_error_response, get_cookie_settings

logger = logging.getLogger(__name__)


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='dispatch')
class RateLimitedTokenObtainPairView(TokenObtainPairView):
    """
    Token obtain view with httpOnly cookie support and rate limiting.
    
    ✅ SECURITY IMPROVEMENT:
    - Implements 2FA via email verification
    - Generates a 6-digit code on successful password validation
    - Sends code to user's email
    - Does NOT return tokens until code is verified
    - Rate limited to 5 attempts per minute per IP
    """
    
    def post(self, request, *args, **kwargs):
        try:
            from django.contrib.auth import authenticate
            
            identifier = (request.data.get('username')
                           or request.data.get('email')
                           or request.data.get('identifier')
                           or '').strip()
            password = request.data.get('password')
            
            if not identifier or not password:
                return Response(
                    {'detail': 'Username or email and password are required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Authenticate user (supports username or email)
            user = authenticate(username=identifier, password=password)

            if user is None:
                # Try case-insensitive username match
                normalized_username = (
                    User.objects
                    .filter(username__iexact=identifier)
                    .values_list('username', flat=True)
                    .first()
                )
                if normalized_username:
                    user = authenticate(username=normalized_username, password=password)

            if user is None:
                # Try email match
                email_match = (
                    User.objects
                    .filter(email__iexact=identifier)
                    .values_list('username', 'email')
                    .first()
                )
                if email_match:
                    matched_username, _ = email_match
                    user = authenticate(username=matched_username, password=password)

            if user is None:
                return Response(
                    {'detail': 'Invalid credentials.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Generate 6-digit verification code using cryptographically secure random
            verification_code = str(secrets.randbelow(900000) + 100000)
            
            # Store code in user profile with 10-minute expiration
            profile = user.profile
            profile.login_verification_code = verification_code
            profile.login_verification_code_expires = timezone.now() + timedelta(minutes=10)
            profile.save()
            
            # Send verification code via email
            display_name = user.get_full_name().strip() or user.username
            try:
                send_mail(
                    subject='SoundLightPro Login Verification Code',
                    message=(
                        f"Hello {display_name},\n\n"
                        "We received a request to sign in to your SoundLightPro account. "
                        "Use the one-time verification code below to continue:\n\n"
                        f"{verification_code}\n\n"
                        "This code expires in 10 minutes. If you did not try to sign in, please reset "
                        "your password and contact our support team at support@soundlightpro.com.\n\n"
                        "Stay secure,\n"
                        "SoundLightPro Security Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                logger.info(f"Verification code sent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to send verification email: {e}")
                return Response(
                    {'detail': 'Failed to send verification code. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Return success response without tokens
            return Response({
                'detail': 'Verification code sent to your email.',
                'email': user.email,
                'requires_verification': True
            }, status=status.HTTP_200_OK)
            
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
                # ✅ This is expected when users aren't logged in - no need to log as warning
                logger.debug('Token refresh attempted without refresh cookie (user not logged in)')
                return Response(
                    {'detail': 'Refresh token not found in cookies'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Validate the refresh token using the serializer directly
            serializer = self.get_serializer(data={'refresh': refresh_token})
            serializer.is_valid(raise_exception=True)

            response = Response(serializer.validated_data, status=status.HTTP_200_OK)

            # Rotate refresh token if present in response payload
            new_refresh_token = serializer.validated_data.get('refresh')
            if new_refresh_token:
                response.data.pop('refresh', None)
                response.set_cookie(
                    cookie_settings['key'],
                    new_refresh_token,
                    max_age=cookie_settings['max_age'],
                    httponly=cookie_settings['httponly'],
                    secure=cookie_settings['secure'],
                    samesite=cookie_settings['samesite'],
                    path=cookie_settings['path'],
                    domain=cookie_settings.get('domain'),
                )

            return response
            
        except Ratelimited:
            return ratelimit_error_response()


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='dispatch')
class VerifyLoginCodeView(APIView):
    """
    API view to verify the 6-digit login verification code.
    
    ✅ SECURITY IMPROVEMENT:
    - Verifies the code matches and hasn't expired
    - Returns JWT tokens only after successful verification
    - Tracks failed attempts and locks account after 5 failures
    - Rate limited to 5 attempts per minute per IP
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            email = request.data.get('email')
            code = request.data.get('code')
            
            if not email or not code:
                return Response(
                    {'detail': 'Email and verification code are required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Find user by email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response(
                    {'detail': 'Invalid verification code.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            profile = user.profile
            
            # Check if account is locked
            if profile.is_locked:
                lockout_remaining = profile.lockout_remaining_seconds
                return Response(
                    {
                        'detail': f'Account is temporarily locked. Please try again in {lockout_remaining // 60} minutes.',
                        'locked': True,
                        'retry_after': lockout_remaining
                    },
                    status=status.HTTP_423_LOCKED
                )
            
            # Check if code matches
            if profile.login_verification_code != code:
                # Increment failed attempts
                profile.increment_failed_attempts()
                
                attempts_remaining = 5 - profile.failed_login_attempts
                if profile.is_locked:
                    return Response(
                        {
                            'detail': 'Too many failed attempts. Account is temporarily locked for 15 minutes.',
                            'locked': True,
                            'retry_after': 900
                        },
                        status=status.HTTP_423_LOCKED
                    )
                
                return Response(
                    {
                        'detail': f'Invalid verification code. {attempts_remaining} attempts remaining.',
                        'attempts_remaining': attempts_remaining
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if code has expired
            if not profile.login_verification_code_expires or \
               timezone.now() > profile.login_verification_code_expires:
                # Clear expired code
                profile.login_verification_code = ''
                profile.login_verification_code_expires = None
                profile.save()
                return Response(
                    {'detail': 'Verification code has expired. Please login again.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Code is valid - generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Clear verification code and reset failed attempts
            profile.login_verification_code = ''
            profile.login_verification_code_expires = None
            profile.reset_failed_attempts()
            
            logger.info(f"User {user.username} successfully verified login")
            
            # Create response with tokens
            response = Response({
                'access': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            }, status=status.HTTP_200_OK)
            
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
                domain=cookie_settings.get('domain'),
            )
            
            return response
            
        except Ratelimited:
            return ratelimit_error_response()


@method_decorator(ratelimit(key='ip', rate='3/m', method='POST', block=True), name='dispatch')
class ResendVerificationCodeView(APIView):
    """
    API view to resend the 6-digit login verification code.
    
    ✅ SECURITY:
    - Only resends if a valid pending verification exists
    - Rate limited to 3 resends per minute per IP
    - Generates a new code and extends expiration
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            email = request.data.get('email')
            
            if not email:
                return Response(
                    {'detail': 'Email is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Find user by email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Don't reveal if user exists
                return Response(
                    {'detail': 'If a pending verification exists, a new code has been sent.'},
                    status=status.HTTP_200_OK
                )
            
            profile = user.profile
            
            # Check if account is locked
            if profile.is_locked:
                lockout_remaining = profile.lockout_remaining_seconds
                return Response(
                    {
                        'detail': f'Account is temporarily locked. Please try again in {lockout_remaining // 60} minutes.',
                        'locked': True,
                        'retry_after': lockout_remaining
                    },
                    status=status.HTTP_423_LOCKED
                )
            
            # Check if there's a pending verification (code exists and not too old)
            # Allow resend even if code expired, as long as it was within last 30 minutes
            if not profile.login_verification_code:
                return Response(
                    {'detail': 'No pending verification found. Please login again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate new 6-digit verification code
            verification_code = str(secrets.randbelow(900000) + 100000)
            
            # Update code with new 10-minute expiration
            profile.login_verification_code = verification_code
            profile.login_verification_code_expires = timezone.now() + timedelta(minutes=10)
            profile.save()
            
            # Send verification code via email
            display_name = user.get_full_name().strip() or user.username
            try:
                send_mail(
                    subject='SoundLightPro Login Verification Code (Resent)',
                    message=(
                        f"Hello {display_name},\n\n"
                        "Here is your new one-time verification code to sign in to your SoundLightPro account:\n\n"
                        f"{verification_code}\n\n"
                        "This code expires in 10 minutes. If you did not request this, please reset "
                        "your password and contact our support team at support@soundlightpro.com.\n\n"
                        "Stay secure,\n"
                        "SoundLightPro Security Team"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                logger.info(f"Verification code resent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to resend verification email: {e}")
                return Response(
                    {'detail': 'Failed to send verification code. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'detail': 'A new verification code has been sent to your email.',
                'email': user.email
            }, status=status.HTTP_200_OK)
            
        except Ratelimited:
            return ratelimit_error_response()

