// 星空背景
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.3 + 0.05
    });
  }
}
resize();
window.addEventListener('resize', resize);

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of stars) {
    s.y += s.speed;
    if (s.y > canvas.height) s.y = 0;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150, 255, 230, ' + s.a + ')';
    ctx.fill();
  }
  requestAnimationFrame(drawStars);
}
drawStars();

// 复制
function copyLoginIp() { copyText('play.simpfun.cn:26897'); }
function copyQQ() { copyText('985424094'); }

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制：' + text);
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    alert('已复制：' + text);
  } catch (e) {
    alert('复制失败，请手动复制：' + text);
  }
  document.body.removeChild(ta);
}

// ============ 查询：用支持 CORS 的 mcstatus.io ============
function setDot(dotId, statusId, online, label) {
  const dot = document.getElementById(dotId);
  const st = document.getElementById(statusId);
  if (online) {
    dot.style.background = '#00ff88';
    dot.style.boxShadow = '0 0 8px #00ff88';
    st.textContent = label + '在线';
  } else {
    dot.style.background = '#ff3333';
    dot.style.boxShadow = '0 0 8px #ff3333';
    st.textContent = label + '离线';
  }
}

async function queryServer(host) {
  const url = 'https://api.mcstatus.io/v2/status/java/' + host;
  console.log('[query]', url);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    console.log('[query] status', r.status);

    if (!r.ok) {
      return { online: false, players: 0, max: 0, error: 'HTTP ' + r.status };
    }

    const data = await r.json();
    console.log('[query] data', data);

    return {
      online: data.online === true,
      players: data.players ? (data.players.online || 0) : 0,
      max: data.players ? (data.players.max || 0) : 0
    };
  } catch (e) {
    clearTimeout(timer);
    console.error('[query] error', e);
    return { online: false, players: 0, max: 0, error: String(e) };
  }
}

async function loadStatus() {
  console.log('[loadStatus] start');
  const login = await queryServer('play.simpfun.cn:26897');
  console.log('[loadStatus] result', login);

  if (login.error) {
    setDot('loginDot', 'loginStatus', false, '登录服');
    document.getElementById('loginStatus').textContent = '查询失败';
    document.getElementById('loginPlayers').textContent = '?';
    document.getElementById('loginMax').textContent = '?';
    return;
  }

  document.getElementById('loginPlayers').textContent = login.online ? login.players : '离线';
  document.getElementById('loginMax').textContent = login.online ? login.max : '-';
  setDot('loginDot', 'loginStatus', login.online, '登录服');
}

loadStatus();
setInterval(loadStatus, 30000);
