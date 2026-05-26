/**
 * note.js - 节拍判定系统
 * 节奏术力口 Rhythm VOCALOID
 *
 * 核心职责：
 * 1. 管理所有音符的状态（待生成/活跃/已判定/已错过）
 * 2. 在正确时机通知收集物系统生成收集物
 * 3. 处理玩家点击，计算判定评级
 */

import { JUDGE_WINDOWS, MAX_JUDGE_WINDOW, SPAWN_AHEAD } from "./config.js";

/**
 * 音符状态枚举
 */
export const NoteState = {
	PENDING: "pending", // 等待生成
	ACTIVE: "active", // 已生成，等待判定
	HIT: "hit", // 已被击中
	MISSED: "missed", // 已错过（超时未击中）
};

/**
 * 判定结果
 * @typedef {Object} JudgeResult
 * @property {'Perfect'|'Great'|'Good'|'Miss'|null} rating - 判定评级
 * @property {Object|null} note - 被判定的音符
 * @property {number} diff - 时间偏差（毫秒），正数=晚，负数=早
 */

export class NoteManager {
	/**
	 * @param {Array} notes - 从 JSON 加载的音符数组
	 * @param {number} offset - 全局时间偏移（秒），用于微调同步
	 */
	constructor(notes, offset = 0) {
		// 深拷贝并添加状态字段
		this._notes = notes.map((n, i) => ({
			...n,
			id: i,
			// 应用全局偏移
			time: n.time + offset,
			state: NoteState.PENDING,
		}));

		this._spawnCallbacks = []; // 收集物生成回调
		this._missCallbacks = []; // 错过回调
	}

	/**
	 * 注册收集物生成回调
	 * 当音符需要生成收集物时调用
	 * @param {function(note: Object): void} callback
	 */
	onSpawn(callback) {
		this._spawnCallbacks.push(callback);
	}

	/**
	 * 注册音符错过回调
	 * @param {function(note: Object): void} callback
	 */
	onMiss(callback) {
		this._missCallbacks.push(callback);
	}

	/**
	 * 每帧更新：检查需要生成的收集物，检查超时音符
	 * @param {number} songTime - 当前歌曲时间（秒）
	 */
	update(songTime) {
		for (const note of this._notes) {
			if (note.state === NoteState.PENDING) {
				// 提前 SPAWN_AHEAD 秒生成收集物
				// 收集物从屏幕右侧出发，恰好在 note.time 时到达判定线
				if (songTime >= note.time - SPAWN_AHEAD) {
					note.state = NoteState.ACTIVE;
					this._spawnCallbacks.forEach((cb) => cb(note));
				}
			} else if (note.state === NoteState.ACTIVE) {
				// 超过判定窗口最大值（Miss 窗口）且玩家未点击 → 自动 Miss
				const diff = (songTime - note.time) * 1000; // 转毫秒
				if (diff > JUDGE_WINDOWS.Good) {
					note.state = NoteState.MISSED;
					this._missCallbacks.forEach((cb) => cb(note));
				}
			}
		}
	}

	/**
	 * 处理玩家点击，返回判定结果
	 * @param {number} songTime - 点击时的歌曲时间（秒）
	 * @returns {JudgeResult}
	 */
	handleTap(songTime) {
		// 在 MAX_JUDGE_WINDOW 范围内找最近的活跃音符
		let nearestNote = null;
		let minDiff = Infinity;

		for (const note of this._notes) {
			if (note.state !== NoteState.ACTIVE) continue;

			const diff = Math.abs(songTime - note.time) * 1000; // 毫秒
			if (diff < minDiff && diff <= MAX_JUDGE_WINDOW) {
				minDiff = diff;
				nearestNote = note;
			}
		}

		if (!nearestNote) {
			// 没有可命中的音符（空击）
			return { rating: null, note: null, diff: 0 };
		}

		// 计算带符号的偏差（正=晚，负=早）
		const signedDiff = (songTime - nearestNote.time) * 1000;
		const absDiff = Math.abs(signedDiff);

		// 判定评级
		let rating;
		if (absDiff <= JUDGE_WINDOWS.Perfect) {
			rating = "Perfect";
		} else if (absDiff <= JUDGE_WINDOWS.Great) {
			rating = "Great";
		} else if (absDiff <= JUDGE_WINDOWS.Good) {
			rating = "Good";
		} else {
			rating = "Miss";
		}

		// 标记为已处理
		nearestNote.state = NoteState.HIT;

		return { rating, note: nearestNote, diff: signedDiff };
	}

	/**
	 * 获取所有已错过的音符（用于统计）
	 * @returns {Array}
	 */
	getMissedNotes() {
		return this._notes.filter((n) => n.state === NoteState.MISSED);
	}

	/**
	 * 获取统计数据
	 * @returns {Object}
	 */
	getStats() {
		const total = this._notes.length;
		const hit = this._notes.filter((n) => n.state === NoteState.HIT).length;
		const missed = this._notes.filter((n) => n.state === NoteState.MISSED).length;
		const pending = this._notes.filter(
			(n) => n.state === NoteState.PENDING || n.state === NoteState.ACTIVE
		).length;

		return { total, hit, missed, pending };
	}

	/**
	 * 重置所有音符状态（重新开始时调用）
	 */
	reset() {
		this._notes.forEach((n) => {
			n.state = NoteState.PENDING;
		});
	}

	/**
	 * 获取总音符数
	 * @returns {number}
	 */
	get totalNotes() {
		return this._notes.length;
	}
}
