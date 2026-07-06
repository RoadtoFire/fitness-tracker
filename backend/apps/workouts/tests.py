from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase

from .analytics import compute_exercise_progress
from .models import Exercise, SetLog, WorkoutSession

User = get_user_model()


class SetLogTests(TestCase):
    def test_estimated_one_rep_max_epley(self):
        s = SetLog(reps=10, weight_kg=100)
        # Epley: 100 * (1 + 10/30) = 133.33...
        self.assertAlmostEqual(s.estimated_one_rep_max(), 133.33, places=1)

    def test_estimated_one_rep_max_single_rep_equals_weight(self):
        s = SetLog(reps=1, weight_kg=150)
        self.assertEqual(s.estimated_one_rep_max(), 150.0)


class ExerciseProgressTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw")
        self.exercise = Exercise.objects.create(user=self.user, name="Bench Press")

    def _log_session(self, day_offset, weight, reps):
        session = WorkoutSession.objects.create(
            user=self.user, date=date(2026, 1, 1) + timedelta(days=day_offset)
        )
        SetLog.objects.create(
            session=session, exercise=self.exercise, set_number=1, reps=reps, weight_kg=weight
        )
        return session

    def test_improving_trend(self):
        for i, weight in enumerate([60, 65, 70, 75, 80]):
            self._log_session(i * 7, weight, 8)

        result = compute_exercise_progress(self.user, self.exercise.id)
        self.assertEqual(result["trend"], "improving")
        self.assertEqual(len(result["sessions"]), 5)

    def test_plateau_trend(self):
        for i in range(5):
            self._log_session(i * 7, 70, 8)

        result = compute_exercise_progress(self.user, self.exercise.id)
        self.assertEqual(result["trend"], "plateau")

    def test_declining_trend(self):
        for i, weight in enumerate([80, 75, 70, 65, 60]):
            self._log_session(i * 7, weight, 8)

        result = compute_exercise_progress(self.user, self.exercise.id)
        self.assertEqual(result["trend"], "declining")

    def test_insufficient_data(self):
        self._log_session(0, 70, 8)
        result = compute_exercise_progress(self.user, self.exercise.id)
        self.assertEqual(result["trend"], "insufficient_data")

    def test_warmup_sets_excluded(self):
        session = WorkoutSession.objects.create(user=self.user, date=date(2026, 1, 1))
        SetLog.objects.create(
            session=session, exercise=self.exercise, set_number=1, reps=15, weight_kg=20, is_warmup=True
        )
        SetLog.objects.create(
            session=session, exercise=self.exercise, set_number=2, reps=8, weight_kg=70
        )
        result = compute_exercise_progress(self.user, self.exercise.id)
        self.assertEqual(len(result["sessions"]), 1)
        self.assertEqual(result["sessions"][0]["max_weight"], 70)
