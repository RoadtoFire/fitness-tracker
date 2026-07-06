import { renderShell } from "../components/navBar.js";
import { showToast } from "../components/toast.js";
import { apiFetch, apiList } from "../api.js";
import { todayIso, escapeHtml } from "../utils.js";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function mealRow(meal) {
  return `
    <div class="flex items-center justify-between bg-surface-2 rounded-xl px-4 py-3">
      <div>
        <p class="font-medium">${escapeHtml(meal.description)}</p>
        <p class="text-xs text-muted uppercase tracking-wide">${meal.meal_type} · ${meal.calories} kcal</p>
      </div>
      <button data-id="${meal.id}" class="delete-meal text-danger text-sm">Remove</button>
    </div>`;
}

function diffCls(diff) {
  return diff > 0 ? "text-warning" : "text-accent";
}

function summaryBlock(dayLog) {
  if (!dayLog) return "";
  const rows = [
    ["Calories", dayLog.total_calories, dayLog.goal_calories, dayLog.calorie_diff],
    ["Protein (g)", dayLog.total_protein_g, dayLog.goal_protein_g, dayLog.protein_diff_g],
    ["Carbs (g)", dayLog.total_carbs_g, dayLog.goal_carbs_g, dayLog.carbs_diff_g],
    ["Fat (g)", dayLog.total_fat_g, dayLog.goal_fat_g, dayLog.fat_diff_g],
  ];
  return `
    <div class="bg-surface border border-border rounded-2xl p-4 mb-6">
      <p class="font-semibold mb-3">Day summary</p>
      <div class="space-y-2 text-sm">
        ${rows
          .map(
            ([label, total, goalVal, diff]) => `
          <div class="flex justify-between">
            <span class="text-muted">${label}</span>
            <span>${total} / ${goalVal ?? "–"}
              ${goalVal != null ? `<span class="${diffCls(diff)}">(${diff > 0 ? "+" : ""}${diff})</span>` : ""}
            </span>
          </div>`
          )
          .join("")}
      </div>
    </div>`;
}

function body(date, goal, meals, dayLog) {
  return `
    <h1 class="text-2xl font-bold mb-1">Nutrition</h1>
    <p class="text-muted mb-6">${date}</p>

    ${summaryBlock(dayLog)}

    <form id="meal-form" class="bg-surface border border-border rounded-2xl p-4 space-y-3 mb-6">
      <p class="font-semibold">Add meal</p>
      <select name="meal_type" class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2">
        ${MEAL_TYPES.map((t) => `<option value="${t}">${t[0].toUpperCase() + t.slice(1)}</option>`).join("")}
      </select>
      <input name="description" placeholder="What did you eat?" required
        class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
      <div class="grid grid-cols-2 gap-3">
        <input name="calories" type="number" min="0" placeholder="Calories" required
          class="bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
        <input name="protein_g" type="number" min="0" step="0.1" placeholder="Protein g"
          class="bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
        <input name="carbs_g" type="number" min="0" step="0.1" placeholder="Carbs g"
          class="bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
        <input name="fat_g" type="number" min="0" step="0.1" placeholder="Fat g"
          class="bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" />
      </div>
      <button type="submit" class="w-full bg-accent text-bg font-semibold rounded-xl px-4 py-2 active:opacity-80">
        Add meal
      </button>
    </form>

    <div class="space-y-2 mb-6">
      ${
        meals.length
          ? meals.map(mealRow).join("")
          : `<p class="text-muted text-center py-6">No meals logged yet today.</p>`
      }
    </div>

    ${
      !dayLog?.is_complete
        ? `<button id="complete-day" class="w-full border border-border rounded-xl px-4 py-3 active:opacity-70">Mark nutrition day complete</button>`
        : `<p class="text-center text-accent font-medium">Day marked complete</p>`
    }
    ${!goal ? `<p class="text-center text-muted mt-3 text-sm">No goal set yet — set one in More → Goals.</p>` : ""}
  `;
}

export async function renderNutrition() {
  const date = todayIso();
  renderShell("/nutrition", `<p class="text-muted">Loading…</p>`);

  let goal, meals, dayLogs;
  try {
    [goal, meals, dayLogs] = await Promise.all([
      apiList("/api/nutrition/goal/"),
      apiList("/api/nutrition/meals/", { date }),
      apiList("/api/nutrition/day-logs/", { date }),
    ]);
  } catch (err) {
    showToast(err.message);
    return;
  }

  draw(date, goal[0] ?? null, meals, dayLogs[0] ?? null);
}

function draw(date, goal, meals, dayLog) {
  renderShell("/nutrition", body(date, goal, meals, dayLog));

  document.getElementById("meal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/api/nutrition/meals/", {
        method: "POST",
        body: {
          date,
          meal_type: form.get("meal_type"),
          description: form.get("description"),
          calories: Number(form.get("calories")) || 0,
          protein_g: Number(form.get("protein_g")) || 0,
          carbs_g: Number(form.get("carbs_g")) || 0,
          fat_g: Number(form.get("fat_g")) || 0,
        },
      });
      renderNutrition();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.querySelectorAll(".delete-meal").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await apiFetch(`/api/nutrition/meals/${btn.dataset.id}/`, { method: "DELETE" });
        renderNutrition();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  document.getElementById("complete-day")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await apiFetch(`/api/nutrition/day/${date}/complete/`, { method: "POST" });
      showToast("Nutrition day marked complete.", "success");
      renderNutrition();
    } catch (err) {
      showToast(err.message);
      e.target.disabled = false;
    }
  });
}
