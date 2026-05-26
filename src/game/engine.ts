import type { RefObject } from "react";
import { type Application, Sprite, Texture } from "pixi.js";
import {
	JUDGMENT_LINE_RATIO,
	JUMP_DURATION,
	LEAD_TIME,
	MISS_WINDOW,
	NOTE_SCALE,
} from "./constants";
import { JUDGMENT_SCORES, judgeNote } from "./judgment";
import type {
	GameState,
	LifecycleState,
	NotesState,
	RuntimeNote,
	ScoringState,
	SceneAssets,
} from "./types";
import type { GameStats, JudgmentEvent, JudgmentLevel, NoteConfig } from "../types";

// ========== 工厂函数 ==========

function createLifecycle(): LifecycleState {
	return { running: false, paused: false, ready: false };
}

function createScoring(): ScoringState {
	return { score: 0, combo: 0, maxCombo: 0, perfect: 0, great: 0, good: 0, miss: 0 };
}

function createNotesState(): NotesState {
	return { configs: [], active: new Map(), nextIndex: 0, nextId: 0 };
}

function createSceneAssets(): SceneAssets {
	return {
		container: null,
		noteTexture: Texture.EMPTY,
		charRunTexture: Texture.EMPTY,
		charJumpTexture: Texture.EMPTY,
		charSprite: null,
		jumpTimeout: null,
	};
}

export function createInitialState(): GameState {
	return {
		lifecycle: createLifecycle(),
		scoring: createScoring(),
		notes: createNotesState(),
		assets: createSceneAssets(),
		audio: null,
		startTimestamp: 0,
		pauseTimestamp: 0,
	};
}

// ========== 时间 ==========

export function getGameTime(state: GameState): number {
	if (state.lifecycle.paused) {
		return (state.pauseTimestamp - state.startTimestamp) / 1000;
	}
	const audio = state.audio;
	if (audio && !audio.paused && audio.readyState >= 2 && audio.duration > 0) {
		state.startTimestamp = performance.now() - audio.currentTime * 1000;
	}
	return (performance.now() - state.startTimestamp) / 1000;
}

// ========== 音符销毁 ==========

export function destroyNote(note: RuntimeNote) {
	if (note.sprite.parent) {
		note.sprite.parent.removeChild(note.sprite);
	}
	note.sprite.destroy();
}

// ========== 重置 ==========

export function resetState(state: GameState, configs: NoteConfig[]) {
	const { assets, notes } = state;

	if (assets.jumpTimeout) {
		clearTimeout(assets.jumpTimeout);
		assets.jumpTimeout = null;
	}
	if (assets.charSprite) {
		assets.charSprite.texture = assets.charRunTexture;
	}

	for (const [, note] of notes.active) {
		destroyNote(note);
	}
	notes.active.clear();
	notes.configs = configs;
	notes.nextIndex = 0;
	notes.nextId = 0;

	const scoring = state.scoring;
	scoring.score = 0;
	scoring.combo = 0;
	scoring.maxCombo = 0;
	scoring.perfect = 0;
	scoring.great = 0;
	scoring.good = 0;
	scoring.miss = 0;

	state.lifecycle.paused = false;
	state.startTimestamp = performance.now();
}

// ========== 音频 ==========

export function startAudio(state: GameState, audioSrc: string) {
	if (state.audio) {
		state.audio.pause();
		state.audio = null;
	}
	if (audioSrc) {
		const audio = new Audio(audioSrc);
		audio.play().catch(() => {});
		state.audio = audio;
	}
}

// ========== 判定 ==========

export function applyJudgment(
	scoring: ScoringState,
	level: JudgmentLevel,
	app: Application,
	onJudgmentRef: RefObject<(event: JudgmentEvent) => void>,
	onScoreUpdateRef: RefObject<(score: number) => void>,
	onComboUpdateRef: RefObject<(combo: number) => void>,
) {
	const jx = app.screen.width * JUDGMENT_LINE_RATIO;
	const ny = app.screen.height / 2;

	scoring.combo = level === "MISS" ? 0 : scoring.combo + 1;
	if (scoring.combo > scoring.maxCombo) {
		scoring.maxCombo = scoring.combo;
	}
	scoring.score += JUDGMENT_SCORES[level];

	switch (level) {
		case "PERFECT":
			scoring.perfect++;
			break;
		case "GREAT":
			scoring.great++;
			break;
		case "GOOD":
			scoring.good++;
			break;
		case "MISS":
			scoring.miss++;
			break;
	}

	onJudgmentRef.current({
		level,
		timestamp: performance.now(),
		x: jx,
		y: ny,
	});
	onScoreUpdateRef.current(scoring.score);
	onComboUpdateRef.current(scoring.combo);
}

// ========== 音符生成 ==========

export function spawnNotes(state: GameState, app: Application) {
	const gameTime = getGameTime(state);
	const ny = app.screen.height / 2;
	const { notes, assets } = state;
	const container = assets.container;
	if (!container) return;

	while (notes.nextIndex < notes.configs.length) {
		const config = notes.configs[notes.nextIndex];
		const spawnTime = config.time - LEAD_TIME;
		if (gameTime < spawnTime) break;

		const id = notes.nextId++;
		const sprite = new Sprite(assets.noteTexture);
		sprite.anchor.set(0.5);
		sprite.x = app.screen.width;
		sprite.y = ny;
		sprite.scale.set(NOTE_SCALE);
		container.addChild(sprite);

		notes.active.set(id, { id, sprite, configTime: config.time });
		notes.nextIndex++;
	}
}

// ========== 音符位置更新 ==========

export function updateNotePositions(state: GameState, app: Application) {
	const gameTime = getGameTime(state);
	const jx = app.screen.width * JUDGMENT_LINE_RATIO;
	const totalDist = app.screen.width - jx;

	for (const [, note] of state.notes.active) {
		const elapsed = gameTime - (note.configTime - LEAD_TIME);
		const progress = Math.max(0, elapsed / LEAD_TIME);
		note.sprite.x = app.screen.width - progress * totalDist;
	}
}

// ========== 自动 MISS ==========

export function checkAutoMiss(
	state: GameState,
	app: Application,
	onJudgmentRef: RefObject<(event: JudgmentEvent) => void>,
	onScoreUpdateRef: RefObject<(score: number) => void>,
	onComboUpdateRef: RefObject<(combo: number) => void>,
) {
	const gameTime = getGameTime(state);
	const { notes, scoring } = state;
	for (const [key, note] of notes.active) {
		if (gameTime - note.configTime > MISS_WINDOW) {
			applyJudgment(scoring, "MISS", app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
			notes.active.delete(key);
			destroyNote(note);
		}
	}
}

// ========== 游戏结束 ==========

export function checkGameEnd(
	state: GameState,
	onGameEndRef: RefObject<(stats: GameStats) => void>,
) {
	const { lifecycle, notes, scoring } = state;
	const allSpawned = notes.nextIndex >= notes.configs.length;
	const allJudged = notes.active.size === 0;
	if (!allSpawned || !allJudged) return;

	const audio = state.audio;
	const audioDone =
		!audio ||
		audio.ended ||
		(audio.paused && audio.currentTime > 0.5) ||
		audio.currentTime >= (audio.duration || 0) - 0.1;

	if (!audioDone && audio && notes.configs.length > 0) return;

	lifecycle.running = false;
	audio?.pause();
	onGameEndRef.current({
		score: scoring.score,
		maxCombo: scoring.maxCombo,
		perfect: scoring.perfect,
		great: scoring.great,
		good: scoring.good,
		miss: scoring.miss,
	});
}

// ========== 输入处理 ==========

function findBestNote(notes: NotesState, gameTime: number): RuntimeNote | null {
	let bestNote: RuntimeNote | null = null;
	let bestDiff = Number.POSITIVE_INFINITY;
	for (const [, note] of notes.active) {
		const diff = Math.abs(gameTime - note.configTime);
		if (diff < bestDiff) {
			bestDiff = diff;
			bestNote = note;
		}
	}
	return bestNote;
}

export function handleInput(
	state: GameState,
	app: Application,
	onJudgmentRef: RefObject<(event: JudgmentEvent) => void>,
	onScoreUpdateRef: RefObject<(score: number) => void>,
	onComboUpdateRef: RefObject<(combo: number) => void>,
) {
	if (!state.lifecycle.running || state.lifecycle.paused) return;

	const { assets, notes, scoring } = state;

	const char = assets.charSprite;
	if (char && assets.charJumpTexture !== Texture.EMPTY) {
		char.texture = assets.charJumpTexture;
		if (assets.jumpTimeout) clearTimeout(assets.jumpTimeout);
		assets.jumpTimeout = setTimeout(() => {
			char.texture = assets.charRunTexture;
		}, JUMP_DURATION);
	}

	const gameTime = getGameTime(state);
	const bestNote = findBestNote(notes, gameTime);
	if (!bestNote) return;

	const level = judgeNote(gameTime - bestNote.configTime);
	applyJudgment(scoring, level, app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
	notes.active.delete(bestNote.id);
	destroyNote(bestNote);
}