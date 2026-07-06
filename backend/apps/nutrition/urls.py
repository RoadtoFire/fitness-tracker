from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MealEntryViewSet,
    NutritionDayLogViewSet,
    NutritionGoalViewSet,
    complete_day,
)

router = DefaultRouter()
router.register("nutrition/goal", NutritionGoalViewSet, basename="nutrition-goal")
router.register("nutrition/meals", MealEntryViewSet, basename="meal-entry")
router.register("nutrition/day-logs", NutritionDayLogViewSet, basename="nutrition-day-log")

urlpatterns = router.urls + [
    path("nutrition/day/<str:date>/complete/", complete_day, name="nutrition-complete-day"),
]
