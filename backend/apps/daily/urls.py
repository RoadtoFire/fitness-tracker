from django.urls import path

from .views import day_export, day_status

urlpatterns = [
    path("daily/<str:date>/status/", day_status, name="daily-status"),
    path("daily/<str:date>/export/", day_export, name="daily-export"),
]
