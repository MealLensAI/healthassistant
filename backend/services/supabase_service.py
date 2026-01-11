import os
import json
import time
from supabase import create_client, Client
from werkzeug.datastructures import FileStorage
from datetime import datetime
from typing import Callable, Any, Tuple

# Disable HTTP/2 to avoid connection termination errors
os.environ['HTTPX_DISABLE_HTTP2'] = '1'

class SupabaseService:
    """
    Service for interacting with Supabase database.
    Includes retry logic for handling transient connection errors.
    """
    
    @staticmethod
    def _is_connection_error(error: Exception) -> bool:
        """Check if an error is a transient connection error that should be retried."""
        error_str = str(error).lower()
        error_type = type(error).__name__.lower()
        
        return (
            'connectionterminated' in error_str or
            'remoteprotocolerror' in error_type or
            'connection' in error_str and ('terminated' in error_str or 'reset' in error_str or 'closed' in error_str) or
            'resource temporarily unavailable' in error_str or
            '[errno 35]' in error_str or
            'readerror' in error_type or
            'timeout' in error_str
        )
    
    @staticmethod
    def _retry_operation(
        operation: Callable,
        max_retries: int = 3,
        initial_delay: float = 0.5,
        operation_name: str = "operation"
    ) -> Tuple[Any, Exception | None]:
        """
        Retry a database operation with exponential backoff on connection errors.
        
        Args:
            operation: A callable that performs the database operation
            max_retries: Maximum number of retry attempts
            initial_delay: Initial delay in seconds (doubles each retry)
            operation_name: Name of the operation for logging
            
        Returns:
            Tuple of (result, error). If successful, result is the return value and error is None.
            If all retries fail, result is None and error is the last exception.
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                result = operation()
                return result, None
            except Exception as e:
                last_error = e
                
                if SupabaseService._is_connection_error(e) and attempt < max_retries - 1:
                    delay = initial_delay * (2 ** attempt)
                    print(f"[WARNING] Connection error in {operation_name} (attempt {attempt + 1}/{max_retries}): {str(e)}. Retrying in {delay}s...")
                    time.sleep(delay)
                    continue
                else:
                    # Not a retryable error or last attempt
                    if attempt == max_retries - 1:
                        print(f"[ERROR] {operation_name} failed after {max_retries} attempts: {str(e)}")
                    break
        
        return None, last_error
    def __init__(self, supabase_url: str, supabase_key: str = None):
        """
        Initializes Supabase client with optimized connection settings.

        Args:
            supabase_url (str): The URL of your Supabase project.
            supabase_key (str): Your Supabase service role key. If not provided, will use SUPABASE_SERVICE_ROLE_KEY env var.
        """
        print(f"[DEBUG] Initializing Supabase client with URL: {supabase_url}")
        self.supabase_url = supabase_url  # Make supabase_url accessible as an attribute
        
        if not supabase_url:
            error_msg = "Supabase URL is required"
            print(f"[ERROR] {error_msg}")
            raise ValueError(error_msg)
            
        if not supabase_key:
            print("[DEBUG] No supabase_key provided, checking environment variables")
            supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            
        if not supabase_key:
            error_msg = "Supabase service role key is required. Set SUPABASE_SERVICE_ROLE_KEY in your environment."
            print(f"[ERROR] {error_msg}")
            raise ValueError(error_msg)
            
        # Friendly status message (no key info)
        print("[INFO] Supabase service role key loaded.")
        
        # Check if key format looks like JWT (no payload print)
        key_parts = supabase_key.split('.') if supabase_key else []
        if not (supabase_key and len(key_parts) == 3):
            print("[WARNING] Supabase key format doesn't look like a valid JWT.")
        else:
            print("[INFO] Supabase key format looks valid.")
        
        try:
            print("[DEBUG] Creating Supabase client...")
            
            # Create the client with service role key
            # IMPORTANT: Use service role key to bypass RLS. This client should NOT use user sessions.
            # Do not pass any user auth tokens to this client - it should only use the service role key.
            # HTTP/2 is disabled via HTTPX_DISABLE_HTTP2 environment variable (set above)
            # Note: ClientOptions causes issues in this version - using defaults
            # The service role key bypasses RLS regardless of ClientOptions
            self.supabase: Client = create_client(supabase_url, supabase_key)
            
            # Store the key for verification
            self._service_role_key = supabase_key
            
            # Verify we're using service role key (starts with 'eyJ' and contains 'service_role' in claims)
            # Note: We don't decode the JWT here, just verify it exists
            if supabase_key and len(supabase_key) > 50:
                print("[INFO] Supabase service role client initialized successfully.")
                print("[INFO] This client will bypass RLS policies for admin operations.")
            else:
                print("[WARNING] Supabase key appears invalid - RLS bypass may not work!")
            
        except Exception as e:
            error_msg = f"Failed to initialize Supabase client: {str(e)}"
            print(f"[ERROR] {error_msg}")
            if hasattr(e, 'args'):
                print(f"[ERROR] Error args: {e.args}")
            if hasattr(e, 'details'):
                print(f"[ERROR] Error details: {e.details}")
            raise

    def upload_file(self, file: FileStorage, bucket_name: str, file_path: str) -> tuple[str | None, str | None]:
        """
        Uploads a file to Supabase Storage.

        Args:
            file (FileStorage): The file object from Flask's request.files.
            bucket_name (str): The name of the Supabase Storage bucket.
            file_path (str): The path within the bucket where the file will be stored.

        Returns:
            tuple[str | None, str | None]: (public_url, None) on success, (None, error_message) on failure.
        """
        try:
            # Read file content
            file_content = file.read()
            
            # Upload to Supabase Storage
            response = self.supabase.storage.from_(bucket_name).upload(file_path, file_content, {
                "content-type": file.content_type
            })
            
            if response.status_code == 200:
                # Get public URL
                public_url_response = self.supabase.storage.from_(bucket_name).get_public_url(file_path)
                return public_url_response, None
            else:
                return None, f"Upload failed with status {response.status_code}: {response.json()}"
        except Exception as e:
            return None, str(e)

    def save_feedback(self, user_id: str | None, feedback_text: str) -> tuple[bool, str | None]:
        """
        Saves user feedback to the 'feedback' table using RPC.

        Args:
            user_id (str | None): The Supabase user ID, or None if unauthenticated.
            feedback_text (str): The feedback message.

        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        try:
            # Try RPC first, fallback to direct insert
            try:
                result = self.supabase.rpc('submit_feedback', {
                    'p_user_id': user_id,
                    'p_feedback_text': feedback_text
                }).execute()
                
                if result.data and len(result.data) > 0 and result.data[0].get('status') == 'success':
                    return True, None
            except Exception as rpc_error:
                print(f"RPC failed, using direct insert: {rpc_error}")
            
            # Fallback: Direct table insert
            result = self.supabase.table('feedback').insert({
                'user_id': user_id,
                'feedback_text': feedback_text,
                'created_at': datetime.utcnow().isoformat() + 'Z'
            }).execute()
            
            if result.data:
                return True, None
            else:
                return False, 'Failed to save feedback'
        except Exception as e:
            return False, str(e)

    def insert_ai_session(self, user_id: str, session_data: dict) -> dict:
        """
        Stores AI session data in Supabase.

        Args:
            user_id (str): The Supabase user ID.
            session_data (dict): The AI session data containing prompt, response, timestamp, and metadata.

        Returns:
            dict: The inserted session data including the generated ID.
        """
        try:
            result = self.supabase.table('ai_sessions').insert({
                'user_id': user_id,
                'prompt': session_data['prompt'],
                'response': session_data['response'],
                'timestamp': session_data['timestamp'],
                'metadata': session_data.get('metadata', {})
            }).execute()

            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to insert AI session data")

        except Exception as e:
            raise Exception(f"Error storing AI session data: {str(e)}")

    def save_detection_history(self, user_id: str, recipe_type: str, suggestion: str = None,
                              instructions: str = None, ingredients: str = None, detected_foods: str = None,
                              analysis_id: str = None, youtube_url: str = None, google_url: str = None, 
                              resources_json: str = None, **kwargs
                            ) -> tuple[bool, str | None]:
        """
        Save detection history to the database.
        Supports both new field names (youtube_url, google_url, resources_json) 
        and legacy names (youtube, google, resources) for backwards compatibility.
        """
        # Support legacy field names
        youtube_url = youtube_url or kwargs.get('youtube')
        google_url = google_url or kwargs.get('google')
        resources_json = resources_json or kwargs.get('resources')
        
        try:
            # First try RPC function (using actual Supabase column names: youtube, google, resources)
            try:
                insert_data = {
                    'p_user_id': user_id,
                    'p_recipe_type': recipe_type,
                    'p_suggestion': suggestion,
                    'p_instructions': instructions,
                    'p_ingredients': ingredients,
                    'p_detected_foods': detected_foods,
                    'p_analysis_id': analysis_id,
                    'p_youtube': youtube_url,
                    'p_google': google_url,
                    'p_resources': resources_json
                }
                insert_data = {k: v for k, v in insert_data.items() if v is not None}
                result = self.supabase.rpc('add_detection_history', insert_data).execute()
                if result.data and len(result.data) > 0:
                    data = result.data[0] if isinstance(result.data, list) else result.data
                    if data.get('status') == 'success':
                        print(f"✅ Detection history saved via RPC for user {user_id}")
                        return True, None
                    else:
                        error = data.get('message', 'RPC returned non-success status')
                        print(f"⚠️ RPC error: {error}, falling back to direct insert")
                        # Fall through to direct insert
            except Exception as rpc_error:
                print(f"⚠️ RPC failed: {rpc_error}, falling back to direct insert")
                # Fall through to direct insert
            
            # Fallback: Direct table insert
            print(f"📝 Using direct table insert for detection history")
            direct_insert = {
                'user_id': user_id,
                'recipe_type': recipe_type,  # FIXED: detection_type → recipe_type (matches table schema)
            }
            
            # Only add non-empty optional fields (prevents empty string to JSONB issues)
            # Check for both None and empty string
            if suggestion and suggestion.strip():
                direct_insert['suggestion'] = suggestion
            if instructions and instructions.strip():
                direct_insert['instructions'] = instructions
            if ingredients and ingredients.strip():
                direct_insert['ingredients'] = ingredients
            if detected_foods and detected_foods.strip():
                direct_insert['detected_foods'] = detected_foods
            if analysis_id and analysis_id.strip():
                direct_insert['analysis_id'] = analysis_id
            # Map to actual Supabase column names (youtube, google, resources - NOT _link)
            # Only add if not empty
            if youtube_url and youtube_url.strip():
                direct_insert['youtube'] = youtube_url
            if google_url and google_url.strip():
                direct_insert['google'] = google_url
            if resources_json and resources_json.strip() and resources_json != "{}":
                direct_insert['resources'] = resources_json
            
            print(f"📝 Direct insert data: user_id={user_id}, recipe_type={recipe_type}, has_youtube={bool(youtube_url)}, has_google={bool(google_url)}, has_resources={bool(resources_json)}")
            
            result = self.supabase.table('detection_history').insert(direct_insert).execute()
            
            if result.data:
                print(f"✅ Detection history saved via direct insert for user {user_id}")
                return True, None
            else:
                print(f"❌ Direct insert failed")
                return False, 'Failed to save detection history via direct insert'
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error in save_detection_history: {error_msg}")
            return False, error_msg

    def update_detection_history(self, analysis_id: str, user_id: str, updates: dict) -> tuple[bool, str | None]:
        """
        Updates an existing food detection event using RPC, with fallback to direct table update.

        Args:
            analysis_id (str): The unique ID of the analysis session to update.
            user_id (str): The Supabase user ID (for RLS check).
            updates (dict): A dictionary of fields to update (can use either _link or direct names).

        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        # Map field names to actual Supabase column names (youtube, google, resources - NOT _link)
        column_mapping = {
            'youtube_link': 'youtube',
            'google_link': 'google',
            'resources_link': 'resources'
        }
        
        # Convert updates to use correct column names
        mapped_updates = {}
        for key, value in updates.items():
            # Map to actual column name if needed
            db_column = column_mapping.get(key, key)
            # Only add non-empty values
            if value and (isinstance(value, str) and value.strip() and value != "{}"):
                mapped_updates[db_column] = value
            elif not isinstance(value, str) and value:
                mapped_updates[db_column] = value
        
        if not mapped_updates:
            print(f"⚠️ No valid updates to apply for analysis_id: {analysis_id}")
            return False, "No valid updates provided"
        
        print(f"📝 Updating detection history for analysis_id: {analysis_id} with fields: {list(mapped_updates.keys())}")
        
        try:
            # First try RPC function
            try:
                rpc_params = {
                    'p_analysis_id': analysis_id,
                    'p_user_id': user_id
                }
                
                # Add update fields with p_ prefix for RPC
                for key, value in mapped_updates.items():
                    rpc_params[f'p_{key}'] = value
                
                result = self.supabase.rpc('update_detection_history', rpc_params).execute()
                
                if result.data and len(result.data) > 0 and result.data[0].get('status') == 'success':
                    print(f"✅ Detection history updated via RPC for analysis_id: {analysis_id}")
                    return True, None
                else:
                    error = result.data[0].get('message') if (result.data and len(result.data) > 0) else 'RPC returned non-success status'
                    print(f"⚠️ RPC update failed: {error}, falling back to direct update")
                    # Fall through to direct update
            except Exception as rpc_error:
                print(f"⚠️ RPC update failed: {rpc_error}, falling back to direct update")
                # Fall through to direct update
            
            # Fallback: Direct table update
            print(f"📝 Using direct table update for detection history")
            query = self.supabase.table('detection_history')\
                .update(mapped_updates)\
                .eq('analysis_id', analysis_id)
            
            # Only filter by user_id if it's provided (for testing with None user_id)
            if user_id:
                query = query.eq('user_id', user_id)
            
            result = query.execute()
            
            if result.data and len(result.data) > 0:
                print(f"✅ Detection history updated via direct update for analysis_id: {analysis_id}")
                return True, None
            else:
                error_msg = 'No record found or update had no effect'
                print(f"❌ Direct update failed: {error_msg}")
                return False, error_msg
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error in update_detection_history: {error_msg}")
            return False, error_msg

    def get_detection_history(self, user_id: str) -> tuple[list | None, str | None]:
        """
        Retrieves a user's food detection history using RPC.

        Args:
            user_id (str): The Supabase user ID.

        Returns:
            tuple[list | None, str | None]: (list of history records, None) on success,
                                          (None, error_message) on failure.
        """
        try:
            result = self.supabase.rpc('get_user_detection_history', {
                'p_user_id': user_id
            }).execute()
            
            if result.data:
                if len(result.data) > 0 and isinstance(result.data[0], dict) and result.data[0].get('status') == 'error':
                    error = result.data[0].get('message', 'Failed to fetch detection history')
                    # Fallback to direct table query
                    table_result = self.supabase.table('detection_history').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
                    return table_result.data or [], None
                else:
                    return result.data, None
            else:
                # Fallback to direct table query when RPC returns no data
                table_result = self.supabase.table('detection_history').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
                return table_result.data or [], None
        except Exception:
            # Final fallback: direct table query
            try:
                table_result = self.supabase.table('detection_history').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
                return table_result.data or [], None
            except Exception as e2:
                return None, str(e2)

    def delete_detection_history(self, user_id: str, record_id: str) -> tuple[bool, str | None]:
        """
        Deletes a specific detection history record for a user.
        """
        try:
            result = self.supabase.table('detection_history').delete().eq('id', record_id).eq('user_id', user_id).execute()
            if result.data:
                return True, None
            return False, 'Record not found or not authorized'
        except Exception as e:
            return False, str(e)

    def normalize_meal_plan_entry(self, raw_plan, user_id=None):
        import uuid
        from datetime import datetime

        # If already normalized (has mealPlan at top level), use it directly
        if 'mealPlan' in raw_plan:
            meal_plan_obj = raw_plan
        else:
            meal_plan_obj = raw_plan.get('meal_plan')
            if isinstance(meal_plan_obj, str):
                try:
                    meal_plan_obj = json.loads(meal_plan_obj)
                except Exception:
                    meal_plan_obj = {}
            if isinstance(meal_plan_obj, dict) and 'plan_data' in meal_plan_obj:
                meal_plan_obj = meal_plan_obj['plan_data']

        name = raw_plan.get('name') or (meal_plan_obj.get('name') if meal_plan_obj else None)
        start_date = raw_plan.get('start_date') or raw_plan.get('startDate') or (meal_plan_obj.get('startDate') if meal_plan_obj else None)
        end_date = raw_plan.get('end_date') or raw_plan.get('endDate') or (meal_plan_obj.get('endDate') if meal_plan_obj else None)
        meal_plan = raw_plan.get('mealPlan') or (meal_plan_obj.get('mealPlan') if isinstance(meal_plan_obj, dict) else meal_plan_obj)

        if not user_id:
            user_id = raw_plan.get('user_id')
        if not raw_plan.get('id'):
            plan_id = str(uuid.uuid4())
        else:
            plan_id = raw_plan.get('id')
        now = datetime.utcnow().isoformat() + 'Z'
        return {
            "id": plan_id,
            "user_id": user_id,
            "name": name,
            "start_date": start_date,
            "end_date": end_date,
            "meal_plan": meal_plan,
            "created_at": raw_plan.get('created_at', now),
            "updated_at": raw_plan.get('updated_at', now)
        }

    def save_meal_plan(self, user_id: str, plan_data: dict):
        """
        Saves a user's meal plan using direct table insertion to match React code structure.
        Returns the inserted meal plan data.
        
        Note: This method uses the service role key which should bypass RLS policies.
        If RLS errors occur, it indicates the service role key is not being recognized properly.
        """
        try:
            # Extract data from plan_data to match React structure
            name = plan_data.get('name')
            start_date = plan_data.get('startDate') or plan_data.get('start_date')
            end_date = plan_data.get('endDate') or plan_data.get('end_date')
            meal_plan = plan_data.get('mealPlan') or plan_data.get('meal_plan')
            has_sickness = plan_data.get('has_sickness', False)
            sickness_type = plan_data.get('sickness_type', '')
            

            # Create insert data matching React structure
            # User-created meal plans are AUTO-APPROVED (is_approved = TRUE)
            # They can see their own plans immediately
            # Get creator's email from profiles table using user_id
            creator_email = None
            try:
                profile_result = self.supabase.table('profiles').select('email').eq('id', user_id).limit(1).execute()
                if profile_result.data and len(profile_result.data) > 0:
                    creator_email = profile_result.data[0].get('email')
            except Exception as profile_error:
                print(f"[WARNING] Could not fetch creator email: {profile_error}")
            
            # Generate ID if not provided
            import uuid
            plan_id = plan_data.get('id') or str(uuid.uuid4())
            
            insert_data = {
                'id': plan_id,
                'user_id': user_id,
                'name': name,
                'start_date': start_date,
                'end_date': end_date,
                'meal_plan': meal_plan,
                'has_sickness': has_sickness,
                'sickness_type': sickness_type,
                'is_approved': True,  # Auto-approved for user-created plans
                'created_at': plan_data.get('created_at') or datetime.utcnow().isoformat() + 'Z',
                'updated_at': plan_data.get('updated_at') or datetime.utcnow().isoformat() + 'Z'
            }
            
            # Store creator email in user_info if it exists, otherwise create it
            if creator_email:
                existing_user_info = plan_data.get('user_info') or {}
                if isinstance(existing_user_info, dict):
                    existing_user_info['creator_email'] = creator_email
                    existing_user_info['is_created_by_user'] = True
                    insert_data['user_info'] = existing_user_info
                else:
                    insert_data['user_info'] = {
                        'creator_email': creator_email,
                        'is_created_by_user': True
                    }

            # Add health_assessment if provided
            if 'health_assessment' in plan_data:
                insert_data['health_assessment'] = plan_data['health_assessment']

            
            # Try RPC function first (if it exists) - it explicitly bypasses RLS with SECURITY DEFINER
            # This is more reliable than relying on service role key recognition
            rpc_function_exists = True  # Assume it exists until we know otherwise
            rpc_succeeded = False
            try:
                rpc_result = self.supabase.rpc('insert_meal_plan_management', {
                    'p_id': insert_data['id'],
                    'p_user_id': insert_data['user_id'],
                    'p_name': insert_data['name'],
                    'p_start_date': insert_data['start_date'],
                    'p_end_date': insert_data['end_date'],
                    'p_meal_plan': insert_data['meal_plan'],
                    'p_has_sickness': insert_data.get('has_sickness', False),
                    'p_sickness_type': insert_data.get('sickness_type', ''),
                    'p_is_approved': insert_data.get('is_approved', True),
                    'p_health_assessment': insert_data.get('health_assessment'),
                    'p_user_info': insert_data.get('user_info'),
                    'p_created_at': insert_data.get('created_at'),
                    'p_updated_at': insert_data.get('updated_at')
                }).execute()
                
                if rpc_result.data and len(rpc_result.data) > 0:
                    inserted_data = rpc_result.data[0]
                    rpc_succeeded = True
                    
                    # Return data in the format expected by frontend
                    return {
                        'id': inserted_data['id'],
                        'name': inserted_data['name'],
                        'startDate': inserted_data['start_date'],
                        'endDate': inserted_data['end_date'],
                        'mealPlan': inserted_data['meal_plan'],
                        'createdAt': inserted_data['created_at'],
                        'updatedAt': inserted_data['updated_at'],
                        'hasSickness': inserted_data.get('has_sickness', False),
                        'sicknessType': inserted_data.get('sickness_type', '')
                    }
                else:
                    print(f"[WARNING] RPC function returned no data, falling back to direct insert")
            except Exception as rpc_error:
                error_str = str(rpc_error)
                # Check if RPC function doesn't exist (function not found error)
                if 'function' in error_str.lower() and ('does not exist' in error_str.lower() or 'not found' in error_str.lower() or '42883' in error_str):
                    rpc_function_exists = False
                else:
                    print(f"[WARNING] RPC function call failed: {rpc_error}, falling back to direct insert")
                    # Function exists but call failed (might be parameter mismatch, etc.)
                    rpc_function_exists = True
            
            # If RPC succeeded, we already returned, so skip direct insert
            if rpc_succeeded:
                return None, 'Unexpected: RPC succeeded but code continued'
            
            # Fallback: Try direct insert with service role key
            # The service role key should bypass RLS, but sometimes it's not recognized properly
            try:
                result = self.supabase.table('meal_plan_management').insert(insert_data).execute()

                if result.data and len(result.data) > 0:
                    # Get the inserted record (first item in the array)
                    inserted_data = result.data[0]
                    
                    # Return data in the format expected by frontend
                    return {
                        'id': inserted_data['id'],
                        'name': inserted_data['name'],
                        'startDate': inserted_data['start_date'],
                        'endDate': inserted_data['end_date'],
                        'mealPlan': inserted_data['meal_plan'],
                        'createdAt': inserted_data['created_at'],
                        'updatedAt': inserted_data['updated_at'],
                        'hasSickness': inserted_data.get('has_sickness', False),
                        'sicknessType': inserted_data.get('sickness_type', '')
                    }
                else:
                    return None, 'Failed to save meal plan: No data returned from insert'
            except Exception as insert_error:
                error_str = str(insert_error)
                error_lower = error_str.lower()
                
                # Check for RLS policy violation
                if 'row-level security' in error_lower or 'rls' in error_lower or '42501' in error_str:
                    print(f"[ERROR] RLS policy violation detected on direct insert!")
                    print(f"[ERROR] Service role key is not being recognized properly by Supabase.")
                    print(f"[ERROR] Error details: {error_str}")
                    
                    # If RPC function doesn't exist, provide helpful error message
                    if not rpc_function_exists:
                        return None, {
                            'code': 'RLS_POLICY_VIOLATION',
                            'message': 'Row-level security policy violation. The service role key should bypass RLS, but it appears RLS is still being enforced. The RPC function fallback also failed.',
                            'original_error': error_str,
                            'hint': 'Verify that SUPABASE_SERVICE_ROLE_KEY is set correctly. Run the FIX_MEAL_PLAN_RLS.sql script in Supabase to create an RPC function that bypasses RLS.',
                            'solution': 'Run the SQL script at backend/database/FIX_MEAL_PLAN_RLS.sql in your Supabase SQL Editor. This will create an RPC function with SECURITY DEFINER that explicitly bypasses RLS.'
                        }
                    else:
                        # RPC function exists but failed, and direct insert also failed
                        return None, {
                            'code': 'RLS_POLICY_VIOLATION',
                            'message': 'Both RPC function and direct insert failed. This indicates a deeper configuration issue.',
                            'original_error': error_str,
                            'hint': 'Check Supabase logs and verify that the RPC function was created correctly.',
                            'solution': 'Verify the RPC function exists: SELECT * FROM pg_proc WHERE proname = \'insert_meal_plan_management\';'
                        }
                
                # Re-raise to be caught by outer exception handler
                raise insert_error

        except Exception as e:
            error_str = str(e)
            print(f"[ERROR] Exception in save_meal_plan: {error_str}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            
            # Check if it's a unique constraint violation (duplicate meal plan)
            if 'unique constraint' in error_str.lower() or 'duplicate key' in error_str.lower() or '23505' in error_str:
                return None, {'code': 'DUPLICATE_PLAN', 'message': 'A meal plan already exists for this week and health profile. Please update the existing plan or choose a different week.', 'original_error': error_str}
            
            # Check if it's already a dict (from inner exception handler)
            if isinstance(e, dict):
                return None, e
            
            return None, error_str
    # def save_meal_plan(self, user_id: str, plan_data: dict) -> tuple[bool, str | None]:
    #     """
    #     Saves a user's meal plan using RPC.
    #     """
    #     try:
    #         print(f"[DEBUG] Saving meal plan for user: {user_id}, plan_data: {plan_data}")
    #         # Normalize the plan_data before saving
    #         normalized_plan = self.normalize_meal_plan_entry(plan_data, user_id)
    #         plan_data_json = json.dumps(normalized_plan)
    #         result = self.supabase.rpc('upsert_meal_plan', {
    #             'p_user_id': user_id,
    #             'p_plan_data': plan_data_json
    #         }).execute()
    #         print(f"[DEBUG] Supabase RPC result: data={result.data} count={getattr(result, 'count', None)}")
    #         if result.data:
    #             if isinstance(result.data, dict) and result.data.get('status') == 'success':
    #                 return True, None
    #             elif isinstance(result.data, list) and result.data and result.data[0].get('status') == 'success':
    #                 return True, None
    #             else:
    #                 if isinstance(result.data, dict):
    #                     error = result.data.get('message', 'Failed to save meal plan')
    #                 elif isinstance(result.data, list) and result.data:
    #                     error = result.data[0].get('message', 'Failed to save meal plan')
    #                 else:
    #                     error = 'Failed to save meal plan'
    #                 print(f"[ERROR] Supabase RPC error: {error}")
    #                 return False, error
    #         else:
    #             print(f"[ERROR] Supabase RPC error: No data returned")
    #             return False, 'Failed to save meal plan'
    #     except Exception as e:
    #         print(f"[ERROR] Exception in save_meal_plan: {e}")
    #         return False, str(e)t

    def _retry_supabase_call(self, func, max_retries=3, initial_delay=0.5):
        """
        Retry a Supabase call with exponential backoff for transient connection errors.
        
        Args:
            func: Function to call (should be a lambda or callable)
            max_retries: Maximum number of retry attempts
            initial_delay: Initial delay in seconds before first retry
            
        Returns:
            Result of the function call
        """
        last_error = None
        for attempt in range(max_retries):
            try:
                return func()
            except Exception as e:
                error_str = str(e).lower()
                error_code = getattr(e, 'errno', None)
                
                # Check if it's a transient connection error
                is_transient = (
                    'resource temporarily unavailable' in error_str or
                    error_code == 35 or  # EAGAIN/EWOULDBLOCK
                    'connection' in error_str or
                    'timeout' in error_str or
                    'temporarily unavailable' in error_str
                )
                
                if not is_transient or attempt == max_retries - 1:
                    # Not a transient error or last attempt, raise it
                    raise
                
                last_error = e
                delay = initial_delay * (2 ** attempt)  # Exponential backoff
                time.sleep(delay)
        
        # Should never reach here, but just in case
        raise last_error if last_error else Exception("Retry failed")

    def get_meal_plans(self, user_id: str) -> tuple[list | None, str | None]:
        """
        Retrieves a user's meal plans using direct table query with retry logic.

        Args:
            user_id (str): The Supabase user ID.

        Returns:
            tuple[list | None, str | None]: (list of meal plans, None) on success,
                                          (None, error_message) on failure.
        """
        try:
            print(f"[DEBUG] Fetching meal plans for user: {user_id}")
            
            # Query the meal_plan_management table with retry logic
            # Only return APPROVED plans (is_approved = TRUE)
            # Plans created by admin that are not approved yet won't show to user
            result = self._retry_supabase_call(
                lambda: self.supabase.table('meal_plan_management')
                    .select('*')
                    .eq('user_id', user_id)
                    .eq('is_approved', True)
                    .order('updated_at', desc=True)
                    .execute()
            )
            
            print(f"[DEBUG] Query result: {result.data}")
            
            if result.data is not None:
                # Return the list of meal plans
                return result.data, None
            else:
                return [], None
        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Exception in get_meal_plans after retries: {error_msg}")
            return None, error_msg

    def save_session(self, user_id: str, session_id: str, session_data: dict, created_at: str) -> tuple[bool, str | None]:
        """
        Saves a new session record using RPC.
        
        Args:
            user_id (str): The Supabase user ID.
            session_id (str): Unique session identifier.
            session_data (dict): Session-specific data (JSONB).
            created_at (str): ISO timestamp of session creation.
        
        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        fallback_error = None
        try:
            result = self.supabase.rpc('save_session', {
                'p_user_id': user_id,
                'p_session_id': session_id,
                'p_session_data': session_data,
                'p_created_at': created_at
            }).execute()
            
            if result.data and result.data[0].get('status') == 'success':
                return True, None
            else:
                fallback_error = result.data[0].get('message') if result.data else 'Failed to save session'
        except Exception as e:
            fallback_error = str(e)

        # Fallback to direct table insert if RPC is unavailable or failed
        try:
            payload = {
                'id': session_id,
                'user_id': user_id,
                'login_at': created_at,
            }
            if session_data:
                try:
                    payload['device_info'] = json.dumps(session_data)
                except Exception:
                    payload['device_info'] = str(session_data)
            result = self.supabase.table('user_sessions').insert(payload).execute()
            if result.data:
                return True, None
            return False, fallback_error or 'Failed to save session'
        except Exception as insert_error:
            return False, fallback_error or f'Failed to save session via fallback: {str(insert_error)}'

    def get_session(self, user_id: str, session_id: str) -> tuple[dict | None, str | None]:
        """
        Retrieves a specific session by ID for the given user.
        
        Args:
            user_id (str): The Supabase user ID.
            session_id (str): The session ID to retrieve.
        
        Returns:
            tuple[dict | None, str | None]: (session_data, None) on success,
                                          (None, error_message) on failure.
        """
        try:
            result = self.supabase.rpc('get_session', {
                'p_user_id': user_id,
                'p_session_id': session_id
            }).execute()
            
            if result.data and result.data[0].get('status') == 'success':
                return result.data[0].get('data'), None
            else:
                error = result.data[0].get('message') if result.data else 'Session not found'
                return None, error
        except Exception as e:
            return None, str(e)

    def update_session(self, user_id: str, session_id: str, session_data: dict) -> tuple[bool, str | None]:
        """
        Updates an existing session record.
        
        Args:
            user_id (str): The Supabase user ID.
            session_id (str): The session ID to update.
            session_data (dict): Updated session data (JSONB).
        
        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        try:
            result = self.supabase.rpc('update_session', {
                'p_user_id': user_id,
                'p_session_id': session_id,
                'p_session_data': session_data
            }).execute()
            
            if result.data and result.data[0].get('status') == 'success':
                return True, None
            else:
                error = result.data[0].get('message') if result.data else 'Failed to update session'
                return False, error
        except Exception as e:
            return False, str(e)

    def list_user_sessions(self, user_id: str) -> tuple[list | None, str | None]:
        """
        Lists all sessions for a user.
        
        Args:
            user_id (str): The Supabase user ID.
        
        Returns:
            tuple[list | None, str | None]: (list of sessions, None) on success,
                                          (None, error_message) on failure.
        """
        try:
            result = self.supabase.rpc('list_user_sessions', {
                'p_user_id': user_id
            }).execute()
            
            # The RPC function returns the data directly as a JSONB array
            # or null if no records, or an error object if there's an exception
            if result.data:
                if isinstance(result.data[0], dict) and result.data[0].get('status') == 'error':
                    # Error case
                    error = result.data[0].get('message', 'Failed to list sessions')
                    return None, error
                else:
                    # Success case - data is returned directly as array
                    return result.data[0] if result.data[0] is not None else [], None
            else:
                return [], None
        except Exception as e:
            return None, str(e)

    def save_shared_recipe(self, user_id: str | None, recipe_type: str, suggestion: str | None,
                          instructions: str | None, ingredients: str | None, detected_foods: str | None,
                          analysis_id: str | None, youtube: str | None, google: str | None,
                          resources: str | None) -> tuple[bool, str | None]:
        """
        Saves a shared recipe using RPC.

        Args:
            user_id (str | None): The Supabase user ID of the sharer.
            recipe_type (str): 'ingredient_detection' or 'food_detection'.
            suggestion (str | None): Recipe name/suggestion.
            instructions (str | None): HTML string of instructions.
            ingredients (str | None): JSON string of ingredients array.
            detected_foods (str | None): JSON string of detected foods array.
            analysis_id (str | None): Unique ID for the initial analysis.
            youtube (str | None): Raw YouTube link.
            google (str | None): Raw Google link.
            resources (str | None): Combined HTML string for resources.

        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        try:
            result = self.supabase.rpc('share_recipe', {
                'p_user_id': user_id,
                'p_recipe_type': recipe_type,
                'p_suggestion': suggestion,
                'p_instructions': instructions,
                'p_ingredients': ingredients,
                'p_detected_foods': detected_foods,
                'p_analysis_id': analysis_id,
                'p_youtube': youtube,
                'p_google': google,
                'p_resources': resources
            }).execute()
            
            if result.data and result.data[0].get('status') == 'success':
                return True, None
            else:
                error = result.data[0].get('message') if result.data else 'Failed to save shared recipe'
                return False, error
        except Exception as e:
            return False, str(e)

    def update_meal_plan(self, user_id: str, plan_id: str, plan_data: dict) -> tuple[bool, str | None]:
        """
        Updates an existing meal plan using RPC.

        Args:
            user_id (str): The Supabase user ID.
            plan_id (str): The meal plan ID to update.
            plan_data (dict): The updated meal plan data (JSONB).

        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        try:
            result = self.supabase.rpc('update_meal_plan', {
                'p_user_id': user_id,
                'p_plan_id': plan_id,
                'p_plan_data': plan_data
            }).execute()
            
            if result.data and result.data[0].get('status') == 'success':
                return True, None
            else:
                error = result.data[0].get('message') if result.data else 'Failed to update meal plan'
                return False, error
        except Exception as e:
            return False, str(e)

    def delete_meal_plan(self, user_id: str, plan_id: str) -> tuple[bool, str | None]:
        """
        Deletes a meal plan using direct table operations.
        """
        try:
            print(f"[DEBUG] Attempting to delete meal plan {plan_id} for user {user_id}")
            
            # Delete directly from table
            result = self.supabase.table('meal_plan_management').delete().eq('user_id', user_id).eq('id', plan_id).execute()
            
            print(f"[DEBUG] Delete result: {result}")
            
            if result.data:
                print(f"[DEBUG] Delete successful")
                return True, None
            else:
                print(f"[DEBUG] No rows deleted")
                return False, 'Meal plan not found or not authorized'
        except Exception as e:
            print(f"[DEBUG] Exception in delete_meal_plan: {e}")
            return False, str(e)

    def clear_meal_plans(self, user_id: str) -> tuple[bool, str | None]:
        """
        Clears all meal plans for a user using RPC.

        Args:
            user_id (str): The Supabase user ID.

        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        try:
            result = self.supabase.rpc('clear_user_meal_plans', {
                'p_user_id': user_id
            }).execute()
            
            if result.data and result.data[0].get('status') == 'success':
                return True, None
            else:
                error = result.data[0].get('message') if result.data else 'Failed to clear meal plans'
                return False, error
        except Exception as e:
            return False, str(e)

    def save_user_settings(self, user_id: str, settings_type: str, settings_data: dict) -> tuple[bool, str | None]:
        """
        Saves user settings using direct table insert (fallback if RPC doesn't work).
        
        NOTE: This method uses the service role client which should bypass RLS.
        If you see RLS errors here, verify that SUPABASE_SERVICE_ROLE_KEY is the correct
        service role key from Supabase dashboard (not the anon key).

        Args:
            user_id (str): The Supabase user ID.
            settings_type (str): Type of settings (e.g., 'health_profile').
            settings_data (dict): The settings data to save.

        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        try:
            # Verify we have service role key configured
            if not hasattr(self, '_service_role_key') or not self._service_role_key:
                error_msg = "Supabase service role key is not configured. Cannot bypass RLS."
                print(f"[ERROR] {error_msg}")
                return False, error_msg
            
            # Get existing settings BEFORE saving (for history comparison)
            # Add retry logic for connection errors
            existing = None
            record_exists = False
            existing_settings = {}
            max_retries = 3
            initial_delay = 0.5
            
            for attempt in range(max_retries):
                try:
                    existing = self.supabase.table('user_settings').select('*').eq('user_id', user_id).eq('settings_type', settings_type).execute()
                    record_exists = bool(existing.data and len(existing.data) > 0)
                    break  # Success, exit retry loop
                except Exception as query_error:
                    error_str = str(query_error).lower()
                    error_type = type(query_error).__name__
                    
                    # Check if it's a connection error that should be retried
                    is_connection_error = (
                        'connectionterminated' in error_str or
                        'remoteprotocolerror' in error_type.lower() or
                        'connection' in error_str and ('terminated' in error_str or 'reset' in error_str or 'closed' in error_str) or
                        'resource temporarily unavailable' in error_str or
                        '[errno 35]' in error_str
                    )
                    
                    if is_connection_error and attempt < max_retries - 1:
                        delay = initial_delay * (2 ** attempt)
                        print(f"[WARNING] Connection error getting existing settings (attempt {attempt + 1}/{max_retries}): {str(query_error)}. Retrying in {delay}s...")
                        import time
                        time.sleep(delay)
                        continue
                    
                    # Not a retryable error or last attempt - log and continue with empty existing_settings
                    print(f"[WARNING] Could not fetch existing settings: {str(query_error)}. Continuing without existing settings comparison.")
                    existing = None
                    record_exists = False
                    break
            
            # Parse existing settings if we got them
            if existing and record_exists:
                existing_settings_raw = existing.data[0].get('settings_data', {})
                if isinstance(existing_settings_raw, str):
                    try:
                        existing_settings = json.loads(existing_settings_raw)
                    except (json.JSONDecodeError, ValueError, TypeError):
                        existing_settings = {}
                elif isinstance(existing_settings_raw, dict):
                    existing_settings = existing_settings_raw
            
            
            # Normalize new settings
            normalized_settings = settings_data
            if isinstance(settings_data, dict):
                normalized_settings = json.loads(json.dumps(settings_data))
            
            # Calculate changed fields BEFORE saving
            # Always use proper field names, never indices
            changed_fields = []
            
            # Define the expected field names for health_profile settings
            expected_fields = ['hasSickness', 'sicknessType', 'age', 'gender', 'height', 'weight', 
                              'waist', 'activityLevel', 'goal', 'location']
            
            if isinstance(existing_settings, dict) and isinstance(normalized_settings, dict):
                if len(existing_settings) > 0:
                    # Compare existing vs new settings
                    all_keys = set(list(existing_settings.keys()) + list(normalized_settings.keys()))
                    for key in all_keys:
                        # Only track expected field names, skip any numeric keys or unexpected fields
                        if isinstance(key, str) and (key in expected_fields or not key.isdigit()):
                            old_value = existing_settings.get(key)
                            new_value = normalized_settings.get(key)
                            try:
                                old_str = json.dumps(old_value, sort_keys=True) if old_value is not None else None
                                new_str = json.dumps(new_value, sort_keys=True) if new_value is not None else None
                                if old_str != new_str:
                                    changed_fields.append(key)
                            except:
                                if old_value != new_value:
                                    changed_fields.append(key)
                else:
                    # First save - all fields are new, but only include expected field names
                    changed_fields = [key for key, value in normalized_settings.items() 
                                     if isinstance(key, str) and key in expected_fields 
                                     and value is not None and value != '']
            
            # If no changes detected, include all fields with values (but only expected field names)
            if not changed_fields:
                changed_fields = [key for key, value in normalized_settings.items() 
                                if isinstance(key, str) and key in expected_fields
                                and value is not None and value != '']
            
            # Ensure we always have at least the fields that have values
            if not changed_fields and isinstance(normalized_settings, dict):
                # Fallback: get all non-numeric keys that have values
                changed_fields = [key for key, value in normalized_settings.items() 
                                if isinstance(key, str) and not key.isdigit()
                                and value is not None and value != '']
            
            # Try RPC first
            rpc_success = False
            persisted_record = None
            timestamp = datetime.utcnow().isoformat() + 'Z'
            
            try:
                result, rpc_error = self._retry_operation(
                    lambda: self.supabase.rpc('upsert_user_settings', {
                    'p_user_id': user_id,
                    'p_settings_type': settings_type,
                    'p_settings_data': json.dumps(normalized_settings) if isinstance(normalized_settings, dict) else normalized_settings
                    }).execute(),
                    operation_name="upsert_user_settings RPC"
                )
                
                if rpc_error:
                    raise rpc_error
                
                if result.data and len(result.data) > 0:
                    data = result.data[0] if isinstance(result.data, list) else result.data
                    if data.get('status') == 'success':
                        rpc_success = True
                        
                        # RPC function should have created history automatically
                        # Get the saved record for history
                        saved_record, fetch_error = self.get_user_settings(user_id, settings_type)
                        if saved_record:
                            if 'settings_data' in saved_record:
                                settings_data_saved = saved_record['settings_data']
                                if isinstance(settings_data_saved, str):
                                    try:
                                        settings_data_saved = json.loads(settings_data_saved)
                                    except:
                                        settings_data_saved = normalized_settings
                                persisted_record = {'settings_data': settings_data_saved}
                            else:
                                persisted_record = {'settings_data': saved_record.get('settings_data', normalized_settings)}
                        else:
                            persisted_record = {'settings_data': normalized_settings}
                    else:
                        error = data.get('message', 'Failed to save settings')
            except Exception as rpc_error:
                pass  # RPC failed, will use direct upsert
            
            # If RPC didn't succeed, use direct table upsert
            if not rpc_success:
                
                upsert_payload = {
                    'user_id': user_id,
                    'settings_type': settings_type,
                    'settings_data': normalized_settings,
                    'updated_at': timestamp
                }
                if not record_exists:
                    upsert_payload['created_at'] = timestamp
                
                # Use retry logic for direct upsert
                # IMPORTANT: This operation uses the service role client which should bypass RLS
                # If you see RLS errors here, it means:
                # 1. The service role key is not being used correctly, OR
                # 2. User session tokens are somehow overriding the service role key
                # 
                # To fix: Ensure this client is ONLY initialized with service role key
                # and never receives user JWT tokens in headers or cookies
                
                if not hasattr(self, '_service_role_key') or not self._service_role_key:
                    return False, 'Supabase service role key not configured properly'
                
                # Create a fresh client call without any user session context
                # This ensures we're using ONLY the service role key, not user tokens
                result, upsert_error = self._retry_operation(
                    lambda: self.supabase
                        .table('user_settings')
                        .upsert(
                            upsert_payload,
                            on_conflict='user_id,settings_type',
                            returning='representation'
                        )
                        .execute(),
                    operation_name="direct settings upsert"
                )
                
                if upsert_error:
                    # Check if it's an RLS error - this should NOT happen with service role key
                    error_str = str(upsert_error).lower()
                    if 'row-level security' in error_str or 'rls' in error_str or '42501' in str(upsert_error):
                        error_msg = (
                            f"CRITICAL RLS ERROR: Service role key should bypass RLS, but got error: {upsert_error}. "
                            f"This usually means:\n"
                            f"1. The SUPABASE_SERVICE_ROLE_KEY environment variable is not the service role key, OR\n"
                            f"2. User session tokens are overriding the service role key, OR\n"
                            f"3. The Supabase client is incorrectly configured.\n"
                            f"Please verify that SUPABASE_SERVICE_ROLE_KEY is the actual service role key from Supabase dashboard."
                        )
                        print(f"[ERROR] {error_msg}")
                        return False, error_msg
                    raise upsert_error
                
                if not result.data:
                    print(f"[ERROR] No data returned from upsert operation")
                    return False, 'Failed to save settings via upsert'
                
                persisted_record = result.data[0]
            
            # Ensure we have persisted_record
            if not persisted_record:
                print(f"[ERROR] No persisted record available for history")
                return False, 'Failed to save settings'
            
            # ALWAYS create history entry after settings are saved (both RPC and direct paths)
            try:
                # Use the same Supabase client (already has service role key for admin operations)
                admin_client = self.supabase
                
                # Get settings_data from persisted record
                settings_data_for_history = persisted_record.get('settings_data', normalized_settings)
                if isinstance(settings_data_for_history, str):
                    try:
                        settings_data_for_history = json.loads(settings_data_for_history)
                    except (json.JSONDecodeError, ValueError, TypeError):
                        settings_data_for_history = normalized_settings
                
                history_data = {
                    'user_id': user_id,
                    'settings_type': settings_type,
                    'settings_data': settings_data_for_history,
                    'previous_settings_data': existing_settings if existing_settings else {},
                    'changed_fields': changed_fields,
                    'created_at': timestamp,
                    'created_by': user_id
                }
                
                # Use retry logic for history insert
                history_result, history_error = self._retry_operation(
                    lambda: admin_client.table('user_settings_history').insert(history_data).execute(),
                    operation_name="history insert"
                )
                
                if history_error:
                    raise history_error
                
                if not (history_result and history_result.data and len(history_result.data) > 0):
                    # Try to verify if record was actually created despite no data returned
                    verify_history, verify_error = self._retry_operation(
                        lambda: admin_client.table('user_settings_history')
                            .select('id')
                            .eq('user_id', user_id)
                            .eq('settings_type', settings_type)
                            .order('created_at', desc=True)
                            .limit(1)
                            .execute(),
                        operation_name="history verification"
                    )
                    if not (verify_history and verify_history.data):
                        print(f"[ERROR] History record not found after insert - check RLS policies")
            except Exception as history_error:
                error_str = str(history_error)
                # Only log actual errors, not warnings
                if 'permission' in error_str.lower() or 'policy' in error_str.lower() or 'row-level security' in error_str.lower():
                    print(f"[ERROR] Failed to save settings history (RLS/permissions issue): {error_str}")
            return True, None
                
        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Exception in save_user_settings: {error_msg}")
            import traceback
            traceback.print_exc()
            return False, error_msg

    def get_user_settings(self, user_id: str, settings_type: str = 'health_profile') -> tuple[dict | None, str | None]:
        """
        Retrieves user settings using direct table query (fallback if RPC doesn't work).
        Includes retry logic for transient connection errors.

        Args:
            user_id (str): The Supabase user ID.
            settings_type (str): Type of settings to retrieve.

        Returns:
            tuple[dict | None, str | None]: (settings_data, None) on success,
                                          (None, error_message) on failure.
        """
        try:
            # First try RPC function with retry
            try:
                result = self._retry_supabase_call(
                    lambda: self.supabase.rpc('get_user_settings', {
                        'p_user_id': user_id,
                        'p_settings_type': settings_type
                    }).execute()
                )
                
                if result.data and len(result.data) > 0:
                    data = result.data[0] if isinstance(result.data, list) else result.data
                    if data.get('status') == 'success':
                        return data.get('data'), None
            except Exception as rpc_error:
                # Fall through to direct query - no need to log every RPC failure
                pass
            
            # Fallback: Direct table query with retry
            result = self._retry_supabase_call(
                lambda: self.supabase.table('user_settings')
                    .select('*')
                    .eq('user_id', user_id)
                    .eq('settings_type', settings_type)
                    .execute()
            )
            
            if result.data and len(result.data) > 0:
                return result.data[0], None
            else:
                return None, None  # No settings found is not an error
                
        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Exception in get_user_settings after retries: {error_msg}")
            import traceback
            traceback.print_exc()
            return None, error_msg

    def delete_user_settings(self, user_id: str, settings_type: str) -> tuple[bool, str | None]:
        """
        Deletes user settings using RPC.

        Args:
            user_id (str): The Supabase user ID.
            settings_type (str): Type of settings to delete.

        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        try:
            result = self.supabase.rpc('delete_user_settings', {
                'p_user_id': user_id,
                'p_settings_type': settings_type
            }).execute()
            
            if result.data and result.data[0].get('status') == 'success':
                return True, None
            else:
                error = result.data[0].get('message') if result.data else 'Failed to delete settings'
                return False, error
        except Exception as e:
            return False, str(e)

    def delete_settings_history(self, user_id: str, record_id: str) -> tuple[bool, str | None]:
        """
        Deletes a specific settings history record for a user.

        Args:
            user_id (str): The Supabase user ID.
            record_id (str): The ID of the history record to delete.

        Returns:
            tuple[bool, str | None]: (True, None) on success, (False, error_message) on failure.
        """
        try:
            result = self.supabase.table('user_settings_history').delete().eq('id', record_id).eq('user_id', user_id).execute()
            if result.data:
                return True, None
            return False, 'Record not found or not authorized'
        except Exception as e:
            return False, str(e)