import type { TimingState } from "./types";

export function createTimingState(): TimingState {
	return {
		audioCtx: null,
		sourceNode: null,
		audioBuffer: null,
		audioStartTime: 0,
		pauseElapsed: 0,
	};
}

/** 创建 AudioContext（需在用户手势中调用） */
export function initAudioContext(timing: TimingState): AudioContext {
	// 如果已有就直接复用
	if (timing.audioCtx) return timing.audioCtx;
	const ctx = new AudioContext();
	timing.audioCtx = ctx;
	return ctx;
}

/** 从 URL 加载音频并解码为 AudioBuffer */
export async function loadAudioBuffer(
	timing: TimingState,
	audioSrc: string
): Promise<AudioBuffer | null> {
	try {
		const response = await fetch(audioSrc);
		if (!response.ok) {
			console.error(`Failed to fetch audio: ${audioSrc}`);
			return null;
		}
		const arrayBuffer = await response.arrayBuffer();
		const ctx = timing.audioCtx;
		if (!ctx) return null;
		const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
		timing.audioBuffer = audioBuffer;
		return audioBuffer;
	} catch (err) {
		console.error("Failed to decode audio:", err);
		return null;
	}
}

/** 从头开始播放（或重新播放）audioBuffer */
export function startPlayback(timing: TimingState): void {
	stopPlayback(timing);
	const ctx = timing.audioCtx;
	const buf = timing.audioBuffer;
	if (!ctx || !buf) return;

	const source = ctx.createBufferSource();
	source.buffer = buf;
	source.connect(ctx.destination);
	source.start(0);

	timing.sourceNode = source;
	timing.audioStartTime = ctx.currentTime;
	timing.pauseElapsed = 0;

	// 终止时不清除 sourceNode，由 stopPlayback 或下次 startPlayback 处理
}

/** 停止当前播放 */
export function stopPlayback(timing: TimingState): void {
	if (timing.sourceNode) {
		try {
			timing.sourceNode.stop();
		} catch {
			// sourceNode 可能已经自然结束，stop() 会抛，忽略
		}
		timing.sourceNode.disconnect();
		timing.sourceNode = null;
	}
}

/** 暂停：记录已流逝时间，suspend AudioContext */
export function pausePlayback(timing: TimingState): void {
	if (!timing.audioCtx) return;
	// 先记下当前游戏时间再冻结
	timing.pauseElapsed = getGameTime(timing);
	timing.audioCtx.suspend();
}

/** 恢复：resume AudioContext，重新校准 audioStartTime */
export function resumePlayback(timing: TimingState): void {
	const ctx = timing.audioCtx;
	if (!ctx) return;
	ctx.resume();
	// resume 后 currentTime 恢复前进，需要校准让 getGameTime 返回 pauseElapsed 起续
	// 公式：audioStartTime = currentTime - pauseElapsed
	timing.audioStartTime = ctx.currentTime - timing.pauseElapsed;
}

/** 完全销毁 AudioContext 和相关资源 */
export function destroyTiming(timing: TimingState): void {
	stopPlayback(timing);
	if (timing.audioCtx) {
		timing.audioCtx.close();
		timing.audioCtx = null;
	}
	timing.audioBuffer = null;
	timing.audioStartTime = 0;
	timing.pauseElapsed = 0;
}

/** 获取当前游戏时间（秒），暂停时返回冻结值 */
export function getGameTime(timing: TimingState): number {
	if (!timing.audioCtx) return 0;

	// AudioContext 被 suspend 时 currentTime 会冻结
	// 但我们用 pauseElapsed 更精确地表示暂停时刻
	const ctx = timing.audioCtx;
	if (ctx.state === "suspended") {
		return timing.pauseElapsed;
	}

	return ctx.currentTime - timing.audioStartTime;
}

/** 检查音频是否已播放完毕 */
export function isAudioDone(timing: TimingState): boolean {
	const buf = timing.audioBuffer;
	if (!buf) return true; // 无音频 = 不阻塞结束
	const gt = getGameTime(timing);
	return gt >= buf.duration;
}
