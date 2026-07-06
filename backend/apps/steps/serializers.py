from rest_framework import serializers

from .models import StepEntry, StepGoal


class StepGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepGoal
        fields = ["id", "daily_step_goal", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class StepEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = StepEntry
        fields = ["id", "date", "steps", "is_complete", "completed_at", "goal_snapshot", "diff"]
        read_only_fields = ["id", "is_complete", "completed_at", "goal_snapshot", "diff"]
