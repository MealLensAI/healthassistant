import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../core/api_exceptions.dart';
import '../core/config.dart';
import '../core/storage.dart';
import '../models/user.dart';
import '../services/api_client.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider with ChangeNotifier {
  AuthProvider() {
    _bootstrap();
  }

  final ApiClient _api = ApiClient.instance;

  AuthStatus _status = AuthStatus.unknown;
  AppUser? _user;
  bool _busy = false;
  String? _error;

  AuthStatus get status => _status;
  AppUser? get user => _user;
  bool get busy => _busy;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> _bootstrap() async {
    final token = await AppStorage.readSecure(AppConfig.kAccessToken);
    if (token == null || token.isEmpty) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }
    final cached = await AppStorage.getString(AppConfig.kUserData);
    if (cached != null) {
      try {
        _user = AppUser.fromJson(
          Map<String, dynamic>.from(jsonDecode(cached)),
        );
      } catch (_) {}
    }
    // Attempt a silent profile refresh; if it fails we still show the last
    // known user and fall back to unauthenticated only on auth errors.
    try {
      final resp = await _api.getProfile();
      if (resp['status'] == 'success' && resp['profile'] is Map) {
        _user = AppUser.fromJson(
          Map<String, dynamic>.from(resp['profile'] as Map),
        );
        await AppStorage.setString(
          AppConfig.kUserData,
          jsonEncode(_user!.toJson()),
        );
      }
      _status = AuthStatus.authenticated;
    } on ApiException catch (e) {
      if (e.isAuthError) {
        await _clearTokens();
        _status = AuthStatus.unauthenticated;
      } else {
        _status = _user == null
            ? AuthStatus.unauthenticated
            : AuthStatus.authenticated;
      }
    } catch (_) {
      _status = _user == null
          ? AuthStatus.unauthenticated
          : AuthStatus.authenticated;
    }
    notifyListeners();
  }

  Future<bool> login({required String email, required String password}) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final resp = await _api.login(email: email, password: password);
      if (resp['status'] != 'success') {
        _error = (resp['error'] ?? resp['message'] ?? 'Login failed').toString();
        return false;
      }
      await _persistTokens(resp);
      _user = _extractUser(resp) ??
          AppUser(uid: resp['user_id']?.toString() ?? '', email: email);
      await AppStorage.setString(
        AppConfig.kUserData,
        jsonEncode(_user!.toJson()),
      );
      _status = AuthStatus.authenticated;
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (e) {
      _error = 'Unexpected error: $e';
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    _busy = true;
    _error = null;
    notifyListeners();
    try {
      final resp = await _api.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      );
      if (resp['status'] != 'success') {
        _error = (resp['error'] ?? resp['message'] ?? 'Registration failed')
            .toString();
        return false;
      }
      await _persistTokens(resp);
      _user = _extractUser(resp) ??
          AppUser(uid: resp['user_id']?.toString() ?? '', email: email);
      await AppStorage.setString(
        AppConfig.kUserData,
        jsonEncode(_user!.toJson()),
      );
      _status = AuthStatus.authenticated;
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<bool> forgotPassword(String email) async {
    try {
      final resp = await _api.forgotPassword(email);
      return resp['status'] == 'success';
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _busy = true;
    notifyListeners();
    try {
      await _api.logout();
    } catch (_) {}
    await _clearTokens();
    _user = null;
    _status = AuthStatus.unauthenticated;
    _busy = false;
    notifyListeners();
  }

  Future<void> _persistTokens(Map<String, dynamic> resp) async {
    final token = resp['access_token']?.toString();
    final refresh = resp['refresh_token']?.toString();
    final sessionId = resp['session_id']?.toString();
    final userId = resp['user_id']?.toString();
    if (token != null && token.isNotEmpty) {
      await AppStorage.writeSecure(AppConfig.kAccessToken, token);
    }
    if (refresh != null && refresh.isNotEmpty) {
      await AppStorage.writeSecure(AppConfig.kRefreshToken, refresh);
    }
    if (sessionId != null && sessionId.isNotEmpty) {
      await AppStorage.writeSecure(AppConfig.kSessionId, sessionId);
    }
    if (userId != null && userId.isNotEmpty) {
      await AppStorage.writeSecure(AppConfig.kUserId, userId);
    }
  }

  AppUser? _extractUser(Map<String, dynamic> resp) {
    if (resp['user'] is Map) {
      return AppUser.fromJson(Map<String, dynamic>.from(resp['user'] as Map));
    }
    if (resp['profile'] is Map) {
      return AppUser.fromJson(
          Map<String, dynamic>.from(resp['profile'] as Map));
    }
    return null;
  }

  Future<void> _clearTokens() async {
    await AppStorage.deleteSecure(AppConfig.kAccessToken);
    await AppStorage.deleteSecure(AppConfig.kRefreshToken);
    await AppStorage.deleteSecure(AppConfig.kSessionId);
    await AppStorage.deleteSecure(AppConfig.kUserId);
    await AppStorage.remove(AppConfig.kUserData);
  }
}
