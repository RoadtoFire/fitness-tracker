from django.contrib import admin

from .models import SleepEntry, SleepGoal


@admin.register(SleepGoal)
class SleepGoalAdmin(admin.ModelAdmin):
    list_display = ["user", "min_hours", "max_hours"]


@admin.register(SleepEntry)
class SleepEntryAdmin(admin.ModelAdmin):
    list_display = ["date", "user", "hours_slept", "within_goal"]
    list_filter = ["within_goal", "date"]
