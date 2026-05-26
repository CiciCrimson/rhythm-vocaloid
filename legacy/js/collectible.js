/**
 * collectible.js - 收集物管理（对象池）
 * 节奏术力口 Rhythm VOCALOID
 *
 * Phase 0：使用 Canvas 绘制的几何体占位
 * 预留 Sprite 替换接口
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  JUDGE_X,
  NOTE_SPEED,
  COLLECTIBLE_Y,
  COLLECTIBLE_Y_HIGH,
  COLLECTIBLE_SIZE
} from './config.js';

// 收集物类型配置（占位颜色和形状）
const TYPE_CONFIG = {
  normal: {
    color: '#16d5b9',
    glowColor: 'rgba(22, 213, 185, 0.4)',
    shape: 'circle',
    size: COLLECTIBLE_SIZE,
    points: 100
  },
  golden: {
    color: '#ffd700',
    glowColor: 'rgba(255, 215, 0, 0.5)',
    shape: 'star',
    size: COLLECTIBLE_SIZE * 1.2,
    points: 150
  },
  special: {
    color: '#f472b6',
    glowColor: 'rgba(244, 114, 182, 0.5)',
    shape: 'diamond',
    size: COLLECTIBLE_SIZE * 1.4,
    points: 200
  }
};

/**
 * 单个收集物
 */
class Collectible {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.note = null;
    this.type = 'normal';
    this.size = COLLECTIBLE_SIZE;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.floatOffset = 0;
    this.floatTimer = 0;
    this.collected = false;       // 是否已被收集（播放收集动画）
    this.collectTimer = 0;        // 收集动画计时器
    this.collectDuration = 300;   // 收集动画时长（ms）
    this.missed = false;          // 是否已错过
    this.opacity = 1;

    // 精灵图（Phase 2 替换）
    this._sprite = null;
  }

  /**
   * 从对象池取出时重置状态
   * @param {Object} note - 音符数据
   */
  reset(note) {
    this.active = true;
    this.note = note;
    this.type = note.type || 'normal';

    const cfg = TYPE_CONFIG[this.type] || TYPE_CONFIG.normal;
    this.size = cfg.size;

    // 初始位置：屏幕右侧外
    this.x = CANVAS_WIDTH + this.size;
    // Y 位置：固定在跳跃高度（玩家需要跳起来才能收集）
    this.y = COLLECTIBLE_Y_HIGH;

    this.rotation = 0;
    this.rotationSpeed = 0; // 不旋转
    this.floatOffset = 0;
    this.floatTimer = 0; // 不再使用浮动
    this.collected = false;
    this.collectTimer = 0;
    this.missed = false;
    this.opacity = 1;
  }

  /**
   * 每帧更新
   * @param {number} dt - 帧间隔（毫秒）
   */
  update(dt) {
    if (!this.active) return;

    const dtSec = dt / 1000;

    if (this.collected) {
      // 收集动画：向上飞出 + 淡出
      this.collectTimer += dt;
      const progress = this.collectTimer / this.collectDuration;
      this.y -= 60 * dtSec;
      this.opacity = Math.max(0, 1 - progress);
      this.size *= 1.01; // 轻微放大

      if (this.collectTimer >= this.collectDuration) {
        this.active = false;
      }
    } else if (this.missed) {
      // 错过动画：继续向左移动 + 淡出
      this.x -= NOTE_SPEED * dtSec;
      this.opacity -= dtSec * 3;
      if (this.opacity <= 0 || this.x < -this.size * 2) {
        this.active = false;
      }
    } else {
      // 正常移动：从右向左
      this.x -= NOTE_SPEED * dtSec;

      // 旋转动画
      this.rotation += this.rotationSpeed * dtSec;

      // 不再浮动，floatOffset 保持 0

      // 出屏回收（已经过了判定线很远）
      if (this.x < JUDGE_X - this.size * 3) {
        // 如果还没被标记为 missed，说明 NoteManager 会处理
        // 这里只做视觉回收
        if (!this.missed) {
          this.active = false;
        }
      }
    }
  }

  /**
   * 绘制收集物
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.active) return;

    const cfg = TYPE_CONFIG[this.type] || TYPE_CONFIG.normal;
    const drawY = this.y + this.floatOffset;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, drawY);
    ctx.rotate(this.rotation);

    if (this._sprite) {
      this._renderSprite(ctx);
    } else {
      this._renderPlaceholder(ctx, cfg);
    }

    ctx.restore();
  }

  /**
   * 占位几何体绘制
   */
  _renderPlaceholder(ctx, cfg) {
    const s = this.size;

    // 发光效果
    ctx.shadowColor = cfg.glowColor;
    ctx.shadowBlur = 15;

    ctx.fillStyle = cfg.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;

    switch (cfg.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'star':
        this._drawStar(ctx, 0, 0, 5, s / 2, s / 4);
        ctx.fill();
        ctx.stroke();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -s / 2);
        ctx.lineTo(s / 2.5, 0);
        ctx.lineTo(0, s / 2);
        ctx.lineTo(-s / 2.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }

    // 内部高光
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.15, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 绘制五角星
   */
  _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(
        cx + Math.cos(rot) * outerRadius,
        cy + Math.sin(rot) * outerRadius
      );
      rot += step;
      ctx.lineTo(
        cx + Math.cos(rot) * innerRadius,
        cy + Math.sin(rot) * innerRadius
      );
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  /**
   * 精灵图绘制（Phase 2 启用）
   */
  _renderSprite(ctx) {
    const s = this.size;
    ctx.drawImage(this._sprite, -s / 2, -s / 2, s, s);
  }

  /**
   * 加载精灵图
   * @param {HTMLImageElement} img - 收集物图片（如 cong.png）
   */
  loadSprite(img) {
    this._sprite = img;
  }

  /**
   * 触发收集动画
   */
  triggerCollect() {
    this.collected = true;
    this.collectTimer = 0;
  }

  /**
   * 触发错过动画
   */
  triggerMiss() {
    this.missed = true;
  }
}

/**
 * 收集物对象池管理器
 */
export class CollectiblePool {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} [poolSize=20] - 对象池大小
   */
  constructor(ctx, poolSize = 20) {
    this._ctx = ctx;
    this._pool = Array.from({ length: poolSize }, () => new Collectible());
    this._active = [];  // 当前活跃的收集物
    // 音符 ID → 收集物 的映射（用于 NoteManager 回调）
    this._noteMap = new Map();
  }

  /**
   * 从池中取出一个收集物并激活
   * @param {Object} note - 音符数据
   * @returns {Collectible|null}
   */
  spawn(note) {
    // 找一个未激活的收集物
    const collectible = this._pool.find(c => !c.active);
    if (!collectible) {
      console.warn('CollectiblePool: 对象池已满，跳过音符', note.id);
      return null;
    }

    collectible.reset(note);
    this._active.push(collectible);
    this._noteMap.set(note.id, collectible);
    return collectible;
  }

  /**
   * 每帧更新所有活跃收集物
   * @param {number} dt - 帧间隔（毫秒）
   */
  update(dt) {
    for (const c of this._active) {
      c.update(dt);
    }

    // 清理已回收的收集物
    const before = this._active.length;
    this._active = this._active.filter(c => c.active);

    // 同步清理 noteMap
    if (this._active.length < before) {
      for (const [id, c] of this._noteMap.entries()) {
        if (!c.active) this._noteMap.delete(id);
      }
    }
  }

  /**
   * 绘制所有活跃收集物
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    for (const c of this._active) {
      c.render(ctx);
    }
  }

  /**
   * 触发收集动画（由 NoteManager 的 hit 回调调用）
   * @param {Object} note
   */
  collect(note) {
    const c = this._noteMap.get(note.id);
    if (c && c.active && !c.collected) {
      c.triggerCollect();
    }
  }

  /**
   * 触发错过动画（由 NoteManager 的 miss 回调调用）
   * @param {Object} note
   */
  miss(note) {
    const c = this._noteMap.get(note.id);
    if (c && c.active && !c.missed) {
      c.triggerMiss();
    }
  }

  /**
   * 获取判定线附近的活跃收集物（调试用）
   * @param {number} tolerance - 容差像素
   * @returns {Collectible[]}
   */
  getActiveNearJudgeLine(tolerance = 50) {
    return this._active.filter(
      c => !c.collected && !c.missed && Math.abs(c.x - JUDGE_X) <= tolerance
    );
  }

  /**
   * 清空所有收集物（重新开始时调用）
   */
  clear() {
    this._active.forEach(c => { c.active = false; });
    this._active = [];
    this._noteMap.clear();
  }

  /**
   * 给对象池中所有收集物加载精灵图
   * 在 game.js 初始化时调用，传入已加载好的 Image 对象
   * @param {HTMLImageElement} img - 收集物图片（如 cong.png）
   */
  loadSprite(img) {
    for (const c of this._pool) {
      c.loadSprite(img);
    }
  }

  get activeCount() {
    return this._active.length;
  }
}
