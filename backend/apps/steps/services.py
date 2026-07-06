from django.utils import timezone

from .models import StepEntry, StepGoal


def complete_steps_day(user, date):
    """Snapshot the current step goal against that date's logged steps."""
    entry, _ = StepEntry.objects.get_or_create(user=user, date=date)
    goal = StepGoal.objects.filter(user=user).first()
    goal_value = goal.daily_step_goal if goal else None

    entry.is_complete = True
    entry.completed_at = timezone.now()
    entry.goal_snapshot = goal_value
    entry.diff = entry.steps - goal_value if goal_value is not None else 0
    entry.save()
    return entry
