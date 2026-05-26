export type JudgmentLevel = "PERFECT" | "GREAT" | "GOOD" | "MISS";

export interface NoteConfig {
	time: number;
	type: string;
	lane: number;
}

export interface SongConfig {
	songId: string;
	title: string;
	artist: string;
	bpm: number;
	audioSrc: string;
	offset: number;
	duration: number;
	notes: NoteConfig[];
}

export interface ActiveNote {
	id: number;
	configTime: number;
	judged: boolean;
	judgment: JudgmentLevel | null;
}

export type GameScreen = "menu" | "playing" | "results";

export interface SongMeta {
	songId: string;
	title: string;
	artist: string;
	bpm: number;
	duration: number;
	unlocked: boolean;
}

export interface GameStats {
	score: number;
	maxCombo: number;
	perfect: number;
	great: number;
	good: number;
	miss: number;
}

export interface JudgmentEvent {
	level: JudgmentLevel;
	timestamp: number;
	x: number;
	y: number;
}
