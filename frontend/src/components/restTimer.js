let wakeLockSentinel = null;
let wakeLockWanted = false;

export function ensureNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export async function acquireWakeLock() {
  wakeLockWanted = true;
  try {
    if ("wakeLock" in navigator) {
      wakeLockSentinel = await navigator.wakeLock.request("screen");
    }
  } catch {
    // Not available/denied — the countdown still runs correctly via wall-clock math,
    // the screen just won't be forced to stay awake.
  }
}

export function releaseWakeLock() {
  wakeLockWanted = false;
  wakeLockSentinel?.release?.();
  wakeLockSentinel = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wakeLockWanted && wakeLockSentinel === null) {
    acquireWakeLock();
  }
});

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio unavailable — visual countdown + notification still fire.
  }
}

function notify(body) {
  if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
    try {
      new Notification("Rest complete", { body });
    } catch {
      // Some browsers require a service-worker-backed notification; safe to skip.
    }
  }
}

/**
 * Mounts a rest countdown into `container`. Computes remaining time from a
 * stored end-timestamp on every tick (never decrements a counter) so it
 * self-corrects if a tick is delayed (e.g. the phone was briefly locked).
 * Returns a `cancel()` function callers must invoke before remounting/removing.
 */
export function mountRestTimer(container, seconds, label = "") {
  const endTime = Date.now() + seconds * 1000;
  let done = false;
  let interval;

  const render = (remaining) => `
    <div class="flex items-center justify-between bg-surface-2 border border-border rounded-xl px-4 py-3 shadow-lg">
      <span class="text-muted text-sm truncate">Resting${label ? ` — ${label}` : ""}</span>
      <span class="text-2xl font-bold tabular-nums text-accent shrink-0 ml-3">${remaining}s</span>
      <button type="button" class="rest-skip text-sm text-muted underline shrink-0 ml-3">Skip</button>
    </div>
  `;

  const clear = () => {
    done = true;
    clearInterval(interval);
  };

  const finish = () => {
    if (done) return;
    clear();
    beep();
    notify(label ? `${label}: your rest period is up.` : "Your rest period is up.");
    container.innerHTML = `
      <div class="bg-accent/15 text-accent border border-accent/30 rounded-xl px-4 py-3 text-center font-medium">
        Rest complete
      </div>`;
  };

  const tick = () => {
    if (done) return;
    const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    container.innerHTML = render(remaining);
    container.querySelector(".rest-skip")?.addEventListener("click", finish);
    if (remaining <= 0) finish();
  };

  interval = setInterval(tick, 250);
  tick();

  return () => {
    clear();
    container.innerHTML = "";
  };
}
