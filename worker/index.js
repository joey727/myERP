const ALLOWED_ORIGIN = "https://joey727.github.io";
const RELEASES_API = "https://api.github.com/repos/joey727/myERP/releases?per_page=100";
const APK_CACHE_KEY = "https://myerp-usage.internal/apk-downloads";
const APK_CACHE_SECONDS = 3600;
const MAX_OPENS_PER_REQUEST = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cross-Origin-Resource-Policy": "cross-origin",
  Vary: "Origin"
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders, ...headers }
  });
}

function readCount(value, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(Math.trunc(parsed), 0), maximum);
}

async function increment(database, name, amount) {
  if (amount <= 0) return;
  await database
    .prepare(
      "INSERT INTO counters (name, value) VALUES (?1, ?2) ON CONFLICT(name) DO UPDATE SET value = value + excluded.value"
    )
    .bind(name, amount)
    .run();
}

async function recordOpen(request, env) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) {
    return json({ error: "Origin not allowed" }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const opens = readCount(payload?.opens, MAX_OPENS_PER_REQUEST);
  const homeScreen = readCount(payload?.homeScreen, opens);
  if (opens === 0) {
    return json({ error: "No opens to record" }, 400);
  }

  await increment(env.DB, "web:opens", opens);
  await increment(env.DB, "web:standalone", homeScreen);
  return json({ recorded: opens });
}

async function readApkDownloads(ctx) {
  const cache = caches.default;
  const cached = await cache.match(APK_CACHE_KEY);
  if (cached) return (await cached.json()).total;

  const response = await fetch(RELEASES_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "myERP-usage-worker"
    }
  });
  if (!response.ok) return null;

  const releases = await response.json();
  if (!Array.isArray(releases)) return null;

  const total = releases.reduce((sum, release) => {
    const assets = Array.isArray(release?.assets) ? release.assets : [];
    return (
      sum +
      assets.reduce((assetSum, asset) => {
        const name = typeof asset?.name === "string" ? asset.name.toLowerCase() : "";
        const count = Number(asset?.download_count);
        return name.endsWith(".apk") && Number.isFinite(count) ? assetSum + count : assetSum;
      }, 0)
    );
  }, 0);

  const cachedResponse = new Response(JSON.stringify({ total }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `max-age=${APK_CACHE_SECONDS}`
    }
  });
  ctx.waitUntil(cache.put(APK_CACHE_KEY, cachedResponse.clone()));
  return total;
}

async function readStats(env, ctx) {
  const { results } = await env.DB.prepare("SELECT name, value FROM counters").all();
  const counters = Object.fromEntries((results ?? []).map((row) => [row.name, row.value]));
  const apkDownloads = await readApkDownloads(ctx).catch(() => null);

  return json(
    {
      webOpens: counters["web:opens"] ?? 0,
      webHomeScreen: counters["web:standalone"] ?? 0,
      apkDownloads
    },
    200,
    { "Cache-Control": "public, max-age=300" }
  );
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (pathname === "/open" && request.method === "POST") {
      return recordOpen(request, env);
    }
    if (pathname === "/stats" && request.method === "GET") {
      return readStats(env, ctx);
    }
    return json({ error: "Not found" }, 404);
  }
};
