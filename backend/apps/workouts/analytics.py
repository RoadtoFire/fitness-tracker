"""Pure-Python progress analytics for a single exercise across sessions.

No numpy dependency: this is a handful of small aggregations plus a
least-squares slope, which is cheap enough to write by hand.
"""

from .models import SetLog

# Minimum session-over-session slope (as a fraction of the mean e1RM) to call
# the trend "improving" or "declining" rather than a "plateau".
TREND_THRESHOLD = 0.005
TREND_WINDOW = 10  # only look at the most recent N sessions for the trend


def _linear_regression_slope(values):
    """Least-squares slope of `values` against their index (0, 1, 2, ...)."""
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values))
    denominator = sum((x - mean_x) ** 2 for x in xs)
    if denominator == 0:
        return 0.0
    return numerator / denominator


def compute_exercise_progress(user, exercise_id):
    """Per-session best e1RM / volume / max weight for one exercise, plus a trend."""
    sets = (
        SetLog.objects.filter(
            exercise_id=exercise_id,
            exercise__user=user,
            is_warmup=False,
        )
        .select_related("session")
        .order_by("session__date")
    )

    sessions = {}
    for s in sets:
        session_id = s.session_id
        entry = sessions.setdefault(
            session_id,
            {
                "session_id": session_id,
                "date": s.session.date,
                "best_e1rm": 0.0,
                "max_weight": 0.0,
                "total_volume": 0.0,
            },
        )
        e1rm = s.estimated_one_rep_max()
        volume = float(s.weight_kg) * s.reps
        entry["best_e1rm"] = max(entry["best_e1rm"], e1rm)
        entry["max_weight"] = max(entry["max_weight"], float(s.weight_kg))
        entry["total_volume"] += volume

    ordered = sorted(sessions.values(), key=lambda e: e["date"])
    for entry in ordered:
        entry["best_e1rm"] = round(entry["best_e1rm"], 2)
        entry["max_weight"] = round(entry["max_weight"], 2)
        entry["total_volume"] = round(entry["total_volume"], 2)

    recent = ordered[-TREND_WINDOW:]
    e1rm_series = [e["best_e1rm"] for e in recent]
    slope = _linear_regression_slope(e1rm_series)
    mean_e1rm = (sum(e1rm_series) / len(e1rm_series)) if e1rm_series else 0.0

    if len(e1rm_series) < 2 or mean_e1rm == 0:
        trend = "insufficient_data"
    else:
        relative_slope = slope / mean_e1rm
        if relative_slope > TREND_THRESHOLD:
            trend = "improving"
        elif relative_slope < -TREND_THRESHOLD:
            trend = "declining"
        else:
            trend = "plateau"

    return {
        "exercise_id": exercise_id,
        "sessions": ordered,
        "trend": trend,
        "trend_window_sessions": len(recent),
    }
