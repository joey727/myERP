const USAGE_URL = process.env.EXPO_PUBLIC_USAGE_URL?.replace(/\/$/, "");
const PENDING_KEY = "myerp.usage.pending";
const SESSION_KEY = "myerp.usage.session";

type PendingOpens = { opens: number; homeScreen: number };

function isHomeScreenLaunch() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readPending(): PendingOpens {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "{}");
    return {
      opens: Number(pending?.opens) || 0,
      homeScreen: Number(pending?.homeScreen) || 0
    };
  } catch {
    return { opens: 0, homeScreen: 0 };
  }
}

function writePending(pending: PendingOpens) {
  if (pending.opens > 0) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } else {
    localStorage.removeItem(PENDING_KEY);
  }
}

function queueOpen() {
  const pending = readPending();
  writePending({
    opens: pending.opens + 1,
    homeScreen: pending.homeScreen + (isHomeScreenLaunch() ? 1 : 0)
  });
}

async function flushPending() {
  const pending = readPending();
  if (pending.opens === 0 || !navigator.onLine) return;

  const response = await fetch(`${USAGE_URL}/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pending),
    keepalive: true
  });
  if (response.ok) writePending({ opens: 0, homeScreen: 0 });
}

export function recordAppOpen() {
  if (!USAGE_URL) return;

  if (!sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.setItem(SESSION_KEY, "1");
    queueOpen();
  }

  void flushPending().catch(() => {});
  window.addEventListener("online", () => void flushPending().catch(() => {}));
}
