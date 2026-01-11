from supabase import Client  # Import Client for type hinting
from typing import Optional, Tuple
import time

class AuthService:
    """
    Manages user authentication using Supabase only.
    """
    def __init__(self, supabase_admin_client: Client):
        """
        Initializes the AuthService with a Supabase admin client.

        Args:
            supabase_admin_client (Client): Supabase client initialized with service_role key.
        """
        self.supabase_admin = supabase_admin_client

    @staticmethod
    def _is_ssl_connection_error(error: Exception) -> bool:
        """Check if an error is an SSL/connection error that should be retried."""
        error_str = str(error).lower()
        error_type = type(error).__name__.lower()
        
        return (
            'ssl' in error_str or
            'unexpected_eof' in error_str or
            'eof occurred' in error_str or
            'connectionterminated' in error_str or
            'remoteprotocolerror' in error_type or
            'connection' in error_str and ('terminated' in error_str or 'reset' in error_str or 'closed' in error_str) or
            'resource temporarily unavailable' in error_str or
            '[errno 35]' in error_str or
            '[errno 8]' in error_str or
            'nodename nor servname' in error_str or
            'readerror' in error_type or
            'timeout' in error_str
        )
    
    def _verify_supabase_token(self, token: str, max_retries: int = 3) -> Tuple[Optional[str], str]:
        """
        Verifies a Supabase JWT token and returns the user ID.
        Includes retry logic for SSL/connection errors.
        
        Args:
            token (str): Supabase JWT token
            max_retries (int): Maximum number of retry attempts for connection errors
            
        Returns:
            Tuple[Optional[str], str]: (user_id, auth_type) or (None, '') if verification fails
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # Use Supabase admin client to verify the token
                # This will decode the JWT and verify it's valid
                user = self.supabase_admin.auth.get_user(token)
                if user and getattr(user, 'user', None):
                    # Prefer profiles.id if present, otherwise fall back to auth user ID
                    try:
                        profile_data = self.supabase_admin.table('profiles').select('id').eq('id', user.user.id).single().execute()
                        if profile_data.data and profile_data.data.get('id'):
                            return profile_data.data['id'], 'supabase'
                    except Exception:
                        pass
                    # Fallback: allow authentication with Supabase auth user ID even if profile row missing
                    return user.user.id, 'supabase'
                else:
                    # Invalid token - don't retry
                    return None, ''
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                # Check if this is a retryable SSL/connection error
                if self._is_ssl_connection_error(e) and attempt < max_retries - 1:
                    delay = 0.5 * (2 ** attempt)  # Exponential backoff: 0.5s, 1s, 2s
                    print(f"[WARNING] SSL/Connection error verifying token (attempt {attempt + 1}/{max_retries}): {str(e)}. Retrying in {delay}s...")
                    time.sleep(delay)
                    continue
                else:
                    # Not a retryable error or last attempt
                    if attempt == max_retries - 1:
                        print(f"[ERROR] Error verifying Supabase token after {max_retries} attempts: {str(e)}")
                    else:
                        # Non-retryable error (e.g., invalid token) - return immediately
                        print(f"Error verifying Supabase token: {str(e)}")
                        return None, ''
        
        # All retries exhausted
        return None, ''

    def get_supabase_user_id_from_token(self, token: str) -> Tuple[Optional[str], str]:
        """
        Verifies a Supabase token and returns the corresponding Supabase user ID.
        
        Args:
            token (str): Supabase JWT token (with or without 'Bearer ' prefix)
            
        Returns:
            Tuple[Optional[str], str]: (user_id, auth_type) or (None, '') if verification fails
        """
        if not token:
            return None, ''
            
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        # Verify as Supabase token
        user_id, auth_type = self._verify_supabase_token(token)
        if user_id:
            return user_id, auth_type

        return None, ''

    # Backwards compatibility for old callers
    def verify_token(self, token: str) -> Tuple[Optional[str], str]:
        return self.get_supabase_user_id_from_token(token)