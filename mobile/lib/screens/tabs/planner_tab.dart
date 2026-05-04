import 'dart:io';

import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme.dart';
import '../../models/meal_plan.dart';
import '../../providers/health_profile_provider.dart';
import '../../providers/meal_plan_provider.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/meal_card.dart';
import '../../widgets/state_views.dart';

class PlannerTab extends StatefulWidget {
  const PlannerTab({super.key});

  @override
  State<PlannerTab> createState() => _PlannerTabState();
}

class _PlannerTabState extends State<PlannerTab> {
  String _selectedDay = _todayName();
  bool _loaded = false;

  static String _todayName() {
    return DateFormat('EEEE').format(DateTime.now());
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (_loaded) return;
      _loaded = true;
      await context.read<MealPlanProvider>().loadPlans();
    });
  }

  Future<void> _generate() async {
    final profile = context.read<HealthProfileProvider>().profile;
    if (!profile.isComplete) {
      _showIncompleteProfile();
      return;
    }

    final source = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Generate weekly plan',
                style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),
              _Choice(
                icon: Icons.photo_camera_outlined,
                title: 'Take a photo of ingredients',
                subtitle: 'AI detects items from an image',
                onTap: () => Navigator.pop(ctx, 'camera'),
              ),
              _Choice(
                icon: Icons.photo_library_outlined,
                title: 'Pick from gallery',
                subtitle: 'Upload an existing photo',
                onTap: () => Navigator.pop(ctx, 'gallery'),
              ),
              _Choice(
                icon: Icons.edit_note,
                title: 'Type ingredients',
                subtitle: 'Comma separated list',
                onTap: () => Navigator.pop(ctx, 'list'),
              ),
              _Choice(
                icon: Icons.auto_awesome,
                title: 'Auto-generate (medical)',
                subtitle: 'Based only on your health profile',
                onTap: () => Navigator.pop(ctx, 'auto'),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null || !mounted) return;

    final provider = context.read<MealPlanProvider>();

    SavedMealPlan? plan;
    if (source == 'auto') {
      plan = await provider.autoGenerate(profile: profile);
    } else if (source == 'list') {
      final list = await _askIngredientList();
      if (list == null || list.trim().isEmpty) return;
      plan = await provider.generateFromIngredients(
        ingredientList: list,
        profile: profile,
      );
    } else {
      final picker = ImagePicker();
      final x = await picker.pickImage(
        source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
        imageQuality: 82,
      );
      if (x == null) return;
      plan = await provider.generateFromImage(
        image: File(x.path),
        profile: profile,
      );
    }
    if (!mounted) return;
    if (plan != null) {
      Fluttertoast.showToast(msg: 'Weekly plan ready!');
      setState(() => _selectedDay = _todayName());
    } else {
      Fluttertoast.showToast(
        msg: provider.error ?? 'Could not generate plan',
        backgroundColor: AppColors.error,
        textColor: Colors.white,
      );
    }
  }

  Future<String?> _askIngredientList() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ingredients'),
        content: AppTextField(
          hint: 'rice, beans, tomato, onion, pepper',
          controller: controller,
          maxLines: 4,
          minLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Generate'),
          ),
        ],
      ),
    );
  }

  void _showIncompleteProfile() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete your profile'),
        content: const Text(
          'Fill out your health profile first so we can tailor your plan.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Later'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.go('/settings');
            },
            child: const Text('Open settings'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MealPlanProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Weekly Planner'),
        actions: [
          IconButton(
            onPressed: () => provider.loadPlans(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: provider.generating ? null : _generate,
        icon: provider.generating
            ? const SizedBox(
                height: 18,
                width: 18,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              )
            : const Icon(Icons.auto_awesome),
        label: Text(provider.generating ? 'Generating…' : 'New plan'),
      ),
      body: _buildBody(provider),
    );
  }

  Widget _buildBody(MealPlanProvider provider) {
    if (provider.loading && provider.plans.isEmpty) {
      return const LoadingView(message: 'Loading your meal plans…');
    }
    if (provider.plans.isEmpty) {
      return EmptyState(
        icon: Icons.restaurant_menu,
        title: 'No meal plans yet',
        message:
            'Tap "New plan" to generate a personalized weekly meal plan based on your health profile.',
        action: AppButton(
          label: 'Create first plan',
          onPressed: provider.generating ? null : _generate,
          loading: provider.generating,
          fullWidth: false,
        ),
      );
    }

    final plan = provider.selectedPlan ?? provider.plans.first;
    return RefreshIndicator(
      onRefresh: () => provider.loadPlans(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
        children: [
          _PlanSelector(
            plans: provider.plans,
            selected: plan,
            onSelect: provider.selectPlan,
          ),
          const SizedBox(height: 16),
          _DayPicker(
            plan: plan,
            selected: _selectedDay,
            onSelect: (d) => setState(() => _selectedDay = d),
          ),
          const SizedBox(height: 16),
          ..._buildDayMeals(plan),
        ],
      ),
    );
  }

  List<Widget> _buildDayMeals(SavedMealPlan plan) {
    final day = plan.findDay(_selectedDay) ??
        (plan.days.isNotEmpty ? plan.days.first : null);
    if (day == null) {
      return [
        const EmptyState(
          title: 'No meals for this day',
          icon: Icons.food_bank_outlined,
        ),
      ];
    }
    final entries = day.toEntries(includeNutrition: true);
    return [
      for (final entry in entries) ...[
        MealCard(
          entry: entry,
          onCookTap: () => _openCook(entry, plan),
        ),
        const SizedBox(height: 10),
      ],
    ];
  }

  void _openCook(MealEntry entry, SavedMealPlan plan) {
    context.push('/cook', extra: {
      'entry': entry,
      'sickness': plan.sicknessType,
    });
  }
}

class _Choice extends StatelessWidget {
  const _Choice({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w600)),
                  Text(subtitle,
                      style: const TextStyle(
                          fontSize: 13, color: AppColors.textSecondary)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textTertiary),
          ],
        ),
      ),
    );
  }
}

class _PlanSelector extends StatelessWidget {
  const _PlanSelector({
    required this.plans,
    required this.selected,
    required this.onSelect,
  });

  final List<SavedMealPlan> plans;
  final SavedMealPlan selected;
  final ValueChanged<SavedMealPlan> onSelect;

  @override
  Widget build(BuildContext context) {
    if (plans.length <= 1) {
      return _PlanBadge(plan: selected);
    }
    return SizedBox(
      height: 80,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: plans.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (ctx, i) {
          final p = plans[i];
          final isSel = p.id == selected.id;
          return InkWell(
            onTap: () => onSelect(p),
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isSel ? AppColors.primary : AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSel ? AppColors.primary : AppColors.border,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    p.name,
                    style: TextStyle(
                      color: isSel ? Colors.white : AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    WeekRange.forDate(p.startDate).label,
                    style: TextStyle(
                      color: isSel
                          ? Colors.white.withValues(alpha: 0.85)
                          : AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _PlanBadge extends StatelessWidget {
  const _PlanBadge({required this.plan});
  final SavedMealPlan plan;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(Icons.calendar_month, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(plan.name,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w600)),
                Text(
                  WeekRange.forDate(plan.startDate).label,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          if (plan.hasSickness && (plan.sicknessType ?? '').isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                plan.sicknessType!,
                style: const TextStyle(
                    color: AppColors.accent,
                    fontSize: 11,
                    fontWeight: FontWeight.w600),
              ),
            ),
        ],
      ),
    );
  }
}

class _DayPicker extends StatelessWidget {
  const _DayPicker({
    required this.plan,
    required this.selected,
    required this.onSelect,
  });

  final SavedMealPlan plan;
  final String selected;
  final ValueChanged<String> onSelect;

  static const _days = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday',
    'Friday', 'Saturday', 'Sunday',
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 46,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _days.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final day = _days[i];
          final selectedNow =
              selected.toLowerCase() == day.toLowerCase();
          final hasData = plan.findDay(day) != null;
          return ChoiceChip(
            label: Text(day.substring(0, 3)),
            selected: selectedNow,
            onSelected: hasData ? (_) => onSelect(day) : null,
            selectedColor: AppColors.primary,
            backgroundColor: AppColors.surface,
            labelStyle: TextStyle(
              color: selectedNow
                  ? Colors.white
                  : hasData
                      ? AppColors.textPrimary
                      : AppColors.textTertiary,
              fontWeight: FontWeight.w600,
            ),
            side: BorderSide(
              color: selectedNow ? AppColors.primary : AppColors.border,
            ),
          );
        },
      ),
    );
  }
}
