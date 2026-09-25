import { DEFAULT_HUD, DEFAULT_LIGHTING, DEFAULT_TEXT } from './defaults';
import type { LevelDefinition, SceneDefinition } from './types';

/**
 * Two rivers cut the island into three banks. The sun box raises the first
 * bridge, the moon box the second, and a second sun box carried to the shrine
 * unlocks the treasure. Clearing texels span X -24..24 and Z -20..20.
 */
export const scene: SceneDefinition = {
    id: 'twin-bridges',
    name: 'Twin Bridges Isle',
    seed: 307,
    terrain: {
        kind: 'river',
        land: [
            { minX: -22, maxX: 22, minZ: -20, maxZ: 20, radius: 3 },
            { minX: -24, maxX: -11.5, minZ: 8.6, maxZ: 18.5, radius: 3 },
            { minX: 11.5, maxX: 24, minZ: -4.7, maxZ: 4.6, radius: 2 }
        ],
        water: [
            // Southern river, spilling off both edges of the island.
            { minX: -28, maxX: -4.6, minZ: 4, maxZ: 9.4, radius: 2 },
            { minX: -6.9, maxX: 9.2, minZ: 4.1, maxZ: 7.1, radius: 1.5 },
            { minX: 6.9, maxX: 28, minZ: 5.4, maxZ: 8.6, radius: 1.5 },
            // Northern river.
            { minX: -28, maxX: -2.3, minZ: -10, maxZ: -6.8, radius: 1.5 },
            { minX: -4.6, maxX: 28, minZ: -11, maxZ: -7.8, radius: 1.5 },
            // Lily pond in the south-west meadow.
            { x: -17.8, z: 14.2, r: 2.3 }
        ],
        islets: [{ x: -13.8, z: 6.7, r: 1.7 }],
        blend: 1.1,
        wallHeight: 2.4,
        waterLevel: -1.8,
        clearings: [
            // Spawn, with a path north to the first bridge.
            { x: 536, y: 892, radius: [85, 70], innerRadius: [55, 45], path: { x: 536, y: 892, dx: 0, dy: -175 } },
            // Sun box nook by the pond.
            { x: 243, y: 828, radius: [75, 60], innerRadius: [48, 38], path: { x: 243, y: 828, dx: 290, dy: 60 } },
            // Middle plaza, trailing back to the first bridge.
            { x: 561, y: 495, radius: [120, 100], innerRadius: [78, 62], path: { x: 561, y: 495, dx: -25, dy: 99 } },
            // Landing below the second bridge, trailing to the plaza.
            { x: 733, y: 374, radius: [60, 48], innerRadius: [38, 30], path: { x: 733, y: 374, dx: -172, dy: 121 } },
            // Western grove with the second sun box.
            { x: 144, y: 483, radius: [66, 60], innerRadius: [42, 38] },
            // Shrine plaza, trailing east to the second bridge.
            { x: 414, y: 166, radius: [170, 75], innerRadius: [110, 50], path: { x: 414, y: 190, dx: 319, dy: 17 } }
        ]
    },
    backdrop: {
        size: 70,
        gradient: ['#c4e7cf', '#cbead5', '#d4efdc'],
        shadowColor: '#7aa88c',
        shadowOffset: [-1.8, 1.6]
    },
    spawn: { x: 1.15, z: 14.85 },
    walkBounds: { minX: -23.4, maxX: 23.4, minZ: -19.4, maxZ: 19.4 },
    blockBounds: { minX: -22.5, maxX: 22.5, minZ: -18.7, maxZ: 18.7 },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 33.31],
            target: [0, 0, 15.59],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.75, 0.9, 0.82]
        },
        follow: { x: 1, z: 1, anchorZ: 14.85, rate: 4 }
    },
    scenery: [
        { type: 'shrineDais', x: -6.32, z: -16.4 },

        // South bank.
        { type: 'tree', x: -21.16, z: 16.76, scale: 1.1, rotation: 20 },
        { type: 'tree', x: -9.2, z: 18.23, scale: 0.9, rotation: -40 },
        { type: 'tree', x: 10.35, z: 17.94, scale: 1, rotation: 60 },
        { type: 'tree', x: 20.01, z: 15.29, scale: 1.2, rotation: -10 },
        { type: 'tree', x: 18.63, z: 10.87, scale: 0.8, rotation: 35 },
        { type: 'rock', x: -20.47, z: 10.58, scale: 1.6, rotation: 25 },
        { type: 'rock', x: 14.49, z: 18.23, scale: 1.4, rotation: -15 },
        { type: 'rock', x: 21.39, z: 12.34, scale: 1 },
        { type: 'rock', x: -7.13, z: 18.53, scale: 0.8, rotation: 40 },
        { type: 'bushCluster', x: -18.86, z: 18.23, count: 4, spread: 1, scale: 0.45 },
        { type: 'bushCluster', x: 16.1, z: 16.17, count: 5, spread: 1.2, scale: 0.46 },
        { type: 'bushCluster', x: -14.4, z: 17.4, count: 3, spread: 0.6, scale: 0.4 },
        { type: 'log', x: 12.88, z: 12.05, scale: 0.8, rotation: 20 },
        { type: 'signpost', x: -2.53, z: 9.4, rotation: 90 },
        { type: 'pot', x: 7.36, z: 16.91, scale: 0.85 },
        { type: 'pot', x: 8.39, z: 16.03, scale: 0.7 },
        { type: 'bush', x: -3.91, z: 15.29, scale: 0.8 },
        { type: 'bush', x: 15.41, z: 9.99, scale: 0.7 },

        // Islet and stepping stones in the southern river.
        { type: 'tree', x: -13.8, z: 6.6, scale: 0.72, rotation: 50 },
        { type: 'rock', x: -12.65, z: 7.3, scale: 0.6, rotation: 10 },
        { type: 'rock', x: -5.63, z: 6.4, scale: 0.7, y: -1.8 },
        { type: 'rock', x: 8.05, z: 6.2, scale: 0.6, y: -1.8 },
        { type: 'rock', x: -21.62, z: 6.6, scale: 0.8, y: -1.8 },
        { type: 'rock', x: 17.82, z: 7, scale: 0.55, y: -1.8 },

        // Middle bank.
        { type: 'tree', x: -20.93, z: -4.06, scale: 1, rotation: 70 },
        { type: 'rock', x: -20.47, z: 2.23, scale: 1.4, rotation: -30 },
        { type: 'rock', x: -8.05, z: 2.71, scale: 1.3, rotation: 15 },
        { type: 'rock', x: -6.67, z: 3.36, scale: 0.7 },
        { type: 'tree', x: -1.38, z: -5.35, scale: 0.8, rotation: -20 },
        { type: 'log', x: -12.19, z: 3.03, scale: 0.8, rotation: -15 },
        { type: 'bushCluster', x: -13.8, z: -5.35, count: 4, spread: 1, scale: 0.42 },
        { type: 'bushCluster', x: 15.52, z: 4.2, count: 4, spread: 1, scale: 0.44 },
        { type: 'bushCluster', x: 21.39, z: -3.09, count: 3, spread: 0.7, scale: 0.45 },
        { type: 'tree', x: 21.85, z: 2.71, scale: 0.9, rotation: 15 },
        { type: 'rock', x: 21.5, z: -1.8, scale: 1.2, rotation: 45 },
        { type: 'signpost', x: 14.26, z: -5.35, rotation: 90 },
        { type: 'bush', x: 3.22, z: 2.39, scale: 0.7 },
        { type: 'tree', x: -16, z: 3.2, scale: 0.95, rotation: 40 },
        { type: 'bushCluster', x: -3.6, z: 2.8, count: 4, spread: 1, scale: 0.42 },
        { type: 'rock', x: 7.4, z: 2.6, scale: 1.1, rotation: -25 },
        { type: 'tree', x: -9, z: -5.4, scale: 0.85, rotation: -35 },
        { type: 'bushCluster', x: 16.8, z: -5.2, count: 3, spread: 0.8, scale: 0.4 },

        // Stepping stones in the northern river.
        { type: 'rock', x: -10.35, z: -8.5, scale: 0.7, y: -1.8 },
        { type: 'rock', x: -16.1, z: -8.1, scale: 0.5, y: -1.8 },
        { type: 'rock', x: 2.3, z: -9.5, scale: 0.6, y: -1.8 },
        { type: 'rock', x: 18.4, z: -9.2, scale: 0.75, y: -1.8 },

        // North bank around the shrine.
        { type: 'tree', x: -20.01, z: -16.4, scale: 1.2, rotation: -25 },
        { type: 'tree', x: -14.49, z: -18.06, scale: 0.9, rotation: 55 },
        { type: 'tree', x: 4.14, z: -18.62, scale: 0.8, rotation: 10 },
        { type: 'tree', x: 17.25, z: -17.23, scale: 1.2, rotation: -60 },
        { type: 'tree', x: 20.7, z: -13.63, scale: 0.9, rotation: 30 },
        { type: 'rock', x: -11.5, z: -18.34, scale: 1.5, rotation: 20 },
        { type: 'rock', x: -17.48, z: -12.52, scale: 1.2, rotation: -10 },
        { type: 'rock', x: 19.78, z: -16.68, scale: 1.1 },
        { type: 'bushCluster', x: -6.32, z: -19.17, count: 5, spread: 2, scale: 0.42 },
        { type: 'bushCluster', x: 11.5, z: -18.62, count: 4, spread: 1.2, scale: 0.44 },
        { type: 'pot', x: -10, z: -13.91, scale: 0.9 },
        { type: 'pot', x: -10.7, z: -14.88, scale: 0.7 },
        { type: 'pot', x: -2.64, z: -13.77, scale: 0.8 },
        { type: 'log', x: 14.95, z: -15.02, scale: 0.8, rotation: 70 },
        { type: 'bush', x: 14.49, z: -12.52, scale: 0.8 }
    ],
    objects: [
        { type: 'bridge', id: 'south-bridge', x: 1.15, z: 5.6, length: 4.8, state: 'closed' },
        { type: 'bridge', id: 'north-bridge', x: 10.35, z: -9.4, length: 4.8, state: 'closed' },
        { type: 'block', id: 'sun-box', symbol: 'sun', x: -12.65, z: 12.34 },
        { type: 'block', id: 'moon-box', symbol: 'moon', x: 18.17, z: 0.45 },
        { type: 'block', id: 'shrine-box', symbol: 'sun', x: -17.25, z: -1.16 },
        { type: 'plate', id: 'south-plate', symbol: 'sun', x: 5.52, z: 10.28 },
        { type: 'plate', id: 'north-plate', symbol: 'moon', x: 5.75, z: -5.03 },
        { type: 'plate', id: 'shrine-plate', symbol: 'sun', x: -0.69, z: -15.29 },
        { type: 'chest', id: 'treasure', x: -6.32, z: -16.4, y: 0.45, rotation: 0, locked: true },
        { type: 'zone', id: 'north-bank', minX: 6.9, maxX: 13.8, minZ: -15.15, maxZ: -12.25, minY: -0.1, maxY: 0.2 },
        { type: 'slime', id: 'grove-slime', x: -12.65, z: -2.29 },
        { type: 'slime', id: 'plaza-slime', x: 14.37, z: 0.78 },
        { type: 'slime', id: 'shrine-slime', x: 4.6, z: -16.4 }
    ]
};

export const level: LevelDefinition = {
    id: 'twin-bridges',
    scene: 'twin-bridges',
    hud: DEFAULT_HUD,
    text: {
        ...DEFAULT_TEXT,
        matched: 'Klick! Något vaknar i närheten.',
        won: {
            title: 'Broarnas hjälte',
            copy: 'Båda broarna står stadigt och skatten glittrar. Så fint gjort!'
        }
    },
    rules: [
        {
            id: 'raise-south-bridge',
            when: { type: 'plateActive', target: 'south-plate' },
            actions: [{ type: 'openBridge', target: 'south-bridge' }],
            message: 'Solen väcker bron! Gå över floden.'
        },
        {
            id: 'raise-north-bridge',
            when: { type: 'plateActive', target: 'north-plate' },
            actions: [{ type: 'openBridge', target: 'north-bridge' }],
            message: 'Månen lyfter nästa bro!'
        },
        {
            id: 'reach-north-bank',
            when: { type: 'zoneVisited', target: 'north-bank' },
            actions: [],
            message: 'Helgedomen väntar. Den vill ha en sol till!'
        },
        {
            id: 'unlock-treasure',
            when: { type: 'plateActive', target: 'shrine-plate' },
            actions: [{ type: 'unlockChest', target: 'treasure' }],
            message: 'Klick! Skatten är upplåst.'
        }
    ],
    completion: { type: 'chestReached', target: 'treasure' }
};
