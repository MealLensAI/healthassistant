/// A single day of the weekly meal plan. Mirrors the JSON returned by the
/// AI + backend endpoints (`/smart_plan`, `/sick_smart_plan`,
/// `/ai_nutrition_plan`, `/auto_generate_plan`).
class DayMealPlan {
  DayMealPlan({
    required this.day,
    this.breakfast = '',
    this.lunch = '',
    this.dinner = '',
    this.snack = '',
    this.breakfastIngredients = const [],
    this.lunchIngredients = const [],
    this.dinnerIngredients = const [],
    this.snackIngredients = const [],
    this.breakfastCalories,
    this.breakfastProtein,
    this.breakfastCarbs,
    this.breakfastFat,
    this.breakfastBenefit,
    this.lunchCalories,
    this.lunchProtein,
    this.lunchCarbs,
    this.lunchFat,
    this.lunchBenefit,
    this.dinnerCalories,
    this.dinnerProtein,
    this.dinnerCarbs,
    this.dinnerFat,
    this.dinnerBenefit,
    this.snackCalories,
    this.snackProtein,
    this.snackCarbs,
    this.snackFat,
    this.snackBenefit,
  });

  final String day;
  final String breakfast;
  final String lunch;
  final String dinner;
  final String snack;

  final List<String> breakfastIngredients;
  final List<String> lunchIngredients;
  final List<String> dinnerIngredients;
  final List<String> snackIngredients;

  final num? breakfastCalories;
  final num? breakfastProtein;
  final num? breakfastCarbs;
  final num? breakfastFat;
  final String? breakfastBenefit;

  final num? lunchCalories;
  final num? lunchProtein;
  final num? lunchCarbs;
  final num? lunchFat;
  final String? lunchBenefit;

  final num? dinnerCalories;
  final num? dinnerProtein;
  final num? dinnerCarbs;
  final num? dinnerFat;
  final String? dinnerBenefit;

  final num? snackCalories;
  final num? snackProtein;
  final num? snackCarbs;
  final num? snackFat;
  final String? snackBenefit;

  List<MealEntry> toEntries({bool includeNutrition = false}) {
    final entries = <MealEntry>[
      MealEntry(
        type: MealType.breakfast,
        title: _clean(breakfast),
        original: breakfast,
        ingredients: breakfastIngredients,
        calories: includeNutrition ? breakfastCalories : null,
        protein: includeNutrition ? breakfastProtein : null,
        carbs: includeNutrition ? breakfastCarbs : null,
        fat: includeNutrition ? breakfastFat : null,
        benefit: includeNutrition ? breakfastBenefit : null,
      ),
      MealEntry(
        type: MealType.lunch,
        title: _clean(lunch),
        original: lunch,
        ingredients: lunchIngredients,
        calories: includeNutrition ? lunchCalories : null,
        protein: includeNutrition ? lunchProtein : null,
        carbs: includeNutrition ? lunchCarbs : null,
        fat: includeNutrition ? lunchFat : null,
        benefit: includeNutrition ? lunchBenefit : null,
      ),
      MealEntry(
        type: MealType.dinner,
        title: _clean(dinner),
        original: dinner,
        ingredients: dinnerIngredients,
        calories: includeNutrition ? dinnerCalories : null,
        protein: includeNutrition ? dinnerProtein : null,
        carbs: includeNutrition ? dinnerCarbs : null,
        fat: includeNutrition ? dinnerFat : null,
        benefit: includeNutrition ? dinnerBenefit : null,
      ),
    ];
    if (snack.trim().isNotEmpty) {
      entries.add(
        MealEntry(
          type: MealType.snack,
          title: _clean(snack),
          original: snack,
          ingredients: snackIngredients,
          calories: includeNutrition ? snackCalories : null,
          protein: includeNutrition ? snackProtein : null,
          carbs: includeNutrition ? snackCarbs : null,
          fat: includeNutrition ? snackFat : null,
          benefit: includeNutrition ? snackBenefit : null,
        ),
      );
    }
    return entries;
  }

  static String _clean(String name) {
    // Strip "(buy: ...)" suffixes that the AI sometimes appends.
    return name.replaceAll(RegExp(r'\s*\(buy:[^)]*\)'), '').trim();
  }

  Map<String, dynamic> toJson() => {
        'day': day,
        'breakfast': breakfast,
        'lunch': lunch,
        'dinner': dinner,
        'snack': snack,
        'breakfast_ingredients': breakfastIngredients,
        'lunch_ingredients': lunchIngredients,
        'dinner_ingredients': dinnerIngredients,
        'snack_ingredients': snackIngredients,
        'breakfast_name': _clean(breakfast),
        'breakfast_calories': breakfastCalories,
        'breakfast_protein': breakfastProtein,
        'breakfast_carbs': breakfastCarbs,
        'breakfast_fat': breakfastFat,
        'breakfast_benefit': breakfastBenefit,
        'lunch_name': _clean(lunch),
        'lunch_calories': lunchCalories,
        'lunch_protein': lunchProtein,
        'lunch_carbs': lunchCarbs,
        'lunch_fat': lunchFat,
        'lunch_benefit': lunchBenefit,
        'dinner_name': _clean(dinner),
        'dinner_calories': dinnerCalories,
        'dinner_protein': dinnerProtein,
        'dinner_carbs': dinnerCarbs,
        'dinner_fat': dinnerFat,
        'dinner_benefit': dinnerBenefit,
        'snack_name': _clean(snack),
        'snack_calories': snackCalories,
        'snack_protein': snackProtein,
        'snack_carbs': snackCarbs,
        'snack_fat': snackFat,
        'snack_benefit': snackBenefit,
      };

  factory DayMealPlan.fromJson(Map<String, dynamic> json) {
    List<String> list(dynamic v) {
      if (v is List) return v.map((e) => e.toString()).toList();
      if (v is String && v.trim().isNotEmpty) {
        return v.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
      }
      return const [];
    }

    num? n(dynamic v) {
      if (v == null) return null;
      if (v is num) return v;
      return num.tryParse(v.toString());
    }

    String s(dynamic v, [String fallback = '']) =>
        (v == null) ? fallback : v.toString();

    return DayMealPlan(
      day: s(json['day']),
      breakfast: s(json['breakfast_name'], s(json['breakfast'])),
      lunch: s(json['lunch_name'], s(json['lunch'])),
      dinner: s(json['dinner_name'], s(json['dinner'])),
      snack: s(json['snack_name'], s(json['snack'])),
      breakfastIngredients: list(json['breakfast_ingredients']),
      lunchIngredients: list(json['lunch_ingredients']),
      dinnerIngredients: list(json['dinner_ingredients']),
      snackIngredients: list(json['snack_ingredients']),
      breakfastCalories: n(json['breakfast_calories']),
      breakfastProtein: n(json['breakfast_protein']),
      breakfastCarbs: n(json['breakfast_carbs']),
      breakfastFat: n(json['breakfast_fat']),
      breakfastBenefit: json['breakfast_benefit']?.toString(),
      lunchCalories: n(json['lunch_calories']),
      lunchProtein: n(json['lunch_protein']),
      lunchCarbs: n(json['lunch_carbs']),
      lunchFat: n(json['lunch_fat']),
      lunchBenefit: json['lunch_benefit']?.toString(),
      dinnerCalories: n(json['dinner_calories']),
      dinnerProtein: n(json['dinner_protein']),
      dinnerCarbs: n(json['dinner_carbs']),
      dinnerFat: n(json['dinner_fat']),
      dinnerBenefit: json['dinner_benefit']?.toString(),
      snackCalories: n(json['snack_calories']),
      snackProtein: n(json['snack_protein']),
      snackCarbs: n(json['snack_carbs']),
      snackFat: n(json['snack_fat']),
      snackBenefit: json['snack_benefit']?.toString(),
    );
  }
}

enum MealType { breakfast, lunch, dinner, snack }

extension MealTypeX on MealType {
  String get label {
    switch (this) {
      case MealType.breakfast:
        return 'Breakfast';
      case MealType.lunch:
        return 'Lunch';
      case MealType.dinner:
        return 'Dinner';
      case MealType.snack:
        return 'Snack';
    }
  }

  String get emoji {
    switch (this) {
      case MealType.breakfast:
        return '🥣';
      case MealType.lunch:
        return '🍲';
      case MealType.dinner:
        return '🍽️';
      case MealType.snack:
        return '🍎';
    }
  }
}

class MealEntry {
  MealEntry({
    required this.type,
    required this.title,
    required this.original,
    this.ingredients = const [],
    this.calories,
    this.protein,
    this.carbs,
    this.fat,
    this.benefit,
  });

  final MealType type;
  final String title;
  final String original;
  final List<String> ingredients;
  final num? calories;
  final num? protein;
  final num? carbs;
  final num? fat;
  final String? benefit;

  bool get hasNutrition => calories != null || protein != null || carbs != null;
}

/// A saved/weekly plan as stored by the backend `/meal_plan` endpoint.
class SavedMealPlan {
  SavedMealPlan({
    required this.id,
    required this.name,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.createdAt,
    required this.updatedAt,
    this.hasSickness = false,
    this.sicknessType,
    this.healthAssessment,
    this.userInfo,
  });

  final String id;
  final String name;
  final DateTime startDate;
  final DateTime endDate;
  final List<DayMealPlan> days;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool hasSickness;
  final String? sicknessType;
  final Map<String, dynamic>? healthAssessment;
  final Map<String, dynamic>? userInfo;

  DayMealPlan? findDay(String dayName) {
    for (final d in days) {
      if (d.day.toLowerCase() == dayName.toLowerCase()) return d;
    }
    return null;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'startDate': startDate.toIso8601String(),
        'endDate': endDate.toIso8601String(),
        'mealPlan': days.map((d) => d.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'hasSickness': hasSickness,
        'sicknessType': sicknessType,
        'health_assessment': healthAssessment,
        'user_info': userInfo,
      };

  factory SavedMealPlan.fromBackend(Map<String, dynamic> json) {
    DateTime parseDate(dynamic v, [DateTime? fallback]) {
      if (v == null) return fallback ?? DateTime.now();
      try {
        return DateTime.parse(v.toString()).toLocal();
      } catch (_) {
        return fallback ?? DateTime.now();
      }
    }

    // The backend sometimes nests plan data under `plan_data`.
    final raw = json['plan_data'] is Map
        ? Map<String, dynamic>.from(json['plan_data'] as Map)
        : json;

    // `mealPlan` can be the array directly, nested, or a single day object.
    dynamic rawDays = raw['mealPlan'] ?? raw['meal_plan'] ?? raw['days'];
    if (rawDays == null && raw['day'] != null) {
      rawDays = [raw];
    }
    final days = <DayMealPlan>[];
    if (rawDays is List) {
      for (final item in rawDays) {
        if (item is Map) {
          days.add(DayMealPlan.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }

    final start = parseDate(raw['startDate'] ?? raw['start_date']);
    final end = parseDate(
      raw['endDate'] ?? raw['end_date'],
      start.add(const Duration(days: 6)),
    );

    final created = parseDate(
      json['created_at'] ?? json['createdAt'] ?? raw['createdAt'],
      start,
    );
    final updated = parseDate(
      json['updated_at'] ?? json['updatedAt'] ?? raw['updatedAt'],
      created,
    );

    final idVal = json['id']?.toString() ??
        raw['id']?.toString() ??
        created.millisecondsSinceEpoch.toString();

    return SavedMealPlan(
      id: idVal,
      name: (raw['name'] ?? 'Weekly Plan').toString(),
      startDate: start,
      endDate: end,
      days: days,
      createdAt: created,
      updatedAt: updated,
      hasSickness:
          raw['hasSickness'] == true || json['has_sickness'] == true,
      sicknessType: (raw['sicknessType'] ?? json['sickness_type'])?.toString(),
      healthAssessment: raw['health_assessment'] is Map
          ? Map<String, dynamic>.from(raw['health_assessment'] as Map)
          : null,
      userInfo: raw['user_info'] is Map
          ? Map<String, dynamic>.from(raw['user_info'] as Map)
          : null,
    );
  }
}

class WeekRange {
  WeekRange({required this.start, required this.end, required this.label});

  final DateTime start;
  final DateTime end;
  final String label;

  static WeekRange forDate(DateTime date) {
    // Week starts Monday.
    final d = DateTime(date.year, date.month, date.day);
    final offset = d.weekday - DateTime.monday;
    final start = d.subtract(Duration(days: offset));
    final end = start.add(const Duration(days: 6));
    final label = '${_fmt(start)} – ${_fmt(end)}';
    return WeekRange(start: start, end: end, label: label);
  }

  static String _fmt(DateTime d) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final day = d.day;
    final suffix =
        (day == 1 || day == 21 || day == 31) ? 'st' :
        (day == 2 || day == 22) ? 'nd' :
        (day == 3 || day == 23) ? 'rd' : 'th';
    return '${months[d.month - 1]} $day$suffix';
  }
}
