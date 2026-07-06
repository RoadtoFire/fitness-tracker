import { renderShell } from "../components/navBar.js";
import { showToast } from "../components/toast.js";
import { apiFetch, apiList } from "../api.js";
import { escapeHtml } from "../utils.js";

function exerciseRow(ex) {
  return `
    <div class="flex items-center justify-between bg-surface-2 rounded-xl px-4 py-3">
      <div>
        <p class="font-medium">${escapeHtml(ex.name)}</p>
        <p class="text-xs text-muted">
          ${escapeHtml(ex.muscle_group || "—")} · rest ${ex.default_rest_seconds}s
        </p>
      </div>
      <button data-id="${ex.id}" class="delete-exercise text-danger text-sm">Remove</button>
    </div>`;
}

function body(exercises) {
  return `
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Exercises</h1>
      <a href="#/workouts" class="text-sm text-muted underline">Back</a>
    </div>

    <form id="exercise-form" class="bg-surface border border-border rounded-2xl p-4 space-y-3 mb-6">
      <p class="font-semibold">Add exercise</p>
      <input name="name" placeholder="Name (e.g. Bench Press)" required
        class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
      <div class="grid grid-cols-2 gap-3">
        <input name="muscle_group" placeholder="Muscle group"
          class="bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
        <input name="default_rest_seconds" type="number" min="0" placeholder="Rest (s)" value="90"
          class="bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
      </div>
      <button type="submit" class="w-full bg-accent text-bg font-semibold rounded-xl px-4 py-2 active:opacity-80">
        Add
      </button>
    </form>

    <div class="space-y-2">
      ${
        exercises.length
          ? exercises.map(exerciseRow).join("")
          : `<p class="text-muted text-center py-6">No exercises yet — add your first above.</p>`
      }
    </div>
  `;
}

export async function renderExercises() {
  renderShell("/workouts", `<p class="text-muted">Loading…</p>`);
  let exercises;
  try {
    exercises = await apiList("/api/exercises/");
  } catch (err) {
    showToast(err.message);
    return;
  }
  draw(exercises);
}

function draw(exercises) {
  renderShell("/workouts", body(exercises));

  document.getElementById("exercise-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/api/exercises/", {
        method: "POST",
        body: {
          name: form.get("name"),
          muscle_group: form.get("muscle_group") || "",
          default_rest_seconds: Number(form.get("default_rest_seconds")) || 90,
        },
      });
      renderExercises();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.querySelectorAll(".delete-exercise").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await apiFetch(`/api/exercises/${btn.dataset.id}/`, { method: "DELETE" });
        renderExercises();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}
