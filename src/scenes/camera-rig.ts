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

export type CameraRigOptions = {
    /** Scene-wide ambient light, applied when the rig is created. */
    ambient: Color;
    camera: {
        position: Vec3Tuple;
        target: Vec3Tuple;
        /** Minimum orthographic half-height in world units. */
        orthoHeight: number;
        /** Minimum visible width, so narrow viewports zoom out instead of cropping. */
        minVisibleWidth: number;
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
            shadowResolution: 2048,
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
        frame.rendering.samples = 2;
        frame.rendering.sharpness = 0.2;
        frame.bloom.intensity = 0.012;
        frame.ssao.type = SSAOTYPE_LIGHTING;
        frame.ssao.intensity = 0.5;
        frame.ssao.radius = 2.5;
        frame.ssao.power = 4;
        frame.ssao.samples = 8;
        frame.ssao.blurEnabled = true;
        frame.ssao.scale = 0.5;
        frame.update();
        this.frame = frame;
    }

    /** Fits the orthographic view to the window's aspect ratio. */
    resize() {
        const { orthoHeight, minVisibleWidth } = this.options.camera;
        this.camera.camera!.orthoHeight = Math.max(orthoHeight, minVisibleWidth / (innerWidth / innerHeight));
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
