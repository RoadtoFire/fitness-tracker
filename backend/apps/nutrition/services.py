from django.utils import timezone

from .models import MealEntry, NutritionDayLog, NutritionGoal


def complete_nutrition_day(user, date):
    """Aggregate a date's meals against the current goal and snapshot the result.

    Goal values are copied onto the day log at completion time so later edits
    to NutritionGoal don't retroactively change the meaning of past days.
    """
    meals = MealEntry.objects.filter(user=user, date=date)
    totals = {
        "calories": sum(m.calories for m in meals),
        "protein_g": sum(m.protein_g for m in meals),
        "carbs_g": sum(m.carbs_g for m in meals),
        "fat_g": sum(m.fat_g for m in meals),
    }

    goal = NutritionGoal.objects.filter(user=user).first()

    day_log, _ = NutritionDayLog.objects.update_or_create(
        user=user,
        date=date,
        defaults={
            "is_complete": True,
            "completed_at": timezone.now(),
            "goal_calories": goal.daily_calories if goal else None,
            "goal_protein_g": goal.protein_g if goal else None,
            "goal_carbs_g": goal.carbs_g if goal else None,
            "goal_fat_g": goal.fat_g if goal else None,
            "total_calories": totals["calories"],
            "total_protein_g": totals["protein_g"],
            "total_carbs_g": totals["carbs_g"],
            "total_fat_g": totals["fat_g"],
            "calorie_diff": totals["calories"] - goal.daily_calories if goal else 0,
            "protein_diff_g": totals["protein_g"] - goal.protein_g if goal else 0,
            "carbs_diff_g": totals["carbs_g"] - goal.carbs_g if goal else 0,
            "fat_diff_g": totals["fat_g"] - goal.fat_g if goal else 0,
        },
    )
    return day_log
