// 内存缓存，避免频繁请求第三方
let cache = { data: null, ts: 0 };
const CACHE_TTL = 25000; // 25 秒

async function queryMcsrvstat(host) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(
      "https://api.mcsrvstat.us/3/" + encodeURIComponent(host),
      { signal: ctrl.signal, headers: { "User-Agent": "bcsimp-web/1.0" } }
    );
    clearTimeout(timer);
    const data = await r.json();
    return {
      online: data.online === true,
      players: data.players ? (data.players.online || 0) : 0,
      max: data.players ? (data.players.max || 0) : 0,
      version: data.version || "",
      motd: data.motd && data.motd.clean ? data.motd.clean.join(" ") : ""
    };
  } catch (e) {
    return null;
  }
}

async function queryMcstatus(host) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(
      "https://api.mcstatus.io/v2/status/java/" + encodeURIComponent(host),
      { signal: ctrl.signal, headers: { "User-Agent": "bcsimp-web/1.0" } }
    );
    clearTimeout(timer);
    const data = await r.json();
    return {
      online: data.online === true,
      players: data.players ? (data.players.online || 0) : 0,
      max: data.players ? (data.players.max || 0) : 0,
      version: data.version && data.version.name_clean ? data.version.name_clean : "",
      motd: data.motd && data.motd.clean ? data.motd.clean : ""
    };
  } catch (e) {
    return null;
  }
}

async function query(host) {
  // 先试 mcsrvstat，失败换 mcstatus
  let result = await queryMcsrvstat(host);
  if (!result) result = await queryMcstatus(host);
  if (!result) {
    return {
      online: false,
      players: 0,
      max: 0,
      version: "",
      motd: "",
      error: "查询超时"
    };
  }
  return result;
}

export async function onRequestGet(context) {
  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "X-Cache": "hit"
      }
    });
  }

  const [main, login] = await Promise.all([
    query("mc.bcsimp.icu"),
    query("play.simpfun.cn:26897")
  ]);

  const result = { ok: true, main, login, ts: now };
  cache = { data: result, ts: now };

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "X-Cache": "miss"
    }
  });
}
