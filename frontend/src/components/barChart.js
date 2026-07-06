import { formatWeekdayShort } from "../utils.js";

const CHART_MARK = "#059669"; // validated for lightness/contrast against the dark surface
const MUTED = "#94a3b8";

/**
 * Renders a small single-series weekly bar chart as inline SVG.
 * `entries`: [{date: "YYYY-MM-DD", steps: number}], oldest first, one per day.
 * `goal`: optional reference line value.
 */
export function stepsBarChartSvg(entries, goal) {
  const width = 320;
  const height = 160;
  const paddingTop = 20;
  const paddingBottom = 22;
  const plotHeight = height - paddingTop - paddingBottom;
  const maxBarWidth = 24;
  const barGap = 4;

  const maxVal = Math.max(goal || 0, ...entries.map((e) => e.steps), 1);
  const slotWidth = width / entries.length;
  const barWidth = Math.min(maxBarWidth, slotWidth - barGap);

  const bars = entries
    .map((e, i) => {
      const barHeight = e.steps > 0 ? Math.max(3, (e.steps / maxVal) * plotHeight) : 0;
      const x = i * slotWidth + (slotWidth - barWidth) / 2;
      const y = paddingTop + (plotHeight - barHeight);
      const label = formatWeekdayShort(e.date);
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}"
          rx="4" fill="${CHART_MARK}">
          <title>${label}: ${e.steps.toLocaleString()} steps</title>
        </rect>
        <text x="${(x + barWidth / 2).toFixed(1)}" y="${height - 6}" text-anchor="middle"
          font-size="10" fill="${MUTED}">${label}</text>
      `;
    })
    .join("");

  let goalLine = "";
  if (goal) {
    const goalY = paddingTop + plotHeight - (goal / maxVal) * plotHeight;
    goalLine = `
      <line x1="0" y1="${goalY.toFixed(1)}" x2="${width}" y2="${goalY.toFixed(1)}"
        stroke="${MUTED}" stroke-width="1" />
      <text x="${width}" y="${(goalY - 4).toFixed(1)}" text-anchor="end"
        font-size="10" fill="${MUTED}">Goal ${goal.toLocaleString()}</text>
    `;
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-40" preserveAspectRatio="xMidYMid meet"
      role="img" aria-label="Steps over the last ${entries.length} days">
      ${goalLine}
      ${bars}
    </svg>
  `;
}
