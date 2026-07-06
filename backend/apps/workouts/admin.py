from django.contrib import admin

from .models import Exercise, SetLog, Workout, WorkoutExercise, WorkoutSession


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "muscle_group", "default_rest_seconds"]
    list_filter = ["muscle_group"]
    search_fields = ["name"]


class WorkoutExerciseInline(admin.TabularInline):
    model = WorkoutExercise
    extra = 1


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "created_at"]
    inlines = [WorkoutExerciseInline]


class SetLogInline(admin.TabularInline):
    model = SetLog
    extra = 0


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ["date", "user", "workout", "completed_at"]
    list_filter = ["date"]
    inlines = [SetLogInline]


@admin.register(SetLog)
class SetLogAdmin(admin.ModelAdmin):
    list_display = ["session", "exercise", "set_number", "reps", "weight_kg"]
