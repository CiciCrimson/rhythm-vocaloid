import type { RefObject } from "react";
import { type Application, Sprite, Texture } from "pixi.js";
import {
	JUDGMENT_LINE_RATIO,
	JUMP_DURATION,
	LEAD_TIME,
	MISS_WINDOW,
	NOTE_SCALE,
} from "./constants";
import { judgeNote } from "./judgment";
import type { GameState, RuntimeNote } from "./types";
import type { GameStats, JudgmentEvent, JudgmentLevel, NoteConfig } from "../types";

export function createInitialState(): GameState {
	return {
		running: false,
		paused: false,
		ready: false,
		noteConfigs: [],
		activeNotes: new Map(),
		nextNoteIndex: 0,
		noteTexture: Texture.EMPTY,
		charRunTexture: Texture.EMPTY,
		charJumpTexture: Texture.EMPTY,
		charSprite: null,
		jumpTimeout: null,
		audio: null,
		startTimestamp: 0,
		pauseTimestamp: 0,
		score: 0,
		combo: 0,
		maxCombo: 0,
		perfect: 0,
		great: 0,
		good: 0,
		miss: 0,
		worldContainer: null,
	};
}

export function getGameTime(state: GameState): number {
	if (state.paused) {
		return (state.pauseTimestamp - state.startTimestamp) / 1000;
	}
	const audio = state.audio;
	if (audio && !audio.paused && audio.readyState >= 2 && audio.duration > 0) {
		state.startTimestamp = performance.now() - audio.currentTime * 1000;
	}
	return (performance.now() - state.startTimestamp) / 1000;
}

export function destroyNote(note: RuntimeNote) {
	if (note.sprite.parent) {
		note.sprite.parent.removeChild(note.sprite);
	}
	note.sprite.destroy();
}

export function resetState(state: GameState, notes: NoteConfig[]) {
	if (state.jumpTimeout) {
		clearTimeout(state.jumpTimeout);
		state.jumpTimeout = null;
	}
	if (state.charSprite) {
		state.charSprite.texture = state.charRunTexture;
	}
	for (const [, note] of state.activeNotes) {
		destroyNote(note);
	}
	state.activeNotes.clear();
	state.noteConfigs = notes;
	state.nextNoteIndex = 0;
	state.score = 0;
	state.combo = 0;
	state.maxCombo = 0;
	state.perfect = 0;
	state.great = 0;
	state.good = 0;
	state.miss = 0;
	state.paused = false;
	state.startTimestamp = performance.now();
}

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

export function applyJudgment(
	state: GameState,
	level: JudgmentLevel,
	app: Application,
	onJudgmentRef: RefObject<(event: JudgmentEvent) => void>,
	onScoreUpdateRef: RefObject<(score: number) => void>,
	onComboUpdateRef: RefObject<(combo: number) => void>,
) {
	const jx = app.screen.width * JUDGMENT_LINE_RATIO;
	const ny = app.screen.height / 2;

	state.combo = level === "MISS" ? 0 : state.combo + 1;
	if (state.combo > state.maxCombo) {
		state.maxCombo = state.combo;
	}
	switch (level) {
		case "PERFECT":
			state.score += 300;
			state.perfect++;
			break;
		case "GREAT":
			state.score += 200;
			state.great++;
			break;
		case "GOOD":
			state.score += 100;
			state.good++;
			break;
		case "MISS":
			state.miss++;
			break;
	}

	onJudgmentRef.current({
		level,
		timestamp: performance.now(),
		x: jx,
		y: ny,
	});
	onScoreUpdateRef.current(state.score);
	onComboUpdateRef.current(state.combo);
}

export function spawnNotes(state: GameState, app: Application) {
	const gameTime = getGameTime(state);
	const ny = app.screen.height / 2;
	const container = state.worldContainer;
	if (!container) return;

	while (state.nextNoteIndex < state.noteConfigs.length) {
		const config = state.noteConfigs[state.nextNoteIndex];
		const spawnTime = config.time - LEAD_TIME;
		if (gameTime < spawnTime) break;

		const sprite = new Sprite(state.noteTexture);
		sprite.anchor.set(0.5);
		sprite.x = app.screen.width;
		sprite.y = ny;
		sprite.scale.set(NOTE_SCALE);
		container.addChild(sprite);

		state.activeNotes.set(config.time, {
			sprite,
			configTime: config.time,
		});
		state.nextNoteIndex++;
	}
}

export function updateNotePositions(state: GameState, app: Application) {
	const gameTime = getGameTime(state);
	const jx = app.screen.width * JUDGMENT_LINE_RATIO;
	const totalDist = app.screen.width - jx;

	for (const [, note] of state.activeNotes) {
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
	onComboUpdateRef: RefObject<(combo: number) => void>,
) {
	const gameTime = getGameTime(state);
	for (const [key, note] of state.activeNotes) {
		if (gameTime - note.configTime > MISS_WINDOW) {
			applyJudgment(state, "MISS", app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
			state.activeNotes.delete(key);
			destroyNote(note);
		}
	}
}

export function checkGameEnd(
	state: GameState,
	onGameEndRef: RefObject<(stats: GameStats) => void>,
) {
	const allSpawned = state.nextNoteIndex >= state.noteConfigs.length;
	const allJudged = state.activeNotes.size === 0;
	if (!allSpawned || !allJudged) return;

	const audioDone =
		!state.audio ||
		state.audio.ended ||
		(state.audio.paused && state.audio.currentTime > 0.5) ||
		state.audio.currentTime >= (state.audio.duration || 0) - 0.1;

	if (!audioDone && state.audio && state.noteConfigs.length > 0) return;

	state.running = false;
	state.audio?.pause();
	onGameEndRef.current({
		score: state.score,
		maxCombo: state.maxCombo,
		perfect: state.perfect,
		great: state.great,
		good: state.good,
		miss: state.miss,
	});
}

function findBestNote(state: GameState, gameTime: number): RuntimeNote | null {
	let bestNote: RuntimeNote | null = null;
	let bestDiff = Number.POSITIVE_INFINITY;
	for (const [, note] of state.activeNotes) {
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
	if (!state.running || state.paused) return;

	const char = state.charSprite;
	if (char && state.charJumpTexture !== Texture.EMPTY) {
		char.texture = state.charJumpTexture;
		if (state.jumpTimeout) clearTimeout(state.jumpTimeout);
		state.jumpTimeout = setTimeout(() => {
			char.texture = state.charRunTexture;
		}, JUMP_DURATION);
	}

	const gameTime = getGameTime(state);
	const bestNote = findBestNote(state, gameTime);
	if (!bestNote) return;

	const level = judgeNote(gameTime - bestNote.configTime);
	applyJudgment(state, level, app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
	state.activeNotes.delete(bestNote.configTime);
	destroyNote(bestNote);
}
