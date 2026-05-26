import type { Container, Sprite, Texture } from "pixi.js";
import type { NoteConfig } from "../types";

// ========== 生命周期 ==========

export interface LifecycleState {
	running: boolean;
	paused: boolean;
	ready: boolean;
}

// ========== 计分统计 ==========

export interface ScoringState {
	score: number;
	combo: number;
	maxCombo: number;
	perfect: number;
	great: number;
	good: number;
	miss: number;
}

// ========== 音符系统 ==========

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

// ========== 渲染资源 ==========

export interface SceneAssets {
	container: Container | null;
	noteTexture: Texture;
	charRunTexture: Texture;
	charJumpTexture: Texture;
	charSprite: Sprite | null;
	jumpTimeout: ReturnType<typeof setTimeout> | null;
}

// ========== 组合根 ==========

export interface GameState {
	lifecycle: LifecycleState;
	scoring: ScoringState;
	notes: NotesState;
	assets: SceneAssets;
	// 时间/音频 — 任务 #2 会重构此处
	audio: HTMLAudioElement | null;
	startTimestamp: number;
	pauseTimestamp: number;
}