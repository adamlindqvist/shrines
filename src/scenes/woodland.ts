import { Color, Entity } from 'playcanvas';

import type { AppContext, SceneInstance } from '../app/context';
import { createPalette } from '../rendering/palette';
import { createRandom } from '../rendering/random';
import { SceneResources } from '../rendering/resources';

import { SceneBuilder } from './builder';
import { CameraRig, MEADOW_LIGHTING } from './camera-rig';
import { addWoodlandGrove } from './groups';
import { createBackdrop, createIsland } from './terrain';

/**
 * Quiet Woodland: a smaller island composed from the same props and
 * reusable groves. No combat, puzzle or HUD — just the view and canopy sway.
 */
export function createWoodlandScene(context: AppContext): SceneInstance {
    const { app, device } = context;
    const resources = new SceneResources();
    const palette = createPalette(resources);
    const rand = createRandom(11);
    const root = new Entity('Quiet Woodland');
    app.root.addChild(root);

    const island = createIsland({ device, resources, rand }, root, {
        halfWidth: 8.6,
        halfDepth: 6.6,
        cornerRadius: 2.6,
        wallHeight: 1.5
    });
    const scene = new SceneBuilder({ device, palette }, rand, root);

    addWoodlandGrove(scene, { x: -4.6, z: -2.6 });
    addWoodlandGrove(scene, { x: 4.4, z: -2.8, scale: 0.9, rotation: 150 });
    addWoodlandGrove(scene, { x: 3.4, z: 3.0, scale: 0.8, rotation: 250 });

    scene.addRock({ x: 0.6, z: -4.6, scale: 1.6, rotation: 30 });
    scene.addBushCluster({ x: -6.2, z: 3.2, count: 5, spread: 1.1, scale: 0.4 });
    scene.addPot({ x: -3.2, z: 3.6 });
    scene.addPot({ x: -2.3, z: 4.3, scale: 0.8 });
    scene.addLog({ x: -0.4, z: 1.2, rotation: 18 });

    createBackdrop({ device, resources }, root, island);
    const layout = scene.finish();

    const rig = new CameraRig(app, root, {
        ...MEADOW_LIGHTING,
        camera: {
            position: [0, 22, 19.2],
            target: [0, 0, 0.74],
            orthoHeight: 6.2,
            minVisibleHalfWidth: 9.5,
            clearColor: new Color(0.78, 0.89, 0.81)
        }
    });

    let time = 0;
    return {
        update(dt) {
            time += Math.min(dt, 0.035);
            layout.animate(time);
        },
        resize: () => rig.resize(),
        destroy() {
            rig.destroy();
            root.destroy();
            resources.destroy();
        }
    };
}
