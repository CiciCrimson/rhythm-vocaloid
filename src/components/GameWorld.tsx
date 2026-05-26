import { extend, useApplication, useTick } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useStableRef } from "../hooks/useStableRef";
import type { GameStats, JudgmentEvent, NoteConfig } from "../types";
import {
	checkAutoMiss,
	checkGameEnd,
	createInitialState,
	handleInput,
	resetState,
	spawnNotes,
	updateNotePositions,
} from "../game/engine";
import {
	destroyTiming,
	initAudioContext,
	loadAudioBuffer,
	pausePlayback,
	resumePlayback,
	startPlayback,
	stopPlayback,
} from "../game/timing";
import {
	buildScene,
	layoutScene,
	loadTextures,
	waitForContainer,
	waitForScreen,
} from "../game/scene";

extend({ Container, Sprite });

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

const GameWorld = forwardRef<GameCanvasHandle, GameCanvasProps>(
	({ notes, audioSrc, onJudgment, onScoreUpdate, onComboUpdate, onGameEnd }, ref) => {
		const { app } = useApplication();
		const containerRef = useRef<Container>(null);
		const gameState = useRef(createInitialState());

		const onJudgmentRef = useStableRef(onJudgment);
		const onScoreUpdateRef = useStableRef(onScoreUpdate);
		const onComboUpdateRef = useStableRef(onComboUpdate);
		const onGameEndRef = useStableRef(onGameEnd);

		useEffect(() => {
			const state = gameState.current;
			let disposed = false;

			async function init() {
				// 1. 创建 AudioContext（需用户手势）
				const ctx = initAudioContext(state.timing);
				if (disposed) return;

				// 2. 等待容器就绪
				const container = await waitForContainer(containerRef, disposed);
				if (disposed || !container) return;
				state.assets.container = container;

				// 3. 加载纹理
				const charRunTex = await loadTextures(state.assets, disposed);
				if (!charRunTex) return;

				// 4. 等待画布就绪
				await waitForScreen(app, disposed);
				if (disposed) return;

				// 5. 构建场景
				buildScene(app, container, state.assets, charRunTex);
				state.lifecycle.ready = true;

				if (notes.length > 0 && !state.lifecycle.running) {
					// 6. 加载音频
					await loadAudioBuffer(state.timing, audioSrc);
					if (disposed) return;

					// 7. 重置状态并开始
					resetState(state, notes);
					startPlayback(state.timing);
					state.lifecycle.running = true;
					onScoreUpdateRef.current(0);
					onComboUpdateRef.current(0);
				}
			}

			init();

			const canvas = app.canvas;
			const onPointerDown = (e: PointerEvent) => {
				e.preventDefault();
				handleInput(state, app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
			};
			canvas.addEventListener("pointerdown", onPointerDown);

			// Resize 回调：重排场景中的静态元素
			const onResize = () => {
				if (!state.lifecycle.ready) return;
				layoutScene(app, state.assets);
			};
			app.renderer.on("resize", onResize);

			return () => {
				disposed = true;
				if (state.assets.jumpTimeout) clearTimeout(state.assets.jumpTimeout);
				stopPlayback(state.timing);
				app.renderer.off("resize", onResize);
				canvas.removeEventListener("pointerdown", onPointerDown);
			};
		}, [app, audioSrc, notes, onComboUpdateRef, onJudgmentRef, onScoreUpdateRef]);

		useTick(() => {
			const state = gameState.current;
			if (!state.lifecycle.running || state.lifecycle.paused || !state.lifecycle.ready)
				return;

			spawnNotes(state, app);
			updateNotePositions(state, app);
			checkAutoMiss(state, app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
			checkGameEnd(state, onGameEndRef);
		});

		useImperativeHandle(ref, () => ({
			startGame(newNotes: NoteConfig[], newAudioSrc: string) {
				const state = gameState.current;
				resetState(state, newNotes);
				// 异步加载音频后播放
				loadAudioBuffer(state.timing, newAudioSrc).then(() => {
					startPlayback(state.timing);
					state.lifecycle.running = true;
					onScoreUpdateRef.current(0);
					onComboUpdateRef.current(0);
				});
			},
			pause() {
				pausePlayback(gameState.current.timing);
				gameState.current.lifecycle.paused = true;
			},
			resume() {
				resumePlayback(gameState.current.timing);
				gameState.current.lifecycle.paused = false;
			},
		}));

		return <pixiContainer ref={containerRef} />;
	}
);

GameWorld.displayName = "GameWorld";

export default GameWorld;
