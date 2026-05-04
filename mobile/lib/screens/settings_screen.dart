import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../models/health_profile.dart';
import '../providers/health_profile_provider.dart';
import '../widgets/app_button.dart';
import '../widgets/app_text_field.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  late HealthProfile _draft;
  bool _initialised = false;

  static const _activities = [
    ['sedentary', 'Sedentary'],
    ['light', 'Lightly active'],
    ['moderate', 'Moderately active'],
    ['active', 'Active'],
    ['very_active', 'Very active'],
  ];

  static const _goals = [
    ['heal', 'Heal & manage condition'],
    ['maintain', 'Maintain health'],
    ['lose_weight', 'Lose weight'],
    ['gain_weight', 'Gain weight'],
    ['improve_fitness', 'Improve fitness'],
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialised) {
      _draft = context.read<HealthProfileProvider>().profile.copyWith();
      _initialised = true;
    }
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final provider = context.read<HealthProfileProvider>();
    final ok = await provider.save(_draft);
    if (!mounted) return;
    Fluttertoast.showToast(
      msg: ok ? 'Profile saved!' : provider.error ?? 'Save failed',
      backgroundColor: ok ? AppColors.success : AppColors.error,
      textColor: Colors.white,
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<HealthProfileProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Health settings')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text(
                'These details power your personalized meal plans.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                tileColor: AppColors.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(color: AppColors.border),
                ),
                value: _draft.hasSickness,
                title: const Text('I have a health condition'),
                subtitle: const Text(
                  'Turn this on for therapeutic meal plans.',
                  style: TextStyle(fontSize: 12),
                ),
                onChanged: (v) => setState(() {
                  _draft = _draft.copyWith(hasSickness: v);
                }),
              ),
              const SizedBox(height: 12),
              if (_draft.hasSickness)
                AppTextField(
                  label: 'Condition',
                  hint: 'e.g. diabetes, hypertension',
                  initialValue: _draft.sicknessType,
                  onChanged: (v) => _draft = _draft.copyWith(sicknessType: v),
                  validator: (v) {
                    if (_draft.hasSickness && (v ?? '').trim().isEmpty) {
                      return 'Tell us about your condition';
                    }
                    return null;
                  },
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: AppTextField(
                      label: 'Age',
                      initialValue: _draft.age?.toString(),
                      keyboardType: TextInputType.number,
                      onChanged: (v) => _draft =
                          _draft.copyWith(age: int.tryParse(v)),
                      validator: (v) =>
                          (v ?? '').isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DropdownField<String>(
                      label: 'Gender',
                      value: _draft.gender,
                      items: const [
                        ['male', 'Male'],
                        ['female', 'Female'],
                        ['other', 'Other'],
                      ],
                      onChanged: (v) => setState(() {
                        _draft = _draft.copyWith(gender: v);
                      }),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: AppTextField(
                      label: 'Height (cm)',
                      initialValue: _draft.height?.toString(),
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      onChanged: (v) => _draft =
                          _draft.copyWith(height: double.tryParse(v)),
                      validator: (v) =>
                          (v ?? '').isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AppTextField(
                      label: 'Weight (kg)',
                      initialValue: _draft.weight?.toString(),
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      onChanged: (v) => _draft =
                          _draft.copyWith(weight: double.tryParse(v)),
                      validator: (v) =>
                          (v ?? '').isEmpty ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Waist (cm)',
                initialValue: _draft.waist?.toString(),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                onChanged: (v) =>
                    _draft = _draft.copyWith(waist: double.tryParse(v)),
                validator: (v) => (v ?? '').isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              _DropdownField<String>(
                label: 'Activity level',
                value: _draft.activityLevel,
                items: _activities,
                onChanged: (v) => setState(() {
                  _draft = _draft.copyWith(activityLevel: v);
                }),
              ),
              const SizedBox(height: 12),
              _DropdownField<String>(
                label: 'Goal',
                value: _draft.goal,
                items: _goals,
                onChanged: (v) => setState(() {
                  _draft = _draft.copyWith(goal: v);
                }),
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Location',
                hint: 'City, Country',
                initialValue: _draft.location,
                prefixIcon: Icons.location_on_outlined,
                onChanged: (v) => _draft = _draft.copyWith(location: v),
              ),
              const SizedBox(height: 24),
              AppButton(
                label: 'Save changes',
                loading: provider.saving,
                onPressed: _save,
                size: AppButtonSize.lg,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DropdownField<T> extends StatelessWidget {
  const _DropdownField({
    required this.label,
    required this.items,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final List<List<String>> items;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppColors.textPrimary)),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: value,
          items: [
            for (final i in items)
              DropdownMenuItem(value: i[0], child: Text(i[1])),
          ],
          onChanged: onChanged,
          decoration: const InputDecoration(),
        ),
      ],
    );
  }
}
