const TABS = [
  { path: "/today", label: "Today" },
  { path: "/workouts", label: "Workouts" },
  { path: "/nutrition", label: "Nutrition" },
  { path: "/steps", label: "Steps" },
  { path: "/more", label: "More" },
];

function navBarHtml(activePath) {
  const items = TABS.map((tab) => {
    const isActive = activePath.startsWith(tab.path);
    const textCls = isActive ? "text-accent font-semibold" : "text-muted";
    return `
      <a href="#${tab.path}" class="flex-1 flex items-center justify-center py-3 ${textCls} text-sm">
        ${tab.label}
      </a>`;
  }).join("");

  return `
    <nav class="fixed bottom-0 left-0 right-0 bg-surface border-t border-border pb-safe">
      <div class="flex max-w-lg mx-auto">${items}</div>
    </nav>`;
}

/**
 * Renders the app shell (scrollable content + bottom tab bar) into #app.
 * `activePath` decides which tab is highlighted; pass null to hide the tab bar (e.g. login).
 */
export function renderShell(activePath, contentHtml) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="min-h-screen bg-bg text-text flex flex-col">
      <main class="flex-1 overflow-y-auto pt-safe ${activePath ? "pb-28" : "pb-6"}">
        <div class="max-w-lg mx-auto px-4 pt-6">${contentHtml}</div>
      </main>
      ${activePath ? navBarHtml(activePath) : ""}
    </div>
  `;
}
