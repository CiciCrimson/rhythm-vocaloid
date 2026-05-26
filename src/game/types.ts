import type { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { NoteConfig } from "../types";

export interface LifecycleState {
	running: boolean;
	paused: boolean;
	ready: boolean;
}

export interface ScoringState {
	score: number;
	combo: number;
	maxCombo: number;
	perfect: number;
	great: number;
	good: number;
	miss: number;
}

export interface RuntimeNote {
	id: number;
	sprite: Sprite;
	configTime: number;
}

export interface NotesState {
	configs: NoteConfig[];
	active: Map<number, RuntimeNote>;
	nextIndex: number;
	nextId: number;
}

export interface SceneAssets {
	container: Container | null;
	noteTexture: Texture;
	charRunTexture: Texture;
	charJumpTexture: Texture;
	charSprite: Sprite | null;
	jumpTimeout: ReturnType<typeof setTimeout> | null;
	bgGraphics: Graphics | null;
	lineGraphics: Graphics | null;
}

export interface TimingState {
	audioCtx: AudioContext | null;
	sourceNode: AudioBufferSourceNode | null;
	/** 已解码的音频数据，可反复创建 sourceNode */
	audioBuffer: AudioBuffer | null;
	/** audioCtx.currentTime 值，播放启动瞬间 */
	audioStartTime: number;
	/** 暂停时刻已流逝的游戏时间（秒） */
	pauseElapsed: number;
}

export interface GameState {
	lifecycle: LifecycleState;
	scoring: ScoringState;
	notes: NotesState;
	assets: SceneAssets;
	timing: TimingState;
}
