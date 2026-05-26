import { extend, useApplication, useTick } from "@pixi/react";
import { Container, Sprite } from "pixi.js";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import { useStableRef } from "../hooks/useStableRef";
import type { GameStats, JudgmentEvent, NoteConfig } from "../types";
import {
	checkAutoMiss,
	checkGameEnd,
	createInitialState,
	handleInput,
	resetState,
	spawnNotes,
	startAudio,
	updateNotePositions,
} from "../game/engine";
import { buildScene, loadTextures, waitForContainer, waitForScreen } from "../game/scene";

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
				const container = await waitForContainer(containerRef, disposed);
				if (disposed || !container) return;
				state.assets.container = container;

				const charRunTex = await loadTextures(state.assets, disposed);
				if (!charRunTex) return;

				await waitForScreen(app, disposed);
				if (disposed) return;

				buildScene(app, container, state.assets, charRunTex);
				state.lifecycle.ready = true;

				if (notes.length > 0 && !state.lifecycle.running) {
					resetState(state, notes);
					startAudio(state, audioSrc);
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

			return () => {
				disposed = true;
				if (state.assets.jumpTimeout) clearTimeout(state.assets.jumpTimeout);
				canvas.removeEventListener("pointerdown", onPointerDown);
			};
		}, [app, audioSrc, notes, onComboUpdateRef, onJudgmentRef, onScoreUpdateRef]);

		useTick(() => {
			const state = gameState.current;
			if (!state.lifecycle.running || state.lifecycle.paused || !state.lifecycle.ready) return;

			spawnNotes(state, app);
			updateNotePositions(state, app);
			checkAutoMiss(state, app, onJudgmentRef, onScoreUpdateRef, onComboUpdateRef);
			checkGameEnd(state, onGameEndRef);
		});

		useImperativeHandle(ref, () => ({
			startGame(newNotes: NoteConfig[], newAudioSrc: string) {
				const state = gameState.current;
				resetState(state, newNotes);
				startAudio(state, newAudioSrc);
				state.lifecycle.running = true;
				onScoreUpdateRef.current(0);
				onComboUpdateRef.current(0);
			},
			pause() {
				const state = gameState.current;
				state.lifecycle.paused = true;
				state.pauseTimestamp = performance.now();
				state.audio?.pause();
			},
			resume() {
				const state = gameState.current;
				state.lifecycle.paused = false;
				state.startTimestamp += performance.now() - state.pauseTimestamp;
				state.audio?.play().catch(() => {});
			},
		}));

		return <pixiContainer ref={containerRef} />;
	},
);

GameWorld.displayName = "GameWorld";

export default GameWorld;