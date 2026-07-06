from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import StepEntryViewSet, StepGoalViewSet, complete_day

router = DefaultRouter()
router.register("steps/goal", StepGoalViewSet, basename="step-goal")
router.register("steps/entries", StepEntryViewSet, basename="step-entry")

urlpatterns = router.urls + [
    path("steps/day/<str:date>/complete/", complete_day, name="steps-complete-day"),
]
