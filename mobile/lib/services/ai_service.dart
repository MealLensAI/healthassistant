import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../core/api_exceptions.dart';
import '../core/config.dart';

/// Wraps the AI inference service (hosted at [AppConfig.aiApiBaseUrl]).
///
/// Endpoints (proxied through the health backend):
/// * `/smart_plan`               – meal plan for healthy users
/// * `/sick_smart_plan`          – therapeutic meal plan
/// * `/ai_nutrition_plan`        – medical-grade JSON plan
/// * `/auto_generate_plan`       – location + budget plan
/// * `/generate_meals_from_ingredients` – ingredient → meal suggestions
/// * `/meal_plan_instructions`   – cooking instructions
/// * `/sick_meal_plan_instructions`
/// * `/resources`                – YouTube + Google search links
class AiService {
  AiService._();
  static final AiService instance = AiService._();

  final http.Client _http = http.Client();
  String get _base => AppConfig.aiApiBaseUrl;

  Future<Map<String, dynamic>> _postForm(
    String path, {
    Map<String, String>? fields,
    File? imageFile,
    String imageField = 'image',
    Duration timeout = const Duration(minutes: 2),
  }) async {
    final uri = Uri.parse('$_base$path');
    final req = http.MultipartRequest('POST', uri);
    if (fields != null) req.fields.addAll(fields);
    if (imageFile != null) {
      req.files.add(
        await http.MultipartFile.fromPath(
          imageField,
          imageFile.path,
          contentType: MediaType('image', _extOf(imageFile.path)),
        ),
      );
    }

    http.StreamedResponse streamed;
    try {
      streamed = await req.send().timeout(timeout);
    } on SocketException {
      throw ApiException('Network error talking to AI service.');
    } on TimeoutException {
      throw ApiException('AI request timed out. Please try again.');
    }
    final body = await streamed.stream.bytesToString();
    return _decode(streamed.statusCode, body);
  }

  Future<Map<String, dynamic>> _postJson(
    String path,
    Map<String, dynamic> body, {
    Duration timeout = const Duration(minutes: 2),
  }) async {
    final uri = Uri.parse('$_base$path');
    http.Response res;
    try {
      res = await _http
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode(body),
          )
          .timeout(timeout);
    } on SocketException {
      throw ApiException('Network error talking to AI service.');
    } on TimeoutException {
      throw ApiException('AI request timed out. Please try again.');
    }
    return _decode(res.statusCode, res.body);
  }

  Map<String, dynamic> _decode(int status, String body) {
    dynamic decoded;
    try {
      decoded = jsonDecode(body);
    } catch (_) {
      decoded = body;
    }
    if (status >= 200 && status < 300) {
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
      return {'raw': decoded};
    }
    final msg = decoded is Map
        ? (decoded['error'] ?? decoded['message'] ?? 'AI request failed')
            .toString()
        : 'AI request failed ($status)';
    throw ApiException(msg.toString(), statusCode: status, data: decoded);
  }

  String _extOf(String path) {
    final dot = path.lastIndexOf('.');
    if (dot <= 0) return 'jpeg';
    final ext = path.substring(dot + 1).toLowerCase();
    if (ext == 'jpg') return 'jpeg';
    if (['png', 'jpeg', 'gif', 'webp', 'bmp'].contains(ext)) return ext;
    return 'jpeg';
  }

  // ------------------------------------------------------------------
  // Meal plan generation
  // ------------------------------------------------------------------

  Future<Map<String, dynamic>> smartPlan({
    required String inputType, // 'image' | 'ingredient_list'
    String? ingredientList,
    File? image,
  }) {
    final fields = <String, String>{
      'image_or_ingredient_list': inputType,
      if (inputType == 'ingredient_list' && ingredientList != null)
        'ingredient_list': ingredientList,
    };
    return _postForm('/smart_plan', fields: fields, imageFile: image);
  }

  Future<Map<String, dynamic>> sickSmartPlan({
    required String inputType,
    String? ingredientList,
    File? image,
    required Map<String, dynamic> healthPayload,
    String? location,
    String? budget,
    bool budgetMode = false,
  }) {
    final fields = <String, String>{
      'image_or_ingredient_list': inputType,
      if (inputType == 'ingredient_list')
        'ingredient_list': ingredientList ?? '',
      for (final e in healthPayload.entries) e.key: e.value.toString(),
      'budget_state': budgetMode ? 'true' : 'false',
      'budget': budget ?? '0',
      if (location != null && location.isNotEmpty) 'location': location,
    };
    return _postForm('/sick_smart_plan', fields: fields, imageFile: image);
  }

  Future<Map<String, dynamic>> aiNutritionPlan(
    Map<String, dynamic> healthPayload,
  ) {
    return _postJson('/ai_nutrition_plan', healthPayload);
  }

  Future<Map<String, dynamic>> autoGenerateHealthyPlan({
    required String location,
    required String budget,
  }) {
    return _postForm('/auto_generate_plan',
        fields: {'location': location, 'budget': budget});
  }

  // ------------------------------------------------------------------
  // Ingredient detection → meal suggestions
  // ------------------------------------------------------------------

  Future<Map<String, dynamic>> generateMealsFromIngredients({
    required Map<String, dynamic> healthPayload,
    required String inputType,
    String? ingredientList,
    File? image,
  }) {
    final fields = <String, String>{
      for (final e in healthPayload.entries) e.key: e.value.toString(),
      'image_or_ingredient_list': inputType,
      if (inputType == 'ingredient_list')
        'ingredient_list': ingredientList ?? '',
    };
    return _postForm(
      '/generate_meals_from_ingredients',
      fields: fields,
      imageFile: image,
    );
  }

  // ------------------------------------------------------------------
  // Cooking instructions & resources
  // ------------------------------------------------------------------

  Future<Map<String, dynamic>> mealInstructions({
    required String foodName,
    required List<String> ingredients,
    String? sickness,
  }) {
    final body = <String, dynamic>{
      'food_name': foodName,
      'ingredients': ingredients,
      if (sickness != null && sickness.isNotEmpty) 'sickness': sickness,
    };
    return _postJson(
      sickness == null || sickness.isEmpty
          ? '/meal_plan_instructions'
          : '/sick_meal_plan_instructions',
      body,
    );
  }

  Future<Map<String, dynamic>> resources(String foodName) {
    return _postForm('/resources', fields: {'food_choice_index': foodName});
  }

  // ------------------------------------------------------------------
  // Food image lookup (for richer cards)
  // ------------------------------------------------------------------

  Future<String?> lookupFoodImage(String query) async {
    try {
      final res = await _http
          .post(
            Uri.parse(AppConfig.imageSearchUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'q': query}),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode < 200 || res.statusCode >= 300) return null;
      final data = jsonDecode(res.body);
      if (data is Map && data['image_url'] is String) {
        return data['image_url'] as String;
      }
    } catch (_) {
      // ignore, we fall back to a placeholder
    }
    return null;
  }
}
