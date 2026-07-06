from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .analytics import compute_exercise_progress
from .models import Exercise, SetLog, Workout, WorkoutExercise, WorkoutSession
from .serializers import (
    ExerciseSerializer,
    SetLogSerializer,
    WorkoutExerciseSerializer,
    WorkoutSerializer,
    WorkoutSessionSerializer,
)


class ExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseSerializer
    filterset_fields = ["muscle_group"]

    def get_queryset(self):
        return Exercise.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        exercise = self.get_object()
        sets = (
            SetLog.objects.filter(exercise=exercise)
            .select_related("session")
            .order_by("-session__date", "-set_number")
        )
        return Response(SetLogSerializer(sets, many=True).data)

    @action(detail=True, methods=["get"], url_path="progress")
    def progress(self, request, pk=None):
        exercise = self.get_object()
        return Response(compute_exercise_progress(request.user, exercise.id))


class WorkoutViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSerializer

    def get_queryset(self):
        return Workout.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="exercises")
    def exercises(self, request, pk=None):
        workout = self.get_object()
        if request.method == "POST":
            serializer = WorkoutExerciseSerializer(
                data={**request.data, "workout": workout.id}, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=201)

        qs = workout.workout_exercises.all()
        return Response(WorkoutExerciseSerializer(qs, many=True).data)


class WorkoutExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutExerciseSerializer
    filterset_fields = ["workout"]

    def get_queryset(self):
        return WorkoutExercise.objects.filter(workout__user=self.request.user)


class WorkoutSessionViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSessionSerializer
    filterset_fields = ["date", "workout"]

    def get_queryset(self):
        return WorkoutSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="sets")
    def sets(self, request, pk=None):
        session = self.get_object()
        if request.method == "POST":
            serializer = SetLogSerializer(
                data={**request.data, "session": session.id}, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=201)

        qs = session.sets.all()
        return Response(SetLogSerializer(qs, many=True).data)


class SetLogViewSet(viewsets.ModelViewSet):
    serializer_class = SetLogSerializer
    filterset_fields = ["session", "exercise"]

    def get_queryset(self):
        return SetLog.objects.filter(session__user=self.request.user)
