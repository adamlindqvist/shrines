import { Entity } from 'playcanvas';

import type { AppContext, SceneInstance } from '../app/context';
import { AdventureGame } from '../gameplay/adventure';
import type { AdventureConfig, AdventureDeps, AdventureDiagnostics } from '../gameplay/adventure';
import type { Point } from '../gameplay/puzzle';
import { createPalette } from '../rendering/palette';
import { createRandom } from '../rendering/random';
import { SceneResources } from '../rendering/resources';

import { SceneBuilder } from './builder';
import { CameraRig } from './camera-rig';
import type { CameraRigOptions } from './camera-rig';
import { createRiverIsland } from './river-island';
import type { RiverIslandOptions } from './river-island';
import { createBackdrop, createIsland } from './terrain';
import type { BackdropOptions, IslandOptions } from './terrain';

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        /** Live state of the current adventure area. */
        meadow?: AdventureDiagnostics;
    }
}

export type AdventureArea = {
    name: string;
    seed: number;
    island: IslandOptions | RiverIslandOptions;
    backdrop?: BackdropOptions;
    game: AdventureConfig;
    slimes: Point[];
    camera: CameraRigOptions;
    decorate(scene: SceneBuilder): void;
};

type JourneyHooks = Pick<AdventureDeps, 'initialHealth' | 'onComplete' | 'onRestart'>;

/** Owns all resources for one area; the journey owns progression between areas. */
export function createAdventureArea(context: AppContext, area: AdventureArea, hooks: JourneyHooks): SceneInstance {
    const { app, device } = context;
    const resources = new SceneResources();
    const palette = createPalette(resources);
    const rand = createRandom(area.seed);
    const root = new Entity(area.name);
    app.root.addChild(root);
    const terrain = { device, resources, rand };
    const river = 'kind' in area.island ? createRiverIsland(terrain, root, area.island) : null;
    const island = river ?? createIsland(terrain, root, area.island as IslandOptions);
    const scene = new SceneBuilder({ device, palette }, rand, root);
    for (const o of river?.obstacles ?? []) scene.addObstacle(o.x, o.z, o.r);
    area.decorate(scene);
    const { puzzle, spawn } = area.game;
    const cast = {
        player: scene.addAdventurer(spawn),
        blocks: puzzle.blocks.map((b) => scene.addPushBlock(b, b.symbol)),
        plates: puzzle.plates.map((p) => scene.addSunSwitch({ ...p, rotation: 0 }, p.symbol)),
        chest: scene.addChest({ ...puzzle.chest, rotation: 0 }),
        slimes: area.slimes.map((at) => scene.addSlime(at))
    };
    createBackdrop({ device, resources }, root, island, { size: area.game.stage === 1 ? 34 : 60, ...area.backdrop });
    const built = scene.finish();
    const layout = river
        ? {
              ...built,
              animate(time: number) {
                  built.animate(time);
                  river.animate(time);
              }
          }
        : built;
    const rig = new CameraRig(app, root, area.camera);
    const game = new AdventureGame({ context, root, rand, palette, layout, rig, cast, config: area.game, ...hooks });
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
