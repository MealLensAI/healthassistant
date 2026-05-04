import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme.dart';
import '../../models/history_item.dart';
import '../../providers/history_provider.dart';
import '../../widgets/state_views.dart';

class HistoryTab extends StatefulWidget {
  const HistoryTab({super.key});

  @override
  State<HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<HistoryTab> {
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_loaded) return;
      _loaded = true;
      context.read<HistoryProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<HistoryProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => provider.load(),
          ),
        ],
      ),
      body: Column(
        children: [
          _FilterBar(
            selected: provider.filter,
            onSelected: provider.setFilter,
          ),
          Expanded(child: _buildBody(provider)),
        ],
      ),
    );
  }

  Widget _buildBody(HistoryProvider provider) {
    if (provider.loading && provider.items.isEmpty) {
      return const LoadingView();
    }
    if (provider.error != null && provider.items.isEmpty) {
      return ErrorView(
        message: provider.error!,
        onRetry: provider.load,
      );
    }
    if (provider.items.isEmpty) {
      return const EmptyState(
        icon: Icons.history_outlined,
        title: 'No history yet',
        message:
            'Your meal plans, detections and health meals will appear here.',
      );
    }
    return RefreshIndicator(
      onRefresh: provider.load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: provider.items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (ctx, i) {
          final item = provider.items[i];
          return _HistoryCard(
            item: item,
            onDelete: () => provider.delete(item.id),
          );
        },
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({required this.selected, required this.onSelected});

  final String selected;
  final ValueChanged<String> onSelected;

  static const _filters = [
    ['all', 'All'],
    ['food_detection', 'Food'],
    ['ingredient_detection', 'Ingredients'],
    ['health_meal', 'Health meals'],
    ['meal_plan', 'Meal plans'],
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        itemCount: _filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final f = _filters[i];
          final isSel = f[0] == selected;
          return ChoiceChip(
            label: Text(f[1]),
            selected: isSel,
            onSelected: (_) => onSelected(f[0]),
            selectedColor: AppColors.primary,
            labelStyle: TextStyle(
              color: isSel ? Colors.white : AppColors.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          );
        },
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.item, required this.onDelete});

  final HistoryItem item;
  final VoidCallback onDelete;

  Future<void> _open(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  item.sourceLabel,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                DateFormat('MMM d, y').format(item.createdAt),
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
              IconButton(
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline,
                    color: AppColors.textTertiary, size: 20),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                splashRadius: 18,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            item.displayName,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (item.detectedFoods.isNotEmpty) ...[
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: item.detectedFoods
                  .take(6)
                  .map((f) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceAlt,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          f,
                          style: const TextStyle(fontSize: 11),
                        ),
                      ))
                  .toList(),
            ),
          ],
          if (item.youtubeLink != null || item.googleLink != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                if (item.youtubeLink != null)
                  TextButton.icon(
                    onPressed: () => _open(item.youtubeLink),
                    icon: const Icon(Icons.play_circle_outline, size: 18),
                    label: const Text('Video'),
                  ),
                if (item.googleLink != null)
                  TextButton.icon(
                    onPressed: () => _open(item.googleLink),
                    icon: const Icon(Icons.search, size: 18),
                    label: const Text('Search'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
