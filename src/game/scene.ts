import type { RefObject } from "react";
import { type Application, Assets, type Container, Graphics, Sprite, type Texture } from "pixi.js";
import { CHAR_SCALE, CHAR_X_RATIO, JUDGMENT_LINE_RATIO } from "./constants";
import { makeFallbackTexture } from "./graphics";
import type { SceneAssets } from "./types";

export async function waitForContainer(
	containerRef: RefObject<Container | null>,
	disposed: boolean
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

export async function loadTextures(assets: SceneAssets, disposed: boolean) {
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
	assets.noteTexture = noteTex;
	assets.charRunTexture = charRunTex;
	assets.charJumpTexture = charJumpTex;
	return charRunTex;
}

/** 绘制背景矩形 */
function drawBackground(bg: Graphics, width: number, height: number) {
	bg.clear();
	bg.rect(0, 0, width, height);
	bg.fill({ color: 0x1a1a2e });
}

/** 绘制判定线虚线 */
function drawJudgeLine(line: Graphics, jx: number, height: number) {
	const dashLen = 12;
	const gapLen = 8;
	line.clear();
	for (let yy = 0; yy < height; yy += dashLen + gapLen) {
		line.moveTo(jx, yy)
			.lineTo(jx, Math.min(yy + dashLen, height))
			.stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
	}
}

/** 根据当前画布尺寸定位所有静态场景元素 */
export function layoutScene(app: Application, assets: SceneAssets) {
	const w = app.screen.width;
	const h = app.screen.height;
	const jx = w * JUDGMENT_LINE_RATIO;

	if (assets.bgGraphics) {
		drawBackground(assets.bgGraphics, w, h);
	}
	if (assets.charSprite) {
		assets.charSprite.x = w * CHAR_X_RATIO;
		assets.charSprite.y = h / 2;
	}
	if (assets.lineGraphics) {
		drawJudgeLine(assets.lineGraphics, jx, h);
	}
}

export function buildScene(
	app: Application,
	container: Container,
	assets: SceneAssets,
	charRunTex: Texture
) {
	const bg = new Graphics();
	drawBackground(bg, app.screen.width, app.screen.height);
	container.addChild(bg);
	assets.bgGraphics = bg;

	const charSprite = new Sprite(charRunTex);
	charSprite.anchor.set(0.5);
	charSprite.x = app.screen.width * CHAR_X_RATIO;
	charSprite.y = app.screen.height / 2;
	charSprite.scale.set(CHAR_SCALE);
	container.addChild(charSprite);
	assets.charSprite = charSprite;

	const lineGfx = new Graphics();
	drawJudgeLine(lineGfx, app.screen.width * JUDGMENT_LINE_RATIO, app.screen.height);
	container.addChild(lineGfx);
	assets.lineGraphics = lineGfx;
}
