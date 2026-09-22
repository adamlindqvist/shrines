import { Color, Entity } from 'playcanvas';

import type { AppContext, SceneInstance } from '../app/context';
import { AdventureGame } from '../gameplay/adventure';
import type { AdventureConfig, AdventureDiagnostics } from '../gameplay/adventure';
import { createPalette } from '../rendering/palette';
import { createRandom } from '../rendering/random';
import { SceneResources } from '../rendering/resources';

import { SceneBuilder } from './builder';
import { CameraRig, MEADOW_LIGHTING } from './camera-rig';
import { createBackdrop, createIsland } from './terrain';
import type { IslandOptions } from './terrain';

declare global {
    // Declaration merging with the DOM's Window requires an interface.
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        /** Live meadow state for debugging and automated checks. */
        meadow?: AdventureDiagnostics;
    }
}

const WX = 12.4,
    DZ = 9.4;

const ISLAND: IslandOptions = {
    halfWidth: WX,
    halfDepth: DZ,
    cornerRadius: 3.0,
    wallHeight: 1.78,
    // Sandy patch under the puzzle, world centre roughly (6.6, -6.6), with a path trailing toward the meadow.
    clearing: {
        x: 786,
        y: 152,
        radius: [168, 190],
        innerRadius: [142, 162],
        path: { x: 792, y: 250, dx: -37, dy: 218 }
    }
};

const SPAWN = { x: -1.7, z: 4.0 };
const SLIMES = [
    { x: -4.2, z: -2.6 },
    { x: 5.7, z: 1.9 }
];

const GAME: AdventureConfig = {
    spawn: SPAWN,
    walkBounds: { minX: -WX + 1.4, maxX: WX - 1.4, minZ: -DZ + 1.1, maxZ: DZ - 1.1 },
    puzzle: {
        block: { x: 4.7, z: -4.7 },
        switch: { x: 7.1, z: -5.2 },
        chest: { x: 9.15, z: -5.4 },
        blockBounds: { minX: -10, maxX: 10.5, minZ: -8, maxZ: 8 }
    },
    hud: {
        title: 'MOSSY MEADOW',
        quest: { title: 'A little push', copy: 'Move the block onto the sun switch' },
        maxHealth: 3
    },
    text: {
        unlockedQuest: { title: 'A little treasure', copy: 'Your sunshine is waiting. Walk to the chest!' },
        unlocked: 'Click! The treasure is unlocked.',
        defeatedSlime: 'A berry brave little hero.',
        paused: 'Paused · press a movement key or click to continue',
        won: {
            title: 'A pocketful of sunshine',
            copy: 'You found the meadow’s treasure. The world feels a little warmer.'
        },
        over: { title: 'A little breather', copy: 'Even brave little adventurers need another try.' }
    },
    logTag: '[Meadow]'
};

/** Mossy Meadow: the playable clearing with slimes, the block puzzle and the treasure chest. */
export function createMeadowScene(context: AppContext): SceneInstance {
    const { app, device } = context;
    const resources = new SceneResources();
    const palette = createPalette(resources);
    // Generation order matters: every call below draws from this one seeded sequence.
    const rand = createRandom(73);
    const root = new Entity('Mossy Meadow');
    app.root.addChild(root);

    const island = createIsland({ device, resources, rand }, root, ISLAND);
    const scene = new SceneBuilder({ device, palette }, rand, root);

    scene.addTree({ x: -8.0, z: -6.3, scale: 1.5, rotation: 20 });
    scene.addTree({ x: 10.8, z: 0.2, scale: 1.44, rotation: -40 });
    scene.addTree({ x: -10.5, z: 5.4, scale: 1.52, rotation: 70 });

    scene.addRock({ x: -9.8, z: -4.5, scale: 2.5 });
    scene.addRock({ x: -10.9, z: -3.3, scale: 1.2 });
    scene.addRock({ x: 9.5, z: 7.1, scale: 3.6 });
    scene.addRock({ x: 8.0, z: 7.6, scale: 1.95 });
    scene.addRock({ x: -5.3, z: -7.7, scale: 1.45 });
    scene.addRock({ x: 4.9, z: -8.8, scale: 1.8 });
    scene.addRock({ x: 11.1, z: -5.0, scale: 1.8 });
    // Pebbles.
    for (const [x, z, scale] of [
        [-9.1, -1.4, 0.72],
        [-5.1, 6.1, 0.84],
        [3.3, 7.4, 0.74],
        [-10.9, 0.6, 0.6],
        [8.0, 0.9, 0.64],
        [-3.6, -6.3, 0.5],
        [6.6, 5.0, 0.46],
        [1.2, -8.6, 0.44]
    ])
        scene.addRock({ x, z, scale });

    scene.addBushCluster({ x: -7.1, z: -6.9, count: 6, spread: 1.5, scale: 0.48 });
    scene.addBushCluster({ x: -9.5, z: -3.6, count: 5, spread: 1.3, scale: 0.44 });
    scene.addBushCluster({ x: 4.3, z: -9.0, count: 6, spread: 1.6, scale: 0.5 });
    scene.addBushCluster({ x: 6.0, z: -8.9, count: 4, spread: 1.2, scale: 0.46 });
    scene.addBushCluster({ x: 11.0, z: -4.6, count: 6, spread: 1.3, scale: 0.46 });
    scene.addBushCluster({ x: 9.1, z: 5.9, count: 7, spread: 1.8, scale: 0.5 });
    scene.addBushCluster({ x: -10.6, z: 4.0, count: 5, spread: 1.2, scale: 0.44 });
    scene.addBushCluster({ x: 11.3, z: 1.9, count: 5, spread: 1.2, scale: 0.44 });
    scene.addBushCluster({ x: -4.4, z: 6.8, count: 3, spread: 0.8, scale: 0.34 });
    scene.addBushCluster({ x: -6.1, z: 6.3, count: 4, spread: 1.0, scale: 0.36 });

    scene.addPot({ x: -8.3, z: 4.9 });
    scene.addPot({ x: -7.0, z: 5.8, scale: 0.9 });
    scene.addLog({ x: -9.5, z: 6.6, rotation: -32 });

    const { puzzle } = GAME;
    const cast = {
        player: scene.addAdventurer(SPAWN),
        block: scene.addPushBlock(puzzle.block).entity,
        sunSwitch: scene.addSunSwitch({ ...puzzle.switch, rotation: 38 }),
        chest: scene.addChest({ ...puzzle.chest, rotation: 26 }),
        slimes: SLIMES.map((at) => scene.addSlime(at))
    };
    createBackdrop({ device, resources }, root, island);
    const layout = scene.finish();

    const rig = new CameraRig(app, root, {
        ...MEADOW_LIGHTING,
        camera: {
            position: [0, 22, 19.2],
            target: [0, 0, 0.74],
            orthoHeight: 8.0,
            minVisibleWidth: 12.0,
            clearColor: new Color(0.78, 0.89, 0.81)
        },
        follow: { x: 0.07, z: 0.06, anchorZ: SPAWN.z, rate: 2.5 }
    });

    const game = new AdventureGame({ context, root, rand, palette, layout, rig, cast, config: GAME });
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
