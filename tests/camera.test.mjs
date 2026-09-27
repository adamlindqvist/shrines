import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { ASPECT_MANUAL, Camera, Entity, PROJECTION_ORTHOGRAPHIC, Vec3 } from 'playcanvas';

registerHooks({
    resolve(s, c, next) {
        return next(s.startsWith('.') && !/\.[a-z]+$/.test(s) ? `${s}.ts` : s, c);
    }
});
const { SHADOW, shadowDistanceForView } = await import('../src/scenes/camera-rig.ts');
const { sceneDefinitions } = await import('../src/levels/index.ts');

test('directional shadows cover visible ground and banks across levels, aspect ratios and camera follow', () => {
    for (const scene of Object.values(sceneDefinitions)) {
        const rig = scene.camera;
        const entity = new Entity();
        entity.setPosition(...rig.camera.position);
        entity.lookAt(...rig.camera.target);
        const camera = new Camera();
        camera.aspectRatioMode = ASPECT_MANUAL;
        camera.projection = PROJECTION_ORTHOGRAPHIC;
        camera.nearClip = 0.1;
        camera.farClip = 80;
        for (const aspect of [2.4, 1.6, 1, 530 / 792, 390 / 844]) {
            camera.aspectRatio = aspect;
            camera.orthoHeight = Math.max(rig.camera.orthoHeight, rig.camera.minVisibleHalfWidth / aspect);
            for (const offset of [0, 1, -1]) {
                entity.setPosition(
                    rig.camera.position[0] + offset,
                    rig.camera.position[1],
                    rig.camera.position[2] + offset
                );
                const distance = shadowDistanceForView(entity, camera, rig.sun.shadowDistance);
                // Intersect the real Engine frustum's corner rays with both receiver planes.
                const corners = camera.getFrustumCorners();
                for (const floor of [0, SHADOW.receiverFloor]) {
                    for (let i = 0; i < 4; i++) {
                        const near = entity.getWorldTransform().transformPoint(corners[i], new Vec3());
                        const far = entity.getWorldTransform().transformPoint(corners[i + 4], new Vec3());
                        const fraction = (floor - near.y) / (far.y - near.y);
                        if (fraction < 0 || fraction > 1) continue;
                        const depth = camera.nearClip + fraction * (camera.farClip - camera.nearClip);
                        assert.ok(
                            depth <= distance + 1e-6,
                            `${scene.id}: aspect ${aspect}, depth ${depth} > ${distance}`
                        );
                    }
                }
            }
        }
    }
});

test('shadow coverage respects the authored minimum and far clip, including horizontal cameras', () => {
    const entity = new Entity();
    entity.setPosition(0, 22, 19.2);
    entity.lookAt(0, 0, 0.74);
    const view = { orthoHeight: 10, aspectRatio: 1.6, farClip: 80 };
    assert.equal(shadowDistanceForView(entity, view, 60), 60);
    assert.equal(shadowDistanceForView(entity, { ...view, orthoHeight: 200 }, 30), 80);
    entity.setEulerAngles(0, 0, 0);
    assert.equal(shadowDistanceForView(entity, view, 30), 80);
});
