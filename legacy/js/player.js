/**
 * player.js - 角色渲染管理
 * 节奏术力口 Rhythm VOCALOID
 *
 * Phase 0：使用代码绘制的几何体占位角色
 * 预留 loadSprite() 接口，Phase 2 替换为真实精灵图
 */

import {
	PLAYER_X,
	PLAYER_Y,
	PLAYER_WIDTH,
	PLAYER_HEIGHT,
	WALK_FRAME_DURATION,
	HIT_ANIMATION_DURATION,
} from "./config.js";

export class Player {
	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Object} [config] - 可选配置覆盖
	 */
	constructor(ctx, config = {}) {
		this._ctx = ctx;
		this._x = config.x ?? PLAYER_X;
		this._y = config.y ?? PLAYER_Y;
		this._width = config.width ?? PLAYER_WIDTH;
		this._height = config.height ?? PLAYER_HEIGHT;

		// 动画状态
		this._walkFrame = 0; // 0, 1, 2 三帧循环
		this._walkTimer = 0; // 帧计时器（ms）
		this._isHit = false; // 是否在播放击中动画
		this._hitTimer = 0; // 击中动画计时器（ms）
		this._hitProgress = 0; // 击中动画进度 0~1

		// 精灵图（两张独立图片：跑步 + 跳跃）
		this._spriteRun = null; // 跑步图（miku1.png 或类似）
		this._spriteJump = null; // 跳跃图（miku2.png 或类似）
		// 兼容旧接口（spriteSheet 模式）
		this._sprite = null;
		this._spriteConfig = null;

		// 角色颜色（占位）
		this._bodyColor = config.color ?? "#4a9eff";
		this._headColor = config.headColor ?? "#7bc8ff";
		this._accentColor = config.accentColor ?? "#ff6b9d";
	}

	/**
	 * 每帧更新动画状态
	 * @param {number} dt - 帧间隔时间（毫秒）
	 */
	update(dt) {
		// 行走动画帧切换
		this._walkTimer += dt;
		if (this._walkTimer >= WALK_FRAME_DURATION) {
			this._walkTimer -= WALK_FRAME_DURATION;
			this._walkFrame = (this._walkFrame + 1) % 3;
		}

		// 击中动画计时
		if (this._isHit) {
			this._hitTimer += dt;
			this._hitProgress = Math.min(this._hitTimer / HIT_ANIMATION_DURATION, 1);
			if (this._hitTimer >= HIT_ANIMATION_DURATION) {
				this._isHit = false;
				this._hitTimer = 0;
				this._hitProgress = 0;
			}
		}
	}

	/**
	 * 绘制角色
	 * @param {CanvasRenderingContext2D} ctx
	 */
	render(ctx) {
		if (this._spriteRun || this._spriteJump) {
			// 优先使用两张独立图片模式
			this._renderSpriteImages(ctx);
		} else if (this._sprite) {
			// 兼容旧的 spriteSheet 模式
			this._renderSprite(ctx);
		} else {
			this._renderPlaceholder(ctx);
		}
	}

	/**
	 * 触发击中/收集动画（跳跃 + 伸手）
	 */
	playHitAnimation() {
		this._isHit = true;
		this._hitTimer = 0;
		this._hitProgress = 0;
	}

	/**
	 * 占位角色绘制（几何体）
	 * 造型：方块身体 + 圆形头部 + 腿部动画
	 */
	_renderPlaceholder(ctx) {
		ctx.save();

		const x = this._x;
		const baseY = this._y; // 脚底 Y 坐标

		// 击中动画：向上跳跃
		let jumpOffset = 0;
		if (this._isHit) {
			// 抛物线跳跃：先上后下
			const t = this._hitProgress;
			jumpOffset = Math.sin(t * Math.PI) * 30;
		}

		const drawY = baseY - jumpOffset;

		// 腿部动画偏移（3 帧）
		const legOffsets = [
			{ left: -8, right: 8 }, // 帧 0：正常站立
			{ left: -12, right: 4 }, // 帧 1：左腿前
			{ left: -4, right: 12 }, // 帧 2：右腿前
		];
		const leg = legOffsets[this._walkFrame];

		const w = this._width;
		const h = this._height;
		const headR = w * 0.35;
		const bodyH = h * 0.45;
		const legH = h * 0.3;
		const legW = w * 0.22;

		// === 绘制腿部 ===
		ctx.fillStyle = this._bodyColor;

		// 左腿
		ctx.save();
		ctx.translate(x - w * 0.15, drawY - legH);
		ctx.rotate(leg.left * 0.04);
		ctx.fillRect(-legW / 2, 0, legW, legH);
		ctx.restore();

		// 右腿
		ctx.save();
		ctx.translate(x + w * 0.15, drawY - legH);
		ctx.rotate(leg.right * 0.04);
		ctx.fillRect(-legW / 2, 0, legW, legH);
		ctx.restore();

		// === 绘制身体 ===
		ctx.fillStyle = this._bodyColor;
		const bodyTop = drawY - legH - bodyH;
		ctx.beginPath();
		ctx.roundRect(x - w / 2, bodyTop, w, bodyH, 6);
		ctx.fill();

		// 身体装饰（领带/腰带）
		ctx.fillStyle = this._accentColor;
		ctx.fillRect(x - 4, bodyTop + bodyH * 0.3, 8, bodyH * 0.4);

		// === 绘制头部 ===
		const headCY = bodyTop - headR * 0.8;
		ctx.fillStyle = this._headColor;
		ctx.beginPath();
		ctx.arc(x, headCY, headR, 0, Math.PI * 2);
		ctx.fill();

		// 眼睛
		ctx.fillStyle = "#1a1a2e";
		ctx.beginPath();
		ctx.arc(x - headR * 0.3, headCY - headR * 0.1, headR * 0.15, 0, Math.PI * 2);
		ctx.arc(x + headR * 0.3, headCY - headR * 0.1, headR * 0.15, 0, Math.PI * 2);
		ctx.fill();

		// 击中时：伸手特效（右手向右上方伸出）
		if (this._isHit && this._hitProgress < 0.6) {
			const armProgress = this._hitProgress / 0.6;
			const armX = x + w * 0.5 + armProgress * 20;
			const armY = bodyTop + bodyH * 0.2 - armProgress * 15;

			ctx.strokeStyle = this._bodyColor;
			ctx.lineWidth = legW;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(x + w * 0.4, bodyTop + bodyH * 0.2);
			ctx.lineTo(armX, armY);
			ctx.stroke();

			// 手部星星特效
			ctx.fillStyle = "#ffd700";
			ctx.font = "16px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("✦", armX + 8, armY - 8);
		}

		// 双马尾（装饰，根据角色颜色）
		ctx.fillStyle = this._accentColor;
		// 左马尾
		ctx.beginPath();
		ctx.ellipse(
			x - headR * 0.9,
			headCY - headR * 0.3,
			headR * 0.2,
			headR * 0.5,
			-0.4,
			0,
			Math.PI * 2
		);
		ctx.fill();
		// 右马尾
		ctx.beginPath();
		ctx.ellipse(
			x + headR * 0.9,
			headCY - headR * 0.3,
			headR * 0.2,
			headR * 0.5,
			0.4,
			0,
			Math.PI * 2
		);
		ctx.fill();

		ctx.restore();
	}

	/**
	 * 精灵图绘制（Phase 2 启用）
	 * @param {CanvasRenderingContext2D} ctx
	 */
	_renderSprite(ctx) {
		if (!this._sprite || !this._spriteConfig) return;

		const cfg = this._spriteConfig;
		const frameIndex = this._isHit ? cfg.jumpFrame : this._walkFrame;
		const srcX = frameIndex * cfg.frameWidth;

		ctx.drawImage(
			this._sprite,
			srcX,
			0,
			cfg.frameWidth,
			cfg.frameHeight,
			this._x - this._width / 2,
			this._y - this._height,
			this._width,
			this._height
		);
	}

	/**
	 * 加载两张独立图片（跑步 + 跳跃）
	 * 在 game.js 初始化时调用
	 * @param {HTMLImageElement} runImg  - 跑步图（如 miku1.png）
	 * @param {HTMLImageElement} jumpImg - 跳跃图（如 miku2.png）
	 * @param {Object} [sizeConfig]      - 可选：覆盖显示尺寸
	 * @param {number} [sizeConfig.width]  - 显示宽度（像素，默认用 PLAYER_WIDTH）
	 * @param {number} [sizeConfig.height] - 显示高度（像素，默认用 PLAYER_HEIGHT）
	 */
	loadImages(runImg, jumpImg, sizeConfig = {}) {
		this._spriteRun = runImg;
		this._spriteJump = jumpImg;
		if (sizeConfig.width) this._width = sizeConfig.width;
		if (sizeConfig.height) this._height = sizeConfig.height;
	}

	/**
	 * 两张独立图片绘制
	 * 跑步时显示 _spriteRun，击中（跳跃）时显示 _spriteJump
	 * @param {CanvasRenderingContext2D} ctx
	 */
	_renderSpriteImages(ctx) {
		// 击中动画：向上跳跃偏移
		let jumpOffset = 0;
		if (this._isHit) {
			const t = this._hitProgress;
			jumpOffset = Math.sin(t * Math.PI) * 30;
		}

		// 选择当前帧图片
		const img = this._isHit && this._spriteJump ? this._spriteJump : this._spriteRun;
		if (!img) return;

		ctx.drawImage(
			img,
			this._x - this._width / 2,
			this._y - this._height - jumpOffset,
			this._width,
			this._height
		);
	}

	/**
	 * 加载精灵图（旧接口，spriteSheet 模式，保留兼容）
	 * @param {HTMLImageElement} spriteSheet - 精灵图 Image 对象
	 * @param {Object} frameConfig - 帧配置
	 * @param {number} frameConfig.frameWidth - 单帧宽度（像素）
	 * @param {number} frameConfig.frameHeight - 单帧高度（像素）
	 * @param {number} frameConfig.jumpFrame - 跳跃帧索引（默认 3）
	 */
	loadSprite(spriteSheet, frameConfig) {
		this._sprite = spriteSheet;
		this._spriteConfig = {
			frameWidth: frameConfig.frameWidth,
			frameHeight: frameConfig.frameHeight,
			jumpFrame: frameConfig.jumpFrame ?? 3,
		};
	}

	get x() {
		return this._x;
	}
	get y() {
		return this._y;
	}
}
