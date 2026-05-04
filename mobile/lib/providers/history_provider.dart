import 'package:flutter/foundation.dart';

import '../core/api_exceptions.dart';
import '../models/history_item.dart';
import '../services/api_client.dart';

class HistoryProvider with ChangeNotifier {
  HistoryProvider();

  final ApiClient _api = ApiClient.instance;

  List<HistoryItem> _items = [];
  bool _loading = false;
  String? _error;
  String _filter = 'all';

  List<HistoryItem> get items {
    if (_filter == 'all') return List.unmodifiable(_items);
    return _items.where((i) => i.recipeType == _filter).toList();
  }

  bool get loading => _loading;
  String? get error => _error;
  String get filter => _filter;

  Future<void> load() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final resp = await _api.getDetectionHistory();
      final raw = resp['history'] ?? resp['data'] ?? resp['items'];
      if (raw is List) {
        _items = raw
            .whereType<Map>()
            .map((e) => HistoryItem.fromJson(Map<String, dynamic>.from(e)))
            .toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      }
    } on ApiException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Could not load history: $e';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setFilter(String value) {
    _filter = value;
    notifyListeners();
  }

  Future<bool> delete(String id) async {
    try {
      await _api.deleteDetectionHistory(id);
      _items.removeWhere((i) => i.id == id);
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }
}
