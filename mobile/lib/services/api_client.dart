import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../core/api_exceptions.dart';
import '../core/config.dart';
import '../core/storage.dart';

typedef JsonMap = Map<String, dynamic>;

class ApiClient {
  ApiClient._internal();
  static final ApiClient instance = ApiClient._internal();

  final http.Client _http = http.Client();
  bool _refreshing = false;

  String get _base => '${AppConfig.apiBaseUrl}/api';

  Future<String?> _token() => AppStorage.readSecure(AppConfig.kAccessToken);

  Future<Map<String, String>> _headers({
    bool auth = true,
    Map<String, String>? extra,
  }) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      if (extra != null) ...extra,
    };
    if (auth) {
      final token = await _token();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    bool auth = true,
    Duration timeout = const Duration(seconds: 30),
    bool retried = false,
  }) async {
    final uri = Uri.parse('$_base$path');
    final headers = await _headers(auth: auth);
    if (body != null) {
      headers['Content-Type'] = 'application/json';
    }

    http.Response res;
    try {
      final encoded = body == null
          ? null
          : (body is String ? body : jsonEncode(body));

      switch (method) {
        case 'GET':
          res = await _http.get(uri, headers: headers).timeout(timeout);
          break;
        case 'POST':
          res = await _http
              .post(uri, headers: headers, body: encoded)
              .timeout(timeout);
          break;
        case 'PUT':
          res = await _http
              .put(uri, headers: headers, body: encoded)
              .timeout(timeout);
          break;
        case 'DELETE':
          res = await _http
              .delete(uri, headers: headers, body: encoded)
              .timeout(timeout);
          break;
        case 'PATCH':
          res = await _http
              .patch(uri, headers: headers, body: encoded)
              .timeout(timeout);
          break;
        default:
          throw ApiException('Unsupported method $method');
      }
    } on SocketException {
      throw ApiException('Network error. Check your connection and try again.');
    } on TimeoutException {
      throw ApiException('Request timed out. Please try again.');
    }

    final decoded = _decode(res);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return decoded;
    }

    if (res.statusCode == 401 && auth && !retried && path != '/refresh-token' &&
        path != '/login' && path != '/register') {
      final didRefresh = await _tryRefresh();
      if (didRefresh) {
        return _send(method, path,
            body: body, auth: auth, timeout: timeout, retried: true);
      }
    }

    final message = _extractError(decoded) ??
        'Request failed (${res.statusCode})';
    throw ApiException(message, statusCode: res.statusCode, data: decoded);
  }

  dynamic _decode(http.Response res) {
    final ct = res.headers['content-type'] ?? '';
    if (res.body.isEmpty) return null;
    if (ct.contains('application/json')) {
      try {
        return jsonDecode(res.body);
      } catch (_) {
        return res.body;
      }
    }
    return res.body;
  }

  String? _extractError(dynamic data) {
    if (data is Map) {
      final msg = data['error'] ?? data['message'];
      if (msg is String && msg.trim().isNotEmpty) return msg;
    }
    if (data is String && data.trim().isNotEmpty) return data;
    return null;
  }

  Future<bool> _tryRefresh() async {
    if (_refreshing) return false;
    _refreshing = true;
    try {
      final refresh = await AppStorage.readSecure(AppConfig.kRefreshToken);
      if (refresh == null || refresh.isEmpty) return false;
      final res = await _send('POST', '/refresh-token',
          body: {'refresh_token': refresh}, auth: false, retried: true);
      if (res is Map && res['status'] == 'success') {
        final token = res['access_token']?.toString();
        final refreshToken = res['refresh_token']?.toString();
        if (token != null && token.isNotEmpty) {
          await AppStorage.writeSecure(AppConfig.kAccessToken, token);
        }
        if (refreshToken != null && refreshToken.isNotEmpty) {
          await AppStorage.writeSecure(AppConfig.kRefreshToken, refreshToken);
        }
        return true;
      }
    } catch (_) {
      // ignore
    } finally {
      _refreshing = false;
    }
    return false;
  }

  // ------------------------------------------------------------------
  // Generic helpers
  // ------------------------------------------------------------------

  Future<JsonMap> get(String path, {Duration? timeout}) async {
    final res = await _send('GET', path,
        timeout: timeout ?? const Duration(seconds: 30));
    return _asMap(res);
  }

  Future<JsonMap> post(String path, {Object? body, bool auth = true, Duration? timeout}) async {
    final res = await _send('POST', path,
        body: body, auth: auth, timeout: timeout ?? const Duration(seconds: 30));
    return _asMap(res);
  }

  Future<JsonMap> put(String path, {Object? body}) async {
    final res = await _send('PUT', path, body: body);
    return _asMap(res);
  }

  Future<JsonMap> delete(String path, {Object? body}) async {
    final res = await _send('DELETE', path, body: body);
    return _asMap(res);
  }

  JsonMap _asMap(dynamic res) {
    if (res is Map) return Map<String, dynamic>.from(res);
    return {'status': 'success', 'data': res};
  }

  // ------------------------------------------------------------------
  // Auth
  // ------------------------------------------------------------------

  Future<JsonMap> login({required String email, required String password}) {
    return post('/login', body: {'email': email, 'password': password}, auth: false);
  }

  Future<JsonMap> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
    String signupType = 'individual',
  }) {
    return post(
      '/register',
      body: {
        'email': email,
        'password': password,
        if (firstName != null) 'first_name': firstName,
        if (lastName != null) 'last_name': lastName,
        'signup_type': signupType,
      },
      auth: false,
      timeout: const Duration(seconds: 45),
    );
  }

  Future<JsonMap> forgotPassword(String email) =>
      post('/forgot-password', body: {'email': email}, auth: false);

  Future<JsonMap> getProfile() => get('/profile');

  Future<JsonMap> logout() => post('/logout');

  // ------------------------------------------------------------------
  // Health profile / settings
  // ------------------------------------------------------------------

  Future<JsonMap> getSettings([String type = 'health_profile']) =>
      get('/settings?settings_type=$type');

  Future<JsonMap> saveSettings(String type, Map<String, dynamic> data) =>
      post('/settings', body: {
        'settings_type': type,
        'settings_data': data,
      });

  // ------------------------------------------------------------------
  // Meal plans
  // ------------------------------------------------------------------

  Future<JsonMap> getMealPlans() =>
      get('/meal_plan', timeout: const Duration(seconds: 45));

  Future<JsonMap> saveMealPlan(Map<String, dynamic> planData) => post(
        '/meal_plans',
        body: {
          'plan_data': planData,
          'created_at': DateTime.now().toUtc().toIso8601String(),
        },
      );

  Future<JsonMap> deleteMealPlan(String id) => delete('/meal_plans/$id');

  Future<JsonMap> clearMealPlans() => delete('/meal_plans/clear');

  // ------------------------------------------------------------------
  // Detection / health history
  // ------------------------------------------------------------------

  Future<JsonMap> getDetectionHistory() =>
      get('/health_history', timeout: const Duration(seconds: 45));

  Future<JsonMap> getDetectionHistoryById(String id) =>
      get('/health_history/$id');

  Future<JsonMap> saveDetectionHistory(Map<String, dynamic> data) =>
      post('/health_history', body: data);

  Future<JsonMap> deleteDetectionHistory(String id) =>
      delete('/health_history/$id');

  // ------------------------------------------------------------------
  // Feedback
  // ------------------------------------------------------------------

  Future<JsonMap> submitFeedback(String feedback) =>
      post('/feedback', body: {'feedback_text': feedback});

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------

  Future<JsonMap> getNotifications() => get('/notifications');

  Future<JsonMap> markAllNotificationsRead() =>
      post('/notifications/read-all');

  // ------------------------------------------------------------------
  // Token refresh
  // ------------------------------------------------------------------

  Future<JsonMap> refreshToken() async {
    final refresh = await AppStorage.readSecure(AppConfig.kRefreshToken);
    if (refresh == null || refresh.isEmpty) {
      throw ApiException('No refresh token available', statusCode: 401);
    }
    return post('/refresh-token',
        body: {'refresh_token': refresh}, auth: false);
  }
}
