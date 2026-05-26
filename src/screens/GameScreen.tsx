import { type FC, useCallback, useRef, useState } from "react";
import GameCanvas, { type GameCanvasHandle } from "../components/GameCanvas";
import HUD from "../components/HUD";
import JudgmentText from "../components/JudgmentText";
import PauseOverlay from "../components/PauseOverlay";
import type { GameStats, JudgmentEvent, NoteConfig } from "../types";

interface GameScreenProps {
	songId: string;
	notes: NoteConfig[];
	audioSrc: string;
	onQuit: () => void;
	onGameEnd: (stats: GameStats) => void;
}

/** 游戏核心界面 — 协调 Pixi 画布与 React HUD 叠加层 */
const GameScreen: FC<GameScreenProps> = ({
	notes,
	audioSrc,
	onQuit,
	onGameEnd,
}) => {
	const canvasRef = useRef<GameCanvasHandle>(null);

	// React 持有的 UI 状态（由 GameCanvas 回调驱动）
	const [score, setScore] = useState(0);
	const [combo, setCombo] = useState(0);
	const [paused, setPaused] = useState(false);
	const [judgmentEvent, setJudgmentEvent] = useState<JudgmentEvent | null>(null);

	// 判定回调 → 显示反馈文字
	const handleJudgment = useCallback((event: JudgmentEvent) => {
		setJudgmentEvent(event);
	}, []);

	// 分数 & Combo 实时更新
	const handleScoreUpdate = useCallback((newScore: number) => {
		setScore(newScore);
	}, []);

	const handleComboUpdate = useCallback((newCombo: number) => {
		setCombo(newCombo);
	}, []);

	// 游戏结束回调
	const handleGameEnd = useCallback(
		(stats: GameStats) => {
			onGameEnd(stats);
		},
		[onGameEnd],
	);

	// 暂停 / 继续
	const handlePause = useCallback(() => {
		setPaused(true);
		canvasRef.current?.pause();
	}, []);

	const handleResume = useCallback(() => {
		setPaused(false);
		canvasRef.current?.resume();
	}, []);

	const handleQuit = useCallback(() => {
		canvasRef.current?.pause();
		onQuit();
	}, [onQuit]);

	return (
		<div style={styles.wrapper}>
			{/* Pixi 画布（底层） */}
			<div style={styles.canvasLayer}>
				<GameCanvas
					ref={canvasRef}
					notes={notes}
					audioSrc={audioSrc}
					onJudgment={handleJudgment}
					onScoreUpdate={handleScoreUpdate}
					onComboUpdate={handleComboUpdate}
					onGameEnd={handleGameEnd}
				/>
			</div>

			{/* React HUD 叠加层 */}
			<HUD
				score={score}
				combo={combo}
				onPause={handlePause}
				visible={!paused}
			/>

			{/* 判定反馈文字 */}
			<JudgmentText event={judgmentEvent} />

			{/* 暂停覆盖层 */}
			{paused && <PauseOverlay onResume={handleResume} onQuit={handleQuit} />}
		</div>
	);
};

const styles: Record<string, React.CSSProperties> = {
	wrapper: {
		position: "relative",
		width: "100%",
		height: "100vh",
		overflow: "hidden",
	},
	canvasLayer: {
		position: "absolute",
		inset: 0,
	},
};

export default GameScreen;
