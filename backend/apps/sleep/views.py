from rest_framework import viewsets

from .models import SleepEntry, SleepGoal
from .serializers import SleepEntrySerializer, SleepGoalSerializer


class SleepGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SleepGoalSerializer

    def get_queryset(self):
        return SleepGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        SleepGoal.objects.filter(user=self.request.user).delete()
        serializer.save(user=self.request.user)


class SleepEntryViewSet(viewsets.ModelViewSet):
    serializer_class = SleepEntrySerializer
    filterset_fields = ["date"]

    def get_queryset(self):
        return SleepEntry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
