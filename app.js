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

// 拉取房间
async function loadRooms() {
  const list = document.getElementById('roomList');
  try {
    const r = await fetch('/api/rooms');
    const data = await r.json();
    if (!data.ok || !data.rooms || data.rooms.length === 0) {
      list.innerHTML = '<div class="empty">暂无开放房间<br><span style="font-size:12px;color:#444">打开游戏客户端创建房间后会显示在这里</span></div>';
      document.getElementById('roomCount').textContent = '0';
      document.getElementById('onlineCount').textContent = '0';
      return;
    }
    let totalPlayers = 0;
    list.innerHTML = '';
    for (const room of data.rooms) {
      totalPlayers += room.player_count || 0;
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
    document.getElementById('roomCount').textContent = data.rooms.length;
    document.getElementById('onlineCount').textContent = totalPlayers;
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

loadRooms();
setInterval(loadRooms, 5000);
