from django.conf import settings
from django.db import models


class Exercise(models.Model):
    """A single movement in the exercise library (e.g. 'Barbell Bench Press')."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="exercises")
    name = models.CharField(max_length=150)
    muscle_group = models.CharField(max_length=100, blank=True)
    equipment = models.CharField(max_length=100, blank=True)
    default_rest_seconds = models.PositiveIntegerField(default=90)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="unique_exercise_name_per_user"),
        ]

    def __str__(self):
        return self.name


class Workout(models.Model):
    """A reusable workout template, e.g. 'Push Day'."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workouts")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="unique_workout_name_per_user"),
        ]

    def __str__(self):
        return self.name


class WorkoutExercise(models.Model):
    """An exercise's planned slot within a workout template (order, targets)."""

    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="workout_exercises")
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="workout_exercises")
    order = models.PositiveIntegerField(default=0)
    target_sets = models.PositiveIntegerField(default=3)
    target_reps_min = models.PositiveIntegerField(default=8)
    target_reps_max = models.PositiveIntegerField(default=12)
    rest_seconds = models.PositiveIntegerField(
        null=True, blank=True, help_text="Overrides the exercise's default rest time for this workout."
    )

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["workout", "exercise"], name="unique_exercise_per_workout"),
        ]

    def __str__(self):
        return f"{self.workout.name} - {self.exercise.name}"

    def effective_rest_seconds(self):
        return self.rest_seconds or self.exercise.default_rest_seconds


class WorkoutSession(models.Model):
    """A single instance of actually performing a workout on a given date."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workout_sessions")
    workout = models.ForeignKey(
        Workout, on_delete=models.SET_NULL, null=True, blank=True, related_name="sessions"
    )
    date = models.DateField()
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-started_at"]

    def __str__(self):
        label = self.workout.name if self.workout else "Ad-hoc session"
        return f"{label} on {self.date}"


class SetLog(models.Model):
    """A single logged set: exercise, set number, reps, and weight."""

    session = models.ForeignKey(WorkoutSession, on_delete=models.CASCADE, related_name="sets")
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="set_logs")
    set_number = models.PositiveIntegerField()
    reps = models.PositiveIntegerField()
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_warmup = models.BooleanField(default=False)
    rpe = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    rest_seconds_actual = models.PositiveIntegerField(null=True, blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["session", "exercise", "set_number"]

    def __str__(self):
        return f"{self.exercise.name} set {self.set_number}: {self.reps}x{self.weight_kg}kg"

    def estimated_one_rep_max(self):
        """Epley formula. Returns weight_kg as-is for single-rep sets."""
        weight = float(self.weight_kg)
        if self.reps <= 1:
            return weight
        return weight * (1 + self.reps / 30)
