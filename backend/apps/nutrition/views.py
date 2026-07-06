from datetime import date as date_cls

from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import MealEntry, NutritionDayLog, NutritionGoal
from .serializers import (
    MealEntrySerializer,
    NutritionDayLogSerializer,
    NutritionGoalSerializer,
)
from .services import complete_nutrition_day


class NutritionGoalViewSet(viewsets.ModelViewSet):
    """Single-row-per-user resource: list/retrieve both return "my" goal."""

    serializer_class = NutritionGoalSerializer

    def get_queryset(self):
        return NutritionGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # One goal row per user: creating again just updates the existing one.
        NutritionGoal.objects.filter(user=self.request.user).delete()
        serializer.save(user=self.request.user)


class MealEntryViewSet(viewsets.ModelViewSet):
    serializer_class = MealEntrySerializer
    filterset_fields = ["date", "meal_type"]

    def get_queryset(self):
        return MealEntry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NutritionDayLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NutritionDayLogSerializer
    filterset_fields = ["date", "is_complete"]

    def get_queryset(self):
        return NutritionDayLog.objects.filter(user=self.request.user)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_day(request, date):
    try:
        parsed_date = date_cls.fromisoformat(date)
    except ValueError:
        return Response({"detail": "date must be in YYYY-MM-DD format."}, status=400)

    day_log = complete_nutrition_day(request.user, parsed_date)
    return Response(NutritionDayLogSerializer(day_log).data, status=200)
