/**
 * background.js - 背景渲染管理
 * 节奏术力口 Rhythm VOCALOID
 *
 * Phase 0：使用 Canvas 绘制的渐变色 + 几何图形滚动背景
 * 预留 loadVideo() / loadImage() 接口，Phase 2 替换为真实背景
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./config.js";

// 各歌曲的占位背景配置
const BG_CONFIGS = {
	levan_polkka: {
		skyTop: "#0a2a1a",
		skyBottom: "#1a4a2a",
		groundColor: "#0d3a1a",
		accentColor: "#16d5b9",
		particleColor: "rgba(22, 213, 185, 0.6)",
		// 滚动装饰元素
		elements: [
			{ type: "circle", x: 0.2, y: 0.3, r: 30, color: "rgba(22,213,185,0.1)" },
			{ type: "circle", x: 0.6, y: 0.2, r: 50, color: "rgba(22,213,185,0.08)" },
			{ type: "circle", x: 0.85, y: 0.4, r: 20, color: "rgba(22,213,185,0.12)" },
		],
	},
	ordinary_disco: {
		skyTop: "#1a0a2a",
		skyBottom: "#2a1a4a",
		groundColor: "#1a0a3a",
		accentColor: "#18a0c3",
		particleColor: "rgba(24, 160, 195, 0.6)",
		elements: [
			{ type: "rect", x: 0.1, y: 0.2, w: 40, h: 60, color: "rgba(24,160,195,0.1)" },
			{ type: "rect", x: 0.5, y: 0.15, w: 30, h: 80, color: "rgba(167,139,250,0.08)" },
			{ type: "rect", x: 0.8, y: 0.25, w: 50, h: 50, color: "rgba(24,160,195,0.1)" },
		],
	},
	igaku: {
		skyTop: "#0a1a2a",
		skyBottom: "#1a2a3a",
		groundColor: "#0a1a2a",
		accentColor: "#e74c3c",
		particleColor: "rgba(231, 76, 60, 0.5)",
		elements: [
			{ type: "cross", x: 0.15, y: 0.3, size: 20, color: "rgba(231,76,60,0.2)" },
			{ type: "cross", x: 0.55, y: 0.2, size: 15, color: "rgba(231,76,60,0.15)" },
			{ type: "cross", x: 0.8, y: 0.35, size: 25, color: "rgba(231,76,60,0.2)" },
		],
	},
};

// 默认背景配置
const DEFAULT_BG = BG_CONFIGS.levan_polkka;

export class Background {
	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {string} songId - 歌曲 ID
	 */
	constructor(ctx, songId) {
		this._ctx = ctx;
		this._songId = songId;
		this._config = BG_CONFIGS[songId] || DEFAULT_BG;

		// 滚动状态
		this._scrollX = 0;
		this._scrollSpeed = 80; // px/s（背景滚动速度，比角色慢，视差效果）

		// 粒子系统（简单的漂浮粒子）
		this._particles = this._initParticles(30);

		// 地面滚动线条
		this._groundLines = this._initGroundLines();

		// 视频/图片（Phase 2 替换）
		this._video = null;
		this._image = null;
	}

	/**
	 * 初始化漂浮粒子
	 */
	_initParticles(count) {
		return Array.from({ length: count }, () => ({
			x: Math.random() * CANVAS_WIDTH,
			y: Math.random() * CANVAS_HEIGHT * 0.8,
			size: Math.random() * 4 + 1,
			speed: Math.random() * 30 + 20,
			opacity: Math.random() * 0.6 + 0.2,
			twinkleSpeed: Math.random() * 2 + 1,
			twinkleTimer: Math.random() * Math.PI * 2,
		}));
	}

	/**
	 * 初始化地面滚动线条
	 */
	_initGroundLines() {
		return Array.from({ length: 8 }, (_, i) => ({
			x: i * (CANVAS_WIDTH / 7),
			width: Math.random() * 3 + 1,
		}));
	}

	/**
	 * 每帧更新
	 * @param {number} dt - 帧间隔（毫秒）
	 * @param {number} songTime - 当前歌曲时间（秒）
	 */
	update(dt, songTime) {
		const dtSec = dt / 1000;

		// 背景滚动
		this._scrollX += this._scrollSpeed * dtSec;
		if (this._scrollX > CANVAS_WIDTH) {
			this._scrollX -= CANVAS_WIDTH;
		}

		// 更新粒子
		for (const p of this._particles) {
			p.x -= p.speed * dtSec;
			p.twinkleTimer += p.twinkleSpeed * dtSec;
			p.opacity = 0.3 + Math.sin(p.twinkleTimer) * 0.3;

			// 粒子出屏后从右侧重新进入
			if (p.x < -p.size) {
				p.x = CANVAS_WIDTH + p.size;
				p.y = Math.random() * CANVAS_HEIGHT * 0.8;
			}
		}

		// 更新地面线条
		for (const line of this._groundLines) {
			line.x -= this._scrollSpeed * 1.5 * dtSec;
			if (line.x < -10) {
				line.x += CANVAS_WIDTH + 20;
			}
		}
	}

	/**
	 * 绘制背景
	 * @param {CanvasRenderingContext2D} ctx
	 */
	render(ctx) {
		if (this._video) {
			this._renderVideo(ctx);
		} else if (this._image) {
			this._renderImage(ctx);
		} else {
			this._renderPlaceholder(ctx);
		}
	}

	/**
	 * 占位背景绘制
	 */
	_renderPlaceholder(ctx) {
		const cfg = this._config;
		const W = CANVAS_WIDTH;
		const H = CANVAS_HEIGHT;

		// === 天空渐变 ===
		const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.75);
		skyGrad.addColorStop(0, cfg.skyTop);
		skyGrad.addColorStop(1, cfg.skyBottom);
		ctx.fillStyle = skyGrad;
		ctx.fillRect(0, 0, W, H * 0.75);

		// === 地面 ===
		const groundGrad = ctx.createLinearGradient(0, H * 0.72, 0, H);
		groundGrad.addColorStop(0, cfg.groundColor);
		groundGrad.addColorStop(1, "#000");
		ctx.fillStyle = groundGrad;
		ctx.fillRect(0, H * 0.72, W, H * 0.28);

		// === 地平线发光 ===
		const horizonGrad = ctx.createLinearGradient(0, H * 0.68, 0, H * 0.78);
		horizonGrad.addColorStop(0, "transparent");
		horizonGrad.addColorStop(0.5, cfg.accentColor + "33");
		horizonGrad.addColorStop(1, "transparent");
		ctx.fillStyle = horizonGrad;
		ctx.fillRect(0, H * 0.68, W, H * 0.1);

		// === 滚动装饰元素（视差层） ===
		ctx.save();
		ctx.globalAlpha = 0.6;
		for (const el of this._config.elements) {
			const drawX = (el.x * W - this._scrollX * 0.3 + W * 2) % W;
			this._drawElement(ctx, el, drawX);
		}
		ctx.restore();

		// === 漂浮粒子 ===
		for (const p of this._particles) {
			ctx.save();
			ctx.globalAlpha = p.opacity;
			ctx.fillStyle = cfg.particleColor;
			ctx.shadowColor = cfg.accentColor;
			ctx.shadowBlur = 6;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		// === 地面滚动线条 ===
		ctx.save();
		ctx.strokeStyle = cfg.accentColor + "40";
		ctx.lineWidth = 1;
		for (const line of this._groundLines) {
			ctx.beginPath();
			ctx.moveTo(line.x, H * 0.73);
			ctx.lineTo(line.x - 20, H);
			ctx.stroke();
		}
		ctx.restore();
	}

	/**
	 * 绘制单个装饰元素
	 */
	_drawElement(ctx, el, drawX) {
		ctx.fillStyle = el.color;
		ctx.strokeStyle = el.color;

		switch (el.type) {
			case "circle":
				ctx.beginPath();
				ctx.arc(drawX, el.y * CANVAS_HEIGHT, el.r, 0, Math.PI * 2);
				ctx.fill();
				break;

			case "rect":
				ctx.fillRect(drawX - el.w / 2, el.y * CANVAS_HEIGHT - el.h / 2, el.w, el.h);
				break;

			case "cross": {
				const s = el.size;
				const cx = drawX;
				const cy = el.y * CANVAS_HEIGHT;
				ctx.lineWidth = s * 0.3;
				ctx.lineCap = "round";
				ctx.beginPath();
				ctx.moveTo(cx - s, cy);
				ctx.lineTo(cx + s, cy);
				ctx.moveTo(cx, cy - s);
				ctx.lineTo(cx, cy + s);
				ctx.stroke();
				break;
			}
		}
	}

	/**
	 * 视频背景绘制（Phase 2 启用）
	 */
	_renderVideo(ctx) {
		if (this._video.readyState >= 2) {
			ctx.drawImage(this._video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		} else {
			this._renderPlaceholder(ctx);
		}
	}

	/**
	 * 图片背景绘制（Phase 2 启用）
	 */
	_renderImage(ctx) {
		ctx.drawImage(this._image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}

	/**
	 * 加载背景视频（Phase 2 调用）
	 * @param {string} url - 视频 URL
	 * @returns {Promise<void>}
	 */
	async loadVideo(url) {
		return new Promise((resolve, reject) => {
			const video = document.createElement("video");
			video.src = url;
			video.loop = true;
			video.muted = true;
			video.playsInline = true;
			video.oncanplay = () => {
				this._video = video;
				video.play();
				resolve();
			};
			video.onerror = reject;
		});
	}

	/**
	 * 加载背景图片（Phase 2 调用）
	 * @param {string} url - 图片 URL
	 * @returns {Promise<void>}
	 */
	async loadImage(url) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				this._image = img;
				resolve();
			};
			img.onerror = reject;
			img.src = url;
		});
	}
}
