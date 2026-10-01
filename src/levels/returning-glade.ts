import { DEFAULT_HUD, DEFAULT_LIGHTING, DEFAULT_TEXT } from './defaults';
import type { LevelDefinition, SceneDefinition, SceneObject } from './types';

// Seal the moon court, leaving its east-facing five-unit gate as the only entrance.
const rims = [
    [
        [-10, 9.6],
        [-10, 7],
        [-20, 7],
        [-20, 19],
        [-10, 19],
        [-10, 16.4]
    ],
    [
        [-14, 0],
        [-13.4, 0]
    ],
    [
        [-6.6, 0],
        [-6, 0]
    ]
];
const rocks: SceneObject[] = [];
for (const rim of rims) {
    for (let i = 1; i < rim.length; i++) {
        const [x, z] = rim[i - 1];
        const [endX, endZ] = rim[i];
        const steps = Math.ceil(Math.hypot(endX - x, endZ - z) / 1.2);
        for (let j = 0; j < steps; j++) {
            rocks.push({ type: 'rock', x: x + ((endX - x) * j) / steps, z: z + ((endZ - z) * j) / steps, scale: 1.8 });
        }
    }
    const [x, z] = rim[rim.length - 1];
    rocks.push({ type: 'rock', x, z, scale: 1.8 });
}

/** Two reusable stones build a permanent return route before lighting the shrine. */
export const scene: SceneDefinition = {
    id: 'returning-glade',
    name: 'Återvägens glänta',
    seed: 613,
    terrain: {
        kind: 'river',
        land: [{ minX: -22, maxX: 22, minZ: -22, maxZ: 22, radius: 3 }],
        water: [
            { minX: -26, maxX: -13.5, minZ: -4, maxZ: 4, radius: 0.5 },
            { minX: -6.5, maxX: 26, minZ: -4, maxZ: 4, radius: 0.5 }
        ],
        islets: [],
        blend: 0.6,
        wallHeight: 2.4,
        waterLevel: -1.8,
        clearings: [
            { x: 512, y: 908, radius: [120, 75], innerRadius: [90, 50], path: { x: 512, y: 908, dx: -140, dy: -186 } },
            { x: 372, y: 722, radius: [80, 65], innerRadius: [50, 40], path: { x: 372, y: 722, dx: 93, dy: -47 } },
            { x: 140, y: 815, radius: [65, 90], innerRadius: [42, 65], path: { x: 140, y: 815, dx: 232, dy: 0 } },
            // Open moon clearing, east of the court wall, linked to the western crossing.
            { x: 465, y: 675, radius: [65, 55], innerRadius: [45, 35], path: { x: 465, y: 675, dx: -186, dy: -23 } },
            { x: 279, y: 652, radius: [65, 55], innerRadius: [45, 35], path: { x: 279, y: 652, dx: 0, dy: -373 } },
            { x: 279, y: 279, radius: [75, 60], innerRadius: [50, 40], path: { x: 279, y: 279, dx: 559, dy: 47 } },
            { x: 838, y: 326, radius: [85, 60], innerRadius: [55, 40], path: { x: 838, y: 326, dx: -93, dy: 373 } },
            { x: 745, y: 722, radius: [85, 65], innerRadius: [55, 40], path: { x: 745, y: 722, dx: -280, dy: -47 } },
            { x: 535, y: 209, radius: [130, 75], innerRadius: [95, 50], path: { x: 535, y: 209, dx: 210, dy: 117 } },
            { x: 931, y: 931, radius: [50, 50], innerRadius: [30, 30] },
            { x: 116, y: 140, radius: [50, 50], innerRadius: [30, 30] }
        ]
    },
    backdrop: {
        size: 72,
        gradient: ['#bfe3e8', '#c7e8ea', '#d2eee8'],
        shadowColor: '#7fa8ae',
        shadowOffset: [-1.8, 1.6]
    },
    spawn: { x: 0, z: 17 },
    walkBounds: { minX: -21, maxX: 21, minZ: -21, maxZ: 21 },
    blockBounds: { minX: -20.5, maxX: 20.5, minZ: -20.5, maxZ: 20.5 },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 35.46],
            target: [0, 0, 17.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.75, 0.89, 0.91]
        },
        follow: { x: 1, z: 1, anchorZ: 17, rate: 4 }
    },
    scenery: [
        { type: 'shrineDais', x: 1, z: -17 },
        { type: 'tree', x: -19, z: -7, scale: 0.9, rotation: 20 },
        { type: 'tree', x: -9, z: -20, scale: 0.95, rotation: -40 },
        { type: 'tree', x: 14, z: -19, scale: 1, rotation: 60 },
        { type: 'tree', x: 19, z: -10, scale: 0.9, rotation: 35 },
        { type: 'tree', x: 19, z: 8, scale: 0.9, rotation: 10 },
        { type: 'tree', x: 8, z: 20, scale: 0.95, rotation: -20 },
        { type: 'tree', x: -5, z: 20, scale: 0.85, rotation: 30 },
        { type: 'bushCluster', x: 15, z: -20, count: 3, spread: 0.7, scale: 0.4 },
        { type: 'bushCluster', x: 20, z: 13, count: 3, spread: 0.7, scale: 0.4 },
        { type: 'pot', x: -18, z: 9, scale: 0.8 },
        { type: 'signpost', x: 3, z: 18, rotation: 180 },
        ...rocks
    ],
    objects: [
        { type: 'block', id: 'sun-box', symbol: 'sun', x: -4, z: 14 },
        { type: 'block', id: 'moon-box', symbol: 'moon', x: -16, z: 13 },
        { type: 'plate', id: 'court-sun', symbol: 'sun', x: -6, z: 9, mode: 'temporary' },
        { type: 'plate', id: 'crossing-moon', symbol: 'moon', x: -2, z: 7, mode: 'temporary' },
        { type: 'plate', id: 'bridge-sun', symbol: 'sun', x: 14, z: -8, mode: 'temporary' },
        { type: 'plate', id: 'shrine-moon', symbol: 'moon', x: -2, z: -13 },
        {
            type: 'plate',
            id: 'shrine-sun',
            symbol: 'sun',
            x: 4,
            z: -13,
            requiresPlate: 'shrine-moon',
            showDependency: true
        },
        {
            type: 'gate',
            id: 'court-gate',
            x: -10,
            z: 13,
            width: 5,
            rotation: 90,
            openWhen: { type: 'plateActive', target: 'court-sun' }
        },
        {
            type: 'gate',
            id: 'crossing-gate',
            x: -10,
            z: 0,
            width: 5,
            openWhen: { type: 'plateActive', target: 'crossing-moon' }
        },
        { type: 'bridge', id: 'return-bridge', x: 10, z: 0, length: 12, state: 'closed' },
        { type: 'portal', id: 'portal', x: 1, z: -17, y: 0.45, rotation: 0, locked: true },
        { type: 'slime', id: 'south-slime', x: 18, z: 18 },
        { type: 'slime', id: 'north-slime', x: -17, z: -16 }
    ]
};

export const level: LevelDefinition = {
    id: 'returning-glade',
    scene: 'returning-glade',
    hud: { ...DEFAULT_HUD, title: 'Återvägens glänta · En ny väg hem' },
    text: {
        ...DEFAULT_TEXT,
        matched: 'Klick! Plattan lyser.',
        won: { title: 'Du hittade vägen!', copy: 'Sol och måne lyser tillsammans igen. Vilket fint äventyr!' },
        over: { title: 'Ett nytt försök?', copy: 'Gläntan väntar på dig. Ta det i din takt!' }
    },
    rules: [
        {
            id: 'open-court',
            when: { type: 'plateActive', target: 'court-sun' },
            actions: [],
            message: 'Solen lyser. Gårdens grind öppnas!'
        },
        {
            id: 'open-crossing',
            when: { type: 'plateActive', target: 'crossing-moon' },
            actions: [],
            message: 'Månen lyser. Vägen över floden öppnas!'
        },
        {
            id: 'raise-return-bridge',
            when: {
                type: 'all',
                conditions: [
                    { type: 'plateActive', target: 'crossing-moon' },
                    { type: 'plateActive', target: 'bridge-sun' }
                ]
            },
            actions: [{ type: 'openBridge', target: 'return-bridge' }],
            message: 'Bron har rest sig och stannar uppe!'
        },
        {
            id: 'light-moon',
            when: { type: 'plateActive', target: 'shrine-moon' },
            actions: [],
            message: 'Månen lyser vid helgedomen. Solplattan vaknar!'
        },
        {
            id: 'open-portal',
            when: {
                type: 'all',
                conditions: [
                    { type: 'plateActive', target: 'shrine-moon' },
                    { type: 'plateActive', target: 'shrine-sun' }
                ]
            },
            actions: [{ type: 'openPortal', target: 'portal' }],
            message: 'Sol och måne är framme. Portalen öppnar sig!'
        }
    ],
    completion: { type: 'portalReached', target: 'portal' }
};
