import type { JudgmentLevel } from "../types";

export const JUDGMENT_WINDOWS = {
	PERFECT: 0.05,
	GREAT: 0.1,
	GOOD: 0.15,
	MISS: 0.25,
} as const;

export const JUDGMENT_SCORES: Record<JudgmentLevel, number> = {
	PERFECT: 300,
	GREAT: 200,
	GOOD: 100,
	MISS: 0,
};

export function judgeNote(timeDiff: number): JudgmentLevel {
	const absDiff = Math.abs(timeDiff);
	if (absDiff <= JUDGMENT_WINDOWS.PERFECT) return "PERFECT";
	if (absDiff <= JUDGMENT_WINDOWS.GREAT) return "GREAT";
	if (absDiff <= JUDGMENT_WINDOWS.GOOD) return "GOOD";
	return "MISS";
}

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
