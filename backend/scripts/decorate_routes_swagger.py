#!/usr/bin/env python3
"""Add @swag_from decorators to route handlers."""
import re
from pathlib import Path

ROUTES = Path(__file__).resolve().parent.parent / 'routes'

IMPORT_BLOCK = """from flasgger import swag_from
from core.swagger import swagger_path
"""

# Map: (filename, route decorator snippet or function name) -> yaml relative path under openapi/
# We'll insert @swag_from right after the @*.route(...) line(s) that precede each def.

# For each file: list of (unique route line substring OR consecutive route lines marker, yaml path)
# Using function names is more reliable.

DECORATIONS = {
    'auth_routes.py': {
        'login': 'auth/login.yml',  # need unique - there may be multiple. Use line-based.
    }
}

# Better approach: for each file, ordered list of yaml files matching order of @route defs
FILE_SPECS = {
    'feedback_routes.py': ['feedback/create.yml'],
    'ai_session_routes.py': ['ai_session/store.yml'],
    'food_for_you_routes.py': [
        'food_for_you/get.yml',
        'food_for_you/put.yml',
        'food_for_you/delete.yml',
    ],
    'health_history_routes.py': [
        'health_history/list.yml',
        'health_history/create.yml',
        'health_history/get.yml',
        'health_history/delete.yml',
    ],
    'mock_ai_routes.py': [
        'mock_ai/smart_plan.yml',
        'mock_ai/sick_smart_plan.yml',
        'mock_ai/ai_nutrition_plan.yml',
        'mock_ai/auto_generate_plan.yml',
    ],
    'auth_routes.py': [
        'auth/login.yml',
        'auth/logout.yml',
        'auth/refresh_token.yml',
        'auth/register.yml',
        'auth/profile.yml',
        'auth/change_password.yml',
        'auth/forgot_password.yml',
        'auth/reset_password.yml',
    ],
    'user_settings_routes.py': [
        'user_settings/create.yml',
        'user_settings/get.yml',
        'user_settings/delete.yml',
        'user_settings/history.yml',
        'user_settings/history_delete.yml',
        'user_settings/notifications.yml',
        'user_settings/notifications_read_all.yml',
        'user_settings/notifications_read.yml',
    ],
    'meal_plan_routes.py': [
        'meal_plan/create.yml',
        'meal_plan/list.yml',
        'meal_plan/create_many.yml',
        'meal_plan/update.yml',
        'meal_plan/delete.yml',
        'meal_plan/clear.yml',
        'meal_plan/get_by_id.yml',
        'meal_plan/get_day.yml',
        'meal_plan/get_meal.yml',
    ],
    'meal_tracking_routes.py': [
        'meal_tracking/mark_cooked.yml',
        'meal_tracking/send_cooked_email.yml',
        'meal_tracking/unmark_cooked.yml',
        'meal_tracking/get.yml',
        'meal_tracking/week_progress.yml',
        'meal_tracking/reminder_settings_get.yml',
        'meal_tracking/reminder_settings_put.yml',
        'meal_tracking/trigger_reminders.yml',
    ],
    'subscription_routes.py': [
        'subscription/status.yml',
        'subscription/feature_access.yml',
        'subscription/record_usage.yml',
        'subscription/create_trial.yml',
        'subscription/activate.yml',
        'subscription/activate_days.yml',
        'subscription/plans.yml',
        'subscription/verify_payment.yml',
        'subscription/webhook.yml',
        'subscription/usage_stats.yml',
        'subscription/health.yml',
    ],
    'payment_routes.py': [
        'payment/plans.yml',
        'payment/subscription.yml',
        'payment/usage.yml',
        'payment/check_usage.yml',
        'payment/record_usage.yml',
        'payment/initialize.yml',
        'payment/verify.yml',
        'payment/webhook.yml',
        'payment/cancel.yml',
        'payment/upgrade.yml',
        'payment/status.yml',
        'payment/success.yml',
    ],
    'lifecycle_routes.py': [
        'lifecycle/status.yml',
        'lifecycle/initialize_trial.yml',
        'lifecycle/mark_trial_used.yml',
        'lifecycle/activate_subscription.yml',
        'lifecycle/mark_subscription_expired.yml',
        'lifecycle/set_test_mode.yml',
        'lifecycle/user_state_display.yml',
        'lifecycle/check_expired_trials.yml',
        'lifecycle/check_expired_subscriptions.yml',
        'lifecycle/plans.yml',
        'lifecycle/verify_payment.yml',
    ],
    'enterprise_routes.py': [
        'enterprise/register.yml',
        'enterprise/can_create.yml',
        'enterprise/my_enterprises.yml',
        'enterprise/get.yml',
        'enterprise/update.yml',
        'enterprise/users.yml',
        'enterprise/invite.yml',
        'enterprise/invitations.yml',
        'enterprise/cancel_invitation.yml',
        'enterprise/test_email.yml',
        'enterprise/verify_invitation_token.yml',  # first of two stacked routes
        # second stacked route shares same function - only one swag_from on the function
        'enterprise/accept_invitation.yml',
        'enterprise/complete_invitation.yml',
        'enterprise/create_user.yml',
        'enterprise/delete_user.yml',
        'enterprise/logout_and_login.yml',
        'enterprise/update_user.yml',
        'enterprise/remove_user.yml',
        'enterprise/my_enterprises_alias.yml',
        'enterprise/settings_history.yml',
        'enterprise/user_settings_get.yml',
        'enterprise/user_settings_put.yml',
        'enterprise/user_settings_delete.yml',
        'enterprise/time_restrictions_get.yml',
        'enterprise/time_restrictions_put.yml',
        'enterprise/statistics.yml',
        'enterprise/meal_plans_get.yml',
        'enterprise/meal_plans_post.yml',
        'enterprise/meal_plan_approve.yml',
        'enterprise/meal_plan_reject.yml',
        'enterprise/meal_plan_update.yml',
        'enterprise/meal_plan_delete.yml',
        'enterprise/detection_history.yml',
        'enterprise/health_history.yml',
    ],
}


def ensure_imports(text: str) -> str:
    if 'from flasgger import swag_from' in text:
        return text
    # Insert after first import block line
    lines = text.splitlines(keepends=True)
    insert_at = 0
    for i, line in enumerate(lines):
        if line.startswith('from ') or line.startswith('import '):
            insert_at = i + 1
        elif insert_at and line.strip() and not line.startswith('#') and not line.startswith('"""') and not line.startswith("'''"):
            # keep going through contiguous imports
            if not (line.startswith('from ') or line.startswith('import ')):
                break
    # Better: find end of initial import section
    insert_at = 0
    seen_import = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('from ') or stripped.startswith('import '):
            seen_import = True
            insert_at = i + 1
        elif seen_import and stripped == '':
            insert_at = i
            break
        elif seen_import and not stripped.startswith('#') and stripped:
            insert_at = i
            break
    lines.insert(insert_at, IMPORT_BLOCK if lines[insert_at-1].endswith('\n') else '\n' + IMPORT_BLOCK)
    # Fix if we need newline
    if insert_at > 0 and not lines[insert_at - 1].endswith('\n'):
        pass
    return ''.join(lines)


ROUTE_RE = re.compile(
    r'^((?:@[^\n]+\n)+)(def \w+)',
    re.MULTILINE,
)


def decorate_file(filename: str, specs: list) -> None:
    path = ROUTES / filename
    text = path.read_text()
    if 'swag_from(swagger_path' in text:
        print(f'SKIP (already decorated): {filename}')
        return

    text = ensure_imports(text)

    # Find all route-decorated functions: lines of @... then def
    # For enterprise verify, two @route share one def - count as one handler
    pattern = re.compile(
        r'(^(?:@[^\n]+\n)+)(def \w+\()',
        re.MULTILINE,
    )

    matches = list(pattern.finditer(text))
    # Filter to only those that include .route(
    route_matches = [m for m in matches if '.route(' in m.group(1)]

    if len(route_matches) != len(specs):
        print(f'WARN {filename}: {len(route_matches)} route handlers vs {len(specs)} specs')
        # Still try to decorate min length
        n = min(len(route_matches), len(specs))
    else:
        n = len(specs)

    # Apply from end to start so offsets stay valid
    for i in range(n - 1, -1, -1):
        m = route_matches[i]
        yaml_rel = specs[i]
        # Avoid double-decorating
        block = m.group(1)
        if 'swag_from' in block:
            continue
        decorator = f"@swag_from(swagger_path('{yaml_rel}'))\n"
        # Insert after the last decorator line, before def
        insert_pos = m.start(2)
        text = text[:insert_pos] + decorator + text[insert_pos:]

    path.write_text(text)
    print(f'OK {filename}: decorated {n} handlers')


def main():
    for filename, specs in FILE_SPECS.items():
        decorate_file(filename, specs)


if __name__ == '__main__':
    main()
