#!/usr/bin/env python3
"""
midi_extract.py - MIDI → JSON 节拍提取脚本
节奏术力口 Rhythm VOCALOID

用法:
    python midi_extract.py <input.mid> <output.json> <song_id>

示例:
    python midi_extract.py levan_polkka.mid ../config/levan_polkka.json levan_polkka

依赖:
    pip install mido
"""

import sys
import json
import argparse
from pathlib import Path

try:
    import mido
except ImportError:
    print("错误：请先安装 mido 库：pip install mido")
    sys.exit(1)


# 歌曲元信息（可手动补充）
SONG_META = {
    "levan_polkka": {
        "title": "甩葱歌",
        "artist": "初音未来",
        "bpm": 119,
        "audioSrc": "assets/audio/levan_polkka.mp3",
        "offset": 0.0
    },
    "ordinary_disco": {
        "title": "普通 DISCO",
        "artist": "洛天依 / 言和",
        "bpm": 128,
        "audioSrc": "assets/audio/ordinary_disco.mp3",
        "offset": 0.0
    },
    "igaku": {
        "title": "医学",
        "artist": "重音 Teto",
        "bpm": 160,
        "audioSrc": "assets/audio/igaku.mp3",
        "offset": 0.0
    }
}

# 目标 MIDI 音符编号（C5 = 72，在 DAW 中统一用这个音符标注节拍点）
# levan_polkka.mid 实际使用 MIDI 61（C#4/Db4）
TARGET_NOTE = 61

# 特殊音符编号（用于标注 special 类型，如"ユ！"喊声）
SPECIAL_NOTE = 84  # C6


def extract_notes(midi_path: str, target_note: int = TARGET_NOTE) -> list:
    """
    从 MIDI 文件中提取指定音符的时间点。

    Args:
        midi_path: MIDI 文件路径
        target_note: 目标 MIDI 音符编号（默认 72 = C5）

    Returns:
        音符列表，每项格式：{"time": float, "type": str, "lane": int}
    """
    mid = mido.MidiFile(midi_path)
    notes = []

    for track in mid.tracks:
        # 累计时间（秒）
        current_time = 0.0
        # 当前 tempo（微秒/拍），默认 120 BPM = 500000 μs/拍
        current_tempo = 500000
        lane_counter = 0  # 用于交替分配 lane

        for msg in track:
            # 先将 tick 转换为秒，累加到当前时间
            # ⚠️ 关键：必须用 mido.tick2second，不能直接用 tick 值
            delta_seconds = mido.tick2second(
                msg.time,
                mid.ticks_per_beat,
                current_tempo
            )
            current_time += delta_seconds

            # 更新 tempo（处理渐快/渐慢）
            if msg.type == 'set_tempo':
                current_tempo = msg.tempo

            # 检测 note_on 事件（velocity > 0 才是真正的按下）
            elif msg.type == 'note_on' and msg.velocity > 0:
                if msg.note == target_note:
                    lane_counter += 1
                    notes.append({
                        "time": round(current_time, 4),
                        "type": "normal",
                        "lane": (lane_counter % 2) + 1  # 交替 1/2
                    })
                elif msg.note == SPECIAL_NOTE:
                    lane_counter += 1
                    notes.append({
                        "time": round(current_time, 4),
                        "type": "special",
                        "lane": (lane_counter % 2) + 1
                    })
                elif msg.note == target_note + 2:  # D5 = 74，标注 golden
                    lane_counter += 1
                    notes.append({
                        "time": round(current_time, 4),
                        "type": "golden",
                        "lane": (lane_counter % 2) + 1
                    })

    # 按时间排序
    notes.sort(key=lambda n: n["time"])
    return notes


def build_config(song_id: str, notes: list, meta: dict = None) -> dict:
    """
    构建完整的歌曲配置 JSON 对象。

    Args:
        song_id: 歌曲 ID
        notes: 音符列表
        meta: 歌曲元信息（可选）

    Returns:
        完整配置字典
    """
    base_meta = SONG_META.get(song_id, {
        "title": song_id,
        "artist": "Unknown",
        "bpm": 120,
        "audioSrc": f"assets/audio/{song_id}.mp3",
        "offset": 0.0
    })

    if meta:
        base_meta.update(meta)

    # 计算歌曲时长（最后一个音符 + 5 秒缓冲）
    duration = (notes[-1]["time"] + 5.0) if notes else 60.0

    return {
        "songId": song_id,
        "title": base_meta["title"],
        "artist": base_meta["artist"],
        "bpm": base_meta["bpm"],
        "audioSrc": base_meta["audioSrc"],
        "offset": base_meta["offset"],
        "duration": round(duration, 2),
        "notes": notes,
        "backgroundShiftPoints": [],
        "characterSwitchPoints": []
    }


def main(midi_path: str, output_path: str, song_id: str) -> None:
    """
    CLI 入口：从 MIDI 提取节拍并输出 JSON。

    Args:
        midi_path: 输入 MIDI 文件路径
        output_path: 输出 JSON 文件路径
        song_id: 歌曲 ID
    """
    midi_file = Path(midi_path)
    if not midi_file.exists():
        print(f"错误：找不到 MIDI 文件：{midi_path}")
        sys.exit(1)

    print(f"正在解析 MIDI 文件：{midi_path}")
    notes = extract_notes(str(midi_file))

    if not notes:
        print(f"警告：未找到音符编号 {TARGET_NOTE}（C5）的音符！")
        print("请确认在 DAW 中使用了正确的音符编号。")
        print("  - 普通节拍：MIDI 72（C5）")
        print("  - Golden 节拍：MIDI 74（D5）")
        print("  - Special 节拍：MIDI 84（C6）")
    else:
        print(f"找到 {len(notes)} 个音符")
        print(f"时间范围：{notes[0]['time']:.2f}s ~ {notes[-1]['time']:.2f}s")

        # 统计各类型
        type_counts = {}
        for n in notes:
            type_counts[n['type']] = type_counts.get(n['type'], 0) + 1
        for t, c in type_counts.items():
            print(f"  {t}: {c} 个")

    config = build_config(song_id, notes)

    # 确保输出目录存在
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 已输出到：{output_path}")
    print("\n⚠️  提示：请在文本编辑器中打开 JSON 文件，")
    print("   手动校对各 time 数值，直到游戏内手感完美。")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='MIDI → JSON 节拍提取脚本（节奏术力口）'
    )
    parser.add_argument('midi_path', help='输入 MIDI 文件路径')
    parser.add_argument('output_path', help='输出 JSON 文件路径')
    parser.add_argument('song_id', help='歌曲 ID（如 levan_polkka）')

    args = parser.parse_args()
    main(args.midi_path, args.output_path, args.song_id)
