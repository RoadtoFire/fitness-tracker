export function showToast(message, type = "error") {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();

  const color = type === "error" ? "bg-danger" : "bg-accent";
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = `fixed top-safe left-1/2 -translate-x-1/2 mt-3 px-4 py-2 rounded-lg text-sm font-medium text-bg ${color} shadow-lg z-50`;
  toast.style.marginTop = "calc(env(safe-area-inset-top) + 0.75rem)";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
