/**
 * config.js - 全局配置常量
 * 节奏术力口 Rhythm VOCALOID
 */

// 画布尺寸
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

// 判定线 X 坐标（屏幕左侧约 27%）
export const JUDGE_X = 220;

// 收集物移动速度 px/s
export const NOTE_SPEED = 300;

// 提前生成收集物的时间（秒）= 收集物从右侧到判定线的时间
export const SPAWN_AHEAD = (CANVAS_WIDTH - JUDGE_X + 50) / NOTE_SPEED; // ≈ 2.1s

// 判定窗口（毫秒）
export const JUDGE_WINDOWS = {
  Perfect: 50,
  Great: 100,
  Good: 150,
  Miss: Infinity
};

// 最大判定搜索窗口（毫秒），超出此范围的音符不参与判定
export const MAX_JUDGE_WINDOW = 200;

// 分数配置
export const SCORE_BASE = 100;
export const COMBO_MULTIPLIER = 0.05;

// 分数倍率
export const SCORE_MULTIPLIER = {
  Perfect: 1.0,
  Great: 0.8,
  Good: 0.5,
  Miss: 0
};

// 结算评级阈值
export const RATING_THRESHOLDS = {
  S: { scoreRatio: 0.95, maxMiss: 5 },
  A: { scoreRatio: 0.85 },
  B: { scoreRatio: 0.70 },
  C: { scoreRatio: 0 }
};

// 收集物 Y 坐标（地面高度，与角色同高）
export const COLLECTIBLE_Y = CANVAS_HEIGHT * 0.6;

// 收集物 Y 坐标（跳跃高度，固定在较高处，跳起来才能收集）
// 角色脚底在 CANVAS_HEIGHT * 0.6，跳跃高度约 30px，收集物中心再高一些
export const COLLECTIBLE_Y_HIGH = CANVAS_HEIGHT * 0.6 - 80;

// 收集物尺寸
export const COLLECTIBLE_SIZE = 40;

// 角色配置
export const PLAYER_X = CANVAS_WIDTH * 0.15;  // 角色固定 X 位置
export const PLAYER_Y = CANVAS_HEIGHT * 0.6;  // 角色 Y 位置（脚底）
export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 80;

// 动画帧率（ms/帧）
export const WALK_FRAME_DURATION = 200;
export const HIT_ANIMATION_DURATION = 300;

// 歌曲列表配置
export const SONGS = [
  {
    id: 'levan_polkka',
    title: '甩葱歌',
    artist: '初音未来',
    configPath: 'config/levan_polkka.json',
    audioPath: 'assets/audio/levan_polkka.mp3',
    available: true,
    color: '#16d5b9',
    bgColor: '#0a2a1a'
  },
  {
    id: 'ordinary_disco',
    title: '普通 DISCO',
    artist: '洛天依 / 言和',
    configPath: 'config/ordinary_disco.json',
    audioPath: 'assets/audio/ordinary_disco.mp3',
    available: false,
    color: '#18a0c3',
    bgColor: '#1a0a2a'
  },
  {
    id: 'igaku',
    title: '医学',
    artist: '重音 Teto',
    configPath: 'config/igaku.json',
    audioPath: 'assets/audio/igaku.mp3',
    available: false,
    color: '#e74c3c',
    bgColor: '#2a0a0a'
  }
];
