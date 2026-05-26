import { useCallback, useState } from "react";
import { loadSongConfig } from "./data/songs";
import GameScreen from "./screens/GameScreen";
import MenuScreen from "./screens/MenuScreen";
import ResultScreen from "./screens/ResultScreen";
import type { GameScreen as GameScreenState, GameStats, NoteConfig } from "./types";

export default function App() {
	const [screen, setScreen] = useState<GameScreenState>("menu");

	// 游戏数据
	const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
	const [notes, setNotes] = useState<NoteConfig[]>([]);
	const [audioSrc, setAudioSrc] = useState("");
	const [gameStats, setGameStats] = useState<GameStats | null>(null);
	const [loading, setLoading] = useState(false);

	// 菜单 → 选歌 → 加载谱面 → 进入游戏
	const handleSelectSong = useCallback(async (songId: string) => {
		setLoading(true);
		try {
			const config = await loadSongConfig(songId);
			setSelectedSongId(songId);
			setNotes(config.notes);
			// 修正音频路径：Vite 静态资源从 public 根目录提供
			const fixedSrc = config.audioSrc.startsWith("/")
				? config.audioSrc
				: `/${config.audioSrc}`;
			setAudioSrc(fixedSrc);
			setScreen("playing");
		} catch (_err) {
			alert("加载谱面失败，请重试");
		} finally {
			setLoading(false);
		}
	}, []);

	// 游戏结束 → 结算
	const handleGameEnd = useCallback((stats: GameStats) => {
		setGameStats(stats);
		setScreen("results");
	}, []);

	// 结算 → 菜单
	const handleBackToMenu = useCallback(() => {
		setScreen("menu");
		setSelectedSongId(null);
		setNotes([]);
		setAudioSrc("");
		setGameStats(null);
	}, []);

	// 游戏中退出 → 菜单
	const handleQuit = useCallback(() => {
		setScreen("menu");
	}, []);

	if (loading) {
		return (
			<div
				style={{
					width: "100%",
					height: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#0f0f23",
					color: "#FFD700",
					fontFamily: "monospace",
					fontSize: 24,
				}}
			>
				Loading...
			</div>
		);
	}

	switch (screen) {
		case "menu":
			return <MenuScreen onSelectSong={handleSelectSong} />;
		case "playing":
			if (!selectedSongId) return null;
			return (
				<GameScreen
					key={selectedSongId}
					songId={selectedSongId}
					notes={notes}
					audioSrc={audioSrc}
					onQuit={handleQuit}
					onGameEnd={handleGameEnd}
				/>
			);
		case "results":
			if (!gameStats) return null;
			return (
				<ResultScreen stats={gameStats} onBackToMenu={handleBackToMenu} />
			);
	}
}
