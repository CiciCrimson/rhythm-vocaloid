import { Texture } from "pixi.js";

export function makeFallbackTexture(color: number, size: number): Texture {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return Texture.EMPTY;
	ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
	ctx.fillRect(0, 0, size, size);
	return Texture.from(canvas);
}
