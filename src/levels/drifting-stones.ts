import { DEFAULT_HUD, DEFAULT_LIGHTING, DEFAULT_TEXT } from './defaults';
import type { LevelDefinition, SceneDefinition } from './types';

/**
 * A wide river splits the island. The moon box wakes two floating stones that drift out of
 * step between the south pier, a mid-river pad and the north pier; the sun box must ride both
 * to reach the shrine plate. Open water splashes. Clearing texels span X -24..24 and Z -20..20.
 */
export const scene: SceneDefinition = {
    id: 'drifting-stones',
    name: 'Drifting Stones',
    seed: 409,
    terrain: {
        kind: 'river',
        land: [{ minX: -22, maxX: 22, minZ: -20, maxZ: 20, radius: 3 }],
        water: [
            // The ferry river, spilling off both edges of the island.
            { minX: -28, maxX: 28, minZ: -4.8, maxZ: 4.2, radius: 1.5 },
            // Lily pond in the south-east meadow.
            { x: 17.6, z: 15.6, r: 2 }
        ],
        islets: [],
        blend: 1.1,
        wallHeight: 2.4,
        waterLevel: -1.8,
        clearings: [
            // Spawn, trailing west toward the moon plate.
            { x: 512, y: 896, radius: [85, 70], innerRadius: [55, 45], path: { x: 512, y: 896, dx: -192, dy: -179 } },
            // Moon plate and the south pier landing.
            { x: 256, y: 710, radius: [110, 70], innerRadius: [72, 45], path: { x: 256, y: 710, dx: -64, dy: -30 } },
            // Sun box nook, trailing back to spawn.
            { x: 768, y: 794, radius: [70, 58], innerRadius: [45, 36], path: { x: 768, y: 794, dx: -256, dy: 102 } },
            // North pier landing, trailing west to the shrine.
            { x: 832, y: 282, radius: [62, 50], innerRadius: [40, 32], path: { x: 832, y: 282, dx: -140, dy: -130 } },
            // Shrine plaza.
            { x: 580, y: 128, radius: [170, 75], innerRadius: [110, 50] }
        ]
    },
    backdrop: {
        size: 70,
        gradient: ['#c4e7cf', '#cbead5', '#d4efdc'],
        shadowColor: '#7aa88c',
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
            clearColor: [0.75, 0.9, 0.82]
        },
        follow: { x: 1, z: 1, anchorZ: 15, rate: 4 }
    },
    scenery: [
        { type: 'shrineDais', x: 2, z: -16 },
        { type: 'water', minX: -24, maxX: 24, minZ: -6, maxZ: 5.5 },

        // Piers and the mid-river pad. Floating stones dock against their lane-facing ends.
        { type: 'pier', x: -15, z: 3.45, width: 3.4, depth: 3.9 },
        { type: 'pier', x: 0, z: -0.3, width: 4, depth: 3.6 },
        { type: 'pier', x: 15, z: -4, width: 3.4, depth: 3.8 },

        // South bank.
        { type: 'tree', x: -20.5, z: 16.5, scale: 1.1, rotation: 20 },
        { type: 'tree', x: -9, z: 18.4, scale: 0.9, rotation: -40 },
        { type: 'tree', x: 9.5, z: 18.2, scale: 1, rotation: 60 },
        { type: 'tree', x: 20.5, z: 9.5, scale: 0.9, rotation: 35 },
        { type: 'rock', x: -20.5, z: 9.5, scale: 1.5, rotation: 25 },
        { type: 'rock', x: -6.5, z: 18.6, scale: 0.8, rotation: 40 },
        { type: 'rock', x: 14.5, z: 18.6, scale: 1.2, rotation: -15 },
        { type: 'rock', x: 21, z: 13.2, scale: 0.9 },
        { type: 'bushCluster', x: -18, z: 18.3, count: 4, spread: 1, scale: 0.45 },
        { type: 'bushCluster', x: 4, z: 18.6, count: 4, spread: 1.2, scale: 0.44 },
        { type: 'bush', x: -4.5, z: 17.5, scale: 0.8 },
        { type: 'log', x: 6, z: 16.8, scale: 0.8, rotation: 20 },
        { type: 'pot', x: -21, z: 6.2, scale: 0.85 },

        // Stones in the ferry river, clear of the drifting lane.
        { type: 'rock', x: -6, z: 3.4, scale: 0.6, y: -1.8 },
        { type: 'rock', x: 8, z: -3.9, scale: 0.7, y: -1.8 },
        { type: 'rock', x: -20, z: -3.6, scale: 0.8, y: -1.8 },
        { type: 'rock', x: 20, z: 3.3, scale: 0.55, y: -1.8 },

        // North bank around the shrine.
        { type: 'tree', x: -20, z: -16.5, scale: 1.2, rotation: -25 },
        { type: 'tree', x: -14, z: -18.2, scale: 0.9, rotation: 55 },
        { type: 'tree', x: 13.5, z: -18.5, scale: 0.9, rotation: 10 },
        { type: 'tree', x: 20.5, z: -15, scale: 1.1, rotation: -60 },
        { type: 'tree', x: -20.5, z: -8, scale: 0.9, rotation: 30 },
        { type: 'rock', x: -11, z: -18.5, scale: 1.4, rotation: 20 },
        { type: 'rock', x: -17.5, z: -11.5, scale: 1.2, rotation: -10 },
        { type: 'rock', x: 20.5, z: -9.5, scale: 1 },
        { type: 'bushCluster', x: 2, z: -19.2, count: 5, spread: 2, scale: 0.42 },
        { type: 'bushCluster', x: 9, z: -19, count: 4, spread: 1.2, scale: 0.44 },
        { type: 'bushCluster', x: -9, z: -9.5, count: 3, spread: 0.8, scale: 0.4 },
        { type: 'pot', x: -2.5, z: -14, scale: 0.9 },
        { type: 'pot', x: -3.2, z: -15.1, scale: 0.7 },
        { type: 'log', x: 17, z: -12.5, scale: 0.8, rotation: 70 },
        { type: 'bush', x: 12.2, z: -8.6, scale: 0.8 }
    ],
    objects: [
        {
            type: 'platform',
            id: 'west-stone',
            x: -15,
            z: -0.3,
            width: 4.4,
            depth: 3.6,
            travel: { x: 10.8, z: 0 },
            duration: 3.2,
            dwell: 1.2,
            phase: 0,
            state: 'dormant'
        },
        {
            type: 'platform',
            id: 'east-stone',
            x: 4.2,
            z: -0.3,
            width: 4.4,
            depth: 3.6,
            travel: { x: 10.8, z: 0 },
            duration: 3.2,
            dwell: 1.2,
            phase: 2,
            state: 'dormant'
        },
        { type: 'block', id: 'moon-box', symbol: 'moon', x: -6, z: 12 },
        { type: 'block', id: 'sun-box', symbol: 'sun', x: 12, z: 11 },
        { type: 'plate', id: 'moon-plate', symbol: 'moon', x: -9, z: 8 },
        { type: 'plate', id: 'shrine-plate', symbol: 'sun', x: 8.5, z: -14.5 },
        { type: 'portal', id: 'portal', x: 2, z: -16, y: 0.45, rotation: 0, locked: true },
        { type: 'slime', id: 'meadow-slime', x: 14, z: 15 },
        { type: 'slime', id: 'landing-slime', x: 10, z: -9 },
        { type: 'slime', id: 'shrine-slime', x: -4, z: -11.5 }
    ]
};

export const level: LevelDefinition = {
    id: 'drifting-stones',
    scene: 'drifting-stones',
    hud: DEFAULT_HUD,
    text: DEFAULT_TEXT,
    rules: [
        {
            id: 'wake-stones',
            when: { type: 'plateActive', target: 'moon-plate' },
            actions: [
                { type: 'activatePlatform', target: 'west-stone' },
                { type: 'activatePlatform', target: 'east-stone' }
            ],
            message: 'Stenarna vaknar och börjar glida över floden.'
        },
        {
            id: 'open-portal',
            when: { type: 'plateActive', target: 'shrine-plate' },
            actions: [{ type: 'openPortal', target: 'portal' }],
            message: 'Klick! En portal öppnar sig.'
        }
    ],
    completion: { type: 'portalReached', target: 'portal' }
};
