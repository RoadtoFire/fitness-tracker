from rest_framework.routers import DefaultRouter

from .views import (
    ExerciseViewSet,
    SetLogViewSet,
    WorkoutExerciseViewSet,
    WorkoutSessionViewSet,
    WorkoutViewSet,
)

router = DefaultRouter()
router.register("exercises", ExerciseViewSet, basename="exercise")
router.register("workouts", WorkoutViewSet, basename="workout")
router.register("workout-exercises", WorkoutExerciseViewSet, basename="workout-exercise")
router.register("sessions", WorkoutSessionViewSet, basename="workout-session")
router.register("sets", SetLogViewSet, basename="set-log")

urlpatterns = router.urls
