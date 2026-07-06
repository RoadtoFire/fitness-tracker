import { renderShell } from "../components/navBar.js";
import { showToast } from "../components/toast.js";
import { apiFetch, apiList } from "../api.js";
import { currentPath, navigate } from "../router.js";
import { escapeHtml } from "../utils.js";
import {
  acquireWakeLock,
  releaseWakeLock,
  ensureNotificationPermission,
  mountRestTimer,
} from "../components/restTimer.js";

let cancelTimer = null;

function cancelActiveTimer() {
  cancelTimer?.();
  cancelTimer = null;
}

function setRow(set) {
  const weight = parseFloat(set.weight_kg);
  return `
    <div class="flex items-center justify-between text-sm py-1">
      <span>Set ${set.set_number}: ${set.reps} × ${weight}kg
        <span class="text-muted">(e1RM ${set.estimated_one_rep_max})</span>
      </span>
      <button data-set-id="${set.id}" class="delete-set text-danger text-xs">✕</button>
    </div>`;
}

function slotCard(slot, sets) {
  const slotSets = sets.filter((s) => s.exercise === slot.exerciseId).sort((a, b) => a.set_number - b.set_number);
  return `
    <div class="bg-surface border border-border rounded-2xl p-4 mb-4" data-exercise-card="${slot.exerciseId}">
      <div class="flex items-baseline justify-between mb-2">
        <p class="font-semibold">${escapeHtml(slot.exerciseName)}</p>
        ${slot.target ? `<p class="text-xs text-muted">Target ${slot.target}</p>` : ""}
      </div>
      <div class="sets-list space-y-1 mb-3" data-sets-list="${slot.exerciseId}">
        ${slotSets.length ? slotSets.map(setRow).join("") : `<p class="text-xs text-muted">No sets logged yet.</p>`}
      </div>
      <form class="log-set-form flex gap-2" data-exercise="${slot.exerciseId}" data-rest="${slot.rest}"
        data-name="${escapeHtml(slot.exerciseName)}">
        <input name="reps" type="number" min="1" placeholder="Reps" required
          class="w-1/3 bg-surface-2 border border-border rounded-xl px-2 py-2 text-sm placeholder-muted" />
        <input name="weight_kg" type="number" min="0" step="0.5" placeholder="kg" required
          class="w-1/3 bg-surface-2 border border-border rounded-xl px-2 py-2 text-sm placeholder-muted" />
        <button type="submit" class="flex-1 bg-accent text-bg font-semibold rounded-xl px-2 py-2 text-sm active:opacity-80">
          Log set
        </button>
      </form>
    </div>`;
}

function body(session, slots, sets) {
  return `
    <div class="flex items-center justify-between mb-1">
      <h1 class="text-2xl font-bold">${escapeHtml(session.workout_name || "Workout")}</h1>
      <a href="#/workouts" class="text-sm text-muted underline">Back</a>
    </div>
    <p class="text-muted mb-6">${session.date}</p>

    <div id="slots-container">
      ${
        slots.length
          ? slots.map((slot) => slotCard(slot, sets)).join("")
          : `<p class="text-muted text-center py-6">This session has no exercises.</p>`
      }
    </div>

    <div class="space-y-3">
      ${
        session.completed_at
          ? `<p class="text-center text-accent font-medium">Workout completed</p>`
          : `<button id="finish-session" class="w-full border border-border rounded-xl px-4 py-3 active:opacity-70">
               Finish workout
             </button>`
      }
      <button id="discard-session" class="w-full text-danger border border-border rounded-xl px-4 py-3 active:opacity-70">
        Discard session
      </button>
    </div>

    <div id="rest-timer-bar" class="fixed left-0 right-0 px-4 z-40" style="bottom: calc(4.5rem + env(safe-area-inset-bottom));"></div>
  `;
}

export async function renderWorkoutSession({ id }) {
  renderShell("/workouts", `<p class="text-muted">Loading…</p>`);

  let session, exercises, workout;
  try {
    [session, exercises] = await Promise.all([apiFetch(`/api/sessions/${id}/`), apiList("/api/exercises/")]);
    workout = session.workout ? await apiFetch(`/api/workouts/${session.workout}/`) : null;
  } catch (err) {
    showToast(err.message);
    return;
  }

  const exerciseMap = Object.fromEntries(exercises.map((ex) => [ex.id, ex]));
  const sets = session.sets;

  ensureNotificationPermission();
  acquireWakeLock();

  const onRouteChange = () => {
    if (!currentPath().startsWith(`/workouts/sessions/${id}`)) {
      releaseWakeLock();
      cancelActiveTimer();
      window.removeEventListener("hashchange", onRouteChange);
    }
  };
  window.addEventListener("hashchange", onRouteChange);

  function computeSlots() {
    if (!workout) return [];
    return workout.workout_exercises.map((we) => ({
      exerciseId: we.exercise,
      exerciseName: we.exercise_name,
      target: `${we.target_sets}×${we.target_reps_min}-${we.target_reps_max}`,
      rest: we.rest_seconds || exerciseMap[we.exercise]?.default_rest_seconds || 90,
    }));
  }

  function draw() {
    renderShell("/workouts", body(session, computeSlots(), sets));
    attachHandlers();
  }

  function refreshSlot(exerciseId) {
    const container = document.querySelector(`[data-sets-list="${exerciseId}"]`);
    if (!container) return;
    const slotSets = sets
      .filter((s) => s.exercise === exerciseId)
      .sort((a, b) => a.set_number - b.set_number);
    container.innerHTML = slotSets.length
      ? slotSets.map(setRow).join("")
      : `<p class="text-xs text-muted">No sets logged yet.</p>`;
    attachDeleteHandlers(container);
  }

  function attachDeleteHandlers(scope) {
    scope.querySelectorAll(".delete-set").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await apiFetch(`/api/sets/${btn.dataset.setId}/`, { method: "DELETE" });
          const idx = sets.findIndex((s) => String(s.id) === btn.dataset.setId);
          const exerciseId = sets[idx]?.exercise;
          if (idx >= 0) sets.splice(idx, 1);
          if (exerciseId !== undefined) refreshSlot(exerciseId);
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  function attachHandlers() {
    document.querySelectorAll(".log-set-form").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const exerciseId = Number(form.dataset.exercise);
        const restSeconds = Number(form.dataset.rest);
        const exerciseName = form.dataset.name;
        const data = new FormData(form);
        const existing = sets.filter((s) => s.exercise === exerciseId);
        try {
          const newSet = await apiFetch(`/api/sessions/${id}/sets/`, {
            method: "POST",
            body: {
              exercise: exerciseId,
              set_number: existing.length + 1,
              reps: Number(data.get("reps")),
              weight_kg: Number(data.get("weight_kg")),
            },
          });
          sets.push(newSet);
          refreshSlot(exerciseId);
          form.reset();

          cancelActiveTimer();
          const timerBar = document.getElementById("rest-timer-bar");
          if (timerBar) cancelTimer = mountRestTimer(timerBar, restSeconds, exerciseName);
        } catch (err) {
          showToast(err.message);
        }
      });
    });

    attachDeleteHandlers(document);

    document.getElementById("finish-session")?.addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        await apiFetch(`/api/sessions/${id}/`, {
          method: "PATCH",
          body: { completed_at: new Date().toISOString() },
        });
        cancelActiveTimer();
        releaseWakeLock();
        showToast("Workout finished.", "success");
        navigate("/workouts");
      } catch (err) {
        showToast(err.message);
        e.target.disabled = false;
      }
    });

    document.getElementById("discard-session").addEventListener("click", async (e) => {
      if (!confirm("Discard this workout session? All logged sets will be deleted permanently.")) return;
      e.target.disabled = true;
      try {
        await apiFetch(`/api/sessions/${id}/`, { method: "DELETE" });
        cancelActiveTimer();
        releaseWakeLock();
        window.removeEventListener("hashchange", onRouteChange);
        showToast("Session discarded.", "success");
        navigate("/workouts");
      } catch (err) {
        showToast(err.message);
        e.target.disabled = false;
      }
    });
  }

  draw();
}
