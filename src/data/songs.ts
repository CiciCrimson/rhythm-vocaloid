import type { SongConfig, SongMeta } from "../types";

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

const configCache = new Map<string, SongConfig>();

export async function loadSongConfig(songId: string): Promise<SongConfig> {
	const cached = configCache.get(songId);
	if (cached) return cached;

	const response = await fetch(`/config/${songId}.json`);
	if (!response.ok) {
		throw new Error(`Failed to load song config: ${songId}`);
	}
	const config: SongConfig = await response.json();
	configCache.set(songId, config);
	return config;
}

export function getSongList(): SongMeta[] {
	return SONG_REGISTRY;
}

export function getSongMeta(songId: string): SongMeta | undefined {
	return SONG_REGISTRY.find((s) => s.songId === songId);
}
