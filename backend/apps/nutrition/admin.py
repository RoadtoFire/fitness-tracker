from django.contrib import admin

from .models import MealEntry, NutritionDayLog, NutritionGoal


@admin.register(NutritionGoal)
class NutritionGoalAdmin(admin.ModelAdmin):
    list_display = ["user", "daily_calories", "protein_g", "carbs_g", "fat_g"]


@admin.register(MealEntry)
class MealEntryAdmin(admin.ModelAdmin):
    list_display = ["date", "user", "meal_type", "description", "calories"]
    list_filter = ["meal_type", "date"]


@admin.register(NutritionDayLog)
class NutritionDayLogAdmin(admin.ModelAdmin):
    list_display = ["date", "user", "is_complete", "total_calories", "calorie_diff"]
    list_filter = ["is_complete", "date"]
