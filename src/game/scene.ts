import type { RefObject } from "react";
import { type Application, Assets, type Container, Graphics, Sprite, type Texture } from "pixi.js";
import { CHAR_SCALE, CHAR_X_RATIO, JUDGMENT_LINE_RATIO } from "./constants";
import { makeFallbackTexture } from "./graphics";
import type { GameState } from "./types";

export async function waitForContainer(
	containerRef: RefObject<Container | null>,
	disposed: boolean,
) {
	let container = containerRef.current;
	if (container) return container;
	for (let i = 0; i < 40 && !disposed; i++) {
		await new Promise((r) => setTimeout(r, 50));
		container = containerRef.current;
		if (container) return container;
	}
	return null;
}

export async function waitForScreen(app: Application, disposed: boolean) {
	if (app.screen.width >= 10 && app.screen.height >= 10) return;
	for (let i = 0; i < 20 && !disposed; i++) {
		await new Promise((r) => setTimeout(r, 100));
		if (app.screen.width >= 10 && app.screen.height >= 10) return;
	}
}

export async function loadTextures(state: GameState, disposed: boolean) {
	let noteTex: Texture;
	let charRunTex: Texture;
	let charJumpTex: Texture;
	try {
		[noteTex, charRunTex, charJumpTex] = await Promise.all([
			Assets.load("/assets/collectibles/cong.png"),
			Assets.load("/assets/sprites/miku/run.png"),
			Assets.load("/assets/sprites/miku/jump.png"),
		]);
	} catch {
		noteTex = makeFallbackTexture(0xffd700, 64);
		charRunTex = makeFallbackTexture(0x00ccff, 128);
		charJumpTex = makeFallbackTexture(0xff69b4, 128);
	}
	if (disposed) return null;
	state.noteTexture = noteTex;
	state.charRunTexture = charRunTex;
	state.charJumpTexture = charJumpTex;
	return charRunTex;
}

export function buildScene(
	app: Application,
	container: Container,
	state: GameState,
	charRunTex: Texture,
) {
	const bg = new Graphics();
	bg.rect(0, 0, app.screen.width, app.screen.height);
	bg.fill({ color: 0x1a1a2e });
	container.addChild(bg);

	const charSprite = new Sprite(charRunTex);
	charSprite.anchor.set(0.5);
	charSprite.x = app.screen.width * CHAR_X_RATIO;
	charSprite.y = app.screen.height / 2;
	charSprite.scale.set(CHAR_SCALE);
	container.addChild(charSprite);
	state.charSprite = charSprite;

	const jx = app.screen.width * JUDGMENT_LINE_RATIO;
	const lineGfx = new Graphics();
	const dashLen = 12;
	const gapLen = 8;
	for (let yy = 0; yy < app.screen.height; yy += dashLen + gapLen) {
		lineGfx
			.moveTo(jx, yy)
			.lineTo(jx, Math.min(yy + dashLen, app.screen.height))
			.stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
	}
	container.addChild(lineGfx);
}
