// 真实域名只存在于服务端，前端永远拿不到
const SERVERS = {
  main: "mc.bcsimp.icu",
  login: "play.simpfun.cn:26897"
};

let cache = {};
const CACHE_TTL = 25000;

async function query(host) {
  const url = "https://api.mcstatus.io/v2/status/java/" + host;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    return {
      online: d.online === true,
      players: d.players ? (d.players.online || 0) : 0,
      max: d.players ? (d.players.max || 0) : 0
    };
  } catch (e) {
    return { online: false, players: 0, max: 0, error: e.message };
  }
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const which = url.searchParams.get("server") || "main";

  if (!SERVERS[which]) {
    return new Response(JSON.stringify({ ok: false, error: "invalid server" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const now = Date.now();
  if (cache[which] && now - cache[which].ts < CACHE_TTL) {
    return new Response(JSON.stringify(cache[which].data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      }
    });
  }

  const result = await query(SERVERS[which]);
  const safe = {
    ok: true,
    server: which,
    online: result.online,
    players: result.players,
    max: result.max,
    ts: now
  };

  cache[which] = { data: safe, ts: now };

  return new Response(JSON.stringify(safe), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    }
  });
}
