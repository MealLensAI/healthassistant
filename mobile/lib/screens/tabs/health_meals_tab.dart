import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../models/health_meal.dart';
import '../../providers/health_profile_provider.dart';
import '../../services/ai_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/state_views.dart';

class HealthMealsTab extends StatefulWidget {
  const HealthMealsTab({super.key});

  @override
  State<HealthMealsTab> createState() => _HealthMealsTabState();
}

class _HealthMealsTabState extends State<HealthMealsTab> {
  final _ingredients = TextEditingController();
  bool _busy = false;
  List<DetectedIngredient> _detected = const [];
  List<HealthMeal> _meals = const [];
  String? _error;

  @override
  void dispose() {
    _ingredients.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final profile = context.read<HealthProfileProvider>().profile;
    final health = profile.toAiPayload();
    if (health == null) {
      _showProfileWarning();
      return;
    }
    final x = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (x == null || !mounted) return;
    await _runGenerate(
      inputType: 'image',
      image: File(x.path),
      healthPayload: health,
    );
  }

  Future<void> _runFromList() async {
    final list = _ingredients.text.trim();
    if (list.isEmpty) {
      Fluttertoast.showToast(msg: 'Enter some ingredients first');
      return;
    }
    final profile = context.read<HealthProfileProvider>().profile;
    final health = profile.toAiPayload();
    if (health == null) {
      _showProfileWarning();
      return;
    }
    await _runGenerate(
      inputType: 'ingredient_list',
      ingredientList: list,
      healthPayload: health,
    );
  }

  Future<void> _runGenerate({
    required String inputType,
    String? ingredientList,
    File? image,
    required Map<String, dynamic> healthPayload,
  }) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final resp = await AiService.instance.generateMealsFromIngredients(
        healthPayload: healthPayload,
        inputType: inputType,
        ingredientList: ingredientList,
        image: image,
      );
      final ingredients = <DetectedIngredient>[];
      final rawIngredients = resp['detected_ingredients'];
      if (rawIngredients is List) {
        for (final item in rawIngredients) {
          if (item is Map) {
            final name = (item['name'] ?? item['ingredient'] ?? '').toString();
            if (name.isEmpty) continue;
            ingredients.add(DetectedIngredient(
              name: name,
              healthInfo: (item['health_info'] ?? item['info'] ?? '').toString(),
              isWarning: item['is_warning'] == true ||
                  item['warning'] == true ||
                  item['status']?.toString().toLowerCase() == 'warning',
            ));
          } else {
            ingredients.add(DetectedIngredient(
              name: item.toString(),
              healthInfo: '',
              isWarning: false,
            ));
          }
        }
      }

      final meals = <HealthMeal>[];
      final rawMeals = resp['health_meals'] ??
          resp['meals'] ??
          resp['food_suggestions'];
      if (rawMeals is List) {
        for (final item in rawMeals) {
          if (item is Map) {
            meals.add(HealthMeal.fromJson(Map<String, dynamic>.from(item)));
          }
        }
      }

      // Enrich with images (best-effort).
      for (final m in meals) {
        m.image = await AiService.instance.lookupFoodImage(m.primaryName);
      }

      setState(() {
        _detected = ingredients;
        _meals = meals;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showProfileWarning() {
    Fluttertoast.showToast(
      msg: 'Complete your health profile first.',
      backgroundColor: AppColors.warning,
      textColor: Colors.white,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Health Meals')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _InputCard(
              controller: _ingredients,
              busy: _busy,
              onCamera: () => _pickImage(ImageSource.camera),
              onGallery: () => _pickImage(ImageSource.gallery),
              onRun: _runFromList,
            ),
            const SizedBox(height: 16),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  _error!,
                  style: const TextStyle(color: AppColors.error),
                ),
              ),
            if (_detected.isNotEmpty) ...[
              const _SectionHeader(
                title: 'Detected ingredients',
                icon: Icons.check_circle_outline,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _detected
                    .map((d) => _IngredientChip(ingredient: d))
                    .toList(),
              ),
              const SizedBox(height: 16),
            ],
            if (_meals.isNotEmpty) ...[
              const _SectionHeader(
                title: 'Recommended meals',
                icon: Icons.restaurant,
              ),
              const SizedBox(height: 8),
              for (final m in _meals) ...[
                _MealResultCard(meal: m),
                const SizedBox(height: 10),
              ],
            ] else if (!_busy && _error == null && _detected.isEmpty)
              const EmptyState(
                icon: Icons.photo_camera_outlined,
                title: 'Snap or list ingredients',
                message:
                    'Snap a photo of what you have or type a quick list — we’ll suggest meals tailored to your health.',
              ),
            if (_busy)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: LoadingView(message: 'Analyzing ingredients…'),
              ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _InputCard extends StatelessWidget {
  const _InputCard({
    required this.controller,
    required this.busy,
    required this.onCamera,
    required this.onGallery,
    required this.onRun,
  });

  final TextEditingController controller;
  final bool busy;
  final VoidCallback onCamera;
  final VoidCallback onGallery;
  final VoidCallback onRun;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppTextField(
            label: 'Ingredients',
            hint: 'e.g. rice, beans, tomato, onion',
            controller: controller,
            maxLines: 3,
            minLines: 2,
            prefixIcon: Icons.kitchen,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  label: 'Camera',
                  icon: Icons.photo_camera,
                  variant: AppButtonVariant.outline,
                  onPressed: busy ? null : onCamera,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton(
                  label: 'Gallery',
                  icon: Icons.photo_library,
                  variant: AppButtonVariant.outline,
                  onPressed: busy ? null : onGallery,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          AppButton(
            label: 'Generate Meals',
            icon: Icons.auto_awesome,
            loading: busy,
            onPressed: onRun,
          ),
        ],
      ),
    );
  }
}

class _IngredientChip extends StatelessWidget {
  const _IngredientChip({required this.ingredient});

  final DetectedIngredient ingredient;

  @override
  Widget build(BuildContext context) {
    final color =
        ingredient.isWarning ? AppColors.warning : AppColors.success;
    return Tooltip(
      message: ingredient.healthInfo.isEmpty
          ? ingredient.name
          : ingredient.healthInfo,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              ingredient.isWarning ? Icons.warning_amber : Icons.check,
              size: 14,
              color: color,
            ),
            const SizedBox(width: 6),
            Text(
              ingredient.name,
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w600, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class _MealResultCard extends StatelessWidget {
  const _MealResultCard({required this.meal});

  final HealthMeal meal;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (meal.image != null && meal.image!.isNotEmpty)
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: CachedNetworkImage(
                  imageUrl: meal.image!,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(color: AppColors.surfaceAlt),
                  errorWidget: (_, __, ___) =>
                      Container(color: AppColors.surfaceAlt),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  meal.primaryName,
                  style: const TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w700),
                ),
                if (meal.healthBenefit.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    meal.healthBenefit,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      height: 1.4,
                      fontSize: 13,
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    _nutri('${meal.calories} kcal'),
                    _nutri('${meal.protein}g P'),
                    _nutri('${meal.carbs}g C'),
                    _nutri('${meal.fat}g F'),
                    if (meal.fiber > 0) _nutri('${meal.fiber}g fiber'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _nutri(String label) => Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: const TextStyle(
              color: AppColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.w600),
        ),
      );
}
