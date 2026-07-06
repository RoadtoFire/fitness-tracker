from datetime import date as date_cls

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services import build_day_csv, get_day_status


def _parse_date(date):
    try:
        return date_cls.fromisoformat(date)
    except ValueError:
        return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def day_status(request, date):
    parsed_date = _parse_date(date)
    if parsed_date is None:
        return Response({"detail": "date must be in YYYY-MM-DD format."}, status=400)
    return Response(get_day_status(request.user, parsed_date))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def day_export(request, date):
    parsed_date = _parse_date(date)
    if parsed_date is None:
        return Response({"detail": "date must be in YYYY-MM-DD format."}, status=400)

    status = get_day_status(request.user, parsed_date)
    if not status["ready_for_export"]:
        return Response(
            {
                "detail": "Day is not ready for export yet. Mark nutrition and steps complete first.",
                **status,
            },
            status=400,
        )

    csv_content = build_day_csv(request.user, parsed_date)
    response = HttpResponse(csv_content, content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="fitness-{date}.csv"'
    return response
