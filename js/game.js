/**
 * game.js - 游戏主循环
 * 节奏术力口 Rhythm VOCALOID
 *
 * 串联所有子系统：Audio → NoteManager → Player → CollectiblePool → Background → UIManager → ResultsScreen
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, SONGS } from './config.js';
import { AudioManager } from './audio.js';
import { NoteManager } from './note.js';
import { Player } from './player.js';
import { CollectiblePool } from './collectible.js';
import { Background } from './background.js';
import { UIManager } from './ui.js';
import { ResultsScreen, ScoreCalculator } from './results.js';

// ============================================================
// 屏幕管理工具
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function setLoadingProgress(ratio, text) {
  const bar = document.getElementById('loadingBar');
  const txt = document.getElementById('loadingText');
  if (bar) bar.style.width = `${Math.round(ratio * 100)}%`;
  if (txt && text) txt.textContent = text;
}

// ============================================================
// 主游戏类
// ============================================================
class Game {
  constructor() {
    // DOM 元素
    this._canvas = document.getElementById('gameCanvas');
    this._ctx = this._canvas.getContext('2d');

    // 子系统（init() 中初始化）
    this._audio = new AudioManager();
    this._noteManager = null;
    this._player = null;
    this._collectibles = null;
    this._background = null;
    this._ui = null;
    this._results = null;
    this._scoreCalc = new ScoreCalculator();

    // 游戏状态
    this._state = 'loading';  // loading | ready | playing | paused | ended
    this._songConfig = null;
    this._songMeta = null;
    this._lastTimestamp = 0;
    this._rafId = null;

    // 页面切后台处理
    this._handleVisibilityChange = this._onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this._handleVisibilityChange);
  }

  // ============================================================
  // 初始化：加载资源
  // ============================================================
  async init() {
    // 从 URL 参数获取歌曲 ID
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('song') || 'levan_polkka';

    this._songMeta = SONGS.find(s => s.id === songId) || SONGS[0];

    // 更新加载界面标题
    const titleEl = document.getElementById('loadingSongTitle');
    if (titleEl) titleEl.textContent = this._songMeta.title;

    showScreen('loadingScreen');

    try {
      // 1. 加载歌曲配置 JSON
      setLoadingProgress(0.1, '正在加载谱面...');
      const configResp = await fetch(this._songMeta.configPath);
      if (!configResp.ok) throw new Error(`无法加载谱面: ${this._songMeta.configPath}`);
      this._songConfig = await configResp.json();

      // 2. 加载音频
      setLoadingProgress(0.3, '正在加载音频...');
      await this._audio.loadAudio(
        this._songMeta.audioPath,
        (progress) => setLoadingProgress(0.3 + progress * 0.6, `正在加载音频... ${Math.round(progress * 100)}%`)
      );

      // 3. 加载图片资源（可选，图片不存在时静默跳过）
      setLoadingProgress(0.92, '正在加载图片...');
      await this._loadImages();

      setLoadingProgress(1, '加载完成！');

      // 4. 初始化 Canvas 尺寸（DPI 适配）
      this._setupCanvas();

      // 5. 初始化子系统
      this._initSystems();

      // 5. 显示开始界面
      await this._delay(300);
      this._showStartScreen();

    } catch (err) {
      console.error('游戏初始化失败:', err);
      setLoadingProgress(0, `加载失败: ${err.message}`);
    }
  }

  /**
   * 设置 Canvas 尺寸（高 DPI 适配）
   */
  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const container = document.getElementById('gameScreen');

    // 计算实际显示尺寸（保持 16:9 比例，适配屏幕）
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let displayW, displayH;
    if (screenW / screenH > aspectRatio) {
      displayH = screenH;
      displayW = displayH * aspectRatio;
    } else {
      displayW = screenW;
      displayH = displayW / aspectRatio;
    }

    // Canvas 物理像素（高 DPI）
    this._canvas.width = displayW * dpr;
    this._canvas.height = displayH * dpr;

    // CSS 显示尺寸
    this._canvas.style.width = `${displayW}px`;
    this._canvas.style.height = `${displayH}px`;

    // 缩放 ctx，使逻辑坐标与 CANVAS_WIDTH/HEIGHT 一致
    const scaleX = (displayW * dpr) / CANVAS_WIDTH;
    const scaleY = (displayH * dpr) / CANVAS_HEIGHT;
    this._ctx.scale(scaleX, scaleY);

    // 保存缩放比（触摸坐标转换用）
    this._displayScale = { x: displayW / CANVAS_WIDTH, y: displayH / CANVAS_HEIGHT };
    this._displayOffset = {
      x: (screenW - displayW) / 2,
      y: (screenH - displayH) / 2
    };
  }

  /**
   * 初始化所有子系统
   */
  _initSystems() {
    const cfg = this._songConfig;
    const ctx = this._ctx;

    // NoteManager
    this._noteManager = new NoteManager(cfg.notes, cfg.offset || 0);

    // Player（根据歌曲配置颜色）
    const playerColors = {
      levan_polkka:   { color: '#4a9eff', headColor: '#7bc8ff', accentColor: '#16d5b9' },
      ordinary_disco: { color: '#a78bfa', headColor: '#c4b5fd', accentColor: '#18a0c3' },
      igaku:          { color: '#f87171', headColor: '#fca5a5', accentColor: '#e74c3c' }
    };
    const pColor = playerColors[this._songMeta.id] || playerColors.levan_polkka;
    this._player = new Player(ctx, pColor);

    // CollectiblePool
    this._collectibles = new CollectiblePool(ctx, 30);

    // 注入图片到 player 和 collectibles（如果已加载）
    if (this._loadedImages) {
      const { runImg, jumpImg, collectImg, cfg } = this._loadedImages;
      if (runImg || jumpImg) {
        this._player.loadImages(runImg, jumpImg, {
          width: cfg.playerWidth,
          height: cfg.playerHeight
        });
      }
      if (collectImg) {
        this._collectibles.loadSprite(collectImg);
      }
    }

    // Background
    this._background = new Background(ctx, this._songMeta.id);

    // UIManager
    this._ui = new UIManager(ctx);

    // ResultsScreen
    this._results = new ResultsScreen(document.getElementById('resultsScreen'));
    this._results.onRetry(() => this._restart());
    this._results.onBackToMenu(() => { window.location.href = 'index.html'; });

    // ScoreCalculator
    this._scoreCalc.reset();

    // 连接 NoteManager 回调
    this._noteManager.onSpawn(note => {
      this._collectibles.spawn(note);
    });

    this._noteManager.onMiss(note => {
      this._collectibles.miss(note);
      const { prevCombo } = this._scoreCalc.processMiss();
      if (prevCombo >= 3) {
        this._ui.showComboBreak();
      }
      this._ui.showJudgeText('Miss');
    });
  }

  /**
   * 显示开始界面
   */
  _showStartScreen() {
    const titleEl = document.getElementById('startSongTitle');
    const artistEl = document.getElementById('startArtist');
    if (titleEl) titleEl.textContent = this._songConfig.title;
    if (artistEl) artistEl.textContent = this._songConfig.artist;

    showScreen('startScreen');
    this._state = 'ready';

    // 绑定开始按钮
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      const onStart = async (e) => {
        e.preventDefault();
        startBtn.removeEventListener('click', onStart);
        startBtn.removeEventListener('touchend', onStart);
        await this.start();
      };
      startBtn.addEventListener('click', onStart);
      startBtn.addEventListener('touchend', onStart, { passive: false });
    }
  }

  // ============================================================
  // 游戏开始
  // ============================================================
  async start() {
    if (this._state !== 'ready') return;

    // ⚠️ 关键：必须在用户手势的同步调用栈内 unlock AudioContext
    await this._audio.unlock();

    // 切换到游戏画面
    showScreen('gameScreen');
    this._state = 'playing';

    // 绑定暂停按钮
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.pause());
      pauseBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.pause();
      }, { passive: false });
    }

    // 绑定暂停界面按钮
    document.getElementById('resumeBtn')?.addEventListener('click', () => this.resume());
    document.getElementById('restartBtn')?.addEventListener('click', () => this._restart());
    document.getElementById('quitBtn')?.addEventListener('click', () => { window.location.href = 'index.html'; });

    // 绑定点击/触摸判定
    this._canvas.addEventListener('touchstart', this._handleTap.bind(this), { passive: false });
    this._canvas.addEventListener('click', this._handleTap.bind(this));

    // 音频结束回调
    this._audio.onEnd(() => this._endGame());

    // 开始播放音频
    this._audio.play();

    // 启动游戏循环
    this._lastTimestamp = performance.now();
    this._rafId = requestAnimationFrame(this._gameLoop.bind(this));
  }

  // ============================================================
  // 游戏主循环
  // ============================================================
  _gameLoop(timestamp) {
    if (this._state !== 'playing') return;

    const dt = Math.min(timestamp - this._lastTimestamp, 50); // 限制最大 dt 50ms（防止切后台后跳帧）
    this._lastTimestamp = timestamp;

    const songTime = this._audio.getCurrentTime();

    this._update(dt, songTime);
    this._render(songTime);

    this._rafId = requestAnimationFrame(this._gameLoop.bind(this));
  }

  /**
   * 更新所有游戏对象
   * @param {number} dt - 帧间隔（毫秒）
   * @param {number} songTime - 当前歌曲时间（秒）
   */
  _update(dt, songTime) {
    // 更新节拍判定（触发 spawn/miss 回调）
    this._noteManager.update(songTime);

    // 更新角色动画
    this._player.update(dt);

    // 更新收集物
    this._collectibles.update(dt);

    // 更新背景
    this._background.update(dt, songTime);

    // 更新 UI
    this._ui.update(dt);

    // 检查歌曲是否结束（超过配置时长）
    const duration = this._songConfig.duration || this._audio.duration;
    if (songTime > duration && this._audio.isPlaying) {
      // 等音频自然结束，onEnd 回调会触发
    }
  }

  /**
   * 渲染所有层
   * @param {number} songTime
   */
  _render(songTime) {
    const ctx = this._ctx;

    // 清屏
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. 背景层
    this._background.render(ctx);

    // 2. 收集物层
    this._collectibles.render(ctx);

    // 3. 角色层
    this._player.render(ctx);

    // 4. HUD 层（判定线、分数、Combo、进度条）
    const progress = this._audio.duration > 0 ? songTime / this._audio.duration : 0;
    this._ui.render(ctx, {
      score: this._scoreCalc.score,
      combo: this._scoreCalc.combo,
      maxCombo: this._scoreCalc.maxCombo,
      progress: Math.min(1, progress)
    });
  }

  // ============================================================
  // 玩家输入处理
  // ============================================================
  _handleTap(e) {
    if (this._state !== 'playing') return;

    e.preventDefault();

    const songTime = this._audio.getCurrentTime();
    const result = this._noteManager.handleTap(songTime);

    if (result.rating === null) {
      // 空击，无反应
      return;
    }

    if (result.rating === 'Miss') {
      // 判定为 Miss（点击时间超出窗口）
      this._scoreCalc.processRating('Miss');
      this._ui.showJudgeText('Miss');
      return;
    }

    // 有效击中
    const { combo } = this._scoreCalc.processRating(result.rating);

    // 触发收集物动画
    if (result.note) {
      this._collectibles.collect(result.note);
    }

    // 触发角色动画
    this._player.playHitAnimation();

    // 显示判定文字
    this._ui.showJudgeText(result.rating);

    // 显示 Combo 文字
    if (combo >= 2) {
      this._ui.showComboText(combo);
    }

    // 调试：打印偏差（开发阶段保留）
    if (import.meta.env?.DEV || window.DEBUG_MODE) {
      console.log(`[判定] ${result.rating} | 偏差: ${result.diff.toFixed(1)}ms | Combo: ${combo}`);
    }
  }

  // ============================================================
  // 暂停 / 继续
  // ============================================================
  pause() {
    if (this._state !== 'playing') return;
    this._state = 'paused';
    this._audio.pause();
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    showScreen('pauseScreen');
  }

  resume() {
    if (this._state !== 'paused') return;
    this._state = 'playing';
    this._audio.resume();
    showScreen('gameScreen');
    this._lastTimestamp = performance.now();
    this._rafId = requestAnimationFrame(this._gameLoop.bind(this));
  }

  // ============================================================
  // 游戏结束
  // ============================================================
  _endGame() {
    if (this._state === 'ended') return;
    this._state = 'ended';

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this._audio.stop();

    // 延迟 500ms 后显示结算（让最后的动画播完）
    setTimeout(() => {
      const result = this._scoreCalc.getResult(
        this._noteManager.totalNotes,
        this._songConfig.title,
        this._songConfig.songId
      );
      showScreen('resultsScreen');
      this._results.show(result);
    }, 500);
  }

  // ============================================================
  // 重新开始
  // ============================================================
  _restart() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._audio.stop();
    this._results.hide();

    // 重置所有子系统
    this._scoreCalc.reset();
    this._noteManager.reset();
    this._collectibles.clear();

    this._state = 'ready';
    this._showStartScreen();
  }

  // ============================================================
  // 页面切后台处理
  // ============================================================
  _onVisibilityChange() {
    if (document.hidden && this._state === 'playing') {
      // 切到后台自动暂停
      this.pause();
    }
  }

  // ============================================================
  // 图片加载（可选，图片不存在时静默跳过）
  // ============================================================
  /**
   * 加载图片资源，成功后注入到 player 和 collectibles
   * 图片路径约定：
   *   角色跑步图：assets/sprites/{角色名}/run.png
   *   角色跳跃图：assets/sprites/{角色名}/jump.png
   *   收集物图：  assets/collectibles/{物品名}.png
   *
   * 当前支持的歌曲图片配置：
   *   levan_polkka → miku/run.png + miku/jump.png + cong.png
   */
  async _loadImages() {
    // 各歌曲的图片配置
    const IMAGE_CONFIG = {
      levan_polkka: {
        playerRun:   'assets/sprites/miku/run.png',
        playerJump:  'assets/sprites/miku/jump.png',
        collectible: 'assets/collectibles/cong.png',
        // 角色显示尺寸（可根据实际图片调整）
        playerWidth:  80,
        playerHeight: 120
      }
      // 其他歌曲后续补充
    };

    const cfg = IMAGE_CONFIG[this._songMeta.id];
    if (!cfg) return; // 没有配置，跳过

    // 辅助函数：加载单张图片，失败时返回 null（不抛错）
    const loadImg = (src) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`[图片] 未找到：${src}，使用代码占位`);
        resolve(null);
      };
      img.src = src;
    });

    // 并行加载所有图片
    const [runImg, jumpImg, collectImg] = await Promise.all([
      loadImg(cfg.playerRun),
      loadImg(cfg.playerJump),
      loadImg(cfg.collectible)
    ]);

    // 保存图片引用，供 _initSystems() 使用
    this._loadedImages = { runImg, jumpImg, collectImg, cfg };
  }

  // ============================================================
  // 工具方法
  // ============================================================
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// 入口：页面加载完成后启动
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 开启调试模式（URL 带 ?debug=1）
  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    window.DEBUG_MODE = true;
  }

  const game = new Game();
  await game.init();

  // 暴露到全局（调试用）
  if (window.DEBUG_MODE) {
    window._game = game;
  }
});
