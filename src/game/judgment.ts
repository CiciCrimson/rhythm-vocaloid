import type { JudgmentLevel } from "../types";

// 判定窗口（秒）
export const JUDGMENT_WINDOWS = {
	PERFECT: 0.05, // ±50ms
	GREAT: 0.1, // ±100ms
	GOOD: 0.15, // ±150ms
	MISS: 0.25, // 超过此窗口未点击 → 自动 MISS
} as const;

// 各判定等级的分数
export const JUDGMENT_SCORES: Record<JudgmentLevel, number> = {
	PERFECT: 300,
	GREAT: 200,
	GOOD: 100,
	MISS: 0,
};

/** 根据时间偏差返回判定等级 */
export function judgeNote(timeDiff: number): JudgmentLevel {
	const absDiff = Math.abs(timeDiff);
	if (absDiff <= JUDGMENT_WINDOWS.PERFECT) return "PERFECT";
	if (absDiff <= JUDGMENT_WINDOWS.GREAT) return "GREAT";
	if (absDiff <= JUDGMENT_WINDOWS.GOOD) return "GOOD";
	return "MISS";
}

/** 播放时间偏差对应的反馈文字 */
export function getJudgmentText(level: JudgmentLevel): string {
	switch (level) {
		case "PERFECT":
			return "PERFECT";
		case "GREAT":
			return "GREAT";
		case "GOOD":
			return "GOOD";
		case "MISS":
			return "MISS";
	}
}

/** 反馈文字颜色 */
export function getJudgmentColor(level: JudgmentLevel): string {
	switch (level) {
		case "PERFECT":
			return "#FFD700";
		case "GREAT":
			return "#00FF88";
		case "GOOD":
			return "#4488FF";
		case "MISS":
			return "#FF4444";
	}
}
