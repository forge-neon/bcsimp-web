// ==================== 日志系统 ====================
let logCount = 0;
const MAX_LOG_LINES = 200;

function pad(n) { return n < 10 ? '0' + n : n; }

function logTime() {
  const d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function addLog(msg, type) {
  type = type || 'info';
  logCount++;
  const content = document.getElementById('logContent');
  const countEl = document.getElementById('logCount');
  if (!content || !countEl) {
    // 如果页面还没加载完，就把日志打到 console
    console.log('[LOG]', msg);
    return;
  }

  const line = document.createElement('div');
  line.className = 'log-line log-' + type;
  line.innerHTML = '<span class="log-time">' + logTime() + '</span>' + escapeHtml(String(msg));
  content.appendChild(line);

  while (content.children.length > MAX_LOG_LINES) {
    content.removeChild(content.firstChild);
  }

  countEl.textContent = logCount;

  const panel = document.getElementById('logPanel');
  if (panel) panel.scrollTop = panel.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function toggleLog() {
  const p = document.getElementById('logPanel');
  if (p) p.classList.toggle('open');
}

// 劫持 console
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;

console.log = function() {
  _origLog.apply(console, arguments);
  try {
    addLog(Array.from(arguments).map(a =>
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' '), 'info');
  } catch (e) {}
};
console.warn = function() {
  _origWarn.apply(console, arguments);
  try {
    addLog(Array.from(arguments).map(a =>
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' '), 'warn');
  } catch (e) {}
};
console.error = function() {
  _origError.apply(console, arguments);
  try {
    addLog(Array.from(arguments).map(a =>
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' '), 'error');
  } catch (e) {}
};

window.addEventListener('error', function(e) {
  addLog('未捕获错误: ' + e.message + ' @ ' + e.filename + ':' + e.lineno, 'error');
});
window.addEventListener('unhandledrejection', function(e) {
  addLog('未处理 Promise: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)), 'error');
});

// 启动日志（等 DOM 就绪）
function bootLog() {
  addLog('=== bcsimp 官网启动 ===', 'success');
  addLog('UA: ' + navigator.userAgent.slice(0, 80), 'data');
  addLog('在线状态: ' + (navigator.onLine ? '在线' : '离线'), navigator.onLine ? 'success' : 'warn');
  addLog('页面地址: ' + location.href, 'data');
}

// ==================== 星空 ====================
const canvas = document.getElementById('stars');
const ctx = canvas ? canvas.getContext('2d') : null;
let stars = [];

function resize() {
  if (!canvas) return;
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
  if (!ctx) return;
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

// ==================== 复制 ====================
function copyLoginIp() { copyText('play.simpfun.cn:26897'); }
function copyQQ() { copyText('985424094'); }

function copyText(text) {
  addLog('复制: ' + text, 'info');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      addLog('已复制到剪贴板', 'success');
      alert('已复制：' + text);
    }).catch(() => {
      addLog('clipboard API 失败，使用 fallback', 'warn');
      fallbackCopy(text);
    });
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
    addLog('fallback 复制成功', 'success');
    alert('已复制：' + text);
  } catch (e) {
    addLog('fallback 复制失败: ' + e.message, 'error');
    alert('复制失败，请手动复制：' + text);
  }
  document.body.removeChild(ta);
}

// ==================== 服务器状态 ====================
function setDot(dotId, statusId, online, label) {
  const dot = document.getElementById(dotId);
  const st = document.getElementById(statusId);
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

async function queryServer(host) {
  const url = 'https://api.mcstatus.io/v2/status/java/' + host;
  addLog('请求: ' + url, 'info');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const startTs = Date.now();

  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const elapsed = Date.now() - startTs;
    addLog('响应 HTTP ' + r.status + ' (' + elapsed + 'ms)', r.ok ? 'success' : 'warn');

    if (!r.ok) {
      return { online: false, players: 0, max: 0, error: 'HTTP ' + r.status };
    }

    const data = await r.json();
    addLog('数据: ' + JSON.stringify(data).slice(0, 200), 'data');

    return {
      online: data.online === true,
      players: data.players ? (data.players.online || 0) : 0,
      max: data.players ? (data.players.max || 0) : 0
    };
  } catch (e) {
    clearTimeout(timer);
    const elapsed = Date.now() - startTs;
    addLog('请求异常 (' + elapsed + 'ms): ' + (e.message || String(e)), 'error');
    return { online: false, players: 0, max: 0, error: String(e.message || e) };
  }
}

async function loadStatus() {
  addLog('--- 开始查询登录服 ---', 'info');
  const login = await queryServer('play.simpfun.cn:26897');

  if (login.error) {
    addLog('查询失败: ' + login.error, 'error');
    setDot('loginDot', 'loginStatus', false, '登录服');
    const st = document.getElementById('loginStatus');
    if (st) st.textContent = '查询失败';
    const p = document.getElementById('loginPlayers');
    const m = document.getElementById('loginMax');
    if (p) p.textContent = '?';
    if (m) m.textContent = '?';
    return;
  }

  addLog('结果: online=' + login.online + ' players=' + login.players + '/' + login.max, 'success');
  const p = document.getElementById('loginPlayers');
  const m = document.getElementById('loginMax');
  if (p) p.textContent = login.online ? login.players : '离线';
  if (m) m.textContent = login.online ? login.max : '-';
  setDot('loginDot', 'loginStatus', login.online, '登录服');
}

// ==================== 初始化 ====================
function init() {
  bootLog();
  loadStatus();
  setInterval(loadStatus, 30000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
