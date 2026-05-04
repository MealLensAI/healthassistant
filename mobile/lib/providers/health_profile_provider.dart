import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../core/api_exceptions.dart';
import '../core/config.dart';
import '../core/storage.dart';
import '../models/health_profile.dart';
import '../services/api_client.dart';

class HealthProfileProvider with ChangeNotifier {
  HealthProfileProvider() {
    _load();
  }

  final ApiClient _api = ApiClient.instance;

  HealthProfile _profile = HealthProfile();
  bool _loading = true;
  bool _saving = false;
  String? _error;
  bool _loadedFromServer = false;

  HealthProfile get profile => _profile;
  bool get loading => _loading;
  bool get saving => _saving;
  bool get isComplete => _profile.isComplete;
  String? get error => _error;

  Future<void> _load() async {
    _loading = true;
    notifyListeners();
    // Hydrate from cache first.
    final cached = await AppStorage.getString(AppConfig.kHealthProfile);
    if (cached != null) {
      try {
        _profile = HealthProfile.fromJson(
          Map<String, dynamic>.from(jsonDecode(cached)),
        );
      } catch (_) {}
    }
    notifyListeners();

    // Then try the backend.
    try {
      final resp = await _api.getSettings();
      final data = resp['settings_data'];
      if (data is Map) {
        _profile = HealthProfile.fromJson(Map<String, dynamic>.from(data));
        await _cache();
        _loadedFromServer = true;
      }
    } on ApiException catch (e) {
      if (!e.isAuthError) _error = e.message;
    } catch (_) {
      // silent: we already hydrated from cache.
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> refresh() => _load();

  Future<bool> save(HealthProfile update) async {
    _saving = true;
    _error = null;
    notifyListeners();
    try {
      final resp = await _api.saveSettings('health_profile', update.toJson());
      if (resp['status'] != 'success') {
        _error = (resp['error'] ?? 'Save failed').toString();
        return false;
      }
      _profile = update;
      await _cache();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } finally {
      _saving = false;
      notifyListeners();
    }
  }

  void updateLocal(HealthProfile update) {
    _profile = update;
    _cache();
    notifyListeners();
  }

  Future<void> _cache() async {
    await AppStorage.setString(
      AppConfig.kHealthProfile,
      jsonEncode(_profile.toJson()),
    );
  }

  bool get loadedFromServer => _loadedFromServer;
}
