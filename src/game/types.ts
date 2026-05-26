import type { Container, Sprite, Texture } from "pixi.js";
import type { NoteConfig } from "../types";

export interface RuntimeNote {
	sprite: Sprite;
	configTime: number;
}

export interface GameState {
	running: boolean;
	paused: boolean;
	ready: boolean;
	noteConfigs: NoteConfig[];
	activeNotes: Map<number, RuntimeNote>;
	nextNoteIndex: number;
	noteTexture: Texture;
	charRunTexture: Texture;
	charJumpTexture: Texture;
	charSprite: Sprite | null;
	jumpTimeout: ReturnType<typeof setTimeout> | null;
	audio: HTMLAudioElement | null;
	startTimestamp: number;
	pauseTimestamp: number;
	score: number;
	combo: number;
	maxCombo: number;
	perfect: number;
	great: number;
	good: number;
	miss: number;
	worldContainer: Container | null;
}
