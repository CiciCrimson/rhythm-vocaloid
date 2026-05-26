/**
 * audio.js - Web Audio API 音频管理器
 * 节奏术力口 Rhythm VOCALOID
 *
 * ⚠️ 关键设计原则：
 * - 全局只创建一个 AudioContext
 * - 必须在用户手势（touchstart/click）的同步调用栈内 resume()
 * - 使用 audioContext.currentTime 做精确计时，绝不用 setTimeout/setInterval
 */

export class AudioManager {
	constructor() {
		// 全局 AudioContext（整个游戏只创建一个）
		this._ctx = null;
		this._source = null;
		this._buffer = null;
		this._startTime = 0; // AudioContext 时间轴上的播放起点
		this._pauseTime = 0; // 暂停时的歌曲进度（秒）
		this._isPlaying = false;
		this._isPaused = false;
		this._onEndCallback = null;
	}

	/**
	 * 获取或创建 AudioContext（懒初始化）
	 * @returns {AudioContext}
	 */
	get ctx() {
		if (!this._ctx) {
			this._ctx = new (window.AudioContext || window.webkitAudioContext)();
		}
		return this._ctx;
	}

	/**
	 * 解锁 AudioContext（必须在用户手势的同步调用栈内调用）
	 * iOS Safari 和 Android Chrome 都需要此步骤
	 * @returns {Promise<void>}
	 */
	async unlock() {
		const ctx = this.ctx;
		if (ctx.state === "suspended") {
			await ctx.resume();
		}
	}

	/**
	 * 检查 AudioContext 是否已就绪
	 * @returns {boolean}
	 */
	get isReady() {
		return this._ctx !== null && this._ctx.state === "running";
	}

	/**
	 * 加载音频文件并解码为 AudioBuffer
	 * @param {string} url - 音频文件 URL
	 * @param {function} [onProgress] - 进度回调 (0~1)
	 * @returns {Promise<AudioBuffer>}
	 */
	async loadAudio(url, onProgress = null) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`音频加载失败: ${url} (${response.status})`);
		}

		// 读取 ArrayBuffer（支持进度回调）
		const contentLength = response.headers.get("Content-Length");
		let arrayBuffer;

		if (contentLength && onProgress) {
			const total = parseInt(contentLength, 10);
			const reader = response.body.getReader();
			const chunks = [];
			let received = 0;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value);
				received += value.length;
				onProgress(received / total);
			}

			// 合并 chunks
			const allChunks = new Uint8Array(received);
			let offset = 0;
			for (const chunk of chunks) {
				allChunks.set(chunk, offset);
				offset += chunk.length;
			}
			arrayBuffer = allChunks.buffer;
		} else {
			arrayBuffer = await response.arrayBuffer();
			if (onProgress) onProgress(1);
		}

		// 解码音频数据
		const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
		this._buffer = audioBuffer;
		return audioBuffer;
	}

	/**
	 * 播放音频，记录精确开始时间
	 * @param {AudioBuffer} [buffer] - 可选，不传则使用已加载的 buffer
	 * @param {number} [startOffset=0] - 从歌曲的第几秒开始播放
	 */
	play(buffer = null, startOffset = 0) {
		if (buffer) this._buffer = buffer;
		if (!this._buffer) throw new Error("没有可播放的音频，请先调用 loadAudio()");

		// 停止之前的播放
		this._stopSource();

		// 创建新的音源节点（每次播放都需要新建）
		this._source = this.ctx.createBufferSource();
		this._source.buffer = this._buffer;
		this._source.connect(this.ctx.destination);

		// 监听播放结束
		this._source.onended = () => {
			if (this._isPlaying) {
				this._isPlaying = false;
				if (this._onEndCallback) this._onEndCallback();
			}
		};

		// 记录播放起点（AudioContext 高精度时钟）
		// startTime = 当前 AudioContext 时间 - 已播放的偏移量
		this._startTime = this.ctx.currentTime - startOffset;
		this._isPlaying = true;
		this._isPaused = false;

		// 开始播放（从 startOffset 秒处开始）
		this._source.start(0, startOffset);
	}

	/**
	 * 获取当前歌曲播放进度（秒）
	 * ⚠️ 这是音游判定的核心时间源，必须用 AudioContext.currentTime
	 * @returns {number}
	 */
	getCurrentTime() {
		if (!this._isPlaying || this._isPaused) {
			return this._pauseTime;
		}
		return this.ctx.currentTime - this._startTime;
	}

	/**
	 * 暂停播放
	 */
	pause() {
		if (!this._isPlaying || this._isPaused) return;
		this._pauseTime = this.getCurrentTime();
		this._stopSource();
		this._isPlaying = false;
		this._isPaused = true;
	}

	/**
	 * 从暂停处继续播放
	 */
	resume() {
		if (!this._isPaused) return;
		this.play(null, this._pauseTime);
	}

	/**
	 * 停止播放并重置
	 */
	stop() {
		this._stopSource();
		this._isPlaying = false;
		this._isPaused = false;
		this._pauseTime = 0;
		this._startTime = 0;
	}

	/**
	 * 注册播放结束回调
	 * @param {function} callback
	 */
	onEnd(callback) {
		this._onEndCallback = callback;
	}

	/**
	 * 内部：停止并销毁当前音源节点
	 */
	_stopSource() {
		if (this._source) {
			try {
				this._source.onended = null;
				this._source.stop();
			} catch (e) {
				// 已经停止的 source 调用 stop() 会抛异常，忽略即可
			}
			this._source.disconnect();
			this._source = null;
		}
	}

	/**
	 * 获取音频总时长（秒）
	 * @returns {number}
	 */
	get duration() {
		return this._buffer ? this._buffer.duration : 0;
	}

	get isPlaying() {
		return this._isPlaying;
	}

	get isPaused() {
		return this._isPaused;
	}
}
