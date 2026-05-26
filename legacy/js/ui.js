/**
 * ui.js - HUD 界面管理
 * 节奏术力口 Rhythm VOCALOID
 *
 * 负责绘制：分数、Combo、进度条、判定文字、判定线
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, JUDGE_X } from "./config.js";

// 判定文字配置
const JUDGE_TEXT_CONFIG = {
	Perfect: { text: "PERFECT", color: "#ffd700", scale: 1.2 },
	Great: { text: "GREAT", color: "#16d5b9", scale: 1.0 },
	Good: { text: "GOOD", color: "#a78bfa", scale: 0.9 },
	Miss: { text: "MISS", color: "#f87171", scale: 0.85 },
};

/**
 * 浮动文字（判定结果、Combo 等）
 */
class FloatingText {
	constructor(text, x, y, color, fontSize = 28) {
		this.text = text;
		this.x = x;
		this.y = y;
		this.color = color;
		this.fontSize = fontSize;
		this.opacity = 1;
		this.vy = -80; // 向上飘动速度 px/s
		this.life = 0;
		this.maxLife = 800; // 存活时间 ms
		this.active = true;
		this.scale = 1;
		this.scaleTarget = 1;
	}

	update(dt) {
		this.life += dt;
		const progress = this.life / this.maxLife;

		// 向上飘动
		this.y += this.vy * (dt / 1000);
		// 减速
		this.vy *= 0.95;

		// 淡出（后半段）
		if (progress > 0.5) {
			this.opacity = 1 - (progress - 0.5) * 2;
		}

		// 缩放弹跳（开始时放大，然后回弹）
		if (progress < 0.15) {
			this.scale = 1 + (1 - progress / 0.15) * 0.3;
		} else {
			this.scale = 1;
		}

		if (this.life >= this.maxLife) {
			this.active = false;
		}
	}

	render(ctx) {
		if (!this.active) return;

		ctx.save();
		ctx.globalAlpha = Math.max(0, this.opacity);
		ctx.translate(this.x, this.y);
		ctx.scale(this.scale, this.scale);

		ctx.font = `bold ${this.fontSize}px 'Segoe UI', sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		// 描边
		ctx.strokeStyle = "rgba(0,0,0,0.5)";
		ctx.lineWidth = 3;
		ctx.strokeText(this.text, 0, 0);

		// 填充
		ctx.fillStyle = this.color;
		ctx.fillText(this.text, 0, 0);

		ctx.restore();
	}
}

export class UIManager {
	/**
	 * @param {CanvasRenderingContext2D} ctx
	 */
	constructor(ctx) {
		this._ctx = ctx;
		this._floatingTexts = [];

		// 分数动画（平滑过渡）
		this._displayScore = 0;
		this._targetScore = 0;

		// Combo 动画
		this._comboScale = 1;
		this._comboScaleTimer = 0;
	}

	/**
	 * 每帧更新
	 * @param {number} dt - 帧间隔（毫秒）
	 */
	update(dt) {
		// 更新浮动文字
		this._floatingTexts = this._floatingTexts.filter((t) => {
			t.update(dt);
			return t.active;
		});

		// 分数平滑过渡
		const diff = this._targetScore - this._displayScore;
		if (Math.abs(diff) > 1) {
			this._displayScore += diff * 0.15;
		} else {
			this._displayScore = this._targetScore;
		}

		// Combo 缩放动画
		if (this._comboScale > 1) {
			this._comboScale = Math.max(1, this._comboScale - dt * 0.005);
		}
	}

	/**
	 * 绘制所有 HUD 元素
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Object} gameState - 游戏状态
	 * @param {number} gameState.score
	 * @param {number} gameState.combo
	 * @param {number} gameState.maxCombo
	 * @param {number} gameState.progress - 0~1
	 * @param {string} gameState.songTitle
	 */
	render(ctx, gameState) {
		this._renderJudgeLine(ctx);
		this._renderProgressBar(ctx, gameState.progress);
		this._renderScore(ctx, gameState.score);
		this._renderCombo(ctx, gameState.combo);
		this._renderFloatingTexts(ctx);
	}

	/**
	 * 显示判定文字（Perfect/Great/Good/Miss）
	 * @param {string} rating
	 */
	showJudgeText(rating) {
		const cfg = JUDGE_TEXT_CONFIG[rating];
		if (!cfg) return;

		// 在判定线附近显示
		const x = JUDGE_X;
		const y = CANVAS_HEIGHT * 0.45;

		const ft = new FloatingText(cfg.text, x, y, cfg.color, 32 * cfg.scale);
		this._floatingTexts.push(ft);
	}

	/**
	 * 显示 Combo 数字（大数字浮动）
	 * @param {number} combo
	 */
	showComboText(combo) {
		if (combo < 2) return;

		const x = JUDGE_X;
		const y = CANVAS_HEIGHT * 0.35;
		const ft = new FloatingText(`${combo} COMBO`, x, y, "#ffd700", 20);
		ft.maxLife = 600;
		this._floatingTexts.push(ft);

		// 触发 Combo 数字缩放动画
		this._comboScale = 1.4;
	}

	/**
	 * 显示 Combo 断裂特效
	 */
	showComboBreak() {
		const x = JUDGE_X;
		const y = CANVAS_HEIGHT * 0.4;
		const ft = new FloatingText("COMBO BREAK", x, y, "#f87171", 18);
		ft.maxLife = 1000;
		this._floatingTexts.push(ft);
	}

	/**
	 * 绘制判定线
	 */
	_renderJudgeLine(ctx) {
		ctx.save();

		// 判定线主体
		const gradient = ctx.createLinearGradient(JUDGE_X, 0, JUDGE_X, CANVAS_HEIGHT);
		gradient.addColorStop(0, "rgba(255,255,255,0)");
		gradient.addColorStop(0.3, "rgba(255,255,255,0.3)");
		gradient.addColorStop(0.5, "rgba(255,255,255,0.6)");
		gradient.addColorStop(0.7, "rgba(255,255,255,0.3)");
		gradient.addColorStop(1, "rgba(255,255,255,0)");

		ctx.strokeStyle = gradient;
		ctx.lineWidth = 2;
		ctx.setLineDash([8, 4]);
		ctx.beginPath();
		ctx.moveTo(JUDGE_X, 0);
		ctx.lineTo(JUDGE_X, CANVAS_HEIGHT);
		ctx.stroke();
		ctx.setLineDash([]);

		// 判定点（圆形标记）
		const judgeY = CANVAS_HEIGHT * 0.6;
		ctx.shadowColor = "#fff";
		ctx.shadowBlur = 10;
		ctx.strokeStyle = "rgba(255,255,255,0.8)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(JUDGE_X, judgeY, 12, 0, Math.PI * 2);
		ctx.stroke();

		ctx.restore();
	}

	/**
	 * 绘制进度条
	 */
	_renderProgressBar(ctx, progress) {
		const barH = 4;
		const barY = CANVAS_HEIGHT - barH;
		const barW = CANVAS_WIDTH * Math.max(0, Math.min(1, progress));

		// 背景
		ctx.fillStyle = "rgba(255,255,255,0.1)";
		ctx.fillRect(0, barY, CANVAS_WIDTH, barH);

		// 进度
		if (barW > 0) {
			const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
			grad.addColorStop(0, "#16d5b9");
			grad.addColorStop(0.5, "#a78bfa");
			grad.addColorStop(1, "#f472b6");
			ctx.fillStyle = grad;
			ctx.fillRect(0, barY, barW, barH);
		}
	}

	/**
	 * 绘制分数
	 */
	_renderScore(ctx, score) {
		this._targetScore = score;
		const displayScore = Math.round(this._displayScore);

		ctx.save();
		ctx.font = "bold 28px monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "top";

		// 描边
		ctx.strokeStyle = "rgba(0,0,0,0.5)";
		ctx.lineWidth = 3;
		ctx.strokeText(String(displayScore).padStart(7, "0"), CANVAS_WIDTH - 16, 16);

		// 填充
		ctx.fillStyle = "#fff";
		ctx.fillText(String(displayScore).padStart(7, "0"), CANVAS_WIDTH - 16, 16);

		ctx.restore();
	}

	/**
	 * 绘制 Combo 计数（右上角，与分数对称）
	 */
	_renderCombo(ctx, combo) {
		if (combo < 2) return;

		// 右上角位置：分数在最右侧，Combo 在分数左边
		const comboX = CANVAS_WIDTH - 100;
		const comboY = 44;

		ctx.save();
		ctx.translate(comboX, comboY);
		ctx.scale(this._comboScale, this._comboScale);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		// Combo 数字
		ctx.font = `bold 28px 'Segoe UI', sans-serif`;
		ctx.strokeStyle = "rgba(0,0,0,0.6)";
		ctx.lineWidth = 4;
		ctx.strokeText(String(combo), 0, 0);
		ctx.fillStyle = "#ffd700";
		ctx.fillText(String(combo), 0, 0);

		// "COMBO" 标签
		ctx.font = "11px sans-serif";
		ctx.fillStyle = "rgba(255,215,0,0.7)";
		ctx.fillText("COMBO", 0, 20);

		ctx.restore();
	}

	/**
	 * 绘制所有浮动文字
	 */
	_renderFloatingTexts(ctx) {
		for (const ft of this._floatingTexts) {
			ft.render(ctx);
		}
	}
}
