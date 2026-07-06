import { renderShell } from "../components/navBar.js";
import { showToast } from "../components/toast.js";
import { apiFetch, apiList, downloadDailyExport } from "../api.js";
import { todayIso, formatDateLabel } from "../utils.js";

function chip(label, done) {
  const cls = done
    ? "bg-accent/15 text-accent border-accent/30"
    : "bg-surface-2 text-muted border-border";
  return `
    <div class="flex items-center justify-between px-4 py-3 rounded-xl border ${cls}">
      <span class="font-medium">${label}</span>
      <span class="text-sm">${done ? "Done" : "Not yet"}</span>
    </div>`;
}

function body(date, status, workoutLogged, sleepLogged) {
  return `
    <h1 class="text-2xl font-bold mb-1">Today</h1>
    <p class="text-muted mb-6">${formatDateLabel(date)}</p>

    <div class="space-y-3 mb-6">
      ${chip("Workout", workoutLogged)}
      ${chip("Nutrition", status.nutrition_complete)}
      ${chip("Steps", status.steps_complete)}
      ${chip("Sleep", sleepLogged)}
    </div>

    <div class="space-y-3 mb-6">
      ${!status.nutrition_complete ? `<button id="complete-nutrition" class="w-full border border-border rounded-xl px-4 py-3 text-text active:opacity-70">Mark nutrition day complete</button>` : ""}
      ${!status.steps_complete ? `<button id="complete-steps" class="w-full border border-border rounded-xl px-4 py-3 text-text active:opacity-70">Mark steps day complete</button>` : ""}
    </div>

    <button id="download-csv" ${status.ready_for_export ? "" : "disabled"}
      class="w-full rounded-xl px-4 py-3 font-semibold ${status.ready_for_export ? "bg-accent text-bg active:opacity-80" : "bg-surface-2 text-muted cursor-not-allowed"}">
      ${status.ready_for_export ? "Download day's CSV" : "Complete nutrition + steps to unlock CSV"}
    </button>
  `;
}

export async function renderToday() {
  const date = todayIso();
  renderShell("/today", `<p class="text-muted">Loading…</p>`);

  let status, sessions, sleepEntries;
  try {
    [status, sessions, sleepEntries] = await Promise.all([
      apiFetch(`/api/daily/${date}/status/`),
      apiList("/api/sessions/", { date }),
      apiList("/api/sleep/entries/", { date }),
    ]);
  } catch (err) {
    showToast(err.message);
    return;
  }

  draw(date, status, sessions.length > 0, sleepEntries.length > 0);
}

function draw(date, status, workoutLogged, sleepLogged) {
  renderShell("/today", body(date, status, workoutLogged, sleepLogged));

  document.getElementById("complete-nutrition")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const log = await apiFetch(`/api/nutrition/day/${date}/complete/`, { method: "POST" });
      showToast(
        `Calories: ${log.total_calories} (${log.calorie_diff > 0 ? "+" : ""}${log.calorie_diff} vs goal)`,
        "success"
      );
      renderToday();
    } catch (err) {
      showToast(err.message);
      e.target.disabled = false;
    }
  });

  document.getElementById("complete-steps")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const entry = await apiFetch(`/api/steps/day/${date}/complete/`, { method: "POST" });
      showToast(`Steps: ${entry.steps} (${entry.diff > 0 ? "+" : ""}${entry.diff} vs goal)`, "success");
      renderToday();
    } catch (err) {
      showToast(err.message);
      e.target.disabled = false;
    }
  });

  document.getElementById("download-csv")?.addEventListener("click", async () => {
    if (!status.ready_for_export) return;
    try {
      await downloadDailyExport(date);
    } catch (err) {
      showToast(err.message);
    }
  });
}
