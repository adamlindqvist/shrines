import { ADDRESS_CLAMP_TO_EDGE, FILTER_LINEAR, FILTER_LINEAR_MIPMAP_LINEAR, Texture } from 'playcanvas';
import type { GraphicsDevice } from 'playcanvas';

/** Square 2D canvas for painting procedural textures. */
export function paintCanvas(size: number) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return { c, x: c.getContext('2d')! };
}

/** Uploads a painted canvas as a clamped, filtered texture. */
export function canvasTexture(device: GraphicsDevice, paint: HTMLCanvasElement, mips = true, srgb = false) {
    const t = new Texture(device, {
        srgb,
        width: paint.width,
        height: paint.height,
        mipmaps: mips,
        minFilter: mips ? FILTER_LINEAR_MIPMAP_LINEAR : FILTER_LINEAR,
        magFilter: FILTER_LINEAR,
        addressU: ADDRESS_CLAMP_TO_EDGE,
        addressV: ADDRESS_CLAMP_TO_EDGE,
        anisotropy: 8
    });
    t.setSource(paint);
    return t;
}
