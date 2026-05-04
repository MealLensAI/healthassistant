import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../models/meal_plan.dart';

class MealCard extends StatelessWidget {
  const MealCard({
    super.key,
    required this.entry,
    this.imageUrl,
    this.onTap,
    this.onCookTap,
    this.tracked = false,
    this.onToggleTracked,
  });

  final MealEntry entry;
  final String? imageUrl;
  final VoidCallback? onTap;
  final VoidCallback? onCookTap;
  final bool tracked;
  final ValueChanged<bool>? onToggleTracked;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 82,
                height: 82,
                child: imageUrl != null && imageUrl!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl!,
                        fit: BoxFit.cover,
                        placeholder: (c, _) => _placeholder(),
                        errorWidget: (c, _, __) => _placeholder(),
                      )
                    : _placeholder(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        '${entry.type.emoji} ${entry.type.label}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      if (onToggleTracked != null) ...[
                        const Spacer(),
                        InkWell(
                          onTap: () => onToggleTracked!(!tracked),
                          borderRadius: BorderRadius.circular(999),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: tracked
                                  ? AppColors.success.withValues(alpha: 0.15)
                                  : Colors.grey.withValues(alpha: 0.08),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              tracked
                                  ? Icons.check_circle
                                  : Icons.radio_button_unchecked,
                              size: 18,
                              color: tracked
                                  ? AppColors.success
                                  : AppColors.textTertiary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    entry.title.isEmpty ? '—' : entry.title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (entry.hasNutrition) ...[
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        if (entry.calories != null)
                          _chip('${entry.calories!.toStringAsFixed(0)} kcal'),
                        if (entry.protein != null)
                          _chip('${entry.protein!.toStringAsFixed(0)}g P'),
                        if (entry.carbs != null)
                          _chip('${entry.carbs!.toStringAsFixed(0)}g C'),
                        if (entry.fat != null)
                          _chip('${entry.fat!.toStringAsFixed(0)}g F'),
                      ],
                    ),
                  ],
                  if (onCookTap != null) ...[
                    const SizedBox(height: 10),
                    TextButton.icon(
                      onPressed: onCookTap,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      icon: const Icon(Icons.restaurant_menu, size: 16),
                      label: const Text('Cook',
                          style: TextStyle(fontSize: 13)),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
        color: AppColors.surfaceAlt,
        child: const Center(
          child: Icon(Icons.restaurant, color: AppColors.textTertiary),
        ),
      );

  Widget _chip(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
}
