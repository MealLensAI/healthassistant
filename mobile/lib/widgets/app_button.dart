import 'package:flutter/material.dart';

import '../core/theme.dart';

enum AppButtonVariant { primary, outline, ghost, danger }

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.loading = false,
    this.variant = AppButtonVariant.primary,
    this.fullWidth = true,
    this.size = AppButtonSize.md,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final AppButtonVariant variant;
  final bool fullWidth;
  final AppButtonSize size;

  @override
  Widget build(BuildContext context) {
    final EdgeInsets padding;
    final double fontSize;
    switch (size) {
      case AppButtonSize.sm:
        padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 10);
        fontSize = 13;
        break;
      case AppButtonSize.md:
        padding = const EdgeInsets.symmetric(horizontal: 18, vertical: 14);
        fontSize = 15;
        break;
      case AppButtonSize.lg:
        padding = const EdgeInsets.symmetric(horizontal: 22, vertical: 18);
        fontSize = 16;
        break;
    }

    final disabled = loading || onPressed == null;

    Widget child = loading
        ? SizedBox(
            height: 18,
            width: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: _foreground,
            ),
          )
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: fontSize + 4),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: fontSize,
                ),
              ),
            ],
          );

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
    );

    final Widget button;
    switch (variant) {
      case AppButtonVariant.primary:
        button = ElevatedButton(
          onPressed: disabled ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: padding,
            shape: shape,
            elevation: 0,
          ),
          child: child,
        );
        break;
      case AppButtonVariant.outline:
        button = OutlinedButton(
          onPressed: disabled ? null : onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            side: const BorderSide(color: AppColors.primary, width: 1.5),
            padding: padding,
            shape: shape,
          ),
          child: child,
        );
        break;
      case AppButtonVariant.ghost:
        button = TextButton(
          onPressed: disabled ? null : onPressed,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            padding: padding,
            shape: shape,
          ),
          child: child,
        );
        break;
      case AppButtonVariant.danger:
        button = ElevatedButton(
          onPressed: disabled ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.error,
            foregroundColor: Colors.white,
            padding: padding,
            shape: shape,
            elevation: 0,
          ),
          child: child,
        );
        break;
    }

    if (!fullWidth) return button;
    return SizedBox(width: double.infinity, child: button);
  }

  Color get _foreground {
    switch (variant) {
      case AppButtonVariant.outline:
      case AppButtonVariant.ghost:
        return AppColors.primary;
      default:
        return Colors.white;
    }
  }
}

enum AppButtonSize { sm, md, lg }
