import { type FC, useEffect, useState } from "react";
import { getJudgmentColor, getJudgmentText } from "../game/judgment";
import type { JudgmentEvent, JudgmentLevel } from "../types";

interface JudgmentTextProps {
	event: JudgmentEvent | null;
}

interface FloatingItem {
	id: number;
	text: string;
	color: string;
	x: number;
	y: number;
}

const JudgmentText: FC<JudgmentTextProps> = ({ event }) => {
	const [items, setItems] = useState<FloatingItem[]>([]);

	useEffect(() => {
		if (!event) return;
		const item: FloatingItem = {
			id: event.timestamp,
			text: getJudgmentText(event.level),
			color: getJudgmentColor(event.level),
			x: event.x,
			y: event.y,
		};
		setItems((prev) => [...prev, item]);

		const timer = setTimeout(() => {
			setItems((prev) => prev.filter((i) => i.id !== item.id));
		}, 1000);
		return () => clearTimeout(timer);
	}, [event]);

	return (
		<div style={styles.container}>
			{items.map((item) => (
				<div
					key={item.id}
					style={{
						...styles.text,
						left: item.x,
						top: item.y,
						color: item.color,
						animation: "judgmentFloat 1s ease-out forwards",
					}}
				>
					{item.text}
				</div>
			))}
			<style>{judgmentKeyframes}</style>
		</div>
	);
};

const styles: Record<string, React.CSSProperties> = {
	container: {
		position: "absolute",
		inset: 0,
		pointerEvents: "none",
		zIndex: 20,
		overflow: "hidden",
	},
	text: {
		position: "absolute",
		fontFamily: "monospace",
		fontSize: 28,
		fontWeight: "bold",
		textShadow: "2px 2px 6px rgba(0,0,0,0.8)",
		transform: "translate(-50%, -50%)",
		whiteSpace: "nowrap",
	},
};

const judgmentKeyframes = `
@keyframes judgmentFloat {
  0%   { opacity: 1;   transform: translate(-50%, -50%) translateY(0); }
  60%  { opacity: 1;   transform: translate(-50%, -50%) translateY(-40px); }
  100% { opacity: 0;   transform: translate(-50%, -50%) translateY(-60px); }
}
`;

export type { JudgmentEvent, JudgmentLevel };

export default JudgmentText;
