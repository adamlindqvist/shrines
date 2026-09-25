import {
    CameraFrame,
    Color,
    PROJECTION_ORTHOGRAPHIC,
    SHADOW_PCF3,
    SHADOW_PCF5,
    SSAOTYPE_LIGHTING,
    TONEMAP_LINEAR
} from 'playcanvas';
import type { AppBase, Entity, Quat } from 'playcanvas';

import { node } from '../rendering/primitives';

type Vec3Tuple = [number, number, number];

/**
 * Post-processing and shadow settings. `full` is the reference look; `light`
 * trims the passes that cost most on tablet GPUs (full-screen SSAO, bloom,
 * MSAA resolve and wide shadow filtering) and is used on touch devices.
 */
export const RENDER_QUALITY = {
    full: {
        samples: 2,
        bloom: 0.012,
        ssao: { scale: 1, samples: 8 },
        shadow: { resolution: 2048, type: SHADOW_PCF5 }
    },
    light: {
        samples: 1,
        bloom: 0.012,
        ssao: { scale: 0.5, samples: 6 },
        shadow: { resolution: 1024, type: SHADOW_PCF3 }
    }
};

export type RenderQuality = keyof typeof RENDER_QUALITY;

/** `light` on touch devices; in development, `?quality=full|light` overrides for comparison. */
export function renderQuality(): RenderQuality {
    const requested = import.meta.env.DEV ? new URLSearchParams(location.search).get('quality') : null;
    if (requested === 'full' || requested === 'light') return requested;
    return window.matchMedia?.('(pointer: coarse)').matches ? 'light' : 'full';
}

/** Shared framing keeps every adventure area at the same scale on a given viewport. */
export const ADVENTURE_VIEW = { orthoHeight: 10, minVisibleHalfWidth: 12 };

export type CameraRigOptions = {
    /** Scene-wide ambient light, applied when the rig is created. */
    ambient: Color;
    camera: {
        position: Vec3Tuple;
        target: Vec3Tuple;
        /** Minimum orthographic half-height in world units. */
        orthoHeight: number;
        /** Minimum visible half-width, so narrow viewports zoom out instead of cropping. */
        minVisibleHalfWidth: number;
        clearColor: Color;
    };
    sun: { position: Vec3Tuple; color: Color; intensity: number; shadowDistance: number };
    fill: { position: Vec3Tuple; color: Color; intensity: number };
    /** Gentle drift toward a followed point, relative to `anchorZ` on Z. */
    follow?: { x: number; z: number; anchorZ: number; rate: number };
};

/**
 * Orthographic camera with a warm key light, a cool fill and the shared
 * post-processing stack. Everything is parented to the scene root.
 */
export class CameraRig {
    readonly camera: Entity;
    readonly sun: Entity;
    readonly fill: Entity;
    private readonly frame: CameraFrame;
    private readonly baseRotation: Quat;

    private readonly options: CameraRigOptions;

    constructor(app: AppBase, root: Entity, options: CameraRigOptions) {
        this.options = options;
        const quality = RENDER_QUALITY[renderQuality()];
        app.scene.ambientLight = options.ambient;
        const { camera: view, sun, fill } = options;

        const camera = node(root, 'scene camera', ...view.position);
        camera.addComponent('camera', {
            projection: PROJECTION_ORTHOGRAPHIC,
            orthoHeight: view.orthoHeight,
            nearClip: 0.1,
            farClip: 80,
            clearColor: view.clearColor,
            toneMapping: TONEMAP_LINEAR
        });
        camera.lookAt(...view.target);
        this.baseRotation = camera.getLocalRotation().clone();
        this.camera = camera;

        const light = node(root, 'warm afternoon sun', ...sun.position);
        light.addComponent('light', {
            type: 'directional',
            color: sun.color,
            intensity: sun.intensity,
            castShadows: true,
            shadowDistance: sun.shadowDistance,
            shadowResolution: quality.shadow.resolution,
            shadowBias: 0.008,
            normalOffsetBias: 0.04,
            shadowType: quality.shadow.type,
            shadowIntensity: 1
        });
        light.lookAt(0, 0, 0);
        this.sun = light;

        const bounce = node(root, 'sky bounce', ...fill.position);
        bounce.addComponent('light', {
            type: 'directional',
            color: fill.color,
            intensity: fill.intensity,
            castShadows: false
        });
        bounce.lookAt(0, 0, 0);
        this.fill = bounce;

        const frame = new CameraFrame(app, camera.camera!);
        frame.rendering.toneMapping = TONEMAP_LINEAR;
        frame.rendering.samples = quality.samples;
        frame.rendering.sharpness = 0.2;
        frame.bloom.intensity = quality.bloom;
        frame.ssao.type = SSAOTYPE_LIGHTING;
        frame.ssao.intensity = 0.5;
        frame.ssao.radius = 2.5;
        frame.ssao.power = 4;
        frame.ssao.samples = quality.ssao.samples;
        frame.ssao.blurEnabled = true;
        frame.ssao.scale = quality.ssao.scale;
        frame.update();
        this.frame = frame;
    }

    /** Fits the orthographic view to the window's aspect ratio. */
    resize() {
        const { orthoHeight, minVisibleHalfWidth } = this.options.camera;
        this.camera.camera!.orthoHeight = Math.max(orthoHeight, minVisibleHalfWidth / (innerWidth / innerHeight));
    }

    /** Eases the camera toward the followed point (x, z). */
    follow(x: number, z: number, dt: number) {
        const f = this.options.follow;
        if (!f) return;
        const [bx, by, bz] = this.options.camera.position;
        const targetX = x * f.x,
            targetZ = (z - f.anchorZ) * f.z;
        const cp = this.camera.getPosition();
        const blend = 1 - Math.exp(-dt * f.rate);
        this.camera.setPosition(cp.x + (bx + targetX - cp.x) * blend, by, cp.z + (bz + targetZ - cp.z) * blend);
    }

    /** Snaps back to the authored position and orientation. */
    reset() {
        this.camera.setPosition(...this.options.camera.position);
        this.camera.setLocalRotation(this.baseRotation);
    }

    destroy() {
        this.frame.destroy();
    }
}

/** The meadow's warm afternoon look, a starting point for other scenes. */
export const MEADOW_LIGHTING: Omit<CameraRigOptions, 'camera' | 'follow'> = {
    ambient: new Color(0.74, 0.78, 0.7),
    sun: { position: [-10, 15, -10], color: new Color(1, 0.975, 0.91), intensity: 0.82, shadowDistance: 30 },
    fill: { position: [14, 9, -16], color: new Color(0.74, 0.9, 0.8), intensity: 0.1 }
};
