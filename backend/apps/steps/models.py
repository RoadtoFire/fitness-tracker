from django.conf import settings
from django.db import models


class StepGoal(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="step_goal")
    daily_step_goal = models.PositiveIntegerField(default=10000)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user}'s step goal"


class StepEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="step_entries")
    date = models.DateField()
    steps = models.PositiveIntegerField(default=0)
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    goal_snapshot = models.PositiveIntegerField(null=True, blank=True)
    diff = models.IntegerField(default=0, help_text="Positive = over goal, negative = under goal.")

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["user", "date"], name="unique_step_entry_per_user"),
        ]

    def __str__(self):
        return f"{self.date}: {self.steps} steps"
