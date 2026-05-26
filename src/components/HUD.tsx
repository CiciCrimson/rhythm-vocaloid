import { type FC, memo } from "react";

interface HUDProps {
	score: number;
	combo: number;
	onPause: () => void;
	visible: boolean;
}

const HUD: FC<HUDProps> = memo(({ score, combo, onPause, visible }) => {
	if (!visible) return null;

	return (
		<div style={styles.container}>
			<button type="button" onClick={onPause} style={styles.pauseBtn} aria-label="暂停">
				⏸
			</button>

			<div style={styles.scoreSection}>
				<div style={styles.score}>{String(score).padStart(8, "0")}</div>
				{combo >= 2 && <div style={styles.combo}>{combo} combo</div>}
			</div>
		</div>
	);
});

HUD.displayName = "HUD";

const styles: Record<string, React.CSSProperties> = {
	container: {
		position: "absolute",
		inset: 0,
		pointerEvents: "none",
		zIndex: 10,
	},
	pauseBtn: {
		position: "absolute",
		top: 16,
		left: 16,
		width: 48,
		height: 48,
		borderRadius: "50%",
		border: "2px solid rgba(255,255,255,0.3)",
		background: "rgba(0,0,0,0.5)",
		color: "#fff",
		fontSize: 20,
		cursor: "pointer",
		pointerEvents: "auto",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	scoreSection: {
		position: "absolute",
		top: 16,
		right: 24,
		textAlign: "right",
	},
	score: {
		fontFamily: "monospace",
		fontSize: 28,
		fontWeight: "bold",
		color: "#FFD700",
		textShadow: "2px 2px 4px rgba(0,0,0,0.6)",
		letterSpacing: 2,
	},
	combo: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#FF6B6B",
		textShadow: "1px 1px 3px rgba(0,0,0,0.6)",
		marginTop: 4,
	},
};

export default HUD;
