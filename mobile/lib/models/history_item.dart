import 'dart:convert';

class HistoryItem {
  HistoryItem({
    required this.id,
    required this.recipeType,
    required this.createdAt,
    this.suggestion,
    this.instructions,
    this.ingredients = const [],
    this.detectedFoods = const [],
    this.youtubeLink,
    this.googleLink,
    this.resources,
  });

  final String id;
  final String recipeType;
  final DateTime createdAt;
  final String? suggestion;
  final String? instructions;
  final List<String> ingredients;
  final List<String> detectedFoods;
  final String? youtubeLink;
  final String? googleLink;
  final Map<String, dynamic>? resources;

  String get displayName {
    if ((suggestion ?? '').trim().isNotEmpty) return suggestion!;
    if (detectedFoods.isNotEmpty) {
      return detectedFoods.first +
          (detectedFoods.length > 1 ? ' (+${detectedFoods.length - 1})' : '');
    }
    return 'Detection';
  }

  String get sourceLabel {
    switch (recipeType) {
      case 'food_detection':
        return 'Food Detect';
      case 'ingredient_detection':
        return 'Ingredient Detect';
      case 'health_meal':
        return 'Health Meal';
      case 'meal_plan':
        return 'Meal Plan';
      default:
        return 'Detection';
    }
  }

  factory HistoryItem.fromJson(Map<String, dynamic> json) {
    List<String> parseMaybeJsonArray(dynamic raw) {
      if (raw == null) return const [];
      if (raw is List) return raw.map((e) => e.toString()).toList();
      final s = raw.toString();
      try {
        final decoded = jsonDecode(s);
        if (decoded is List) return decoded.map((e) => e.toString()).toList();
      } catch (_) {}
      return s.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    }

    Map<String, dynamic>? parseMaybeJsonMap(dynamic raw) {
      if (raw == null) return null;
      if (raw is Map) return Map<String, dynamic>.from(raw);
      try {
        final decoded = jsonDecode(raw.toString());
        if (decoded is Map) return Map<String, dynamic>.from(decoded);
      } catch (_) {}
      return null;
    }

    DateTime parseDate(dynamic v) {
      if (v == null) return DateTime.now();
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return DateTime.now();
      }
    }

    return HistoryItem(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      recipeType: (json['recipe_type'] ?? 'detection').toString(),
      createdAt: parseDate(json['created_at'] ?? json['createdAt']),
      suggestion: json['suggestion']?.toString(),
      instructions: json['instructions']?.toString(),
      ingredients: parseMaybeJsonArray(json['ingredients']),
      detectedFoods: parseMaybeJsonArray(json['detected_foods']),
      youtubeLink: json['youtube_link']?.toString(),
      googleLink: json['google_link']?.toString(),
      resources: parseMaybeJsonMap(json['resources_link']),
    );
  }
}
