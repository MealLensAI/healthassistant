class HealthProfile {
  HealthProfile({
    this.hasSickness = true,
    this.sicknessType = '',
    this.age,
    this.gender,
    this.height,
    this.weight,
    this.waist,
    this.activityLevel,
    this.goal,
    this.location,
  });

  /// The web app is a health-focused product and defaults to
  /// `hasSickness = true`. We mirror that here so the UX matches.
  bool hasSickness;
  String sicknessType;
  int? age;
  String? gender; // male | female | other
  double? height; // cm
  double? weight; // kg
  double? waist; // cm
  String? activityLevel; // sedentary | light | moderate | active | very_active
  String? goal; // heal | maintain | ...
  String? location;

  bool get isComplete =>
      hasSickness &&
      sicknessType.trim().isNotEmpty &&
      age != null &&
      (gender ?? '').isNotEmpty &&
      height != null &&
      weight != null &&
      waist != null &&
      (activityLevel ?? '').isNotEmpty &&
      (goal ?? '').isNotEmpty &&
      (location ?? '').isNotEmpty;

  HealthProfile copyWith({
    bool? hasSickness,
    String? sicknessType,
    int? age,
    String? gender,
    double? height,
    double? weight,
    double? waist,
    String? activityLevel,
    String? goal,
    String? location,
  }) {
    return HealthProfile(
      hasSickness: hasSickness ?? this.hasSickness,
      sicknessType: sicknessType ?? this.sicknessType,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      height: height ?? this.height,
      weight: weight ?? this.weight,
      waist: waist ?? this.waist,
      activityLevel: activityLevel ?? this.activityLevel,
      goal: goal ?? this.goal,
      location: location ?? this.location,
    );
  }

  Map<String, dynamic> toJson() => {
        'hasSickness': hasSickness,
        'sicknessType': sicknessType,
        'age': age,
        'gender': gender,
        'height': height,
        'weight': weight,
        'waist': waist,
        'activityLevel': activityLevel,
        'goal': goal,
        'location': location,
      };

  /// Build the payload the AI + meal-plan backend expects.
  Map<String, dynamic>? toAiPayload() {
    if (!isComplete) return null;
    return {
      'age': age,
      'weight': weight,
      'height': height,
      'waist': waist,
      'gender': gender,
      'activity_level': activityLevel,
      'condition': sicknessType,
      'goal': _mapGoalToBackend(goal),
      'location': location,
    };
  }

  factory HealthProfile.fromJson(Map<String, dynamic> json) {
    double? toD(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toDouble();
      return double.tryParse(v.toString());
    }

    int? toI(dynamic v) {
      if (v == null) return null;
      if (v is int) return v;
      if (v is num) return v.toInt();
      return int.tryParse(v.toString());
    }

    return HealthProfile(
      hasSickness: json['hasSickness'] == null
          ? true
          : (json['hasSickness'] == true || json['hasSickness'] == 'true'),
      sicknessType: (json['sicknessType'] ?? json['condition'] ?? '').toString(),
      age: toI(json['age']),
      gender: json['gender']?.toString(),
      height: toD(json['height']),
      weight: toD(json['weight']),
      waist: toD(json['waist']),
      activityLevel:
          (json['activityLevel'] ?? json['activity_level'])?.toString(),
      goal: json['goal']?.toString(),
      location: json['location']?.toString(),
    );
  }

  static String _mapGoalToBackend(String? goal) {
    if (goal == null || goal.trim().isEmpty) return 'heal';
    final g = goal.trim().toLowerCase();
    const healAliases = {
      'heal',
      'improve',
      'manage',
      'restore',
      'heal health condition',
      'improve health condition',
      'manage health condition',
      'restore health condition',
      'heal & manage condition',
    };
    const maintainAliases = {
      'maintain',
      'maintain health condition',
      'maintain health',
    };
    if (maintainAliases.contains(g)) return 'maintain';
    if (healAliases.contains(g)) return 'heal';
    if (g.contains('maintain')) return 'maintain';
    if (g == 'lose_weight' || g == 'gain_weight' || g == 'improve_fitness') {
      return g;
    }
    return 'heal';
  }
}
