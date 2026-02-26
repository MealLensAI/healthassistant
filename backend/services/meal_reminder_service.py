"""
Meal Reminder Service - Scheduled email reminders for uncooked meals.

Timing logic:
  - Breakfast window: 7-10am  → Reminder at 10:30am, follow-up at 12pm
  - Lunch    window: 12-2pm   → Reminder at 2:30pm,  follow-up at 4pm
  - Snack    window: 3-5pm    → Reminder at 5:30pm,  follow-up at 7pm
  - Dinner   window: 6-9pm    → Reminder at 9:30pm,  follow-up at 11pm

All times are UTC.  Adjust MEAL_WINDOWS if your user base is in a
different timezone (or store per-user tz in settings).
"""

import json
import threading
from datetime import datetime
from typing import Optional

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False
    print("[MealReminder] APScheduler not installed. Run: pip install apscheduler")

from services.email_service import email_service


class MealReminderService:
    """Sends scheduled email reminders when users miss a planned meal."""

    # reminder_hour  = first nudge (meal time just passed)
    # followup_hour  = stronger nudge (you still haven't cooked)
    MEAL_WINDOWS = {
        'breakfast': {'reminder_hour': 10, 'reminder_min': 30,
                      'followup_hour': 12, 'followup_min': 0},
        'lunch':     {'reminder_hour': 14, 'reminder_min': 30,
                      'followup_hour': 16, 'followup_min': 0},
        'snack':     {'reminder_hour': 17, 'reminder_min': 30,
                      'followup_hour': 19, 'followup_min': 0},
        'dinner':    {'reminder_hour': 21, 'reminder_min': 30,
                      'followup_hour': 23, 'followup_min': 0},
    }

    def __init__(self, supabase_service=None):
        self.svc = supabase_service
        self.scheduler = None
        self._lock = threading.Lock()

        if SCHEDULER_AVAILABLE:
            self.scheduler = BackgroundScheduler(timezone='UTC')

    # ── lifecycle ────────────────────────────────────────────────────

    def start(self):
        if not self.scheduler:
            print("[MealReminder] Scheduler not available")
            return False
        try:
            for meal_type, w in self.MEAL_WINDOWS.items():
                self.scheduler.add_job(
                    self._check_and_remind,
                    CronTrigger(hour=w['reminder_hour'], minute=w['reminder_min']),
                    args=[meal_type, False],
                    id=f'{meal_type}_reminder',
                    replace_existing=True,
                    name=f'{meal_type.capitalize()} Reminder',
                )
                self.scheduler.add_job(
                    self._check_and_remind,
                    CronTrigger(hour=w['followup_hour'], minute=w['followup_min']),
                    args=[meal_type, True],
                    id=f'{meal_type}_followup',
                    replace_existing=True,
                    name=f'{meal_type.capitalize()} Follow-up',
                )

            self.scheduler.add_job(
                self._send_weekly_summary,
                CronTrigger(day_of_week='sun', hour=20, minute=0),
                id='weekly_summary',
                replace_existing=True,
                name='Weekly Summary Email',
            )

            self.scheduler.start()
            print("[MealReminder] Scheduler started with the following jobs:")
            for job in self.scheduler.get_jobs():
                print(f"  - {job.name}: next run at {job.next_run_time}")
            return True
        except Exception as e:
            print(f"[MealReminder] Failed to start: {e}")
            return False

    def stop(self):
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            print("[MealReminder] Scheduler stopped")

    # ── helpers ──────────────────────────────────────────────────────

    def _get_day_name(self) -> str:
        return datetime.utcnow().strftime('%A')

    def _get_users_with_plans(self) -> list:
        """Fetch all users who have an active (approved) meal plan."""
        try:
            result = (
                self.svc.supabase.table('meal_plan_management')
                .select('user_id, id, meal_plan')
                .eq('is_approved', True)
                .execute()
            )
            return result.data or []
        except Exception as e:
            print(f"[MealReminder] Error fetching plans: {e}")
            return []

    def _get_user_info(self, user_id: str) -> tuple:
        """Return (email, display_name) for a Supabase Auth user."""
        try:
            resp = self.svc.supabase.auth.admin.get_user_by_id(user_id)
            if resp and hasattr(resp, 'user') and resp.user:
                email = resp.user.email
                meta = getattr(resp.user, 'user_metadata', {}) or {}
                name = (meta.get('full_name')
                        or meta.get('first_name')
                        or (email.split('@')[0] if email else 'there'))
                return email, name
        except Exception as e:
            print(f"[MealReminder] Error fetching user {user_id}: {e}")
        return None, None

    def _extract_meal_name(self, plan_row: dict, day_name: str, meal_type: str) -> str | None:
        """Pull the meal name from the plan JSON for a given day + meal_type."""
        meal_plan_data = plan_row.get('meal_plan', [])
        if isinstance(meal_plan_data, str):
            meal_plan_data = json.loads(meal_plan_data)
        if isinstance(meal_plan_data, dict) and 'mealPlan' in meal_plan_data:
            meal_plan_data = meal_plan_data['mealPlan']

        day_plan = next(
            (d for d in (meal_plan_data or [])
             if d.get('day', '').lower() == day_name.lower()),
            None,
        )
        if not day_plan:
            return None
        return day_plan.get(meal_type) or day_plan.get(f'{meal_type}_name')

    # ── core job ─────────────────────────────────────────────────────

    def _check_and_remind(self, meal_type: str, is_followup: bool):
        """For every active plan, check if meal_type is uncooked today and send email."""
        with self._lock:
            day_name = self._get_day_name()
            label = f"{'follow-up ' if is_followup else ''}{meal_type}"
            print(f"[MealReminder] ── {label} check for {day_name} ──")

            plans = self._get_users_with_plans()
            if not plans:
                print(f"[MealReminder] No active plans found")
                return

            sent = 0
            skipped_cooked = 0
            skipped_no_meal = 0

            for plan_row in plans:
                try:
                    user_id = plan_row.get('user_id')
                    meal_plan_id = str(plan_row.get('id'))

                    meal_name = self._extract_meal_name(plan_row, day_name, meal_type)
                    if not meal_name:
                        skipped_no_meal += 1
                        continue

                    tracking, _ = self.svc.get_meal_tracking(user_id, meal_plan_id)
                    cooked = (
                        tracking
                        and tracking.get(day_name, {}).get(meal_type, {}).get('cooked_at')
                    )
                    if cooked:
                        skipped_cooked += 1
                        continue

                    email, name = self._get_user_info(user_id)
                    if not email:
                        continue

                    success = email_service.send_meal_reminder_email(
                        to_email=email,
                        user_name=name,
                        meal_type=meal_type,
                        meal_name=meal_name,
                        is_followup=is_followup,
                    )
                    if success:
                        sent += 1
                        print(f"[MealReminder]   → sent to {email}")
                    else:
                        print(f"[MealReminder]   ✗ failed for {email}")

                except Exception as e:
                    print(f"[MealReminder]   ✗ error user {plan_row.get('user_id')}: {e}")

            print(f"[MealReminder] {label} done: sent={sent}, already_cooked={skipped_cooked}, no_meal={skipped_no_meal}")

    def _send_weekly_summary(self):
        """Sunday evening: send each user their weekly cooking progress."""
        with self._lock:
            plans = self._get_users_with_plans()
            seen_users: set = set()

            for plan_row in plans:
                try:
                    user_id = plan_row.get('user_id')
                    if user_id in seen_users:
                        continue
                    seen_users.add(user_id)

                    meal_plan_id = str(plan_row.get('id'))
                    progress, _ = self.svc.get_week_progress(user_id, meal_plan_id)
                    if not progress:
                        continue

                    email, name = self._get_user_info(user_id)
                    if not email:
                        continue

                    email_service.send_weekly_completion_email(
                        to_email=email,
                        user_name=name,
                        total_meals=progress.get('total_meals', 0),
                        cooked_meals=progress.get('cooked_meals', 0),
                    )
                    print(f"[MealReminder] Weekly summary sent to {email}")
                except Exception as e:
                    print(f"[MealReminder] Weekly summary error: {e}")

    # ── manual trigger (for testing / API endpoint) ──────────────────

    def trigger_check_now(self, meal_type: str = None) -> dict:
        """
        Manually trigger a reminder check right now.
        If meal_type is None, checks ALL meal types whose window has passed today.
        Returns a summary dict.
        """
        results = {}
        day_name = self._get_day_name()
        now_hour = datetime.utcnow().hour

        types_to_check = [meal_type] if meal_type else list(self.MEAL_WINDOWS.keys())

        for mt in types_to_check:
            w = self.MEAL_WINDOWS.get(mt)
            if not w:
                results[mt] = 'unknown meal type'
                continue

            is_followup = now_hour >= w['followup_hour']
            plans = self._get_users_with_plans()
            sent = 0
            already_cooked = 0
            no_meal = 0

            for plan_row in plans:
                try:
                    user_id = plan_row.get('user_id')
                    meal_plan_id = str(plan_row.get('id'))

                    meal_name = self._extract_meal_name(plan_row, day_name, mt)
                    if not meal_name:
                        no_meal += 1
                        continue

                    tracking, _ = self.svc.get_meal_tracking(user_id, meal_plan_id)
                    cooked = (
                        tracking
                        and tracking.get(day_name, {}).get(mt, {}).get('cooked_at')
                    )
                    if cooked:
                        already_cooked += 1
                        continue

                    email, name = self._get_user_info(user_id)
                    if not email:
                        continue

                    success = email_service.send_meal_reminder_email(
                        to_email=email,
                        user_name=name,
                        meal_type=mt,
                        meal_name=meal_name,
                        is_followup=is_followup,
                    )
                    if success:
                        sent += 1
                except Exception as e:
                    print(f"[MealReminder] trigger error: {e}")

            results[mt] = {
                'sent': sent,
                'already_cooked': already_cooked,
                'no_meal_planned': no_meal,
                'is_followup': is_followup,
            }

        return results


# ── module-level singleton ──────────────────────────────────────────

meal_reminder_service: Optional[MealReminderService] = None


def init_meal_reminder_service(supabase_service=None) -> MealReminderService:
    global meal_reminder_service
    if meal_reminder_service is None:
        meal_reminder_service = MealReminderService(supabase_service)
        meal_reminder_service.start()
    return meal_reminder_service


def get_meal_reminder_service() -> Optional[MealReminderService]:
    return meal_reminder_service
