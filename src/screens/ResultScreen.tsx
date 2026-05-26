import type { FC } from "react";
import type { GameStats } from "../types";

interface ResultScreenProps {
	stats: GameStats;
	onBackToMenu: () => void;
}

const BACKGROUND = "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #16213e 100%)";

const ResultScreen: FC<ResultScreenProps> = ({ stats, onBackToMenu }) => {
	const totalNotes = stats.perfect + stats.great + stats.good + stats.miss;
	const grade = getGrade(stats, totalNotes);

	return (
		<div style={styles.container}>
			<div style={styles.card}>
				<div style={styles.grade}>{grade}</div>

				<div style={styles.scoreLabel}>最终得分</div>
				<div style={styles.score}>{String(stats.score).padStart(8, "0")}</div>

				<div style={styles.statRow}>
					<span style={styles.statLabel}>Max Combo</span>
					<span style={styles.statValue}>{stats.maxCombo}</span>
				</div>

				<div style={styles.divider} />
				<div style={styles.judgmentGrid}>
					<JudgmentItem label="PERFECT" count={stats.perfect} color="#FFD700" />
					<JudgmentItem label="GREAT" count={stats.great} color="#00FF88" />
					<JudgmentItem label="GOOD" count={stats.good} color="#4488FF" />
					<JudgmentItem label="MISS" count={stats.miss} color="#FF4444" />
				</div>

				<button type="button" style={styles.backBtn} onClick={onBackToMenu}>
					返回主菜单
				</button>
			</div>
		</div>
	);
};

const JudgmentItem: FC<{
	label: string;
	count: number;
	color: string;
}> = ({ label, count, color }) => (
	<div style={styles.judgmentItem}>
		<span style={{ ...styles.judgmentLabel, color }}>{label}</span>
		<span style={styles.judgmentCount}>{count}</span>
	</div>
);

function getGrade(stats: GameStats, total: number): string {
	if (total === 0) return "—";
	const perfectRate = stats.perfect / total;
	if (stats.miss === 0 && perfectRate >= 0.95) return "S";
	if (stats.miss === 0 && perfectRate >= 0.8) return "A";
	if (perfectRate >= 0.6) return "B";
	if (perfectRate >= 0.4) return "C";
	return "D";
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		width: "100%",
		minHeight: "100vh",
		background: BACKGROUND,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	card: {
		background: "rgba(30, 30, 60, 0.9)",
		border: "2px solid rgba(255, 255, 255, 0.12)",
		borderRadius: 16,
		padding: "40px 56px",
		textAlign: "center",
		minWidth: 340,
	},
	grade: {
		fontSize: 64,
		fontWeight: "bold",
		fontFamily: "monospace",
		color: "#FFD700",
		textShadow: "0 0 30px rgba(255, 215, 0, 0.5)",
		marginBottom: 16,
	},
	scoreLabel: {
		fontSize: 14,
		fontFamily: "monospace",
		color: "rgba(255, 255, 255, 0.5)",
		marginBottom: 4,
	},
	score: {
		fontSize: 36,
		fontWeight: "bold",
		fontFamily: "monospace",
		color: "#FFD700",
		textShadow: "2px 2px 4px rgba(0,0,0,0.6)",
		letterSpacing: 3,
		marginBottom: 24,
	},
	statRow: {
		display: "flex",
		justifyContent: "space-between",
		padding: "8px 0",
	},
	statLabel: {
		fontSize: 16,
		fontFamily: "monospace",
		color: "rgba(255, 255, 255, 0.6)",
	},
	statValue: {
		fontSize: 16,
		fontWeight: "bold",
		fontFamily: "monospace",
		color: "#FF6B6B",
	},
	divider: {
		height: 1,
		background: "rgba(255, 255, 255, 0.1)",
		margin: "16px 0",
	},
	judgmentGrid: {
		display: "flex",
		justifyContent: "center",
		gap: 24,
		marginBottom: 32,
	},
	judgmentItem: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: 4,
	},
	judgmentLabel: {
		fontSize: 12,
		fontWeight: "bold",
		fontFamily: "monospace",
	},
	judgmentCount: {
		fontSize: 20,
		fontWeight: "bold",
		fontFamily: "monospace",
		color: "#fff",
	},
	backBtn: {
		padding: "12px 40px",
		fontSize: 18,
		fontFamily: "monospace",
		borderRadius: 8,
		border: "2px solid rgba(255, 255, 255, 0.3)",
		background: "rgba(255, 255, 255, 0.1)",
		color: "#fff",
		cursor: "pointer",
	},
};

export default ResultScreen;
