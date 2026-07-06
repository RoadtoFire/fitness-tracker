from django.contrib import admin

from .models import StepEntry, StepGoal


@admin.register(StepGoal)
class StepGoalAdmin(admin.ModelAdmin):
    list_display = ["user", "daily_step_goal"]


@admin.register(StepEntry)
class StepEntryAdmin(admin.ModelAdmin):
    list_display = ["date", "user", "steps", "is_complete", "diff"]
    list_filter = ["is_complete", "date"]
