import { renderShell } from "../components/navBar.js";
import { showToast } from "../components/toast.js";
import { apiFetch, apiList } from "../api.js";
import { stepsBarChartSvg } from "../components/barChart.js";
import { todayIso, isoDaysAgo } from "../utils.js";

function diffCls(diff) {
  return diff > 0 ? "text-accent" : diff < 0 ? "text-warning" : "text-muted";
}

function body(date, goal, todayEntry, weekEntries) {
  return `
    <h1 class="text-2xl font-bold mb-1">Steps</h1>
    <p class="text-muted mb-6">${date}</p>

    <form id="steps-form" class="bg-surface border border-border rounded-2xl p-4 space-y-3 mb-6">
      <label class="text-sm text-muted block">Today's steps</label>
      <input name="steps" type="number" min="0" required value="${todayEntry?.steps ?? ""}"
        class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 placeholder-muted" placeholder="e.g. 8500" />
      <button type="submit" class="w-full bg-accent text-bg font-semibold rounded-xl px-4 py-2 active:opacity-80">
        Save
      </button>
    </form>

    ${
      todayEntry?.is_complete
        ? `<div class="bg-surface border border-border rounded-2xl p-4 mb-6 text-sm flex justify-between">
             <span class="text-muted">Steps vs goal</span>
             <span class="${diffCls(todayEntry.diff)}">${todayEntry.steps} / ${todayEntry.goal_snapshot ?? "–"}${
               todayEntry.goal_snapshot != null
                 ? ` (${todayEntry.diff > 0 ? "+" : ""}${todayEntry.diff})`
                 : ""
             }</span>
           </div>`
        : `<button id="complete-day" class="w-full border border-border rounded-xl px-4 py-3 active:opacity-70 mb-6">Mark steps day complete</button>`
    }
    ${!goal ? `<p class="text-center text-muted mb-6 text-sm">No goal set yet — set one in More → Goals.</p>` : ""}

    <div class="bg-surface border border-border rounded-2xl p-4">
      <p class="font-semibold mb-2">Last 7 days</p>
      ${stepsBarChartSvg(weekEntries, goal?.daily_step_goal)}
    </div>
  `;
}

export async function renderSteps() {
  const date = todayIso();
  const startDate = isoDaysAgo(6);
  renderShell("/steps", `<p class="text-muted">Loading…</p>`);

  let goals, entries;
  try {
    [goals, entries] = await Promise.all([
      apiList("/api/steps/goal/"),
      apiList("/api/steps/entries/", { start: startDate, end: date }),
    ]);
  } catch (err) {
    showToast(err.message);
    return;
  }

  const goal = goals[0] ?? null;
  const byDate = Object.fromEntries(entries.map((e) => [e.date, e]));
  const weekEntries = Array.from({ length: 7 }, (_, i) => {
    const d = isoDaysAgo(6 - i);
    return { date: d, steps: byDate[d]?.steps ?? 0 };
  });
  const todayEntry = byDate[date] ?? null;

  draw(date, goal, todayEntry, weekEntries);
}

function draw(date, goal, todayEntry, weekEntries) {
  renderShell("/steps", body(date, goal, todayEntry, weekEntries));

  document.getElementById("steps-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const steps = Number(new FormData(e.target).get("steps")) || 0;
    try {
      if (todayEntry) {
        await apiFetch(`/api/steps/entries/${todayEntry.id}/`, { method: "PATCH", body: { steps } });
      } else {
        await apiFetch("/api/steps/entries/", { method: "POST", body: { date, steps } });
      }
      renderSteps();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById("complete-day")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const entry = await apiFetch(`/api/steps/day/${date}/complete/`, { method: "POST" });
      showToast(`Steps: ${entry.steps} (${entry.diff > 0 ? "+" : ""}${entry.diff} vs goal)`, "success");
      renderSteps();
    } catch (err) {
      showToast(err.message);
      e.target.disabled = false;
    }
  });
}
