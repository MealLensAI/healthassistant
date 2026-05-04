class AppConfig {
  AppConfig._();

  static const String appName = 'MealLens AI';
  static const String tagline = 'Your AI-powered kitchen assistant';

  // Backend base URL (hosted production backend)
  static const String apiBaseUrl = 'https://api.meallensai.com/5001';

  // AI API base URL (hosted AI service)
  static const String aiApiBaseUrl = 'https://api.meallensai.com/7017';

  // Image search service used by the web app to enrich meal cards.
  static const String imageSearchUrl =
      'https://get-images-qa23.onrender.com/image';

  // Storage keys
  static const String kAccessToken = 'access_token';
  static const String kRefreshToken = 'supabase_refresh_token';
  static const String kSessionId = 'supabase_session_id';
  static const String kUserId = 'supabase_user_id';
  static const String kUserData = 'user_data';
  static const String kHealthProfile = 'meallensai_health_settings_v1';
  static const String kOnboardingSeen = 'onboarding_seen';
}
