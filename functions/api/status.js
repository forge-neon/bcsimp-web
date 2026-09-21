export async function onRequestGet(context) {
  const servers = {
    main: "mc.bcsimp.icu",
    login: "play.simpfun.cn:26897"
  };

  async function query(host) {
    try {
      const r = await fetch(
        "https://api.mcsrvstat.us/3/" + encodeURIComponent(host),
        { headers: { "User-Agent": "bcsimp-web/1.0" } }
      );
      const data = await r.json();
      return {
        online: data.online === true,
        players: data.players ? (data.players.online || 0) : 0,
        max: data.players ? (data.players.max || 0) : 0,
        version: data.version || "",
        motd: data.motd && data.motd.clean ? data.motd.clean.join(" ") : ""
      };
    } catch (e) {
      return { online: false, players: 0, max: 0, error: e.message };
    }
  }

  const [main, login] = await Promise.all([
    query(servers.main),
    query(servers.login)
  ]);

  return new Response(JSON.stringify({
    ok: true,
    main: main,
    login: login
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    }
  });
}
