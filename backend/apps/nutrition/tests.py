from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import MealEntry, NutritionDayLog, NutritionGoal
from .services import complete_nutrition_day

User = get_user_model()


class CompleteNutritionDayTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw")
        self.day = date(2026, 1, 1)
        NutritionGoal.objects.create(user=self.user, daily_calories=2000, protein_g=150, carbs_g=200, fat_g=70)

    def test_aggregates_meals_and_computes_diff(self):
        MealEntry.objects.create(
            user=self.user, date=self.day, meal_type="breakfast", description="Oats",
            calories=400, protein_g=20, carbs_g=60, fat_g=10,
        )
        MealEntry.objects.create(
            user=self.user, date=self.day, meal_type="lunch", description="Chicken rice",
            calories=800, protein_g=60, carbs_g=90, fat_g=15,
        )

        day_log = complete_nutrition_day(self.user, self.day)

        self.assertTrue(day_log.is_complete)
        self.assertEqual(day_log.total_calories, 1200)
        self.assertEqual(day_log.calorie_diff, 1200 - 2000)
        self.assertEqual(day_log.total_protein_g, 80)
        self.assertEqual(day_log.protein_diff_g, 80 - 150)

    def test_goal_snapshot_survives_later_goal_edits(self):
        MealEntry.objects.create(
            user=self.user, date=self.day, meal_type="dinner", description="Steak",
            calories=2000, protein_g=150, carbs_g=200, fat_g=70,
        )
        day_log = complete_nutrition_day(self.user, self.day)
        self.assertEqual(day_log.goal_calories, 2000)
        self.assertEqual(day_log.calorie_diff, 0)

        goal = NutritionGoal.objects.get(user=self.user)
        goal.daily_calories = 2500
        goal.save()

        day_log.refresh_from_db()
        self.assertEqual(day_log.goal_calories, 2000)
        self.assertEqual(day_log.calorie_diff, 0)

    def test_completing_twice_updates_same_row(self):
        MealEntry.objects.create(
            user=self.user, date=self.day, meal_type="snack", description="Apple",
            calories=100, protein_g=0, carbs_g=25, fat_g=0,
        )
        complete_nutrition_day(self.user, self.day)
        MealEntry.objects.create(
            user=self.user, date=self.day, meal_type="snack", description="Banana",
            calories=100, protein_g=1, carbs_g=27, fat_g=0,
        )
        complete_nutrition_day(self.user, self.day)

        self.assertEqual(NutritionDayLog.objects.filter(user=self.user, date=self.day).count(), 1)
        day_log = NutritionDayLog.objects.get(user=self.user, date=self.day)
        self.assertEqual(day_log.total_calories, 200)

    def test_no_goal_set_defaults_diff_to_zero(self):
        user2 = User.objects.create_user(username="bob", password="pw")
        MealEntry.objects.create(
            user=user2, date=self.day, meal_type="lunch", description="Salad",
            calories=500, protein_g=20, carbs_g=40, fat_g=15,
        )
        day_log = complete_nutrition_day(user2, self.day)
        self.assertIsNone(day_log.goal_calories)
        self.assertEqual(day_log.calorie_diff, 0)
