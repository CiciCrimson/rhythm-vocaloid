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
import { getGameTime } from "./timing";
import type {
	GameState,
	LifecycleState,
	NotesState,
	RuntimeNote,
	ScoringState,
	SceneAssets,
} from "./types";
import type { GameStats, JudgmentEvent, JudgmentLevel, NoteConfig } from "../types";

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
		bgGraphics: null,
		lineGraphics: null,
	};
}

export function createInitialState(): GameState {
	return {
		lifecycle: createLifecycle(),
		scoring: createScoring(),
		notes: createNotesState(),
		assets: createSceneAssets(),
		timing: {
			audioCtx: null,
			sourceNode: null,
			audioBuffer: null,
			audioStartTime: 0,
			pauseElapsed: 0,
		},
	};
}

export function destroyNote(note: RuntimeNote) {
	if (note.sprite.parent) {
		note.sprite.parent.removeChild(note.sprite);
	}
	note.sprite.destroy();
}

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
	state.timing.pauseElapsed = 0;
}

export function applyJudgment(
	scoring: ScoringState,
	level: JudgmentLevel,
	app: Application,
	onJudgmentRef: RefObject<(event: JudgmentEvent) => void>,
	onScoreUpdateRef: RefObject<(score: number) => void>,
	onComboUpdateRef: RefObject<(combo: number) => void>
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

export function spawnNotes(state: GameState, app: Application) {
	const gameTime = getGameTime(state.timing);
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

export function updateNotePositions(state: GameState, app: Application) {
	const gameTime = getGameTime(state.timing);
	const jx = app.screen.width * JUDGMENT_LINE_RATIO;
	const totalDist = app.screen.width - jx;

	for (const [, note] of state.notes.active) {
		const elapsed = gameTime - (note.configTime - LEAD_TIME);
		const progress = Math.max(0, elapsed / LEAD_TIME);
		note.sprite.x = app.screen.width - progress * totalDist;
	}
}

export function checkAutoMiss(
	state: GameState,
	app: Application,
	onJudgmentRef: RefObject<(event: JudgmentEvent) => void>,
	onScoreUpdateRef: RefObject<(score: number) => void>,
	onComboUpdateRef: RefObject<(combo: number) => void>
) {
	const gameTime = getGameTime(state.timing);
	const { notes, scoring } = state;
	for (const [key, note] of notes.active) {
		if (gameTime - note.configTime > MISS_WINDOW) {
			applyJudgment(scoring, "MISS", app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
			notes.active.delete(key);
			destroyNote(note);
		}
	}
}

export function checkGameEnd(
	state: GameState,
	onGameEndRef: RefObject<(stats: GameStats) => void>
) {
	const { lifecycle, notes, scoring } = state;
	const allSpawned = notes.nextIndex >= notes.configs.length;
	const allJudged = notes.active.size === 0;
	if (!allSpawned || !allJudged) return;

	// 无音频或音频已播放完毕
	if (notes.configs.length > 0 && state.timing.audioBuffer && !isAudioDoneInternal(state)) {
		return;
	}

	lifecycle.running = false;
	onGameEndRef.current({
		score: scoring.score,
		maxCombo: scoring.maxCombo,
		perfect: scoring.perfect,
		great: scoring.great,
		good: scoring.good,
		miss: scoring.miss,
	});
}

function isAudioDoneInternal(state: GameState): boolean {
	const buf = state.timing.audioBuffer;
	if (!buf) return true;
	const gt = getGameTime(state.timing);
	return gt >= buf.duration;
}

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
	onComboUpdateRef: RefObject<(combo: number) => void>
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

	const gameTime = getGameTime(state.timing);
	const bestNote = findBestNote(notes, gameTime);
	if (!bestNote) return;

	const level = judgeNote(gameTime - bestNote.configTime);
	applyJudgment(scoring, level, app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
	notes.active.delete(bestNote.id);
	destroyNote(bestNote);
}
