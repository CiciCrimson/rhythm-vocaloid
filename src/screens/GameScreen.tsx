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

const GameScreen: FC<GameScreenProps> = ({
	notes,
	audioSrc,
	onQuit,
	onGameEnd,
}) => {
	const canvasRef = useRef<GameCanvasHandle>(null);

	const [score, setScore] = useState(0);
	const [combo, setCombo] = useState(0);
	const [paused, setPaused] = useState(false);
	const [judgmentEvent, setJudgmentEvent] = useState<JudgmentEvent | null>(null);

	const handleJudgment = useCallback((event: JudgmentEvent) => {
		setJudgmentEvent(event);
	}, []);

	const handleScoreUpdate = useCallback((newScore: number) => {
		setScore(newScore);
	}, []);

	const handleComboUpdate = useCallback((newCombo: number) => {
		setCombo(newCombo);
	}, []);

	const handleGameEnd = useCallback(
		(stats: GameStats) => {
			onGameEnd(stats);
		},
		[onGameEnd],
	);

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

			<HUD
				score={score}
				combo={combo}
				onPause={handlePause}
				visible={!paused}
			/>

			<JudgmentText event={judgmentEvent} />

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
