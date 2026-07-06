import { renderShell } from "../components/navBar.js";
import { showToast } from "../components/toast.js";
import { apiFetch, apiList, logout } from "../api.js";
import { todayIso } from "../utils.js";

// 40% protein / 40% carbs / 20% fat by calories, converted to grams
// (protein & carbs = 4 kcal/g, fat = 9 kcal/g).
function calcMacros(calories) {
  const cals = Number(calories) || 0;
  return {
    protein_g: Math.round((cals * 0.4) / 4),
    carbs_g: Math.round((cals * 0.4) / 4),
    fat_g: Math.round((cals * 0.2) / 9),
  };
}

function body(date, sleepEntry, sleepGoal, stepGoal, nutritionGoal) {
  return `
    <h1 class="text-2xl font-bold mb-6">More</h1>

    <section class="mb-6">
      <p class="font-semibold mb-3">Sleep — ${date}</p>
      <form id="sleep-form" class="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <label class="text-sm text-muted block">Hours slept</label>
        <input name="hours_slept" type="number" min="0" max="24" step="0.1" required
          value="${sleepEntry?.hours_slept ?? ""}"
          class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2" placeholder="e.g. 7.5" />
        <button type="submit" class="w-full bg-accent text-bg font-semibold rounded-xl px-4 py-2 active:opacity-80">
          Save
        </button>
        ${
          sleepEntry
            ? `<p class="text-sm text-center ${sleepEntry.within_goal ? "text-accent" : "text-warning"}">
                 ${sleepEntry.within_goal ? "Within your sleep goal" : "Outside your sleep goal"}
               </p>`
            : ""
        }
      </form>
    </section>

    <section class="mb-6">
      <p class="font-semibold mb-3">Sleep goal (hours)</p>
      <form id="sleep-goal-form" class="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm text-muted block mb-1">Min</label>
            <input name="min_hours" type="number" step="0.1" min="0" max="24" value="${sleepGoal?.min_hours ?? 7}"
              class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2" />
          </div>
          <div>
            <label class="text-sm text-muted block mb-1">Max</label>
            <input name="max_hours" type="number" step="0.1" min="0" max="24" value="${sleepGoal?.max_hours ?? 9}"
              class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2" />
          </div>
        </div>
        <button type="submit" class="w-full border border-border rounded-xl px-4 py-2 active:opacity-70">Save goal</button>
      </form>
    </section>

    <section class="mb-6">
      <p class="font-semibold mb-3">Step goal</p>
      <form id="step-goal-form" class="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <input name="daily_step_goal" type="number" min="0" value="${stepGoal?.daily_step_goal ?? 10000}"
          class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2" />
        <button type="submit" class="w-full border border-border rounded-xl px-4 py-2 active:opacity-70">Save goal</button>
      </form>
    </section>

    <section class="mb-6">
      <p class="font-semibold mb-3">Nutrition goal</p>
      <form id="nutrition-goal-form" class="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <div>
          <label class="text-sm text-muted block mb-1">Total calories</label>
          <input id="ng-calories" name="daily_calories" type="number" min="0"
            value="${nutritionGoal?.daily_calories ?? 2000}"
            class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2" />
        </div>
        <p class="text-xs text-muted">Protein/carbs/fat below are auto-calculated from calories (40% / 40% / 20%).</p>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-sm text-muted block mb-1">Protein (g)</label>
            <input id="ng-protein" name="protein_g" type="number" min="0" readonly
              value="${nutritionGoal?.protein_g ?? calcMacros(nutritionGoal?.daily_calories ?? 2000).protein_g}"
              class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-muted" />
          </div>
          <div>
            <label class="text-sm text-muted block mb-1">Carbs (g)</label>
            <input id="ng-carbs" name="carbs_g" type="number" min="0" readonly
              value="${nutritionGoal?.carbs_g ?? calcMacros(nutritionGoal?.daily_calories ?? 2000).carbs_g}"
              class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-muted" />
          </div>
          <div>
            <label class="text-sm text-muted block mb-1">Fat (g)</label>
            <input id="ng-fat" name="fat_g" type="number" min="0" readonly
              value="${nutritionGoal?.fat_g ?? calcMacros(nutritionGoal?.daily_calories ?? 2000).fat_g}"
              class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-muted" />
          </div>
        </div>
        <button type="submit" class="w-full border border-border rounded-xl px-4 py-2 active:opacity-70">Save goal</button>
      </form>
    </section>

    <button id="logout-btn" class="w-full text-danger border border-border rounded-xl px-4 py-3 active:opacity-70">
      Log out
    </button>
  `;
}

export async function renderMore() {
  const date = todayIso();
  renderShell("/more", `<p class="text-muted">Loading…</p>`);

  let sleepEntries, sleepGoals, stepGoals, nutritionGoals;
  try {
    [sleepEntries, sleepGoals, stepGoals, nutritionGoals] = await Promise.all([
      apiList("/api/sleep/entries/", { date }),
      apiList("/api/sleep/goal/"),
      apiList("/api/steps/goal/"),
      apiList("/api/nutrition/goal/"),
    ]);
  } catch (err) {
    showToast(err.message);
    return;
  }

  draw(date, sleepEntries[0] ?? null, sleepGoals[0] ?? null, stepGoals[0] ?? null, nutritionGoals[0] ?? null);
}

function draw(date, sleepEntry, sleepGoal, stepGoal, nutritionGoal) {
  renderShell("/more", body(date, sleepEntry, sleepGoal, stepGoal, nutritionGoal));

  document.getElementById("sleep-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const hours = Number(new FormData(e.target).get("hours_slept"));
    try {
      if (sleepEntry) {
        await apiFetch(`/api/sleep/entries/${sleepEntry.id}/`, { method: "PATCH", body: { hours_slept: hours } });
      } else {
        await apiFetch("/api/sleep/entries/", { method: "POST", body: { date, hours_slept: hours } });
      }
      renderMore();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById("sleep-goal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/api/sleep/goal/", {
        method: "POST",
        body: { min_hours: Number(form.get("min_hours")), max_hours: Number(form.get("max_hours")) },
      });
      showToast("Sleep goal saved.", "success");
      renderMore();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById("step-goal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const steps = Number(new FormData(e.target).get("daily_step_goal"));
    try {
      await apiFetch("/api/steps/goal/", { method: "POST", body: { daily_step_goal: steps } });
      showToast("Step goal saved.", "success");
      renderMore();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById("ng-calories").addEventListener("input", (e) => {
    const { protein_g, carbs_g, fat_g } = calcMacros(e.target.value);
    document.getElementById("ng-protein").value = protein_g;
    document.getElementById("ng-carbs").value = carbs_g;
    document.getElementById("ng-fat").value = fat_g;
  });

  document.getElementById("nutrition-goal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/api/nutrition/goal/", {
        method: "POST",
        body: {
          daily_calories: Number(form.get("daily_calories")),
          protein_g: Number(form.get("protein_g")),
          carbs_g: Number(form.get("carbs_g")),
          fat_g: Number(form.get("fat_g")),
        },
      });
      showToast("Nutrition goal saved.", "success");
      renderMore();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById("logout-btn").addEventListener("click", logout);
}
