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

// 复制地址
function copyServerIp() {
  copyText('mc.bcsimp.icu');
}

function copyLoginIp() {
  copyText('play.simpfun.cn:26897');
}

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

// 拉服务器状态
async function loadStatus() {
  try {
    const r = await fetch('/api/status');
    const data = await r.json();
    if (!data.ok) return;

    const main = data.main;
    const login = data.login;

    document.getElementById('mainPlayers').textContent = main.online ? main.players : '离线';
    document.getElementById('mainMax').textContent = main.online ? main.max : '-';
    document.getElementById('mainMotd').textContent = main.motd || '正式游戏服';

    document.getElementById('loginPlayers').textContent = login.online ? login.players : '离线';
    document.getElementById('loginMax').textContent = login.online ? login.max : '-';
    document.getElementById('loginMotd').textContent = login.motd || '外置登录认证';

    if (main.online) {
      document.getElementById('mainDot').style.background = '#00ff88';
      document.getElementById('mainDot').style.boxShadow = '0 0 8px #00ff88';
      document.getElementById('mainStatus').textContent = '主服在线';
    } else {
      document.getElementById('mainDot').style.background = '#ff3333';
      document.getElementById('mainDot').style.boxShadow = '0 0 8px #ff3333';
      document.getElementById('mainStatus').textContent = '主服离线';
    }

    if (login.online) {
      document.getElementById('loginDot').style.background = '#00ff88';
      document.getElementById('loginDot').style.boxShadow = '0 0 8px #00ff88';
      document.getElementById('loginStatus').textContent = '登录服在线';
    } else {
      document.getElementById('loginDot').style.background = '#ff3333';
      document.getElementById('loginDot').style.boxShadow = '0 0 8px #ff3333';
      document.getElementById('loginStatus').textContent = '登录服离线';
    }

    const total = (main.online ? main.players : 0) + (login.online ? login.players : 0);
    document.getElementById('totalPlayers').textContent = total;

    if (main.version) {
      document.getElementById('serverVersion').textContent = main.version.split(' ')[0];
    }
  } catch (e) {
    console.error('loadStatus error:', e);
  }
}

// 拉房间
async function loadRooms() {
  const list = document.getElementById('roomList');
  try {
    const r = await fetch('/api/rooms');
    const data = await r.json();
    if (!data.ok || !data.rooms || data.rooms.length === 0) {
      list.innerHTML = '<div class="empty">暂无开放房间<br><span style="font-size:12px;color:#444">打开游戏客户端创建房间后会显示在这里</span></div>';
      return;
    }
    list.innerHTML = '';
    for (const room of data.rooms) {
      const item = document.createElement('div');
      item.className = 'room-item';
      item.innerHTML =
        '<div class="room-info">' +
          '<div class="room-name">' + escapeHtml(room.name || '未命名房间') + '</div>' +
          '<div class="room-meta">房主 ' + escapeHtml(room.host_nickname || '?') + ' · 房间号 ' + escapeHtml(room.id || '?') + '</div>' +
        '</div>' +
        '<div class="room-count">' + (room.player_count || 0) + '/' + (room.max_players || 8) + '</div>';
      list.appendChild(item);
    }
  } catch (e) {
    list.innerHTML = '<div class="empty">无法连接服务器</div>';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

loadStatus();
loadRooms();
setInterval(loadStatus, 30000);
setInterval(loadRooms, 10000);
