import csv
import io

from apps.nutrition.models import MealEntry, NutritionDayLog
from apps.sleep.models import SleepEntry
from apps.steps.models import StepEntry
from apps.workouts.models import SetLog, WorkoutSession


def get_day_status(user, date):
    nutrition_log = NutritionDayLog.objects.filter(user=user, date=date).first()
    step_entry = StepEntry.objects.filter(user=user, date=date).first()

    nutrition_complete = bool(nutrition_log and nutrition_log.is_complete)
    steps_complete = bool(step_entry and step_entry.is_complete)

    return {
        "date": date,
        "nutrition_complete": nutrition_complete,
        "steps_complete": steps_complete,
        "ready_for_export": nutrition_complete and steps_complete,
    }


def build_day_csv(user, date):
    """Build a CSV for the given date: one section per data type, then a summary.

    Sections are stacked with their own header row (a common pattern for
    human/LLM-readable exports mixing heterogeneous record shapes in one file).
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(["Fitness Tracker Daily Export", str(date)])

    writer.writerow([])
    writer.writerow(["WORKOUT SETS"])
    writer.writerow(["exercise", "set_number", "reps", "weight_kg", "is_warmup", "estimated_1rm"])
    sets = (
        SetLog.objects.filter(session__user=user, session__date=date)
        .select_related("exercise", "session")
        .order_by("session__id", "exercise__name", "set_number")
    )
    for s in sets:
        writer.writerow([
            s.exercise.name, s.set_number, s.reps, s.weight_kg,
            s.is_warmup, round(s.estimated_one_rep_max(), 2),
        ])

    writer.writerow([])
    writer.writerow(["MEALS"])
    writer.writerow(["meal_type", "description", "calories", "protein_g", "carbs_g", "fat_g"])
    meals = MealEntry.objects.filter(user=user, date=date).order_by("logged_at")
    for m in meals:
        writer.writerow([m.meal_type, m.description, m.calories, m.protein_g, m.carbs_g, m.fat_g])

    writer.writerow([])
    writer.writerow(["STEPS"])
    writer.writerow(["steps", "goal", "diff"])
    step_entry = StepEntry.objects.filter(user=user, date=date).first()
    if step_entry:
        writer.writerow([step_entry.steps, step_entry.goal_snapshot, step_entry.diff])

    writer.writerow([])
    writer.writerow(["SLEEP"])
    writer.writerow(["hours_slept", "within_goal"])
    sleep_entry = SleepEntry.objects.filter(user=user, date=date).first()
    if sleep_entry:
        writer.writerow([sleep_entry.hours_slept, sleep_entry.within_goal])

    writer.writerow([])
    writer.writerow(["NUTRITION SUMMARY"])
    writer.writerow([
        "total_calories", "goal_calories", "calorie_diff",
        "total_protein_g", "goal_protein_g", "protein_diff_g",
        "total_carbs_g", "goal_carbs_g", "carbs_diff_g",
        "total_fat_g", "goal_fat_g", "fat_diff_g",
    ])
    nutrition_log = NutritionDayLog.objects.filter(user=user, date=date).first()
    if nutrition_log:
        writer.writerow([
            nutrition_log.total_calories, nutrition_log.goal_calories, nutrition_log.calorie_diff,
            nutrition_log.total_protein_g, nutrition_log.goal_protein_g, nutrition_log.protein_diff_g,
            nutrition_log.total_carbs_g, nutrition_log.goal_carbs_g, nutrition_log.carbs_diff_g,
            nutrition_log.total_fat_g, nutrition_log.goal_fat_g, nutrition_log.fat_diff_g,
        ])

    return buffer.getvalue()
