class DetectedIngredient {
  DetectedIngredient({
    required this.name,
    required this.healthInfo,
    required this.isWarning,
  });

  final String name;
  final String healthInfo;
  final bool isWarning;
}

class HealthMeal {
  HealthMeal({
    required this.calories,
    required this.carbs,
    required this.fat,
    required this.fiber,
    required this.protein,
    required this.foodSuggestions,
    required this.healthBenefit,
    required this.ingredientsUsed,
    this.image,
  });

  final num calories;
  final num carbs;
  final num fat;
  final num fiber;
  final num protein;
  final List<String> foodSuggestions;
  final String healthBenefit;
  final List<String> ingredientsUsed;
  String? image;

  String get primaryName =>
      foodSuggestions.isNotEmpty ? foodSuggestions.first : 'Health meal';

  factory HealthMeal.fromJson(Map<String, dynamic> json) {
    num n(dynamic v) {
      if (v is num) return v;
      return num.tryParse(v?.toString() ?? '') ?? 0;
    }

    List<String> list(dynamic v) {
      if (v is List) return v.map((e) => e.toString()).toList();
      if (v is String) {
        return v
            .split(',')
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty)
            .toList();
      }
      return const [];
    }

    return HealthMeal(
      calories: n(json['calories']),
      carbs: n(json['carbs']),
      fat: n(json['fat']),
      fiber: n(json['fiber']),
      protein: n(json['protein']),
      foodSuggestions: list(json['food_suggestions']),
      healthBenefit: (json['health_benefit'] ?? '').toString(),
      ingredientsUsed: list(json['ingredients_used']),
    );
  }
}
