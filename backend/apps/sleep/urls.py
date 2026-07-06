from rest_framework.routers import DefaultRouter

from .views import SleepEntryViewSet, SleepGoalViewSet

router = DefaultRouter()
router.register("sleep/goal", SleepGoalViewSet, basename="sleep-goal")
router.register("sleep/entries", SleepEntryViewSet, basename="sleep-entry")

urlpatterns = router.urls
