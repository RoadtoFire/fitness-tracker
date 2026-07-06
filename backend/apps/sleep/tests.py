from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import SleepEntry, SleepGoal

User = get_user_model()


class SleepEntryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw")

    def test_within_default_goal(self):
        entry = SleepEntry.objects.create(user=self.user, date=date(2026, 1, 1), hours_slept=8)
        self.assertTrue(entry.within_goal)

    def test_below_default_goal(self):
        entry = SleepEntry.objects.create(user=self.user, date=date(2026, 1, 1), hours_slept=5)
        self.assertFalse(entry.within_goal)

    def test_above_default_goal(self):
        entry = SleepEntry.objects.create(user=self.user, date=date(2026, 1, 1), hours_slept=10)
        self.assertFalse(entry.within_goal)

    def test_uses_custom_goal(self):
        SleepGoal.objects.create(user=self.user, min_hours=6, max_hours=7)
        entry = SleepEntry.objects.create(user=self.user, date=date(2026, 1, 1), hours_slept=6.5)
        self.assertTrue(entry.within_goal)
