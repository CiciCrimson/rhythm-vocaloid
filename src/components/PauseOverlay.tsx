import type { FC } from "react";

interface PauseOverlayProps {
	onResume: () => void;
	onQuit: () => void;
}

const PauseOverlay: FC<PauseOverlayProps> = ({ onResume, onQuit }) => {
	return (
		<div style={styles.backdrop}>
			<div style={styles.card}>
				<h2 style={styles.title}>暂停</h2>
				<div style={styles.buttons}>
					<button type="button" style={styles.btn} onClick={onResume}>
						继续
					</button>
					<button
						type="button"
						style={{ ...styles.btn, ...styles.quitBtn }}
						onClick={onQuit}
					>
						退出
					</button>
				</div>
			</div>
		</div>
	);
};

const styles: Record<string, React.CSSProperties> = {
	backdrop: {
		position: "absolute",
		inset: 0,
		background: "rgba(0, 0, 0, 0.7)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 50,
	},
	card: {
		background: "rgba(30, 30, 60, 0.95)",
		borderRadius: 16,
		padding: "40px 60px",
		textAlign: "center",
		border: "2px solid rgba(255, 255, 255, 0.15)",
	},
	title: {
		color: "#FFD700",
		fontSize: 36,
		margin: "0 0 32px",
		fontFamily: "monospace",
	},
	buttons: {
		display: "flex",
		gap: 16,
		justifyContent: "center",
	},
	btn: {
		padding: "12px 32px",
		fontSize: 18,
		borderRadius: 8,
		border: "2px solid rgba(255, 255, 255, 0.3)",
		background: "rgba(255, 255, 255, 0.1)",
		color: "#fff",
		cursor: "pointer",
		fontFamily: "monospace",
	},
	quitBtn: {
		borderColor: "rgba(255, 100, 100, 0.5)",
		color: "#FF6464",
	},
};

export default PauseOverlay;
