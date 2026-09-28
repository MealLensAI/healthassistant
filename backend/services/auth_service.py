import os

from supabase import Client, create_client  # Import Client for type hinting
from typing import Optional, Tuple

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
        # Separate clients for token verify + profile lookup so get_user / sessions
        # never rewrite Authorization on the shared app write client (RLS 42501).
        url = os.environ.get("SUPABASE_URL") or getattr(supabase_admin_client, "supabase_url", None)
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        self._verify_client: Optional[Client] = None
        self._profile_client: Optional[Client] = None
        if url and key:
            try:
                self._verify_client = create_client(url, key)
                self._profile_client = create_client(url, key)
            except Exception as e:
                print(f"Warning: AuthService could not create isolated clients: {e}")

    def _verify_supabase_token(self, token: str) -> Tuple[Optional[str], str]:
        """
        Verifies a Supabase JWT token and returns the user ID.
        
        Args:
            token (str): Supabase JWT token
            
        Returns:
            Tuple[Optional[str], str]: (user_id, auth_type) or (None, '') if verification fails
        """
        try:
            auth_client = self._verify_client or self.supabase_admin
            db_client = self._profile_client or self.supabase_admin
            # Use Supabase admin client to verify the token
            # This will decode the JWT and verify it's valid
            user = auth_client.auth.get_user(token)
            if user and getattr(user, 'user', None):
                # Prefer profiles.id if present, otherwise fall back to auth user ID
                try:
                    # Keep service-role on profile reads even if get_user mutated auth_client.
                    try:
                        db_client.postgrest.auth(os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "")
                    except Exception:
                        pass
                    profile_data = db_client.table('profiles').select('id').eq('id', user.user.id).single().execute()
                    if profile_data.data and profile_data.data.get('id'):
                        return profile_data.data['id'], 'supabase'
                except Exception:
                    pass
                # Fallback: allow authentication with Supabase auth user ID even if profile row missing
                return user.user.id, 'supabase'
            else:
                print("Invalid Supabase token")
                return None, ''
        except Exception as e:
            print(f"Error verifying Supabase token: {str(e)}")
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