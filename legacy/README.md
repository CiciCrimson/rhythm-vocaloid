# 节奏术力口 Rhythm VOCALOID

> VOCALOID 虚拟歌手同人节拍收集跑酷网页小游戏

## 快速开始

```bash
# 本地开发服务器（必须用 HTTP 服务，不能直接打开 HTML 文件）
npx serve .
# 或
python -m http.server 8080
```

然后访问 `http://localhost:3000`（或 8080）

## 项目结构

```
节奏术力口/
├── index.html          # 选歌入口
├── game.html           # 游戏主页面
├── css/
│   ├── main.css        # 选歌页样式
│   └── game.css        # 游戏页样式
├── js/
│   ├── config.js       # 全局配置常量
│   ├── main.js         # 选歌页逻辑
│   ├── game.js         # 游戏主循环
│   ├── audio.js        # Web Audio API 封装
│   ├── note.js         # 节拍判定系统
│   ├── player.js       # 角色渲染
│   ├── collectible.js  # 收集物对象池
│   ├── background.js   # 背景渲染
│   ├── ui.js           # HUD 界面
│   └── results.js      # 结算界面
├── config/
│   ├── levan_polkka.json
│   ├── ordinary_disco.json
│   └── igaku.json
├── assets/
│   ├── audio/          # MP3 音频文件
│   ├── sprites/        # 角色精灵图（PNG）
│   ├── collectibles/   # 收集物图片（PNG）
│   └── backgrounds/    # 背景视频（MP4）
├── tools/
│   └── midi_extract.py # MIDI → JSON 节拍提取脚本
└── docs/
    └── 规划.md
```

## MIDI 节拍提取

```bash
pip install mido
python tools/midi_extract.py input.mid config/levan_polkka.json levan_polkka
```

## 开发阶段

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 0: 原型验证 | 🟡 进行中 | 甩葱歌单曲可玩 |
| Phase 1: 三曲扩展 | ⬜ 未开始 | 3 首歌全部可玩 |
| Phase 2: 美术集成 | ⬜ 未开始 | 替换占位美术 |
| Phase 3: 测试优化 | ⬜ 未开始 | 移动端适配 |
| Phase 4: 上线 | ⬜ 未开始 | B 站发布 |
