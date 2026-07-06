from rest_framework import serializers

from .models import Exercise, SetLog, Workout, WorkoutExercise, WorkoutSession


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = [
            "id", "name", "muscle_group", "equipment",
            "default_rest_seconds", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)

    class Meta:
        model = WorkoutExercise
        fields = [
            "id", "workout", "exercise", "exercise_name", "order",
            "target_sets", "target_reps_min", "target_reps_max", "rest_seconds",
        ]
        read_only_fields = ["id", "exercise_name"]

    def validate_exercise(self, exercise):
        request = self.context["request"]
        if exercise.user_id != request.user.id:
            raise serializers.ValidationError("Exercise does not belong to this user.")
        return exercise


class WorkoutSerializer(serializers.ModelSerializer):
    workout_exercises = WorkoutExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = Workout
        fields = ["id", "name", "description", "created_at", "workout_exercises"]
        read_only_fields = ["id", "created_at"]


class SetLogSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)
    estimated_one_rep_max = serializers.SerializerMethodField()

    class Meta:
        model = SetLog
        fields = [
            "id", "session", "exercise", "exercise_name", "set_number", "reps",
            "weight_kg", "is_warmup", "rpe", "rest_seconds_actual", "logged_at",
            "estimated_one_rep_max",
        ]
        read_only_fields = ["id", "logged_at", "exercise_name", "estimated_one_rep_max"]

    def get_estimated_one_rep_max(self, obj):
        return round(obj.estimated_one_rep_max(), 2)

    def validate_exercise(self, exercise):
        request = self.context["request"]
        if exercise.user_id != request.user.id:
            raise serializers.ValidationError("Exercise does not belong to this user.")
        return exercise


class WorkoutSessionSerializer(serializers.ModelSerializer):
    sets = SetLogSerializer(many=True, read_only=True)
    workout_name = serializers.CharField(source="workout.name", read_only=True, default=None)

    class Meta:
        model = WorkoutSession
        fields = [
            "id", "workout", "workout_name", "date", "started_at",
            "completed_at", "notes", "sets",
        ]
        read_only_fields = ["id", "workout_name", "sets"]

    def validate_workout(self, workout):
        if workout is None:
            return workout
        request = self.context["request"]
        if workout.user_id != request.user.id:
            raise serializers.ValidationError("Workout does not belong to this user.")
        return workout
