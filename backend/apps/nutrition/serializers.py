from rest_framework import serializers

from .models import MealEntry, NutritionDayLog, NutritionGoal


class NutritionGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionGoal
        fields = ["id", "daily_calories", "protein_g", "carbs_g", "fat_g", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class MealEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MealEntry
        fields = [
            "id", "date", "meal_type", "description", "calories",
            "protein_g", "carbs_g", "fat_g", "logged_at",
        ]
        read_only_fields = ["id", "logged_at"]


class NutritionDayLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionDayLog
        fields = [
            "id", "date", "is_complete", "completed_at",
            "goal_calories", "goal_protein_g", "goal_carbs_g", "goal_fat_g",
            "total_calories", "total_protein_g", "total_carbs_g", "total_fat_g",
            "calorie_diff", "protein_diff_g", "carbs_diff_g", "fat_diff_g",
        ]
        read_only_fields = fields
