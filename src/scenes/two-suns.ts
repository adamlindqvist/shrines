import { Color } from 'playcanvas';

import type { AdventureArea } from './adventure-area';
import { ADVENTURE_VIEW, MEADOW_LIGHTING } from './camera-rig';
import { meadowArea } from './meadow';
import type { RiverIslandOptions } from './river-island';

const SPAWN = { x: -0.8, z: 8.3 };
const WATER_LEVEL = -1.8;

/** The painted meadow spans the island's bounding box, X −20…20 and Z −12.5…12.5. */
const texel = (x: number, z: number) => ({ x: (x + 20) * 25.6, y: (z + 12.5) * 40.96 });

/** A bridge carries the path from the south meadow over the river to the shrine plateau. */
const BRIDGE = { x: 3.9, z: -2.375, length: 6.75 };
const SHRINE = { x: 3.9, z: -11.1 };

const ISLAND: RiverIslandOptions = {
    kind: 'river',
    land: [
        // Western meadow reaching up to the signpost corner.
        { minX: -20, maxX: -6.9, minZ: -10.9, maxZ: 12.5, radius: 2.6 },
        // The broad southern meadow.
        { minX: -20, maxX: 15.5, minZ: -8.8, maxZ: 12.5, radius: 2.4 },
        // Shrine plateau.
        { minX: -4.9, maxX: 15.5, minZ: -12.5, maxZ: -2, radius: 2.4 },
        // River mouth on the eastern edge.
        { minX: 13, maxX: 16.6, minZ: -5.9, maxZ: 4, radius: 0.5 },
        // The south-eastern shoulder.
        { minX: -20, maxX: 20, minZ: 2.8, maxZ: 12.5, radius: 2.8 }
    ],
    water: [
        { minX: -1.5, maxX: 18, minZ: -5.3, maxZ: 0.5, radius: 1.5 },
        { x: 17.4, z: 1.2, r: 1.9 },
        { minX: -11.2, maxX: 0, minZ: -5.2, maxZ: 2.9, radius: 2.3 },
        { minX: -7.2, maxX: -4.6, minZ: -12, maxZ: -3, radius: 1.0 }
    ],
    islets: [{ x: -4.6, z: -0.2, r: 2.1 }],
    blend: 1.1,
    wallHeight: 2.4,
    waterLevel: WATER_LEVEL,
    clearings: [
        // Path from the bridge down through the south meadow.
        {
            ...texel(3.9, 2.2),
            radius: [62, 52],
            innerRadius: [40, 34],
            path: { ...texel(3.9, 2.2), dx: 0, dy: 360 }
        },
        // Worn trail along the western meadow.
        {
            ...texel(-14.3, -3.5),
            radius: [46, 40],
            innerRadius: [30, 26],
            path: { ...texel(-14.3, -3.5), dx: 54, dy: 400 }
        },
        // The shrine courtyard and the path up from the bridge.
        {
            ...texel(3.9, -8.2),
            radius: [210, 100],
            innerRadius: [150, 70],
            path: { ...texel(3.9, -6.2), dx: 0, dy: -80 }
        },
        { ...texel(-0.75, -9.8), radius: [70, 56], innerRadius: [46, 36] },
        { ...texel(8.85, -9.8), radius: [70, 56], innerRadius: [46, 36] }
    ],
    openings: [
        {
            minX: BRIDGE.x - 1.9,
            maxX: BRIDGE.x + 1.9,
            minZ: BRIDGE.z - BRIDGE.length / 2,
            maxZ: BRIDGE.z + BRIDGE.length / 2
        }
    ]
};

/** Two sun blocks on either side of the river, two sun plates beside the shrine on the plateau. */
export const twoSunsArea: AdventureArea = {
    name: 'Two Suns Shrine',
    seed: 211,
    island: ISLAND,
    backdrop: {
        gradient: ['#b8e5d2', '#bee9d7', '#c6eedf'],
        shadowColor: '#72a88f',
        shadowOffset: [-1.8, 1.6]
    },
    game: {
        ...meadowArea.game,
        area: 'two-suns',
        stage: 3,
        spawn: SPAWN,
        walkBounds: { minX: -19.4, maxX: 19.4, minZ: -12, maxZ: 12 },
        puzzle: {
            blocks: [
                { symbol: 'sun', x: -14.9, z: -6.8 },
                { symbol: 'sun', x: 9.4, z: 6.7 }
            ],
            plates: [
                { symbol: 'sun', x: -0.75, z: -9.8 },
                { symbol: 'sun', x: 8.85, z: -9.8 }
            ],
            chest: { x: SHRINE.x, z: SHRINE.z, y: 0.45 },
            // The chest stands on the dais, so it opens from the foot of the steps.
            chestReach: 2.9,
            blockBounds: { minX: -18.5, maxX: 18.5, minZ: -11.4, maxZ: 11.4 }
        },
        text: {
            ...meadowArea.game.text,
            matched: 'Click! One sun is shining. Fetch the other one!',
            won: {
                title: 'Three shrines aglow',
                copy: 'Every shrine is shining. What a brave and kind little adventure!'
            }
        },
        logTag: '[Two Suns]'
    },
    slimes: [
        { x: -12.2, z: -7.9 },
        { x: -10.7, z: 7.0 }
    ],
    // Same gameplay scale as the earlier shrines; the camera follows fully instead of framing the whole island.
    camera: {
        ...MEADOW_LIGHTING,
        camera: {
            position: [0, 22, SPAWN.z + 19.2],
            target: [0, 0, SPAWN.z + 0.74],
            ...ADVENTURE_VIEW,
            clearColor: new Color(0.73, 0.9, 0.83)
        },
        follow: { x: 1, z: 1, anchorZ: SPAWN.z, rate: 4 }
    },
    decorate(scene) {
        scene.addBridge(BRIDGE);
        scene.addShrineDais(SHRINE);
        scene.addSignpost({ x: -17.7, z: -8.0, rotation: -12 });

        // Trees, with their boulders and understory.
        scene.addTree({ x: -9.0, z: -9.4, scale: 1.11, rotation: 30 });
        scene.addRock({ x: -11.3, z: -9.5, scale: 1.8, rotation: 20 });
        scene.addBushCluster({ x: -10.4, z: -8.6, count: 4, spread: 0.9, scale: 0.42 });
        scene.addTree({ x: -17.6, z: -9.7, scale: 0.67, rotation: -20 });
        scene.addTree({ x: -3.4, z: -10.9, scale: 0.74, rotation: 60 });
        scene.addBushCluster({ x: -2.3, z: -10.6, count: 3, spread: 0.7, scale: 0.4 });
        scene.addTree({ x: 13.2, z: -9.7, scale: 1.11, rotation: -50 });
        scene.addBushCluster({ x: 14.1, z: -8.8, count: 4, spread: 0.9, scale: 0.4 });

        scene.addTree({ x: -18.6, z: -1.7, scale: 1.11, rotation: 10 });
        scene.addRock({ x: -16.9, z: -1.9, scale: 1.8, rotation: 40 });
        scene.addTree({ x: -18.9, z: 4.0, scale: 1.18, rotation: 80 });
        scene.addRock({ x: -16.6, z: 4.4, scale: 2.0 });
        scene.addBushCluster({ x: -17.4, z: 5.6, count: 5, spread: 1.1, scale: 0.44 });
        scene.addTree({ x: -18.1, z: 9.2, scale: 1.18, rotation: -30 });
        scene.addRock({ x: -16.2, z: 9.4, scale: 2.2, rotation: 15 });
        scene.addBushCluster({ x: -16.4, z: 10.7, count: 5, spread: 1.2, scale: 0.44 });

        scene.addTree({ x: -4.6, z: -0.5, scale: 1.04, rotation: 45 });
        scene.addRock({ x: -6.1, z: -0.2, scale: 1.3, rotation: 30 });
        scene.addRock({ x: -3.0, z: -0.3, scale: 1.2, rotation: -20 });

        scene.addTree({ x: -7.3, z: 10.0, scale: 0.96, rotation: 70 });
        scene.addRock({ x: -5.9, z: 9.6, scale: 1.1 });
        scene.addTree({ x: 16.5, z: 6.9, scale: 1.41, rotation: 20 });
        scene.addRock({ x: 17.3, z: 9.4, scale: 3.0, rotation: -10 });
        scene.addBushCluster({ x: 15.2, z: 8.4, count: 6, spread: 1.3, scale: 0.5 });
        scene.addBushCluster({ x: 18.2, z: 10.8, count: 4, spread: 1.0, scale: 0.45 });

        // Bushes and pebbles across the meadows.
        scene.addBushCluster({ x: -5.7, z: 4.5, count: 3, spread: 0.6, scale: 0.55 });
        scene.addRock({ x: -4.8, z: 4.9, scale: 0.9 });
        scene.addRock({ x: -5.3, z: 5.5, scale: 0.6 });
        scene.addBushCluster({ x: -11.2, z: -10.4, count: 3, spread: 0.6, scale: 0.5 });
        scene.addBush({ x: 0.7, z: -7.5, scale: 1.05 });
        scene.addBush({ x: 7.6, z: 1.6, scale: 1.1 });
        scene.addBush({ x: 12.8, z: 2.9, scale: 1.0 });
        scene.addBush({ x: 5.2, z: 11.1, scale: 0.9 });
        scene.addBush({ x: -17.5, z: -7.2, scale: 0.6 });
        scene.addRock({ x: 11.4, z: -8.2, scale: 1.3, rotation: 25 });
        scene.addRock({ x: 13.6, z: 10.2, scale: 1.2 });
        for (const [x, z, scale] of [
            [-18.9, 1.2, 0.6],
            [-17.7, -0.6, 0.45],
            [-18.2, 7.6, 0.5],
            [-12.6, 11.4, 0.5],
            [8.6, 11.3, 0.45],
            [-1.6, 5.7, 0.4]
        ])
            scene.addRock({ x, z, scale });

        // Stepping stones in the river.
        for (const [x, z, scale] of [
            [-8.3, -1.7, 0.75],
            [-1.5, -2.45, 0.6],
            [-0.9, -1.6, 0.55],
            [0.55, -2.0, 0.7],
            [-5.5, -8.4, 1.0],
            [-9.4, 1.5, 0.5]
        ])
            scene.addRock({ x, z, scale, y: WATER_LEVEL });
    }
};
