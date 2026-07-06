from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import StepEntry, StepGoal
from .services import complete_steps_day

User = get_user_model()


class CompleteStepsDayTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw")
        self.day = date(2026, 1, 1)
        StepGoal.objects.create(user=self.user, daily_step_goal=10000)

    def test_overshot_goal(self):
        StepEntry.objects.create(user=self.user, date=self.day, steps=12000)
        entry = complete_steps_day(self.user, self.day)
        self.assertTrue(entry.is_complete)
        self.assertEqual(entry.goal_snapshot, 10000)
        self.assertEqual(entry.diff, 2000)

    def test_undershot_goal(self):
        StepEntry.objects.create(user=self.user, date=self.day, steps=4000)
        entry = complete_steps_day(self.user, self.day)
        self.assertEqual(entry.diff, -6000)

    def test_completes_even_without_prior_entry(self):
        entry = complete_steps_day(self.user, self.day)
        self.assertTrue(entry.is_complete)
        self.assertEqual(entry.steps, 0)
        self.assertEqual(entry.diff, -10000)

    def test_goal_snapshot_survives_later_goal_edits(self):
        StepEntry.objects.create(user=self.user, date=self.day, steps=10000)
        entry = complete_steps_day(self.user, self.day)
        self.assertEqual(entry.diff, 0)

        goal = StepGoal.objects.get(user=self.user)
        goal.daily_step_goal = 15000
        goal.save()

        entry.refresh_from_db()
        self.assertEqual(entry.goal_snapshot, 10000)
        self.assertEqual(entry.diff, 0)
