from datetime import date as date_cls

from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import StepEntry, StepGoal
from .serializers import StepEntrySerializer, StepGoalSerializer
from .services import complete_steps_day


class StepGoalViewSet(viewsets.ModelViewSet):
    serializer_class = StepGoalSerializer

    def get_queryset(self):
        return StepGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        StepGoal.objects.filter(user=self.request.user).delete()
        serializer.save(user=self.request.user)


class StepEntryViewSet(viewsets.ModelViewSet):
    serializer_class = StepEntrySerializer
    filterset_fields = ["date", "is_complete"]

    def get_queryset(self):
        qs = StepEntry.objects.filter(user=self.request.user)
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_day(request, date):
    try:
        parsed_date = date_cls.fromisoformat(date)
    except ValueError:
        return Response({"detail": "date must be in YYYY-MM-DD format."}, status=400)

    entry = complete_steps_day(request.user, parsed_date)
    return Response(StepEntrySerializer(entry).data, status=200)
