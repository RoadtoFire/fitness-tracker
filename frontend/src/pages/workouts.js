import { renderShell } from "../components/navBar.js";
import { showToast } from "../components/toast.js";
import { apiFetch, apiList } from "../api.js";
import { navigate } from "../router.js";
import { escapeHtml, todayIso } from "../utils.js";

function workoutExerciseRow(we) {
  return `
    <div class="flex items-center justify-between text-sm py-1.5">
      <span>${escapeHtml(we.exercise_name)} — ${we.target_sets}×${we.target_reps_min}-${we.target_reps_max}</span>
      <button data-id="${we.id}" class="remove-we text-danger text-xs">Remove</button>
    </div>`;
}

function exerciseOptions(exercises) {
  return exercises.map((ex) => `<option value="${ex.id}">${escapeHtml(ex.name)}</option>`).join("");
}

function workoutCard(workout, exercises) {
  return `
    <div class="bg-surface border border-border rounded-2xl p-4 mb-4" data-workout-card="${workout.id}">
      <div class="flex items-center justify-between mb-2">
        <p class="font-semibold">${escapeHtml(workout.name)}</p>
        <button data-id="${workout.id}" class="delete-workout text-danger text-sm">Delete</button>
      </div>
      ${workout.description ? `<p class="text-sm text-muted mb-2">${escapeHtml(workout.description)}</p>` : ""}

      <div class="mb-3">
        ${
          workout.workout_exercises.length
            ? workout.workout_exercises.map(workoutExerciseRow).join("")
            : `<p class="text-sm text-muted">No exercises added yet.</p>`
        }
      </div>

      ${
        exercises.length
          ? `<form class="add-we-form flex gap-2 mb-3" data-workout-id="${workout.id}">
               <select name="exercise" class="flex-1 bg-surface-2 border border-border rounded-xl px-2 py-2 text-sm">
                 ${exerciseOptions(exercises)}
               </select>
               <input name="target_sets" type="number" min="1" value="3" class="w-14 bg-surface-2 border border-border rounded-xl px-2 py-2 text-sm" />
               <button type="submit" class="bg-surface-2 border border-border rounded-xl px-3 text-sm">Add</button>
             </form>`
          : `<p class="text-xs text-muted mb-3">Add an exercise in the library first.</p>`
      }

      <button data-id="${workout.id}" class="start-workout w-full bg-accent text-bg font-semibold rounded-xl px-4 py-2 active:opacity-80">
        Start
      </button>
    </div>`;
}

function sessionRow(session) {
  const setCount = session.sets?.length ?? 0;
  return `
    <div class="flex items-stretch bg-surface-2 rounded-xl">
      <a href="#/workouts/sessions/${session.id}" class="flex-1 flex items-center justify-between px-4 py-3">
        <span>${session.date} — ${escapeHtml(session.workout_name || "Ad-hoc")}</span>
        <span class="text-xs text-muted">${setCount} sets</span>
      </a>
      <button data-id="${session.id}" class="discard-session text-danger text-xs px-3">Discard</button>
    </div>`;
}

function body(workouts, sessions, exercises) {
  return `
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Workouts</h1>
      <a href="#/workouts/exercises" class="text-sm text-muted underline">Exercise library</a>
    </div>

    <form id="new-workout-form" class="bg-surface border border-border rounded-2xl p-4 space-y-3 mb-6">
      <p class="font-semibold">New workout template</p>
      <input name="name" placeholder="e.g. Push Day" required
        class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
      <input name="description" placeholder="Description (optional)"
        class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
      <button type="submit" class="w-full bg-accent text-bg font-semibold rounded-xl px-4 py-2 active:opacity-80">
        Create
      </button>
    </form>

    <div class="mb-6">
      ${
        workouts.length
          ? workouts.map((w) => workoutCard(w, exercises)).join("")
          : `<p class="text-muted text-center py-4">No workout templates yet.</p>`
      }
    </div>

    <p class="font-semibold mb-3">Recent sessions</p>
    <div class="space-y-2">
      ${
        sessions.length
          ? sessions.map(sessionRow).join("")
          : `<p class="text-muted text-center py-6">No sessions logged yet.</p>`
      }
    </div>
  `;
}

export async function renderWorkouts() {
  renderShell("/workouts", `<p class="text-muted">Loading…</p>`);
  let workouts, sessions, exercises;
  try {
    [workouts, sessions, exercises] = await Promise.all([
      apiList("/api/workouts/"),
      apiList("/api/sessions/"),
      apiList("/api/exercises/"),
    ]);
  } catch (err) {
    showToast(err.message);
    return;
  }
  draw(workouts, sessions, exercises);
}

function draw(workouts, sessions, exercises) {
  renderShell("/workouts", body(workouts, sessions, exercises));

  document.getElementById("new-workout-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/api/workouts/", {
        method: "POST",
        body: { name: form.get("name"), description: form.get("description") || "" },
      });
      renderWorkouts();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.querySelectorAll(".start-workout").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const session = await apiFetch("/api/sessions/", {
          method: "POST",
          body: { date: todayIso(), workout: Number(btn.dataset.id) },
        });
        navigate(`/workouts/sessions/${session.id}`);
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  document.querySelectorAll(".discard-session").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!confirm("Discard this workout session? All logged sets will be deleted permanently.")) return;
      try {
        await apiFetch(`/api/sessions/${btn.dataset.id}/`, { method: "DELETE" });
        renderWorkouts();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  document.querySelectorAll(".delete-workout").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await apiFetch(`/api/workouts/${btn.dataset.id}/`, { method: "DELETE" });
        renderWorkouts();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  document.querySelectorAll(".remove-we").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await apiFetch(`/api/workout-exercises/${btn.dataset.id}/`, { method: "DELETE" });
        renderWorkouts();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  document.querySelectorAll(".add-we-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      try {
        await apiFetch(`/api/workouts/${form.dataset.workoutId}/exercises/`, {
          method: "POST",
          body: {
            exercise: Number(data.get("exercise")),
            target_sets: Number(data.get("target_sets")) || 3,
          },
        });
        renderWorkouts();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}
