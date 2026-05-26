import { Application } from "@pixi/react";
import { forwardRef } from "react";
import GameWorld from "./GameWorld";
import type { GameCanvasHandle, GameCanvasProps } from "./GameWorld";

export type { GameCanvasHandle, GameCanvasProps };

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>((props, ref) => {
	return (
		<Application background={"#1a1a2e"} resizeTo={window}>
			<GameWorld ref={ref} {...props} />
		</Application>
	);
});

GameCanvas.displayName = "GameCanvas";

export default GameCanvas;
