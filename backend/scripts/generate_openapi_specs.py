#!/usr/bin/env python3
"""Generate flasgger operation YAML files for all API endpoints."""
import os

ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs', 'openapi')

BEARER = "security:\n  - Bearer: []\n"
NO_SEC = "security: []\n"

ERR = """  400:
    description: Bad request
  401:
    description: Unauthorized
  500:
    description: Server error
"""

ERR_NO_AUTH = """  400:
    description: Bad request
  500:
    description: Server error
"""


def props(fields):
    """fields: list of (name, type, description) or (name, type)"""
    lines = []
    for f in fields:
        name, typ = f[0], f[1]
        desc = f[2] if len(f) > 2 else ''
        lines.append(f"        {name}:")
        lines.append(f"          type: {typ}")
        if desc:
            lines.append(f"          description: {desc}")
    return "\n".join(lines)


def body(required, fields, desc="Request body"):
    req = ""
    if required:
        req = "\n      required:\n" + "\n".join(f"        - {r}" for r in required)
    return f"""parameters:
  - in: body
    name: body
    description: {desc}
    required: true
    schema:
      type: object{req}
      properties:
{props(fields)}
"""


def path_params(*params):
    """params: (name, type, description)"""
    blocks = []
    for name, typ, desc in params:
        blocks.append(f"""  - in: path
    name: {name}
    type: {typ}
    required: true
    description: {desc}""")
    return "parameters:\n" + "\n".join(blocks) + "\n"


def query_params(*params):
    """params: (name, type, required, description)"""
    blocks = []
    for name, typ, required, desc in params:
        blocks.append(f"""  - in: query
    name: {name}
    type: {typ}
    required: {str(required).lower()}
    description: {desc}""")
    return "parameters:\n" + "\n".join(blocks) + "\n"


def path_and_body(path_ps, required, fields):
    """Combine path params and body."""
    blocks = []
    for name, typ, desc in path_ps:
        blocks.append(f"""  - in: path
    name: {name}
    type: {typ}
    required: true
    description: {desc}""")
    req = ""
    if required:
        req = "\n      required:\n" + "\n".join(f"        - {r}" for r in required)
    blocks.append(f"""  - in: body
    name: body
    required: true
    schema:
      type: object{req}
      properties:
{props(fields)}""")
    return "parameters:\n" + "\n".join(blocks) + "\n"


def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(rel)


def op(tags, summary, consumes_json=True, security=True, params="", responses="200", extra_err=True, auth_err=True):
    cons = "consumes:\n  - application/json\n" if consumes_json else ""
    sec = BEARER if security else NO_SEC
    if responses == "200":
        resp = """responses:
  200:
    description: Success
"""
    elif responses == "201":
        resp = """responses:
  201:
    description: Created
"""
    else:
        resp = responses
    err = ""
    if extra_err:
        err = ERR if auth_err and security else ERR_NO_AUTH
        # avoid duplicating 200/201 already in resp - ERR only has 400/401/500
    return f"""tags:
  - {tags}
summary: {summary}
{cons}{sec}{params}{resp}{err}"""


# ── Auth ──────────────────────────────────────────────────────────
write('auth/login.yml', op('Auth', 'Login with email and password', security=False,
    params=body(['email', 'password'], [
        ('email', 'string'), ('password', 'string'),
    ]), auth_err=False))

write('auth/logout.yml', op('Auth', 'Logout and clear access token cookie', security=False,
    params="", consumes_json=False, extra_err=False))

write('auth/refresh_token.yml', op('Auth', 'Refresh access token', security=False,
    params=body(['refresh_token'], [('refresh_token', 'string')]), auth_err=False))

write('auth/register.yml', op('Auth', 'Register a new user', security=False,
    params=body(['email', 'password', 'first_name', 'last_name'], [
        ('email', 'string'), ('password', 'string'),
        ('first_name', 'string'), ('last_name', 'string'),
        ('signup_type', 'string', 'individual or organization'),
    ]), responses="201", auth_err=False))

write('auth/profile.yml', op('Auth', 'Get current user profile',
    params="", consumes_json=False))

write('auth/change_password.yml', op('Auth', 'Change password',
    params=body(['current_password', 'new_password'], [
        ('current_password', 'string'), ('new_password', 'string'),
    ])))

write('auth/forgot_password.yml', op('Auth', 'Request password reset email', security=False,
    params=body(['email'], [
        ('email', 'string'), ('redirect_url', 'string'),
    ]), extra_err=False))

write('auth/reset_password.yml', op('Auth', 'Reset password with recovery token', security=False,
    params=body(['access_token', 'new_password'], [
        ('access_token', 'string', 'Recovery access token'),
        ('new_password', 'string'),
    ]), auth_err=False))

# ── Meal plans ────────────────────────────────────────────────────
write('meal_plan/create.yml', op('Meal Plans', 'Create meal plan (single)',
    params=body([], [('type', 'object', 'Meal plan payload (opaque)')], desc='Meal plan object'),
    responses="201"))

write('meal_plan/list.yml', op('Meal Plans', 'List meal plans',
    params="", consumes_json=False))

write('meal_plan/create_many.yml', op('Meal Plans', 'Create meal plan entry',
    params=body([], [], desc='Meal plan JSON'), responses="201"))

write('meal_plan/update.yml', op('Meal Plans', 'Update meal plan by id',
    params=path_and_body([('id', 'string', 'Meal plan id')], [], [])))

write('meal_plan/delete.yml', op('Meal Plans', 'Delete meal plan by id',
    params=path_params(('id', 'string', 'Meal plan id')), consumes_json=False))

write('meal_plan/clear.yml', op('Meal Plans', 'Clear all meal plans',
    params="", consumes_json=False))

write('meal_plan/get_by_id.yml', op('Meal Plans', 'Get meal plan by id',
    params=path_params(('plan_id', 'string', 'Meal plan id')), consumes_json=False))

write('meal_plan/get_day.yml', op('Meal Plans', 'Get meal plan for a day',
    params=path_params(
        ('plan_id', 'string', 'Meal plan id'),
        ('day', 'string', 'Day key'),
    ), consumes_json=False))

write('meal_plan/get_meal.yml', op('Meal Plans', 'Get specific meal from plan',
    params=path_params(
        ('plan_id', 'string', 'Meal plan id'),
        ('day', 'string', 'Day key'),
        ('meal_type', 'string', 'breakfast|lunch|dinner|snack'),
    ), consumes_json=False))

# ── Food for you ──────────────────────────────────────────────────
write('food_for_you/get.yml', op('Food For You', 'Get saved foods',
    params="", consumes_json=False))

write('food_for_you/put.yml', op('Food For You', 'Update saved foods',
    params=body(['foods'], [
        ('foods', 'array', 'List of foods'),
        ('source_plan', 'object'),
    ])))

write('food_for_you/delete.yml', op('Food For You', 'Clear saved foods',
    params="", consumes_json=False))

# ── Health history ────────────────────────────────────────────────
write('health_history/list.yml', op('Health History', 'List health/detection history',
    params="", consumes_json=False))

write('health_history/create.yml', op('Health History', 'Create health history record',
    params=body(['recipe_type'], [
        ('recipe_type', 'string'),
        ('suggestion', 'string'),
        ('instructions', 'string'),
        ('ingredients', 'string'),
        ('detected_foods', 'string'),
        ('analysis_id', 'string'),
        ('youtube_link', 'string'),
        ('google_link', 'string'),
        ('resources_link', 'string'),
    ]), responses="201"))

write('health_history/get.yml', op('Health History', 'Get health history record',
    params=path_params(('record_id', 'string', 'Record id')), consumes_json=False))

write('health_history/delete.yml', op('Health History', 'Delete health history record',
    params=path_params(('record_id', 'string', 'Record id')), consumes_json=False))

# ── User settings ─────────────────────────────────────────────────
write('user_settings/create.yml', op('Settings', 'Save user settings',
    params=body([], [
        ('settings_type', 'string', 'Defaults to health_profile'),
        ('settings_data', 'object'),
    ])))

write('user_settings/get.yml', op('Settings', 'Get user settings',
    params=query_params(('settings_type', 'string', False, 'Settings type filter')),
    consumes_json=False))

write('user_settings/delete.yml', op('Settings', 'Delete user settings',
    params=query_params(('settings_type', 'string', False, 'Settings type filter')),
    consumes_json=False))

write('user_settings/history.yml', op('Settings', 'Get settings history',
    params=query_params(
        ('settings_type', 'string', False, 'Settings type filter'),
        ('limit', 'integer', False, 'Max records (default 50)'),
    ), consumes_json=False))

write('user_settings/history_delete.yml', op('Settings', 'Delete settings history record',
    params=path_params(('record_id', 'string', 'History record id')), consumes_json=False))

write('user_settings/notifications.yml', op('Settings', 'List notifications',
    params="", consumes_json=False))

write('user_settings/notifications_read_all.yml', op('Settings', 'Mark all notifications read',
    params="", consumes_json=False))

write('user_settings/notifications_read.yml', op('Settings', 'Mark one notification read',
    params=body(['notification_id'], [('notification_id', 'string')])))

# ── Feedback ──────────────────────────────────────────────────────
write('feedback/create.yml', op('Feedback', 'Submit feedback',
    consumes_json=False, security=True,
    params="""parameters:
  - in: formData
    name: feedback_text
    type: string
    required: true
    description: Feedback text
""",
    responses="201"))

# ── AI session ────────────────────────────────────────────────────
write('ai_session/store.yml', op('AI Session', 'Store AI session (path is /api/api/store-session as registered)',
    params=body(['session_data'], [
        ('session_data', 'object', 'Contains prompt, response, timestamp, optional metadata'),
    ]), responses="201"))

# ── Meal tracking ─────────────────────────────────────────────────
write('meal_tracking/mark_cooked.yml', op('Meal Tracking', 'Mark meal as cooked',
    params=body(['meal_plan_id', 'day', 'meal_type'], [
        ('meal_plan_id', 'string'), ('day', 'string'), ('meal_type', 'string'),
    ])))

write('meal_tracking/send_cooked_email.yml', op('Meal Tracking', 'Send cooked meal email',
    params=body(['meal_type'], [
        ('meal_type', 'string'), ('meal_plan_id', 'string'),
        ('day', 'string'), ('meal_name', 'string'),
    ])))

write('meal_tracking/unmark_cooked.yml', op('Meal Tracking', 'Unmark meal as cooked',
    params=body(['meal_plan_id', 'day', 'meal_type'], [
        ('meal_plan_id', 'string'), ('day', 'string'), ('meal_type', 'string'),
    ])))

write('meal_tracking/get.yml', op('Meal Tracking', 'Get tracking for meal plan',
    params=path_params(('meal_plan_id', 'string', 'Meal plan id')), consumes_json=False))

write('meal_tracking/week_progress.yml', op('Meal Tracking', 'Get week progress',
    params=path_params(('meal_plan_id', 'string', 'Meal plan id')), consumes_json=False))

write('meal_tracking/reminder_settings_get.yml', op('Meal Tracking', 'Get reminder settings',
    params="", consumes_json=False))

write('meal_tracking/reminder_settings_put.yml', op('Meal Tracking', 'Update reminder settings',
    params=body([], [
        ('reminders_enabled', 'boolean'),
        ('breakfast_reminder_time', 'string'),
        ('lunch_reminder_time', 'string'),
        ('dinner_reminder_time', 'string'),
        ('followup_delay_hours', 'number'),
        ('timezone', 'string'),
    ])))

write('meal_tracking/trigger_reminders.yml', op('Meal Tracking', 'Trigger meal reminders',
    params=body([], [('meal_type', 'string')])))

# ── Subscription (no bearer; user_id in body/query) ────────────────
write('subscription/status.yml', op('Subscription', 'Get subscription status', security=False,
    params=query_params(('user_id', 'string', True, 'User id')), consumes_json=False, auth_err=False))

write('subscription/feature_access.yml', op('Subscription', 'Check feature access', security=False,
    params=body(['user_id', 'feature_name'], [
        ('user_id', 'string'), ('feature_name', 'string'),
    ]), auth_err=False))

write('subscription/record_usage.yml', op('Subscription', 'Record feature usage', security=False,
    params=body(['user_id', 'feature_name'], [
        ('user_id', 'string'), ('feature_name', 'string'), ('count', 'integer'),
    ]), auth_err=False))

write('subscription/create_trial.yml', op('Subscription', 'Create trial', security=False,
    params=body(['user_id'], [
        ('user_id', 'string'), ('duration_days', 'integer'),
    ]), auth_err=False))

write('subscription/activate.yml', op('Subscription', 'Activate subscription', security=False,
    params=body(['user_id', 'plan_name'], [
        ('user_id', 'string'), ('plan_name', 'string'), ('paystack_data', 'object'),
    ]), auth_err=False))

write('subscription/activate_days.yml', op('Subscription', 'Activate subscription for days', security=False,
    params=body(['user_id', 'duration_days'], [
        ('user_id', 'string'), ('duration_days', 'integer'), ('paystack_data', 'object'),
    ]), auth_err=False))

write('subscription/plans.yml', op('Subscription', 'List subscription plans', security=False,
    params="", consumes_json=False, extra_err=True, auth_err=False))

write('subscription/verify_payment.yml', op('Subscription', 'Verify payment', security=False,
    params=body(['reference'], [('reference', 'string')]), auth_err=False))

write('subscription/webhook.yml', op('Subscription', 'Paystack webhook', security=False,
    params=body([], [], desc='Paystack webhook payload'), auth_err=False))

write('subscription/usage_stats.yml', op('Subscription', 'Get usage stats', security=False,
    params=query_params(('user_id', 'string', True, 'User id')), consumes_json=False, auth_err=False))

write('subscription/health.yml', op('Subscription', 'Subscription service health', security=False,
    params="", consumes_json=False, extra_err=True, auth_err=False))

# ── Payment ───────────────────────────────────────────────────────
write('payment/plans.yml', op('Payment', 'List payment plans', security=False,
    params="", consumes_json=False, auth_err=False))

write('payment/subscription.yml', op('Payment', 'Get current subscription',
    params="", consumes_json=False))

write('payment/usage.yml', op('Payment', 'Get usage',
    params="", consumes_json=False))

write('payment/check_usage.yml', op('Payment', 'Check feature usage',
    params=path_params(('feature_name', 'string', 'Feature name')), consumes_json=False))

write('payment/record_usage.yml', op('Payment', 'Record feature usage',
    params=path_and_body([('feature_name', 'string', 'Feature name')], [], [
        ('count', 'integer'),
    ])))

write('payment/initialize.yml', op('Payment', 'Initialize Paystack payment',
    params=body(['email', 'amount', 'plan_id'], [
        ('email', 'string'), ('amount', 'number'),
        ('plan_id', 'string'), ('callback_url', 'string'),
    ])))

write('payment/verify.yml', op('Payment', 'Verify Paystack payment',
    params=path_params(('reference', 'string', 'Payment reference')), consumes_json=False))

write('payment/webhook.yml', op('Payment', 'Paystack payment webhook', security=False,
    params="""parameters:
  - in: header
    name: X-Paystack-Signature
    type: string
    required: false
  - in: body
    name: body
    required: true
    schema:
      type: object
""", auth_err=False))

write('payment/cancel.yml', op('Payment', 'Cancel subscription',
    params="", consumes_json=False))

write('payment/upgrade.yml', op('Payment', 'Upgrade subscription',
    params=body(['plan_id'], [('plan_id', 'string')])))

write('payment/status.yml', op('Payment', 'Payment service status', security=False,
    params="", consumes_json=False, extra_err=False))

write('payment/success.yml', op('Payment', 'Record payment success', security=False,
    params=body(['user_id', 'email', 'plan_name'], [
        ('user_id', 'string'), ('email', 'string'), ('plan_name', 'string'),
        ('plan_duration_minutes', 'integer'), ('paystack_data', 'object'),
    ]), auth_err=False))

# ── Lifecycle ─────────────────────────────────────────────────────
write('lifecycle/status.yml', op('Lifecycle', 'Get lifecycle status',
    params="", consumes_json=False))

write('lifecycle/initialize_trial.yml', op('Lifecycle', 'Initialize trial',
    params=body([], [
        ('duration_hours', 'number'), ('test_mode', 'boolean'),
    ])))

write('lifecycle/mark_trial_used.yml', op('Lifecycle', 'Mark trial as used',
    params="", consumes_json=False))

write('lifecycle/activate_subscription.yml', op('Lifecycle', 'Activate subscription',
    params=body(['duration_days', 'paystack_data'], [
        ('duration_days', 'integer'), ('paystack_data', 'object'), ('test_mode', 'boolean'),
    ])))

write('lifecycle/mark_subscription_expired.yml', op('Lifecycle', 'Mark subscription expired',
    params="", consumes_json=False))

write('lifecycle/set_test_mode.yml', op('Lifecycle', 'Set lifecycle test mode',
    params=body(['test_mode'], [('test_mode', 'boolean')])))

write('lifecycle/user_state_display.yml', op('Lifecycle', 'Get user state display',
    params="", consumes_json=False))

write('lifecycle/check_expired_trials.yml', op('Lifecycle', 'Check expired trials',
    params="", consumes_json=False))

write('lifecycle/check_expired_subscriptions.yml', op('Lifecycle', 'Check expired subscriptions',
    params="", consumes_json=False))

write('lifecycle/plans.yml', op('Lifecycle', 'List lifecycle plans', security=False,
    params="", consumes_json=False, auth_err=False))

write('lifecycle/verify_payment.yml', op('Lifecycle', 'Verify lifecycle payment',
    params=body(['reference'], [('reference', 'string')])))

# ── Mock AI ───────────────────────────────────────────────────────
for name, summary in [
    ('smart_plan', 'Mock smart meal plan'),
    ('sick_smart_plan', 'Mock sick smart meal plan'),
    ('ai_nutrition_plan', 'Mock AI nutrition plan'),
    ('auto_generate_plan', 'Mock auto-generate meal plan'),
]:
    write(f'mock_ai/{name}.yml', op('Mock AI', summary, security=False,
        params=body([], [], desc='Body ignored by mock'), auth_err=False))

# ── Enterprise ────────────────────────────────────────────────────
write('enterprise/register.yml', op('Enterprise', 'Register enterprise',
    params=body(['name', 'email', 'organization_type'], [
        ('name', 'string'), ('email', 'string'), ('organization_type', 'string'),
        ('phone', 'string'), ('address', 'string'),
    ]), responses="201"))

write('enterprise/can_create.yml', op('Enterprise', 'Check if user can create enterprise',
    params="", consumes_json=False))

write('enterprise/my_enterprises.yml', op('Enterprise', 'List my enterprises',
    params="", consumes_json=False))

write('enterprise/get.yml', op('Enterprise', 'Get enterprise by id',
    params=path_params(('enterprise_id', 'string', 'Enterprise id')), consumes_json=False))

write('enterprise/update.yml', op('Enterprise', 'Update enterprise',
    params=path_and_body([('enterprise_id', 'string', 'Enterprise id')], [], [
        ('name', 'string'), ('email', 'string'), ('phone', 'string'),
        ('address', 'string'), ('organization_type', 'string'),
        ('max_users', 'integer'), ('settings', 'object'), ('is_active', 'boolean'),
    ])))

write('enterprise/users.yml', op('Enterprise', 'List enterprise users',
    params=path_params(('enterprise_id', 'string', 'Enterprise id')), consumes_json=False))

write('enterprise/invite.yml', op('Enterprise', 'Invite user to enterprise',
    params=path_and_body([('enterprise_id', 'string', 'Enterprise id')], ['email'], [
        ('email', 'string'),
        ('role', 'string', 'client|patient|doctor|nutritionist'),
        ('message', 'string'),
    ]), responses="201"))

write('enterprise/invitations.yml', op('Enterprise', 'List enterprise invitations',
    params=path_params(('enterprise_id', 'string', 'Enterprise id')), consumes_json=False))

write('enterprise/cancel_invitation.yml', op('Enterprise', 'Cancel invitation',
    params=path_params(('invitation_id', 'string', 'Invitation id')), consumes_json=False))

write('enterprise/test_email.yml', op('Enterprise', 'Send test email',
    params=body([], [('email', 'string')])))

write('enterprise/verify_invitation_token.yml', op('Enterprise', 'Verify invitation by path token',
    security=False,
    params=path_params(('token', 'string', 'Invitation token')), consumes_json=False, auth_err=False))

write('enterprise/verify_invitation_query.yml', op('Enterprise', 'Verify invitation by query token',
    security=False,
    params=query_params(('token', 'string', True, 'Invitation token')), consumes_json=False, auth_err=False))

write('enterprise/accept_invitation.yml', op('Enterprise', 'Accept invitation',
    security=False,
    params=body(['token'], [('token', 'string')]), auth_err=False))

write('enterprise/complete_invitation.yml', op('Enterprise', 'Complete invitation acceptance',
    params=body(['invitation_id'], [('invitation_id', 'string')])))

write('enterprise/create_user.yml', op('Enterprise', 'Create enterprise user',
    params=body(['enterprise_id', 'first_name', 'last_name', 'email', 'password', 'role'], [
        ('enterprise_id', 'string'), ('first_name', 'string'), ('last_name', 'string'),
        ('email', 'string'), ('password', 'string'), ('role', 'string'),
    ]), responses="201"))

write('enterprise/delete_user.yml', op('Enterprise', 'Delete enterprise user (owner)',
    params=path_params(('user_relation_id', 'string', 'User relation id')), consumes_json=False))

write('enterprise/logout_and_login.yml', op('Enterprise', 'Redirect to logout-and-login',
    security=False, params="", consumes_json=False, extra_err=False,
    responses="""responses:
  302:
    description: Redirect to frontend
"""))

write('enterprise/update_user.yml', op('Enterprise', 'Update enterprise user membership',
    params=path_and_body([
        ('enterprise_id', 'string', 'Enterprise id'),
        ('user_relation_id', 'string', 'User relation id'),
    ], [], [
        ('status', 'string'), ('role', 'string'),
        ('notes', 'string'), ('metadata', 'object'),
    ])))

write('enterprise/remove_user.yml', op('Enterprise', 'Remove user from enterprise',
    params=path_params(
        ('enterprise_id', 'string', 'Enterprise id'),
        ('user_relation_id', 'string', 'User relation id'),
    ), consumes_json=False))

write('enterprise/my_enterprises_alias.yml', op('Enterprise', 'List my enterprises (alias)',
    params="", consumes_json=False))

write('enterprise/settings_history.yml', op('Enterprise', 'Get enterprise settings history',
    params=path_params(('enterprise_id', 'string', 'Enterprise id')), consumes_json=False))

write('enterprise/user_settings_get.yml', op('Enterprise', 'Get user settings in enterprise',
    params=path_params(
        ('enterprise_id', 'string', 'Enterprise id'),
        ('user_id', 'string', 'User id'),
    ), consumes_json=False))

write('enterprise/user_settings_put.yml', op('Enterprise', 'Update user settings in enterprise',
    params=path_and_body([
        ('enterprise_id', 'string', 'Enterprise id'),
        ('user_id', 'string', 'User id'),
    ], ['settings_data'], [
        ('settings_data', 'object'), ('settings_type', 'string'),
    ])))

write('enterprise/user_settings_delete.yml', op('Enterprise', 'Delete user settings in enterprise',
    params="""parameters:
  - in: path
    name: enterprise_id
    type: string
    required: true
  - in: path
    name: user_id
    type: string
    required: true
  - in: query
    name: settings_type
    type: string
    required: false
""", consumes_json=False))

write('enterprise/time_restrictions_get.yml', op('Enterprise', 'Get time restrictions',
    params=path_params(('enterprise_id', 'string', 'Enterprise id')), consumes_json=False))

write('enterprise/time_restrictions_put.yml', op('Enterprise', 'Update time restrictions',
    params=path_and_body([('enterprise_id', 'string', 'Enterprise id')], [], [
        ('enabled', 'boolean'), ('timezone', 'string'), ('windows', 'array'),
    ])))

write('enterprise/statistics.yml', op('Enterprise', 'Get enterprise statistics',
    params=path_params(('enterprise_id', 'string', 'Enterprise id')), consumes_json=False))

write('enterprise/meal_plans_get.yml', op('Enterprise', 'List user meal plans in enterprise',
    params=path_params(
        ('enterprise_id', 'string', 'Enterprise id'),
        ('user_id', 'string', 'User id'),
    ), consumes_json=False))

write('enterprise/meal_plans_post.yml', op('Enterprise', 'Create user meal plan in enterprise',
    params=path_and_body([
        ('enterprise_id', 'string', 'Enterprise id'),
        ('user_id', 'string', 'User id'),
    ], [], [
        ('name', 'string'), ('start_date', 'string'), ('startDate', 'string'),
        ('end_date', 'string'), ('endDate', 'string'),
        ('meal_plan', 'object'), ('mealPlan', 'object'),
        ('user_info', 'object'),
    ]), responses="201"))

write('enterprise/meal_plan_approve.yml', op('Enterprise', 'Approve meal plan',
    params=path_params(
        ('enterprise_id', 'string', 'Enterprise id'),
        ('plan_id', 'string', 'Plan id'),
    ), consumes_json=False))

write('enterprise/meal_plan_reject.yml', op('Enterprise', 'Reject meal plan',
    params=path_params(
        ('enterprise_id', 'string', 'Enterprise id'),
        ('plan_id', 'string', 'Plan id'),
    ), consumes_json=False))

write('enterprise/meal_plan_update.yml', op('Enterprise', 'Update enterprise meal plan',
    params=path_and_body([
        ('enterprise_id', 'string', 'Enterprise id'),
        ('plan_id', 'string', 'Plan id'),
    ], [], [
        ('name', 'string'), ('start_date', 'string'), ('end_date', 'string'),
        ('meal_plan', 'object'), ('status', 'string'),
    ])))

write('enterprise/meal_plan_delete.yml', op('Enterprise', 'Delete enterprise meal plan',
    params=path_params(
        ('enterprise_id', 'string', 'Enterprise id'),
        ('plan_id', 'string', 'Plan id'),
    ), consumes_json=False))

write('enterprise/detection_history.yml', op('Enterprise', 'Get user detection history',
    params=path_params(
        ('enterprise_id', 'string', 'Enterprise id'),
        ('user_id', 'string', 'User id'),
    ), consumes_json=False))

write('enterprise/health_history.yml', op('Enterprise', 'Get user health history',
    params=path_params(
        ('enterprise_id', 'string', 'Enterprise id'),
        ('user_id', 'string', 'User id'),
    ), consumes_json=False))

print('Done.')
