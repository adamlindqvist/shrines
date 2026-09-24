import { Color, Entity } from 'playcanvas';

import type { AppContext, SceneInstance } from '../app/context';
import { AdventureGame } from '../gameplay/adventure';
import type { AdventureDeps, AdventureDiagnostics } from '../gameplay/adventure';
import type { LevelDefinition, SceneDefinition } from '../levels/types';
import { validateLevel } from '../levels/validate';
import { BRIDGE } from '../objects/shrine';
import { createPalette } from '../rendering/palette';
import { createRandom } from '../rendering/random';
import { SceneResources } from '../rendering/resources';

import { buildDefinition } from './build-definition';
import { SceneBuilder } from './builder';
import { CameraRig } from './camera-rig';
import { createRiverIsland } from './river-island';
import { createBackdrop, createIsland } from './terrain';

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        meadow?: AdventureDiagnostics;
    }
}

type JourneyHooks = Pick<AdventureDeps, 'initialHealth' | 'onComplete' | 'onRestart' | 'stage'>;

/** Builds a data-authored scene; the level supplies rules, never construction callbacks. */
export function createAdventureArea(
    context: AppContext,
    scene: SceneDefinition,
    level: LevelDefinition,
    hooks: JourneyHooks = {}
): SceneInstance {
    validateLevel(level, scene);
    const { app, device } = context;
    const resources = new SceneResources();
    const palette = createPalette(resources);
    const rand = createRandom(scene.seed);
    const root = new Entity(scene.name);
    app.root.addChild(root);
    const terrain = { device, resources, rand };
    const openings = [...scene.scenery, ...scene.objects]
        .filter((o) => o.type === 'bridge')
        .map((o) => ({
            minX: o.x - BRIDGE.width / 2,
            maxX: o.x + BRIDGE.width / 2,
            minZ: o.z - o.length / 2,
            maxZ: o.z + o.length / 2
        }));
    const river = 'kind' in scene.terrain ? createRiverIsland(terrain, root, { ...scene.terrain, openings }) : null;
    const island = 'kind' in scene.terrain ? river! : createIsland(terrain, root, scene.terrain);
    const builder = new SceneBuilder({ device, palette }, rand, root);
    for (const o of river?.obstacles ?? []) builder.addObstacle(o.x, o.z, o.r);
    const cast = buildDefinition(builder, scene);
    createBackdrop({ device, resources }, root, island, scene.backdrop);
    const built = builder.finish();
    const layout = river
        ? {
              ...built,
              animate(time: number) {
                  built.animate(time);
                  river.animate(time);
              }
          }
        : built;
    const c = scene.camera;
    const rig = new CameraRig(app, root, {
        ...c,
        ambient: new Color(...c.ambient),
        camera: { ...c.camera, clearColor: new Color(...c.camera.clearColor) },
        sun: { ...c.sun, color: new Color(...c.sun.color) },
        fill: { ...c.fill, color: new Color(...c.fill.color) }
    });
    const game = new AdventureGame({ context, root, rand, palette, layout, rig, cast, scene, level, ...hooks });
    Object.defineProperty(window, 'meadow', { configurable: true, get: () => game.diagnostics() });
    return {
        update: (dt) => game.update(dt),
        resize: () => rig.resize(),
        destroy() {
            delete window.meadow;
            game.destroy();
            rig.destroy();
            root.destroy();
            resources.destroy();
        }
    };
}
