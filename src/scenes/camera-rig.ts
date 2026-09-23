import {
    CameraFrame,
    Color,
    PROJECTION_ORTHOGRAPHIC,
    SHADOW_PCF5,
    SSAOTYPE_LIGHTING,
    TONEMAP_LINEAR
} from 'playcanvas';
import type { AppBase, Entity, Quat } from 'playcanvas';

import { node } from '../rendering/primitives';

type Vec3Tuple = [number, number, number];

/** Viewport height (CSS pixels) at which a scene shows exactly its authored `orthoHeight`. */
export const CAMERA = { referenceHeight: 1200 };

export type CameraRigOptions = {
    /** Scene-wide ambient light, applied when the rig is created. */
    ambient: Color;
    camera: {
        position: Vec3Tuple;
        target: Vec3Tuple;
        /**
         * Orthographic half-height in world units at `CAMERA.referenceHeight`. The view scales with the viewport
         * so every size shows the world at the same pixels per unit; larger screens see more, not bigger.
         */
        orthoHeight: number;
        /** Half-width the authored framing shows; narrower views follow the player fully on X instead of zooming out. */
        framedHalfWidth: number;
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
        app.scene.ambientLight = options.ambient;
        const { camera: view, sun, fill } = options;

        const camera = node(root, 'scene camera', ...view.position);
        camera.addComponent('camera', {
            projection: PROJECTION_ORTHOGRAPHIC,
            orthoHeight: view.orthoHeight,
            nearClip: 0.1,
            farClip: 160,
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
            shadowResolution: 4096,
            shadowBias: 0.008,
            normalOffsetBias: 0.04,
            shadowType: SHADOW_PCF5,
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
        frame.rendering.samples = 4;
        frame.rendering.sharpness = 0.2;
        frame.bloom.intensity = 0.012;
        frame.ssao.type = SSAOTYPE_LIGHTING;
        frame.ssao.intensity = 0.5;
        frame.ssao.radius = 2.5;
        frame.ssao.power = 4;
        frame.ssao.samples = 12;
        frame.ssao.blurEnabled = true;
        frame.ssao.scale = 1;
        frame.update();
        this.frame = frame;
    }

    /** Keeps a constant world scale in CSS pixels; small viewports are handled by following instead. */
    resize() {
        this.camera.camera!.orthoHeight = this.options.camera.orthoHeight * (innerHeight / CAMERA.referenceHeight);
    }

    /** Eases the camera toward the followed point (x, z), fully on any axis the viewport crops. */
    follow(x: number, z: number, dt: number) {
        const f = this.options.follow;
        if (!f) return;
        const { position, orthoHeight, framedHalfWidth } = this.options.camera;
        const [bx, by, bz] = position;
        const halfHeight = this.camera.camera!.orthoHeight;
        const narrow = halfHeight * (innerWidth / innerHeight) < framedHalfWidth,
            short = halfHeight < orthoHeight;
        const targetX = x * (narrow ? 1 : f.x),
            targetZ = (z - f.anchorZ) * (short ? 1 : f.z);
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
