import { type FC, useState } from "react";
import { getSongList } from "../data/songs";
import type { SongMeta } from "../types";

interface MenuScreenProps {
	onSelectSong: (songId: string) => void;
}

const BACKGROUND = "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #16213e 100%)";

const MenuScreen: FC<MenuScreenProps> = ({ onSelectSong }) => {
	const [songs] = useState(getSongList);

	return (
		<div style={styles.container}>
			<h1 style={styles.title}>Rhythm VOCALOID</h1>
			<p style={styles.subtitle}>节奏术力口</p>

			<div style={styles.grid}>
				{songs.map((song) => (
					<SongCard
						key={song.songId}
						song={song}
						onClick={() => {
							if (song.unlocked) {
								onSelectSong(song.songId);
							} else {
								alert("🔒 该歌曲尚未解锁");
							}
						}}
					/>
				))}
			</div>
		</div>
	);
};

const SongCard: FC<{ song: SongMeta; onClick: () => void }> = ({
	song,
	onClick,
}) => {
	const locked = !song.unlocked;
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				...styles.card,
				opacity: locked ? 0.45 : 1,
				cursor: locked ? "not-allowed" : "pointer",
			}}
			disabled={false}
		>
			<div style={styles.coverPlaceholder}>
				{locked ? "🔒" : "🎵"}
			</div>
			<div style={styles.cardBody}>
				<div style={styles.songTitle}>{song.title}</div>
				<div style={styles.songArtist}>{song.artist}</div>
				<div style={styles.songMeta}>
					BPM {song.bpm} · {formatDuration(song.duration)}
				</div>
			</div>
			{locked && <div style={styles.lockBadge}>未解锁</div>}
		</button>
	);
};

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${String(s).padStart(2, "0")}`;
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		width: "100%",
		minHeight: "100vh",
		background: BACKGROUND,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: "40px 20px",
		boxSizing: "border-box",
	},
	title: {
		color: "#FFD700",
		fontSize: 42,
		fontFamily: "monospace",
		margin: "0 0 4px",
		textShadow: "0 0 20px rgba(255, 215, 0, 0.4)",
		letterSpacing: 4,
	},
	subtitle: {
		color: "rgba(255, 255, 255, 0.5)",
		fontSize: 16,
		fontFamily: "monospace",
		margin: "0 0 40px",
	},
	grid: {
		display: "flex",
		flexWrap: "wrap",
		gap: 24,
		justifyContent: "center",
		maxWidth: 900,
		width: "100%",
	},
	card: {
		width: 260,
		background: "rgba(255, 255, 255, 0.06)",
		border: "1px solid rgba(255, 255, 255, 0.12)",
		borderRadius: 12,
		overflow: "hidden",
		transition: "transform 0.2s, border-color 0.2s",
		color: "#fff",
		textAlign: "left" as const,
		padding: 0,
		position: "relative" as const,
	},
	coverPlaceholder: {
		width: "100%",
		height: 140,
		background: "rgba(255, 255, 255, 0.04)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: 48,
	},
	cardBody: {
		padding: "16px",
	},
	songTitle: {
		fontSize: 18,
		fontWeight: "bold",
		fontFamily: "monospace",
		color: "#FFD700",
		marginBottom: 4,
	},
	songArtist: {
		fontSize: 14,
		color: "rgba(255, 255, 255, 0.6)",
		fontFamily: "monospace",
		marginBottom: 4,
	},
	songMeta: {
		fontSize: 12,
		color: "rgba(255, 255, 255, 0.35)",
		fontFamily: "monospace",
	},
	lockBadge: {
		position: "absolute",
		top: 8,
		right: 8,
		background: "rgba(0, 0, 0, 0.6)",
		color: "#FF6B6B",
		fontSize: 11,
		fontFamily: "monospace",
		padding: "2px 8px",
		borderRadius: 4,
	},
};

export default MenuScreen;
