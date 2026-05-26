import { Application, extend, useApplication, useTick } from "@pixi/react";
import { Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import { judgeNote } from "../game/judgment";
import type {
	GameStats,
	JudgmentEvent,
	JudgmentLevel,
	NoteConfig,
} from "../types";

extend({ Container, Sprite });

const LEAD_TIME = 2.0;
const JUDGMENT_LINE_RATIO = 0.32;
const CHAR_X_RATIO = 0.16;
const NOTE_SCALE = 0.35;
const CHAR_SCALE = 0.5;
const MISS_WINDOW = 0.5;
const JUMP_DURATION = 280;

interface RuntimeNote {
	sprite: Sprite;
	configTime: number;
}

export interface GameCanvasHandle {
	startGame: (notes: NoteConfig[], audioSrc: string) => void;
	pause: () => void;
	resume: () => void;
}

interface GameCanvasProps {
	notes: NoteConfig[];
	audioSrc: string;
	onJudgment: (event: JudgmentEvent) => void;
	onScoreUpdate: (score: number) => void;
	onComboUpdate: (combo: number) => void;
	onGameEnd: (stats: GameStats) => void;
}

/** 纯函数：图片加载失败时生成 fallback 纯色纹理 */
function makeFallbackTexture(color: number, size: number): Texture {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return Texture.EMPTY;
	ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
	ctx.fillRect(0, 0, size, size);
	return Texture.from(canvas);
}

/** 稳定引用包装 — ref 对象身份不变，放入 deps 数组安全 */
function useStableRef<T>(value: T) {
	const ref = useRef(value);
	ref.current = value;
	return ref;
}

const GameWorld = forwardRef<GameCanvasHandle, GameCanvasProps>(
	({ notes, audioSrc, onJudgment, onScoreUpdate, onComboUpdate, onGameEnd }, ref) => {
		const { app } = useApplication();
		const containerRef = useRef<Container>(null);

		const onJudgmentRef = useStableRef(onJudgment);
		const onScoreUpdateRef = useStableRef(onScoreUpdate);
		const onComboUpdateRef = useStableRef(onComboUpdate);
		const onGameEndRef = useStableRef(onGameEnd);

	const gs = useRef({
		running: false,
		paused: false,
			ready: false,
			noteConfigs: [] as NoteConfig[],
		activeNotes: new Map<number, RuntimeNote>(),
		nextNoteIndex: 0,
		noteTexture: Texture.EMPTY,
		charRunTexture: Texture.EMPTY,
		charJumpTexture: Texture.EMPTY,
		charSprite: null as Sprite | null,
		jumpTimeout: null as ReturnType<typeof setTimeout> | null,
		audio: null as HTMLAudioElement | null,
		startTimestamp: 0, // performance.now() 基准 — 不含暂停时长
		pauseTimestamp: 0, // 暂停开始时刻
		score: 0,
		combo: 0,
		maxCombo: 0,
		perfect: 0,
		great: 0,
		good: 0,
		miss: 0,
		worldContainer: null as Container | null,
	});

	// 获取游戏时间（秒）— 音频播放时用其时钟，否则用 performance 计时器，暂停时冻结
	const getGameTime = useCallback((): number => {
		const state = gs.current;
		if (state.paused) {
			// 暂停中 → 返回暂停瞬间的时间
			return (state.pauseTimestamp - state.startTimestamp) / 1000;
		}
		const audio = state.audio;
		if (audio && !audio.paused && audio.readyState >= 2 && audio.duration > 0) {
			// 音频正在播放 → 以音频时钟为准，同步 startTimestamp
			state.startTimestamp = performance.now() - audio.currentTime * 1000;
		}
		return (performance.now() - state.startTimestamp) / 1000;
	}, []);

	const getJX = useCallback(
			() => app.screen.width * JUDGMENT_LINE_RATIO,
			[app.screen.width],
		);
		const getNY = useCallback(
			() => app.screen.height / 2,
			[app.screen.height],
		);

		const destroyNote = useCallback((note: RuntimeNote) => {
			if (note.sprite.parent) {
				note.sprite.parent.removeChild(note.sprite);
			}
			note.sprite.destroy();
		}, []);

		const applyJudgment = useCallback(
			(level: JudgmentLevel) => {
				const state = gs.current;
				const jx = getJX();
				const ny = getNY();

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
			},
			[getJX, getNY, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef],
		);

	const handleInput = useCallback(() => {
		const state = gs.current;
		if (!state.running || state.paused) return;

		const char = state.charSprite;
		if (char && state.charJumpTexture !== Texture.EMPTY) {
			char.texture = state.charJumpTexture;
			if (state.jumpTimeout) clearTimeout(state.jumpTimeout);
			state.jumpTimeout = setTimeout(() => {
				char.texture = state.charRunTexture;
			}, JUMP_DURATION);
		}

		const gameTime = getGameTime();

			let bestNote: RuntimeNote | null = null;
			let bestDiff = Number.POSITIVE_INFINITY;

			for (const [, note] of state.activeNotes) {
				const diff = Math.abs(gameTime - note.configTime);
				if (diff < bestDiff) {
					bestDiff = diff;
					bestNote = note;
				}
			}

			if (!bestNote) return;

			const level = judgeNote(gameTime - bestNote.configTime);
			applyJudgment(level);
			state.activeNotes.delete(bestNote.configTime);
			destroyNote(bestNote);
		}, [applyJudgment, destroyNote, getGameTime]);

	const checkAutoMiss = useCallback(() => {
			const state = gs.current;
			const gameTime = getGameTime();

			for (const [key, note] of state.activeNotes) {
				if (gameTime - note.configTime > MISS_WINDOW) {
					applyJudgment("MISS");
					state.activeNotes.delete(key);
					destroyNote(note);
				}
			}
		}, [applyJudgment, destroyNote, getGameTime]);

	const spawnNotes = useCallback(() => {
			const state = gs.current;
			const gameTime = getGameTime();
			const ny = getNY();
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
		}, [app.screen.width, getNY, getGameTime]);

	const updateNotePositions = useCallback(() => {
			const state = gs.current;
			const gameTime = getGameTime();
			const jx = getJX();
			const totalDist = app.screen.width - jx;

			for (const [, note] of state.activeNotes) {
			const elapsed = gameTime - (note.configTime - LEAD_TIME);
			const progress = Math.max(0, elapsed / LEAD_TIME);
			note.sprite.x = app.screen.width - progress * totalDist;
			}
		}, [app.screen.width, getJX, getGameTime]);

	const checkGameEnd = useCallback(() => {
			const state = gs.current;
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
		}, [onGameEndRef]);

		const doStartGame = useCallback(
			(notes: NoteConfig[], audioSrc: string) => {
				const state = gs.current;

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

			onScoreUpdateRef.current(0);
				onComboUpdateRef.current(0);

				if (state.audio) {
					state.audio.pause();
					state.audio = null;
				}
				if (audioSrc) {
					const audio = new Audio(audioSrc);
					audio.play().catch(() => {});
					state.audio = audio;
				}
				state.running = true;
			},
			[destroyNote, onScoreUpdateRef, onComboUpdateRef],
		);

		// 一次性初始化 — 加载资源并构建场景
		// biome-ignore lint/correctness/useExhaustiveDependencies: 只运行一次装载；所有可变状态通过 gs ref 访问
		useEffect(() => {
			const state = gs.current;
			let disposed = false;

			async function init() {
				let container = containerRef.current;
				if (!container) {
					for (let i = 0; i < 40 && !disposed; i++) {
						await new Promise((r) => setTimeout(r, 50));
						container = containerRef.current;
						if (container) break;
					}
				}
				if (disposed || !container) return;
				state.worldContainer = container;

		let noteTex: Texture;
		let charRunTex: Texture;
		let charJumpTex: Texture;
		try {
			[noteTex, charRunTex, charJumpTex] = await Promise.all([
				Assets.load("/assets/collectibles/cong.png"),
				Assets.load("/assets/sprites/miku/run.png"),
				Assets.load("/assets/sprites/miku/jump.png"),
			]);
		} catch {
			noteTex = makeFallbackTexture(0xffd700, 64);
			charRunTex = makeFallbackTexture(0x00ccff, 128);
			charJumpTex = makeFallbackTexture(0xff69b4, 128);
		}
		if (disposed) return;
		state.noteTexture = noteTex;
		state.charRunTexture = charRunTex;
		state.charJumpTexture = charJumpTex;

				if (app.screen.width < 10 || app.screen.height < 10) {
					for (let i = 0; i < 20 && !disposed; i++) {
						await new Promise((r) => setTimeout(r, 100));
						if (app.screen.width >= 10 && app.screen.height >= 10) break;
					}
				}
				if (disposed) return;

				const bg = new Graphics();
				bg.rect(0, 0, app.screen.width, app.screen.height);
				bg.fill({ color: 0x1a1a2e });
				container.addChild(bg);

			const charSprite = new Sprite(charRunTex);
			charSprite.anchor.set(0.5);
			charSprite.x = app.screen.width * CHAR_X_RATIO;
			charSprite.y = app.screen.height / 2;
			charSprite.scale.set(CHAR_SCALE);
			container.addChild(charSprite);
			state.charSprite = charSprite;

				const jx = app.screen.width * JUDGMENT_LINE_RATIO;
				const lineGfx = new Graphics();
				const dashLen = 12;
				const gapLen = 8;
				for (let yy = 0; yy < app.screen.height; yy += dashLen + gapLen) {
					lineGfx
						.moveTo(jx, yy)
						.lineTo(jx, Math.min(yy + dashLen, app.screen.height))
						.stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
				}
				container.addChild(lineGfx);

				state.ready = true;

				if (notes.length > 0 && !state.running) {
					doStartGame(notes, audioSrc);
				}
			}

			init();

			const canvas = app.canvas;
			const onPointerDown = (e: PointerEvent) => {
				e.preventDefault();
				handleInput();
			};
			canvas.addEventListener("pointerdown", onPointerDown);

		return () => {
			disposed = true;
			if (state.jumpTimeout) clearTimeout(state.jumpTimeout);
			canvas.removeEventListener("pointerdown", onPointerDown);
		};
		}, []);

		useTick((ticker) => {
			const state = gs.current;
			if (!state.running || state.paused || !state.ready) return;
			void ticker;

			spawnNotes();
			updateNotePositions();
			checkAutoMiss();
			checkGameEnd();
		});

		useImperativeHandle(ref, () => ({
			pause() {
			const state = gs.current;
			state.paused = true;
			state.pauseTimestamp = performance.now();
			state.audio?.pause();
		},
		resume() {
			const state = gs.current;
			state.paused = false;
			// 排除暂停时长，保持游戏时间连续
			state.startTimestamp += performance.now() - state.pauseTimestamp;
			state.audio?.play().catch(() => {});
		},
		}));

		return <pixiContainer ref={containerRef} />;
	},
);

GameWorld.displayName = "GameWorld";

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>((props, ref) => {
	return (
		<Application background={"#1a1a2e"} resizeTo={window}>
			<GameWorld ref={ref} {...props} />
		</Application>
	);
});

GameCanvas.displayName = "GameCanvas";

export default GameCanvas;
