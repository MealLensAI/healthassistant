import 'dart:io';

import 'package:flutter/foundation.dart';

import '../core/api_exceptions.dart';
import '../models/health_profile.dart';
import '../models/meal_plan.dart';
import '../services/ai_service.dart';
import '../services/api_client.dart';

class MealPlanProvider with ChangeNotifier {
  MealPlanProvider();

  final ApiClient _api = ApiClient.instance;
  final AiService _ai = AiService.instance;

  List<SavedMealPlan> _plans = [];
  SavedMealPlan? _selected;
  bool _loading = false;
  bool _generating = false;
  String? _error;

  List<SavedMealPlan> get plans => List.unmodifiable(_plans);
  SavedMealPlan? get selectedPlan => _selected;
  bool get loading => _loading;
  bool get generating => _generating;
  String? get error => _error;

  Future<void> loadPlans() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final resp = await _api.getMealPlans();
      final items = resp['meal_plans'];
      if (items is List) {
        _plans = items
            .whereType<Map>()
            .map((m) =>
                SavedMealPlan.fromBackend(Map<String, dynamic>.from(m)))
            .toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      }
      _selected ??= _plans.isNotEmpty ? _plans.first : null;
    } on ApiException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Could not load meal plans: $e';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void selectPlan(SavedMealPlan plan) {
    _selected = plan;
    notifyListeners();
  }

  Future<SavedMealPlan?> generateFromImage({
    required File image,
    required HealthProfile profile,
    String? budget,
    bool budgetMode = false,
  }) async {
    return _generate(() async {
      final health = profile.toAiPayload();
      if (health == null) {
        throw ApiException('Please complete your health profile first.');
      }
      final resp = await _ai.sickSmartPlan(
        inputType: 'image',
        image: image,
        healthPayload: health,
        location: profile.location,
        budget: budget,
        budgetMode: budgetMode,
      );
      return _persistAiResponse(resp, profile);
    });
  }

  Future<SavedMealPlan?> generateFromIngredients({
    required String ingredientList,
    required HealthProfile profile,
    String? budget,
    bool budgetMode = false,
  }) async {
    return _generate(() async {
      final health = profile.toAiPayload();
      if (health == null) {
        throw ApiException('Please complete your health profile first.');
      }
      final resp = await _ai.sickSmartPlan(
        inputType: 'ingredient_list',
        ingredientList: ingredientList,
        healthPayload: health,
        location: profile.location,
        budget: budget,
        budgetMode: budgetMode,
      );
      return _persistAiResponse(resp, profile);
    });
  }

  Future<SavedMealPlan?> autoGenerate({required HealthProfile profile}) async {
    return _generate(() async {
      final health = profile.toAiPayload();
      if (health == null) {
        throw ApiException('Please complete your health profile first.');
      }
      final resp = await _ai.aiNutritionPlan(health);
      return _persistAiResponse(resp, profile);
    });
  }

  Future<SavedMealPlan?> _generate(
      Future<SavedMealPlan?> Function() runner) async {
    _generating = true;
    _error = null;
    notifyListeners();
    try {
      return await runner();
    } on ApiException catch (e) {
      _error = e.message;
      return null;
    } catch (e) {
      _error = 'Could not generate plan: $e';
      return null;
    } finally {
      _generating = false;
      notifyListeners();
    }
  }

  Future<SavedMealPlan?> _persistAiResponse(
    Map<String, dynamic> resp,
    HealthProfile profile,
  ) async {
    // Try the documented shape first: `{ meal_plan: [...] }`
    final rawDays = resp['meal_plan'] ?? resp['mealPlan'] ?? resp['days'];
    final payload = <String, dynamic>{
      'mealPlan': rawDays,
      'name': 'Weekly Plan',
      'startDate': DateTime.now().toIso8601String(),
      'endDate': DateTime.now()
          .add(const Duration(days: 6))
          .toIso8601String(),
      'hasSickness': profile.hasSickness,
      'sicknessType': profile.sicknessType,
      'health_assessment': resp['health_assessment'],
      'user_info': profile.toAiPayload(),
    };

    final saveResp = await _api.saveMealPlan(payload);
    final plan = SavedMealPlan.fromBackend(
      Map<String, dynamic>.from(
        (saveResp['meal_plan'] as Map?) ?? {'plan_data': payload},
      ),
    );

    _plans = [plan, ..._plans];
    _selected = plan;
    notifyListeners();
    return plan;
  }

  Future<bool> deletePlan(String id) async {
    try {
      await _api.deleteMealPlan(id);
      _plans.removeWhere((p) => p.id == id);
      if (_selected?.id == id) {
        _selected = _plans.isNotEmpty ? _plans.first : null;
      }
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> clearAll() async {
    try {
      await _api.clearMealPlans();
      _plans = [];
      _selected = null;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      return false;
    }
  }
}
