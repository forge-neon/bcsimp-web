// 真实域名只存在于服务端，前端永远拿不到
const SERVERS = {
  main: "mc.bcsimp.icu",
  login: "play.simpfun.cn:26897"
};

let cache = {};
const CACHE_TTL = 25000;

// 密码验证失败计数（按 IP）
let failCounts = {};
const FAIL_WINDOW = 5 * 60 * 1000;
const FAIL_LIMIT = 5;

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

function getIP(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

// ============ GET：查询服务器状态 ============
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

// ============ POST：管理员密码验证 ============
export async function onRequestPost(context) {
  const url = new URL(context.request.url);

  if (url.pathname !== "/api/status") {
    return new Response(JSON.stringify({ ok: false, error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const ip = getIP(context.request);

  // 限速检查
  const now = Date.now();
  if (!failCounts[ip]) failCounts[ip] = { count: 0, firstTs: now };
  if (now - failCounts[ip].firstTs > FAIL_WINDOW) {
    failCounts[ip] = { count: 0, firstTs: now };
  }
  if (failCounts[ip].count >= FAIL_LIMIT) {
    return new Response(JSON.stringify({
      ok: false,
      error: "尝试次数过多，请 5 分钟后再试"
    }), {
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 解析 body
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const pwd = String(body.password || "");

  // 防注入：只允许字母、数字、点、连字符、下划线
  if (!/^[a-zA-Z0-9\.\-_]+$/.test(pwd) || pwd.length > 64) {
    failCounts[ip].count++;
    return new Response(JSON.stringify({ ok: false, error: "非法字符" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 从环境变量读取期望密码
  const expected = context.env.ADMIN_PASSWORD || "";

  if (pwd !== expected) {
    failCounts[ip].count++;
    return new Response(JSON.stringify({
      ok: false,
      error: "密码错误",
      remaining: FAIL_LIMIT - failCounts[ip].count
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 成功
  failCounts[ip] = { count: 0, firstTs: now };
  const token = btoa(ip + ":" + now + ":" + Math.random());

  return new Response(JSON.stringify({
    ok: true,
    token: token,
    expire: now + 3600000
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
