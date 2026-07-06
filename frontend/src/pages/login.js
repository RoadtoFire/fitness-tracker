import { renderShell } from "../components/navBar.js";
import { showToast } from "../components/toast.js";
import { login } from "../api.js";
import { navigate } from "../router.js";

export async function renderLogin() {
  renderShell(
    null,
    `
    <div class="min-h-[80vh] flex flex-col justify-center">
      <h1 class="text-2xl font-bold mb-1 text-center">FitTrack</h1>
      <p class="text-muted text-center mb-8">Sign in to your tracker</p>

      <form id="login-form" class="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div>
          <label class="text-sm text-muted mb-1 block">Username</label>
          <input name="username" type="text" autocomplete="username" required
            class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label class="text-sm text-muted mb-1 block">Password</label>
          <input name="password" type="password" autocomplete="current-password" required
            class="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <button type="submit"
          class="w-full bg-accent text-bg font-semibold rounded-xl px-4 py-3 active:opacity-80">
          Sign in
        </button>
      </form>
    </div>
  `
  );

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await login(form.get("username"), form.get("password"));
      navigate("/today");
    } catch (err) {
      showToast(err.message || "Login failed");
    }
  });
}
