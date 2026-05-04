import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Secure storage for auth tokens + small preferences helper.
///
/// We keep the API intentionally close to what the web app does with
/// `safeSetItem` / `safeGetItem`: simple key-value access.
class AppStorage {
  AppStorage._();

  static const FlutterSecureStorage _secure = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  static Future<void> writeSecure(String key, String? value) async {
    if (value == null) {
      await _secure.delete(key: key);
    } else {
      await _secure.write(key: key, value: value);
    }
  }

  static Future<String?> readSecure(String key) => _secure.read(key: key);

  static Future<void> deleteSecure(String key) => _secure.delete(key: key);

  static Future<void> wipeSecure() => _secure.deleteAll();

  static Future<SharedPreferences> prefs() => SharedPreferences.getInstance();

  static Future<void> setString(String key, String? value) async {
    final p = await prefs();
    if (value == null) {
      await p.remove(key);
    } else {
      await p.setString(key, value);
    }
  }

  static Future<String?> getString(String key) async {
    final p = await prefs();
    return p.getString(key);
  }

  static Future<void> setBool(String key, bool value) async {
    final p = await prefs();
    await p.setBool(key, value);
  }

  static Future<bool> getBool(String key, {bool fallback = false}) async {
    final p = await prefs();
    return p.getBool(key) ?? fallback;
  }

  static Future<void> remove(String key) async {
    final p = await prefs();
    await p.remove(key);
  }
}
