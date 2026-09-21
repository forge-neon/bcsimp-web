# bcsimp 我的世界服务器 · 官网

基于 Cloudflare Pages 部署的官网。

## 结构

- `index.html` — 主页面
- `style.css` — 样式
- `app.js` — 星空背景 + 房间列表拉取
- `functions/api/rooms.js` — Pages Functions，代理游戏 API

## 部署

1. push 到 GitHub
2. Cloudflare Pages 连接此仓库
3. Framework preset: `None`
4. Build command: 留空
5. Build output directory: `/`

## 自定义域名

Pages → Custom domains → 添加 `bcsimp.dpdns.org`
