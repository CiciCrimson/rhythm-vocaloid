/**
 * results.js - 结算界面
 * 节奏术力口 Rhythm VOCALOID
 */

import { SCORE_BASE, SCORE_MULTIPLIER, COMBO_MULTIPLIER, RATING_THRESHOLDS } from "./config.js";

export class ResultsScreen {
	/**
	 * @param {HTMLElement} container - 结算界面容器元素（#resultsScreen）
	 */
	constructor(container) {
		this._container = container;
		this._onRetryCallback = null;
		this._onBackCallback = null;
	}

	/**
	 * 注册重试回调
	 * @param {function} callback
	 */
	onRetry(callback) {
		this._onRetryCallback = callback;
	}

	/**
	 * 注册返回选歌回调
	 * @param {function} callback
	 */
	onBackToMenu(callback) {
		this._onBackCallback = callback;
	}

	/**
	 * 显示结算界面
	 * @param {Object} gameResult - 游戏结果数据
	 * @param {number} gameResult.score - 最终分数
	 * @param {number} gameResult.maxCombo - 最大 Combo
	 * @param {number} gameResult.totalNotes - 总音符数
	 * @param {number} gameResult.perfectCount
	 * @param {number} gameResult.greatCount
	 * @param {number} gameResult.goodCount
	 * @param {number} gameResult.missCount
	 * @param {string} gameResult.songTitle - 歌曲名
	 * @param {string} gameResult.songId - 歌曲 ID
	 */
	show(gameResult) {
		const maxScore = this._calcMaxScore(gameResult.totalNotes);
		const rating = this.calcRating(gameResult.score, maxScore, gameResult.missCount);

		this._container.innerHTML = this._buildHTML(gameResult, rating, maxScore);
		this._container.classList.add("active");

		// 绑定按钮事件
		const retryBtn = this._container.querySelector("#retryBtn");
		const backBtn = this._container.querySelector("#backBtn");

		if (retryBtn) {
			retryBtn.addEventListener("click", () => {
				if (this._onRetryCallback) this._onRetryCallback();
			});
			retryBtn.addEventListener(
				"touchend",
				(e) => {
					e.preventDefault();
					if (this._onRetryCallback) this._onRetryCallback();
				},
				{ passive: false }
			);
		}

		if (backBtn) {
			backBtn.addEventListener("click", () => {
				if (this._onBackCallback) this._onBackCallback();
			});
			backBtn.addEventListener(
				"touchend",
				(e) => {
					e.preventDefault();
					if (this._onBackCallback) this._onBackCallback();
				},
				{ passive: false }
			);
		}

		// 入场动画
		requestAnimationFrame(() => {
			this._container.querySelector(".results-content")?.classList.add("show");
		});
	}

	/**
	 * 隐藏结算界面
	 */
	hide() {
		this._container.classList.remove("active");
		this._container.innerHTML = "";
	}

	/**
	 * 计算结算评级
	 * @param {number} score - 实际得分
	 * @param {number} maxScore - 理论满分
	 * @param {number} missCount - Miss 数量
	 * @returns {'S'|'A'|'B'|'C'}
	 */
	calcRating(score, maxScore, missCount) {
		const ratio = maxScore > 0 ? score / maxScore : 0;

		if (ratio >= RATING_THRESHOLDS.S.scoreRatio && missCount <= RATING_THRESHOLDS.S.maxMiss) {
			return "S";
		} else if (ratio >= RATING_THRESHOLDS.A.scoreRatio) {
			return "A";
		} else if (ratio >= RATING_THRESHOLDS.B.scoreRatio) {
			return "B";
		} else {
			return "C";
		}
	}

	/**
	 * 计算理论满分（所有音符全 Perfect + 最大 Combo 加成）
	 * @param {number} totalNotes
	 * @returns {number}
	 */
	_calcMaxScore(totalNotes) {
		let score = 0;
		for (let i = 1; i <= totalNotes; i++) {
			const comboBonus = 1 + (i - 1) * COMBO_MULTIPLIER;
			score += SCORE_BASE * SCORE_MULTIPLIER.Perfect * comboBonus;
		}
		return Math.round(score);
	}

	/**
	 * 构建结算界面 HTML
	 */
	_buildHTML(result, rating, maxScore) {
		const accuracy =
			result.totalNotes > 0
				? Math.round(
						((result.perfectCount + result.greatCount * 0.8 + result.goodCount * 0.5) /
							result.totalNotes) *
							100
					)
				: 0;

		return `
      <div class="results-content">
        <div class="results-title">RESULT</div>
        <div class="results-song-name">${result.songTitle || "甩葱歌"}</div>

        <div class="results-grade grade-${rating}">${rating}</div>
        <div class="results-score">${result.score.toLocaleString()}</div>

        <div class="results-stats">
          <div class="stat-item">
            <div class="stat-label">PERFECT</div>
            <div class="stat-value stat-perfect">${result.perfectCount}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">GREAT</div>
            <div class="stat-value stat-great">${result.greatCount}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">GOOD</div>
            <div class="stat-value stat-good">${result.goodCount}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">MISS</div>
            <div class="stat-value stat-miss">${result.missCount}</div>
          </div>
        </div>

        <div class="results-combo">
          最大 Combo：<span>${result.maxCombo}</span>
          &nbsp;&nbsp;准确率：<span>${accuracy}%</span>
        </div>

        <div class="results-buttons">
          <button id="retryBtn" class="btn-result btn-retry">再来一次</button>
          <button id="backBtn" class="btn-result btn-back">返回选歌</button>
        </div>
      </div>
    `;
	}
}

/**
 * 游戏分数计算器
 * 在 game.js 中使用，统一管理分数逻辑
 */
export class ScoreCalculator {
	constructor() {
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;
		this.perfectCount = 0;
		this.greatCount = 0;
		this.goodCount = 0;
		this.missCount = 0;
	}

	/**
	 * 处理一次判定结果，更新分数和 Combo
	 * @param {'Perfect'|'Great'|'Good'|'Miss'} rating
	 * @returns {{ scoreDelta: number, combo: number, maxCombo: number }}
	 */
	processRating(rating) {
		let scoreDelta = 0;

		if (rating === "Miss") {
			this.missCount++;
			this.combo = 0;
		} else if (rating === "Good") {
			this.goodCount++;
			this.combo = 0; // Good 也断 Combo（按规划文档）
			const multiplier = SCORE_MULTIPLIER[rating];
			const comboBonus = 1; // Combo 已归零，用 1
			scoreDelta = Math.round(SCORE_BASE * multiplier * comboBonus);
			this.score += scoreDelta;
		} else {
			// Perfect 或 Great
			if (rating === "Perfect") this.perfectCount++;
			else if (rating === "Great") this.greatCount++;

			this.combo++;
			if (this.combo > this.maxCombo) this.maxCombo = this.combo;

			const multiplier = SCORE_MULTIPLIER[rating];
			const comboBonus = 1 + (this.combo - 1) * COMBO_MULTIPLIER;
			scoreDelta = Math.round(SCORE_BASE * multiplier * comboBonus);
			this.score += scoreDelta;
		}

		return { scoreDelta, combo: this.combo, maxCombo: this.maxCombo };
	}

	/**
	 * 处理自动 Miss（音符超时未击中）
	 */
	processMiss() {
		this.missCount++;
		const prevCombo = this.combo;
		this.combo = 0;
		return { prevCombo };
	}

	/**
	 * 重置所有计数
	 */
	reset() {
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;
		this.perfectCount = 0;
		this.greatCount = 0;
		this.goodCount = 0;
		this.missCount = 0;
	}

	/**
	 * 获取结算数据
	 * @param {number} totalNotes
	 * @param {string} songTitle
	 * @param {string} songId
	 * @returns {Object}
	 */
	getResult(totalNotes, songTitle, songId) {
		return {
			score: this.score,
			maxCombo: this.maxCombo,
			totalNotes,
			perfectCount: this.perfectCount,
			greatCount: this.greatCount,
			goodCount: this.goodCount,
			missCount: this.missCount,
			songTitle,
			songId,
		};
	}
}
