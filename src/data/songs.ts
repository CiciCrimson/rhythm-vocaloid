import type { SongConfig, SongMeta } from "../types";

// 歌曲注册表 — 对应 public/config 下的谱面文件
const SONG_REGISTRY: SongMeta[] = [
	{
		songId: "levan_polkka",
		title: "甩葱歌",
		artist: "初音未来",
		bpm: 119,
		duration: 70.5,
		unlocked: true,
	},
	{
		songId: "ordinary_disco",
		title: "普通 DISCO",
		artist: "洛天依 / 言和",
		bpm: 128,
		duration: 105,
		unlocked: false,
	},
	{
		songId: "igaku",
		title: "医学",
		artist: "重音 Teto",
		bpm: 160,
		duration: 90,
		unlocked: false,
	},
];

// 谱面缓存，避免重复请求
const configCache = new Map<string, SongConfig>();

/** 加载谱面 JSON 配置 */
export async function loadSongConfig(songId: string): Promise<SongConfig> {
	if (configCache.has(songId)) {
		return configCache.get(songId) as SongConfig;
	}
	const response = await fetch(`/config/${songId}.json`);
	if (!response.ok) {
		throw new Error(`Failed to load song config: ${songId}`);
	}
	const config: SongConfig = await response.json();
	configCache.set(songId, config);
	return config;
}

/** 获取所有歌曲元数据列表 */
export function getSongList(): SongMeta[] {
	return SONG_REGISTRY;
}

/** 按 songId 查找歌曲元数据 */
export function getSongMeta(songId: string): SongMeta | undefined {
	return SONG_REGISTRY.find((s) => s.songId === songId);
}
