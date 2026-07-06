from datetime import date

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.nutrition.models import MealEntry, NutritionGoal
from apps.nutrition.services import complete_nutrition_day
from apps.sleep.models import SleepEntry
from apps.steps.models import StepEntry, StepGoal
from apps.steps.services import complete_steps_day
from apps.workouts.models import Exercise, SetLog, WorkoutSession

User = get_user_model()


class DailyExportTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw")
        self.client.force_authenticate(user=self.user)
        self.day = date(2026, 1, 1)
        self.day_str = "2026-01-01"

    def test_status_not_ready_when_nothing_logged(self):
        response = self.client.get(f"/api/daily/{self.day_str}/status/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["ready_for_export"])
        self.assertFalse(response.data["nutrition_complete"])
        self.assertFalse(response.data["steps_complete"])

    def test_export_blocked_until_both_day_completes_done(self):
        response = self.client.get(f"/api/daily/{self.day_str}/export/")
        self.assertEqual(response.status_code, 400)

        complete_nutrition_day(self.user, self.day)
        response = self.client.get(f"/api/daily/{self.day_str}/export/")
        self.assertEqual(response.status_code, 400)

        complete_steps_day(self.user, self.day)
        response = self.client.get(f"/api/daily/{self.day_str}/export/")
        self.assertEqual(response.status_code, 200)

    def test_export_content_once_ready(self):
        NutritionGoal.objects.create(user=self.user, daily_calories=2000, protein_g=150, carbs_g=200, fat_g=70)
        MealEntry.objects.create(
            user=self.user, date=self.day, meal_type="lunch", description="Chicken rice",
            calories=800, protein_g=60, carbs_g=90, fat_g=15,
        )
        complete_nutrition_day(self.user, self.day)

        StepGoal.objects.create(user=self.user, daily_step_goal=10000)
        StepEntry.objects.create(user=self.user, date=self.day, steps=12000)
        complete_steps_day(self.user, self.day)

        SleepEntry.objects.create(user=self.user, date=self.day, hours_slept=8)

        exercise = Exercise.objects.create(user=self.user, name="Squat")
        session = WorkoutSession.objects.create(user=self.user, date=self.day)
        SetLog.objects.create(session=session, exercise=exercise, set_number=1, reps=5, weight_kg=100)

        response = self.client.get(f"/api/daily/{self.day_str}/export/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv")
        content = response.content.decode()
        self.assertIn("Squat", content)
        self.assertIn("Chicken rice", content)
        self.assertIn("12000", content)
        self.assertIn("8", content)

    def test_rest_day_with_no_workout_does_not_block_export(self):
        complete_nutrition_day(self.user, self.day)
        complete_steps_day(self.user, self.day)
        response = self.client.get(f"/api/daily/{self.day_str}/export/")
        self.assertEqual(response.status_code, 200)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(f"/api/daily/{self.day_str}/status/")
        self.assertEqual(response.status_code, 401)
