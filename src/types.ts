// 音符判定等级
export type JudgmentLevel = "PERFECT" | "GREAT" | "GOOD" | "MISS";

// 谱面中的音符定义（来自 JSON 配置）
export interface NoteConfig {
	time: number;
	type: string;
	lane: number;
}

// 歌曲配置（来自 JSON 配置）
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

// 运行时活跃音符
export interface ActiveNote {
	id: number;
	configTime: number;
	judged: boolean;
	judgment: JudgmentLevel | null;
}

// 屏幕/游戏状态
export type GameScreen = "menu" | "playing" | "results";

// 菜单中歌曲元数据
export interface SongMeta {
	songId: string;
	title: string;
	artist: string;
	bpm: number;
	duration: number;
	unlocked: boolean;
}

// 单局统计数据
export interface GameStats {
	score: number;
	maxCombo: number;
	perfect: number;
	great: number;
	good: number;
	miss: number;
}

// 单次判定反馈事件
export interface JudgmentEvent {
	level: JudgmentLevel;
	timestamp: number; // performance.now() 时间戳，用于 React key
	x: number; // 判定线 x 坐标（屏幕空间），用于定位反馈文字
	y: number; // 音符 y 坐标
}
