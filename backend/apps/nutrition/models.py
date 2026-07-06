from django.conf import settings
from django.db import models


class NutritionGoal(models.Model):
    """The user's current daily nutrition target. One editable row per user."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="nutrition_goal")
    daily_calories = models.PositiveIntegerField(default=2000)
    protein_g = models.PositiveIntegerField(default=150)
    carbs_g = models.PositiveIntegerField(default=200)
    fat_g = models.PositiveIntegerField(default=70)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user}'s nutrition goal"


class MealEntry(models.Model):
    class MealType(models.TextChoices):
        BREAKFAST = "breakfast", "Breakfast"
        LUNCH = "lunch", "Lunch"
        DINNER = "dinner", "Dinner"
        SNACK = "snack", "Snack"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meal_entries")
    date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=MealType.choices)
    description = models.CharField(max_length=255)
    calories = models.PositiveIntegerField(default=0)
    protein_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    carbs_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    fat_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "logged_at"]
        verbose_name_plural = "meal entries"

    def __str__(self):
        return f"{self.date} {self.meal_type}: {self.description}"


class NutritionDayLog(models.Model):
    """Snapshot created when the user marks a day's nutrition as complete."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="nutrition_day_logs")
    date = models.DateField()
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    goal_calories = models.PositiveIntegerField(null=True, blank=True)
    goal_protein_g = models.PositiveIntegerField(null=True, blank=True)
    goal_carbs_g = models.PositiveIntegerField(null=True, blank=True)
    goal_fat_g = models.PositiveIntegerField(null=True, blank=True)

    total_calories = models.PositiveIntegerField(default=0)
    total_protein_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    total_carbs_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    total_fat_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)

    calorie_diff = models.IntegerField(default=0, help_text="Positive = over goal, negative = under goal.")
    protein_diff_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    carbs_diff_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    fat_diff_g = models.DecimalField(max_digits=6, decimal_places=1, default=0)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["user", "date"], name="unique_nutrition_day_log_per_user"),
        ]

    def __str__(self):
        return f"Nutrition day log {self.date} ({'complete' if self.is_complete else 'open'})"
