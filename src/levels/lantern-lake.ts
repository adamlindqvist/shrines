import { DEFAULT_HUD, DEFAULT_LIGHTING, DEFAULT_TEXT } from './defaults';
import type { LevelDefinition, SceneDefinition } from './types';

/**
 * The shrine stands on an islet in a northern lake, and its plate wants the moon. A sun box on
 * the west lantern wakes a ferry stone in the east bay; a second sun box, hidden in the north-west
 * grove, must ride it to the east lantern. Both lanterns raise the lake bridge, and the moon box
 * waiting on the far shore rides back across to the shrine. Clearing texels span X -22..22 and
 * Z -20..20.
 */
export const scene: SceneDefinition = {
    id: 'lantern-lake',
    name: 'Lantern Lake',
    seed: 511,
    terrain: {
        kind: 'river',
        land: [{ minX: -22, maxX: 22, minZ: -20, maxZ: 20, radius: 3 }],
        water: [
            // The lake, spilling off the north edge between the two shores.
            { minX: -12, maxX: 10, minZ: -28, maxZ: -2, radius: 5 },
            // The east bay, cutting the far shore off from the meadow.
            { minX: 6, maxX: 28, minZ: -11, maxZ: -2, radius: 1.5 },
            // Lily pond in the south-east meadow.
            { x: 14, z: 12, r: 2.2 }
        ],
        islets: [{ x: 0, z: -10, r: 5.5 }],
        blend: 1.1,
        wallHeight: 2.4,
        waterLevel: -1.8,
        clearings: [
            // Spawn, trailing north toward the west lantern.
            { x: 512, y: 896, radius: [85, 70], innerRadius: [55, 45], path: { x: 512, y: 896, dx: -70, dy: -330 } },
            // West lantern and the bridge landing, trailing west along the shore.
            { x: 465, y: 550, radius: [110, 70], innerRadius: [72, 45], path: { x: 465, y: 550, dx: -325, dy: -120 } },
            // Hidden grove on the north-west shore, trailing back south.
            { x: 105, y: 141, radius: [66, 60], innerRadius: [42, 38], path: { x: 105, y: 141, dx: 35, dy: 300 } },
            // Sun box nook, trailing back to spawn.
            { x: 628, y: 794, radius: [70, 58], innerRadius: [45, 36], path: { x: 628, y: 794, dx: -116, dy: 102 } },
            // South pier landing, trailing west along the shore.
            { x: 954, y: 537, radius: [62, 50], innerRadius: [40, 32], path: { x: 954, y: 537, dx: -300, dy: 40 } },
            // Far north-east shore.
            { x: 884, y: 115, radius: [120, 70], innerRadius: [78, 45] },
            // Shrine islet.
            { x: 512, y: 282, radius: [100, 90], innerRadius: [65, 58] }
        ]
    },
    backdrop: {
        size: 70,
        gradient: ['#bfe3e8', '#c7e8ea', '#d2eee8'],
        shadowColor: '#7fa8ae',
        shadowOffset: [-1.8, 1.6]
    },
    spawn: { x: 0, z: 15 },
    walkBounds: { minX: -23.4, maxX: 23.4, minZ: -19.4, maxZ: 19.4 },
    blockBounds: { minX: -22.5, maxX: 22.5, minZ: -18.7, maxZ: 18.7 },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 33.46],
            target: [0, 0, 15.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.75, 0.89, 0.91]
        },
        follow: { x: 1, z: 1, anchorZ: 15, rate: 4 }
    },
    scenery: [
        { type: 'shrineDais', x: 0, z: -11.5 },
        // Only the ferry bay splashes; the lake bridge sits outside it and its shores stay solid.
        { type: 'water', minX: 5, maxX: 24, minZ: -12.5, maxZ: -1 },

        // Piers across the east bay. The ferry stone docks against their lane-facing ends.
        { type: 'pier', x: 19, z: -2.75, width: 3.4, depth: 3.9 },
        { type: 'pier', x: 13, z: -10.25, width: 3.4, depth: 3.9 },

        // South meadow.
        { type: 'tree', x: -20.5, z: 16.5, scale: 1.1, rotation: 20 },
        { type: 'tree', x: -9, z: 18.4, scale: 0.9, rotation: -40 },
        { type: 'tree', x: 9.5, z: 18.2, scale: 1, rotation: 60 },
        { type: 'tree', x: 20.5, z: 9.5, scale: 0.9, rotation: 35 },
        { type: 'tree', x: -15, z: 5, scale: 0.95, rotation: 40 },
        { type: 'rock', x: -20.5, z: 9.5, scale: 1.5, rotation: 25 },
        { type: 'rock', x: -6.5, z: 18.6, scale: 0.8, rotation: 40 },
        { type: 'rock', x: 14.5, z: 18.6, scale: 1.2, rotation: -15 },
        { type: 'rock', x: 21, z: 4.5, scale: 0.9 },
        { type: 'bushCluster', x: -18, z: 18.3, count: 4, spread: 1, scale: 0.45 },
        { type: 'bushCluster', x: 4, z: 18.6, count: 4, spread: 1.2, scale: 0.44 },
        { type: 'bushCluster', x: -10, z: 7, count: 3, spread: 0.8, scale: 0.4 },
        { type: 'bushCluster', x: 16.8, z: 14.2, count: 3, spread: 0.7, scale: 0.42 },
        { type: 'bush', x: -4.5, z: 17.5, scale: 0.8 },
        { type: 'log', x: -12, z: 12, scale: 0.8, rotation: 20 },
        { type: 'signpost', x: -3.4, z: 0.2, rotation: 30 },
        { type: 'pot', x: -21, z: 4, scale: 0.85 },
        { type: 'pot', x: 11.5, z: 5, scale: 0.8 },

        // West shore, screening the grove without closing its trail.
        { type: 'tree', x: -21, z: -4.5, scale: 0.85, rotation: 30 },
        { type: 'tree', x: -14.5, z: -11, scale: 0.9, rotation: -20 },
        { type: 'bushCluster', x: -13.5, z: -8.5, count: 3, spread: 0.8, scale: 0.4 },
        { type: 'bushCluster', x: -21, z: -13.5, count: 3, spread: 0.7, scale: 0.42 },
        { type: 'tree', x: -20, z: -17.8, scale: 1.2, rotation: -25 },
        { type: 'rock', x: -15, z: -18.6, scale: 1.3, rotation: 20 },
        { type: 'pot', x: -13.8, z: -16.5, scale: 0.8 },

        // Stones in the lake and bay, clear of the ferry lane.
        { type: 'rock', x: -9, z: -8, scale: 0.7, y: -1.8 },
        { type: 'rock', x: 7.5, z: -14, scale: 0.6, y: -1.8 },
        { type: 'rock', x: 9, z: -3.2, scale: 0.55, y: -1.8 },
        { type: 'rock', x: -6, z: -17, scale: 0.8, y: -1.8 },

        // Far north-east shore.
        { type: 'tree', x: 21, z: -18, scale: 1.1, rotation: -60 },
        { type: 'tree', x: 12.4, z: -19, scale: 0.9, rotation: 10 },
        { type: 'rock', x: 21.3, z: -12.2, scale: 1 },
        { type: 'bushCluster', x: 17, z: -19.2, count: 4, spread: 1.2, scale: 0.44 },
        { type: 'bush', x: 11.4, z: -17.8, scale: 0.7 },

        // Shrine islet.
        { type: 'bushCluster', x: 0, z: -14.6, count: 3, spread: 1.2, scale: 0.4 },
        { type: 'pot', x: -3.4, z: -12.3, scale: 0.8 },
        { type: 'pot', x: 3.5, z: -12.5, scale: 0.7 }
    ],
    objects: [
        { type: 'bridge', id: 'lake-bridge', x: 0, z: -3.5, length: 4.8, state: 'closed' },
        {
            type: 'platform',
            id: 'bay-stone',
            x: 19,
            z: -6.5,
            width: 4.4,
            depth: 3.6,
            travel: { x: -6, z: 0 },
            duration: 2.8,
            dwell: 1.4,
            phase: 0,
            state: 'dormant'
        },
        { type: 'block', id: 'sun-box', symbol: 'sun', x: 5, z: 11 },
        { type: 'block', id: 'grove-box', symbol: 'sun', x: -17.5, z: -14.5 },
        { type: 'block', id: 'moon-box', symbol: 'moon', x: 14.5, z: -16.8 },
        { type: 'plate', id: 'west-lantern', symbol: 'sun', x: -5.5, z: 3.5 },
        { type: 'plate', id: 'east-lantern', symbol: 'sun', x: 19, z: -14 },
        { type: 'plate', id: 'shrine-plate', symbol: 'moon', x: -3.2, z: -7.8 },
        { type: 'portal', id: 'portal', x: 0, z: -11.5, y: 0.45, rotation: 0, locked: true },
        { type: 'slime', id: 'meadow-slime', x: 12, z: 8 },
        { type: 'slime', id: 'shore-slime', x: -17, z: -6 },
        { type: 'slime', id: 'grove-slime', x: -14.5, z: -15.5 },
        { type: 'slime', id: 'far-slime', x: 19, z: -18 }
    ]
};

export const level: LevelDefinition = {
    id: 'lantern-lake',
    scene: 'lantern-lake',
    hud: DEFAULT_HUD,
    text: DEFAULT_TEXT,
    rules: [
        {
            id: 'light-west',
            when: { type: 'plateActive', target: 'west-lantern' },
            actions: [{ type: 'activatePlatform', target: 'bay-stone' }],
            message: 'Västra lyktan lyser! Något vaknar i östra viken.'
        },
        {
            id: 'raise-bridge',
            when: {
                type: 'all',
                conditions: [
                    { type: 'plateActive', target: 'west-lantern' },
                    { type: 'plateActive', target: 'east-lantern' }
                ]
            },
            actions: [{ type: 'openBridge', target: 'lake-bridge' }],
            message: 'Båda lyktorna lyser! Bron reser sig mot helgedomen.'
        },
        {
            id: 'open-portal',
            when: { type: 'plateActive', target: 'shrine-plate' },
            actions: [{ type: 'openPortal', target: 'portal' }],
            message: 'Klick! Månen lyser och portalen öppnar sig.'
        }
    ],
    completion: { type: 'portalReached', target: 'portal' }
};
