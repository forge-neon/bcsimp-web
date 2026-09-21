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
function copyServerIp() { copyText('mc.bcsimp.icu'); }
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

// ============ 服务器状态：客户端直接查 ============
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
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(
      'https://api.mcsrvstat.us/3/' + encodeURIComponent(host),
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    const data = await r.json();
    return {
      online: data.online === true,
      players: data.players ? (data.players.online || 0) : 0,
      max: data.players ? (data.players.max || 0) : 0,
      version: data.version || ''
    };
  } catch (e) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(
        'https://api.mcstatus.io/v2/status/java/' + encodeURIComponent(host),
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      const data = await r.json();
      return {
        online: data.online === true,
        players: data.players ? (data.players.online || 0) : 0,
        max: data.players ? (data.players.max || 0) : 0,
        version: data.version && data.version.name_clean ? data.version.name_clean : ''
      };
    } catch (e2) {
      return { online: false, players: 0, max: 0, version: '', error: true };
    }
  }
}

async function loadStatus() {
  const [main, login] = await Promise.all([
    queryServer('mc.bcsimp.icu'),
    queryServer('play.simpfun.cn:26897')
  ]);

  document.getElementById('mainPlayers').textContent = main.online ? main.players : '离线';
  document.getElementById('mainMax').textContent = main.online ? main.max : '-';
  document.getElementById('loginPlayers').textContent = login.online ? login.players : '离线';
  document.getElementById('loginMax').textContent = login.online ? login.max : '-';

  setDot('mainDot', 'mainStatus', main.online, '主服');
  setDot('loginDot', 'loginStatus', login.online, '登录服');

  const total = (main.online ? main.players : 0) + (login.online ? login.players : 0);
  document.getElementById('totalPlayers').textContent = total;
}

loadStatus();
setInterval(loadStatus, 30000);
