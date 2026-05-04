import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme.dart';
import '../models/meal_plan.dart';
import '../services/ai_service.dart';
import '../widgets/state_views.dart';

class CookScreenArgs {
  CookScreenArgs({required this.entry, this.sickness});
  final MealEntry entry;
  final String? sickness;
}

class CookScreen extends StatefulWidget {
  const CookScreen({super.key, required this.args});

  final CookScreenArgs args;

  @override
  State<CookScreen> createState() => _CookScreenState();
}

class _CookScreenState extends State<CookScreen> {
  bool _loading = true;
  String? _instructions;
  String? _youtube;
  String? _google;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final instructions = await AiService.instance.mealInstructions(
        foodName: widget.args.entry.title,
        ingredients: widget.args.entry.ingredients,
        sickness: widget.args.sickness,
      );
      final resources =
          await AiService.instance.resources(widget.args.entry.title);
      setState(() {
        _instructions =
            (instructions['instructions'] ?? instructions['recipe'] ?? '')
                .toString();
        _youtube = (resources['youtube_link'] ?? resources['youtube'])
            ?.toString();
        _google =
            (resources['google_link'] ?? resources['google'])?.toString();
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final entry = widget.args.entry;
    return Scaffold(
      appBar: AppBar(title: Text(entry.title)),
      body: _loading
          ? const LoadingView(message: 'Cooking up instructions…')
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (entry.ingredients.isNotEmpty) ...[
                      const Text('Ingredients',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: entry.ingredients
                            .map((i) => Chip(
                                  label: Text(i),
                                  backgroundColor: AppColors.surfaceAlt,
                                  side:
                                      BorderSide(color: AppColors.border),
                                ))
                            .toList(),
                      ),
                      const SizedBox(height: 16),
                    ],
                    const Text('Instructions',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    if ((_instructions ?? '').trim().isEmpty)
                      const Text('No instructions available.',
                          style: TextStyle(color: AppColors.textSecondary))
                    else
                      MarkdownBody(data: _instructions!),
                    const SizedBox(height: 16),
                    if (_youtube != null || _google != null) ...[
                      const Text('Learn more',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          if (_youtube != null)
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _open(_youtube),
                                icon: const Icon(Icons.play_circle_outline),
                                label: const Text('Video'),
                              ),
                            ),
                          if (_youtube != null && _google != null)
                            const SizedBox(width: 8),
                          if (_google != null)
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _open(_google),
                                icon: const Icon(Icons.search),
                                label: const Text('Search'),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
    );
  }
}
