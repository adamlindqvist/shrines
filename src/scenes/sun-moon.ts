import { Color } from 'playcanvas';

import type { AdventureArea } from './adventure-area';
import { ADVENTURE_VIEW, MEADOW_LIGHTING } from './camera-rig';
import { meadowArea } from './meadow';

const SPAWN = { x: 0, z: 10 };

/** Broad connected clearings; all transport routes stay inside the sparse perimeter. */
export const sunMoonArea: AdventureArea = {
    name: 'Sun & Moon Grove',
    seed: 149,
    island: {
        halfWidth: 20,
        halfDepth: 15,
        cornerRadius: 3,
        wallHeight: 1.78,
        clearings: [
            { x: 512, y: 205, radius: [180, 105], innerRadius: [140, 75], path: { x: 512, y: 260, dx: 0, dy: 575 } },
            { x: 307, y: 614, radius: [100, 90], innerRadius: [65, 55], path: { x: 307, y: 614, dx: 205, dy: 120 } },
            { x: 717, y: 512, radius: [100, 90], innerRadius: [65, 55], path: { x: 717, y: 512, dx: -205, dy: 100 } }
        ]
    },
    game: {
        ...meadowArea.game,
        area: 'sun-moon',
        stage: 2,
        spawn: SPAWN,
        walkBounds: { minX: -18, maxX: 18, minZ: -13, maxZ: 13 },
        puzzle: {
            blocks: [
                { symbol: 'sun', x: -8, z: 3 },
                { symbol: 'moon', x: 8, z: 0 }
            ],
            plates: [
                { symbol: 'sun', x: -4, z: -8 },
                { symbol: 'moon', x: 4, z: -8 }
            ],
            chest: { x: 0, z: -11 },
            blockBounds: { minX: -17, maxX: 17, minZ: -12, maxZ: 12 }
        },
        text: {
            ...meadowArea.game.text,
            won: {
                title: 'Sunshine and moonbeams',
                copy: 'Two shrines, two treasures. You brought a little light to every corner.'
            }
        },
        logTag: '[Sun & Moon]'
    },
    slimes: [
        { x: -10, z: -1 },
        { x: 10, z: -4 },
        { x: -5, z: -4 },
        { x: 5, z: 5.5 }
    ],
    camera: {
        ...MEADOW_LIGHTING,
        camera: {
            position: [0, 22, SPAWN.z + 19.2],
            target: [0, 0, SPAWN.z + 0.74],
            ...ADVENTURE_VIEW,
            clearColor: new Color(0.78, 0.89, 0.81)
        },
        follow: { x: 1, z: 1, anchorZ: SPAWN.z, rate: 4 }
    },
    decorate(scene) {
        for (const [x, z, scale] of [
            [-16, 9, 1.6],
            [16, 7, 1.6],
            [-16, -9, 1.7],
            [16, -10, 1.8],
            [-7, -13, 1.3],
            [9, 13, 1.4]
        ]) {
            scene.addTree({ x, z, scale, rotation: x * 7 });
            scene.addBushCluster({ x: x + 1, z: z - 1, count: 5, spread: 1.3, scale: 0.5 });
        }
        for (const [x, z, scale] of [
            [-17, 2, 3],
            [17, -1, 3.5],
            [-12, -12, 2.4],
            [12, 11, 2.8],
            [-12, 11, 1.5],
            [12, -12, 1.8]
        ]) {
            scene.addRock({ x, z, scale });
            scene.addBushCluster({ x, z: z + 1.5, count: 4, spread: 1, scale: 0.42 });
        }
        scene.addPot({ x: -11, z: 5 });
        scene.addPot({ x: 11, z: 2 });
        scene.addLog({ x: -15, z: 6, rotation: 25 });
    }
};
