// ==================== 权限系统 ====================
var state = {
  role: 'user',        // guest < user < admin
  violations: 0,
  logs: [],
  token: null
};

var MAX_LOG = 300;

(function restoreRole() {
  try {
    var r = localStorage.getItem('bcsimp_role') || 'user';
    var v = parseInt(localStorage.getItem('bcsimp_violations') || '0');
    var t = localStorage.getItem('bcsimp_token');
    state.role = r;
    state.violations = v;
    state.token = t;
    if (state.violations >= 3) {
      state.role = 'guest';
      localStorage.setItem('bcsimp_role', 'guest');
    }
  } catch (e) {}
})();

// ==================== 工具 ====================
function pad(n) { return n < 10 ? '0' + n : n; }

function nowStr() {
  var d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
    + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function tsStr(ts) {
  var d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
    + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function sanitize(text) {
  var s = String(text);
  s = s.replace(/mc\.bcsimp\.icu/gi, '[主服]');
  s = s.replace(/play\.simpfun\.cn/gi, '[登录服]');
  s = s.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
  return s;
}

// ==================== 日志 ====================
var logCount = 0;

function addLog(msg, type) {
  type = type || 'info';
  if (state.role === 'guest') return;

  logCount++;
  state.logs.push({ ts: Date.now(), msg: String(msg), type: type });
  if (state.logs.length > MAX_LOG) state.logs.shift();

  var content = document.getElementById('logContent');
  var countEl = document.getElementById('logCount');
  if (!content || !countEl) return;

  var line = document.createElement('div');
  line.className = 'log-line log-' + type;
  var displayMsg = (state.role === 'admin') ? String(msg) : sanitize(msg);
  line.innerHTML = '<span class="log-time">' + nowStr() + '</span>' + escapeHtml(displayMsg);
  content.appendChild(line);

  while (content.children.length > MAX_LOG) content.removeChild(content.firstChild);
  countEl.textContent = logCount;

  var panel = document.getElementById('logPanel');
  if (panel) panel.scrollTop = panel.scrollHeight;
}

function renderAllLogs() {
  var content = document.getElementById('logContent');
  if (!content) return;
  content.innerHTML = '';
  var countEl = document.getElementById('logCount');
  if (countEl) countEl.textContent = state.logs.length;

  for (var i = 0; i < state.logs.length; i++) {
    var l = state.logs[i];
    var line = document.createElement('div');
    line.className = 'log-line log-' + l.type;
    var displayMsg = (state.role === 'admin') ? l.msg : sanitize(l.msg);
    line.innerHTML = '<span class="log-time">' + tsStr(l.ts) + '</span>' + escapeHtml(displayMsg);
    content.appendChild(line);
  }

  var panel = document.getElementById('logPanel');
  if (panel) panel.scrollTop = panel.scrollHeight;
}

function toggleLog() {
  var p = document.getElementById('logPanel');
  if (p) p.classList.toggle('open');
}

// ==================== 角色 UI ====================
function updateRoleUI() {
  var roleEl = document.getElementById('logRole');
  var adminBar = document.getElementById('adminBar');
  var logPanel = document.getElementById('logPanel');
  if (!roleEl || !adminBar || !logPanel) return;

  if (state.role === 'admin') {
    roleEl.textContent = '管理员';
    roleEl.style.background = 'rgba(255,80,80,0.2)';
    roleEl.style.color = '#ff5555';
    adminBar.style.display = 'block';
    logPanel.style.display = 'block';
  } else if (state.role === 'user') {
    roleEl.textContent = '普通用户';
    roleEl.style.background = 'rgba(0,255,200,0.15)';
    roleEl.style.color = '#00ffc8';
    adminBar.style.display = 'none';
    logPanel.style.display = 'block';
  } else {
    roleEl.textContent = '访客';
    roleEl.style.background = 'rgba(100,100,100,0.3)';
    roleEl.style.color = '#888';
    adminBar.style.display = 'none';
    logPanel.style.display = 'none';
  }
}

// ==================== 管理员验证 ====================
async function tryAdmin() {
  var input = document.getElementById('adminPwd');
  if (!input) return;
  var val = input.value.trim();
  if (!val) return;

  // 允许字母、数字、点、连字符、下划线
  if (!/^[a-zA-Z0-9\.\-_]+$/.test(val)) {
    recordViolation('非法字符');
    input.value = '';
    return;
  }
  if (val.length > 64) {
    recordViolation('超长输入');
    input.value = '';
    return;
  }

  try {
    var r = await fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: val })
    });
    var data = await r.json();

    if (data.ok && data.token) {
      state.role = 'admin';
      state.token = data.token;
      try {
        localStorage.setItem('bcsimp_role', 'admin');
        localStorage.setItem('bcsimp_token', data.token);
      } catch (e) {}
      updateRoleUI();
      renderAllLogs();
      alert('管理员验证通过');
      input.value = '';
    } else {
      var remaining = data.remaining !== undefined ? data.remaining : '-';
      if (remaining === 0 || r.status === 429) {
        state.role = 'guest';
        try { localStorage.setItem('bcsimp_role', 'guest'); } catch (e) {}
        updateRoleUI();
        console.log = function () {};
        console.warn = function () {};
        console.error = function () {};
        alert('尝试次数过多，已降级为访客');
      } else {
        recordViolation(data.error || '密码错误');
      }
      input.value = '';
    }
  } catch (e) {
    alert('验证请求失败: ' + e.message);
    input.value = '';
  }
}

function logoutAdmin() {
  state.role = 'user';
  state.token = null;
  try {
    localStorage.setItem('bcsimp_role', 'user');
    localStorage.removeItem('bcsimp_token');
  } catch (e) {}
  updateRoleUI();
  renderAllLogs();
}

function recordViolation(reason) {
  state.violations++;
  try { localStorage.setItem('bcsimp_violations', String(state.violations)); } catch (e) {}

  if (state.violations >= 3) {
    state.role = 'guest';
    try { localStorage.setItem('bcsimp_role', 'guest'); } catch (e) {}
    updateRoleUI();
    console.log = function () {};
    console.warn = function () {};
    console.error = function () {};
    alert('检测到多次非法操作，已降级为永久访客');
  } else {
    alert('验证失败：' + reason + '（剩余 ' + (3 - state.violations) + ' 次机会）');
  }
}

// ==================== console 劫持 ====================
var _origLog = console.log;
var _origWarn = console.warn;
var _origError = console.error;

console.log = function () {
  _origLog.apply(console, arguments);
  if (state.role !== 'guest') {
    try { addLog(Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info'); } catch (e) {}
  }
};
console.warn = function () {
  _origWarn.apply(console, arguments);
  if (state.role !== 'guest') {
    try { addLog(Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'warn'); } catch (e) {}
  }
};
console.error = function () {
  _origError.apply(console, arguments);
  if (state.role !== 'guest') {
    try { addLog(Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'error'); } catch (e) {}
  }
};

window.addEventListener('error', function (e) {
  if (state.role !== 'guest') {
    addLog('未捕获错误: ' + e.message, 'error');
  }
});

// ==================== 星空 ====================
var canvas = document.getElementById('stars');
var ctx = canvas.getContext('2d');
var stars = [];

function resizeStars() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  stars = [];
  for (var i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.3 + 0.05
    });
  }
}
resizeStars();
window.addEventListener('resize', resizeStars);

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    s.y += s.speed;
    if (s.y > canvas.height) s.y = 0;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,255,230,' + s.a + ')';
    ctx.fill();
  }
  requestAnimationFrame(drawStars);
}
drawStars();

// ==================== 复制 ====================
function copyText(text) {
  // 复制内容只允许字母数字 . : - _
  if (!/^[a-zA-Z0-9\.\:\-\_]+$/.test(text)) {
    addLog('复制内容含非法字符，拒绝', 'warn');
    return;
  }
  addLog('复制: ' + sanitize(text), 'info');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function () {
      addLog('已复制', 'success');
      alert('已复制：' + text);
    }).catch(function () { fallbackCopy(text); });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    alert('已复制：' + text);
  } catch (e) {
    alert('复制失败');
  }
  document.body.removeChild(ta);
}

// ==================== 状态查询 ====================
function setDot(dotId, statusId, online, label) {
  var dot = document.getElementById(dotId);
  var st = document.getElementById(statusId);
  if (!dot || !st) return;
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

var queryResult = { main: null, login: null };

function updateTotal() {
  var totalEl = document.getElementById('totalPlayers');
  if (!totalEl) return;
  var m = queryResult.main;
  var l = queryResult.login;
  var sum = 0;
  var has = false;
  if (m && m.ok && m.online) { sum += m.players; has = true; }
  if (l && l.ok && l.online) { sum += l.players; has = true; }
  totalEl.textContent = has ? sum : '-';
}

function queryServer(which, cb) {
  var url = '/api/status?server=' + encodeURIComponent(which);
  addLog('查询: ' + which, 'info');

  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 10000);
  var t0 = Date.now();

  fetch(url, { signal: ctrl.signal })
    .then(function (r) {
      clearTimeout(timer);
      var dt = Date.now() - t0;
      addLog('HTTP ' + r.status + ' (' + dt + 'ms)', r.ok ? 'success' : 'warn');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      addLog('数据: online=' + data.online + ' players=' + data.players + '/' + data.max, 'data');
      cb(data);
    })
    .catch(function (e) {
      clearTimeout(timer);
      addLog('查询失败: ' + (e.message || e), 'error');
      cb({ ok: false });
    });
}

function loadStatus() {
  queryServer('main', function (main) {
    queryResult.main = main;
    if (main.ok) {
      document.getElementById('mainPlayers').textContent = main.online ? main.players : '离线';
      document.getElementById('mainMax').textContent = main.online ? main.max : '-';
      setDot('mainDot', 'mainStatus', main.online, '主服');
    }
    updateTotal();
  });

  queryServer('login', function (login) {
    queryResult.login = login;
    if (login.ok) {
      document.getElementById('loginPlayers').textContent = login.online ? login.players : '离线';
      document.getElementById('loginMax').textContent = login.online ? login.max : '-';
      setDot('loginDot', 'loginStatus', login.online, '登录服');
    }
    updateTotal();
  });
}

// ==================== 启动 ====================
window.addEventListener('load', function () {
  updateRoleUI();
  addLog('=== bcsimp 官网启动 ===', 'success');
  addLog('当前身份: ' + state.role, 'info');
  addLog('在线: ' + (navigator.onLine ? '在线' : '离线'), 'info');

  loadStatus();
  setInterval(loadStatus, 30000);
});
