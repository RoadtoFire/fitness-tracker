from rest_framework import serializers

from .models import SleepEntry, SleepGoal


class SleepGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SleepGoal
        fields = ["id", "min_hours", "max_hours", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class SleepEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = SleepEntry
        fields = ["id", "date", "hours_slept", "within_goal", "logged_at"]
        read_only_fields = ["id", "within_goal", "logged_at"]
