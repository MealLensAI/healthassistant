"""
Helper functions for invitation management
"""

from flask import current_app
from supabase import Client
from datetime import datetime, timezone
import uuid
import os


def get_frontend_url():
    """Get the frontend URL from FRONTEND_URL environment variable only"""
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        load_dotenv(env_path)
    except:
        pass  # If dotenv fails, assume env vars are already loaded
    
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        frontend_url = frontend_url.strip()
        if frontend_url:
            return frontend_url.rstrip('/')
    
    # Default fallback
    return 'http://localhost:5173'


def auto_accept_pending_invitations(user_id: str, user_email: str, admin_supabase: Client) -> list[dict]:
    """
    Automatically accept all pending invitations for a user's email after login/registration.
    Only sends notification emails after user registers and accepts (not when invitation is created).
    
    Args:
        user_id: The authenticated user's ID
        user_email: The user's email address
        admin_supabase: Admin Supabase client (to bypass RLS)
        
    Returns:
        list: List of accepted invitation IDs
    """
    accepted_invitations = []
    
    try:
        current_app.logger.info(f"[AUTO_ACCEPT] Checking for pending invitations for {user_email}")
        
        # Find all pending invitations for this email
        invitations_result = admin_supabase.table('invitations').select('*, enterprises(*)').eq('email', user_email.lower().strip()).eq('status', 'pending').execute()
        
        if not invitations_result.data:
            current_app.logger.info(f"[AUTO_ACCEPT] No pending invitations found for {user_email}")
            return accepted_invitations
        
        current_app.logger.info(f"[AUTO_ACCEPT] Found {len(invitations_result.data)} pending invitation(s) for {user_email}")
        
        for invitation in invitations_result.data:
            try:
                # Check if invitation has expired
                if invitation.get('expires_at'):
                    expires_at = datetime.fromisoformat(invitation['expires_at'].replace('Z', '+00:00'))
                    now = datetime.now(timezone.utc)
                    if now > expires_at:
                        current_app.logger.warning(f"[AUTO_ACCEPT] Invitation {invitation['id']} has expired, skipping")
                        continue
                
                enterprise_id = invitation.get('enterprise_id')
                if not enterprise_id:
                    current_app.logger.warning(f"[AUTO_ACCEPT] Invitation {invitation['id']} has no enterprise_id, skipping")
                    continue
                
                # Check if user is already a member of this organization
                existing_membership = admin_supabase.table('organization_users').select('id').eq('enterprise_id', enterprise_id).eq('user_id', user_id).execute()
                
                if existing_membership.data:
                    current_app.logger.info(f"[AUTO_ACCEPT] User {user_id} is already a member of enterprise {enterprise_id}, marking invitation as accepted")
                    # Update invitation status even though they're already a member
                    admin_supabase.table('invitations').update({
                        'status': 'accepted',
                        'accepted_at': datetime.now(timezone.utc).isoformat(),
                        'accepted_by': user_id
                    }).eq('id', invitation['id']).execute()
                    accepted_invitations.append(invitation['id'])
                    continue
                
                # Add user to organization
                membership_id = str(uuid.uuid4())
                membership_data = {
                    'id': membership_id,
                    'enterprise_id': enterprise_id,
                    'user_id': user_id,
                    'role': invitation.get('role', 'patient'),
                    'status': 'active',
                    'joined_at': datetime.now(timezone.utc).isoformat()
                }
                
                current_app.logger.info(f"[AUTO_ACCEPT] Adding user {user_id} to enterprise {enterprise_id}")
                
                membership_result = admin_supabase.table('organization_users').insert(membership_data).execute()
                
                if membership_result.data:
                    # Update invitation status
                    admin_supabase.table('invitations').update({
                        'status': 'accepted',
                        'accepted_at': datetime.now(timezone.utc).isoformat(),
                        'accepted_by': user_id
                    }).eq('id', invitation['id']).execute()
                    
                    # Send notification email to admin/owner (only after user registers and accepts)
                    enterprise_data = invitation.get('enterprises') or {}
                    enterprise_name = enterprise_data.get('name', 'Unknown Organization')
                    enterprise_owner_id = enterprise_data.get('created_by')
                    
                    if enterprise_owner_id:
                        try:
                            from services.email_service import EmailService
                            email_service = EmailService()
                            
                            owner_details = admin_supabase.auth.admin.get_user_by_id(enterprise_owner_id)
                            if owner_details and owner_details.user:
                                owner_email = owner_details.user.email
                                owner_metadata = owner_details.user.user_metadata or {}
                                owner_name = f"{owner_metadata.get('first_name', '')} {owner_metadata.get('last_name', '')}".strip() or owner_email
                                
                                # Get user details for notification
                                user_details = admin_supabase.auth.admin.get_user_by_id(user_id)
                                accepted_user_name = user_email
                                if user_details and user_details.user:
                                    user_metadata = user_details.user.user_metadata or {}
                                    first_name = user_metadata.get('first_name', '')
                                    last_name = user_metadata.get('last_name', '')
                                    accepted_user_name = f"{first_name} {last_name}".strip() or user_email
                                
                                frontend_url = get_frontend_url()
                                dashboard_url = f"{frontend_url}/enterprise"
                                
                                # Send notification email in background thread
                                import threading
                                from flask import current_app
                                app = current_app._get_current_object()
                                
                                def send_notification():
                                    with app.app_context():
                                        try:
                                            email_sent = email_service.send_invitation_accepted_notification(
                                                admin_email=owner_email,
                                                admin_name=owner_name,
                                                accepted_user_email=user_email,
                                                accepted_user_name=accepted_user_name,
                                                enterprise_name=enterprise_name,
                                                role=invitation.get('role', 'patient'),
                                                dashboard_url=dashboard_url
                                            )
                                            if email_sent:
                                                current_app.logger.info(f"[AUTO_ACCEPT] Notification email sent to {owner_email}")
                                            else:
                                                current_app.logger.warning(f"[AUTO_ACCEPT] Failed to send notification email to {owner_email}")
                                        except Exception as e:
                                            current_app.logger.warning(f"[AUTO_ACCEPT] Error sending notification email: {e}")
                                
                                notification_thread = threading.Thread(target=send_notification)
                                notification_thread.daemon = True
                                notification_thread.start()
                        except Exception as email_error:
                            current_app.logger.warning(f"[AUTO_ACCEPT] Could not send notification email: {email_error}")
                    
                    accepted_invitations.append(invitation['id'])
                    current_app.logger.info(f"[AUTO_ACCEPT] ✅ Successfully accepted invitation {invitation['id']} and added user to enterprise {enterprise_id}")
                else:
                    current_app.logger.error(f"[AUTO_ACCEPT] Failed to add user to organization for invitation {invitation['id']}")
                    
            except Exception as invite_error:
                current_app.logger.error(f"[AUTO_ACCEPT] Error processing invitation {invitation.get('id', 'unknown')}: {str(invite_error)}", exc_info=True)
                # Continue with other invitations
                continue
        
        current_app.logger.info(f"[AUTO_ACCEPT] Completed auto-acceptance: {len(accepted_invitations)} invitation(s) accepted")
        return accepted_invitations
        
    except Exception as e:
        current_app.logger.error(f"[AUTO_ACCEPT] Error checking/accepting invitations: {str(e)}", exc_info=True)
        return accepted_invitations
