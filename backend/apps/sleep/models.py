from django.conf import settings
from django.db import models


class SleepGoal(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sleep_goal")
    min_hours = models.DecimalField(max_digits=3, decimal_places=1, default=7)
    max_hours = models.DecimalField(max_digits=3, decimal_places=1, default=9)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user}'s sleep goal ({self.min_hours}-{self.max_hours}h)"


class SleepEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sleep_entries")
    date = models.DateField()
    hours_slept = models.DecimalField(max_digits=4, decimal_places=1)
    within_goal = models.BooleanField(default=False)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["user", "date"], name="unique_sleep_entry_per_user"),
        ]

    def __str__(self):
        return f"{self.date}: {self.hours_slept}h"

    def save(self, *args, **kwargs):
        goal = SleepGoal.objects.filter(user=self.user).first()
        min_hours = goal.min_hours if goal else 7
        max_hours = goal.max_hours if goal else 9
        self.within_goal = min_hours <= self.hours_slept <= max_hours
        super().save(*args, **kwargs)
