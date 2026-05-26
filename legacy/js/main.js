/**
 * main.js - 选歌页入口逻辑
 * 节奏术力口 Rhythm VOCALOID
 */

import { SONGS } from "./config.js";

// 歌曲图标 emoji（占位）
const SONG_ICONS = {
	levan_polkka: "🎶",
	ordinary_disco: "🪩",
	igaku: "💊",
};

/**
 * 初始化歌曲卡片列表
 */
function initSongCards() {
	const container = document.getElementById("songCards");
	if (!container) return;

	container.innerHTML = "";

	SONGS.forEach((song) => {
		const card = createSongCard(song);
		container.appendChild(card);
	});
}

/**
 * 创建单张歌曲卡片 DOM
 * @param {Object} song - 歌曲配置对象
 * @returns {HTMLElement}
 */
function createSongCard(song) {
	const card = document.createElement("div");
	card.className = `song-card ${song.available ? "available" : "locked"}`;
	card.style.setProperty("--card-color", song.color);
	card.style.setProperty("--card-bg", song.bgColor);

	card.innerHTML = `
    <div class="card-bg"></div>
    <div class="card-icon">${SONG_ICONS[song.id] || "🎵"}</div>
    <div class="card-content">
      <div class="card-title">${song.title}</div>
      <div class="card-artist">${song.artist}</div>
    </div>
    <div class="card-color-bar"></div>
    ${
		!song.available
			? `
      <div class="card-lock-overlay">
        <div class="lock-icon">🔒</div>
        <div class="lock-text">即将上线</div>
      </div>
    `
			: ""
	}
  `;

	if (song.available) {
		// 点击事件（桌面端）
		card.addEventListener("click", () => onSongSelect(song.id));
		// 触摸事件（移动端，无延迟）
		card.addEventListener(
			"touchend",
			(e) => {
				e.preventDefault();
				onSongSelect(song.id);
			},
			{ passive: false }
		);
	}

	return card;
}

/**
 * 选歌后跳转到游戏页
 * @param {string} songId - 歌曲 ID
 */
function onSongSelect(songId) {
	// 用 URLSearchParams 传参，避免 localStorage 在 iOS 隐私模式失效
	window.location.href = `game.html?song=${encodeURIComponent(songId)}`;
}

/**
 * 加载歌曲配置 JSON
 * @param {string} songId
 * @returns {Promise<Object>}
 */
export async function loadSongConfig(songId) {
	const song = SONGS.find((s) => s.id === songId);
	if (!song) throw new Error(`未知歌曲 ID: ${songId}`);

	const response = await fetch(song.configPath);
	if (!response.ok) throw new Error(`无法加载配置: ${song.configPath}`);

	return response.json();
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", initSongCards);
