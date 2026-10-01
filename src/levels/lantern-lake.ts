import { DEFAULT_HUD, DEFAULT_LIGHTING, DEFAULT_TEXT } from './defaults';
import type { LevelDefinition, SceneDefinition, SceneObject } from './types';

/** Overlapping rock rims seal both courts, leaving only their five-unit southern gates. */
const courtRims = [
    [
        [-11.4, 0],
        [-13, 0],
        [-13, -9],
        [-3, -9],
        [-3, 0],
        [-4.6, 0]
    ],
    [
        [4.1, 0],
        [0.5, 0],
        [0.5, -15.5],
        [15.5, -15.5],
        [15.5, 0],
        [10.9, 0]
    ]
];
const courtEnclosures: SceneObject[] = [];
for (const rim of courtRims) {
    for (let segment = 1; segment < rim.length; segment++) {
        const [x, z] = rim[segment - 1];
        const [endX, endZ] = rim[segment];
        const steps = Math.ceil(Math.hypot(endX - x, endZ - z) / 1.2);
        for (let i = 0; i < steps; i++) {
            courtEnclosures.push({
                type: 'rock',
                x: x + ((endX - x) * i) / steps,
                z: z + ((endZ - z) * i) / steps,
                scale: 1.8
            });
        }
    }
    const [x, z] = rim[rim.length - 1];
    courtEnclosures.push({ type: 'rock', x, z, scale: 1.8 });
}

/**
 * Two stones trade gate duty beside the lake. The sun frees the moon from the west court;
 * the moon opens the east court until the sun takes over from inside. Bringing the moon
 * inside permanently holds that gate open and readies the final sun plate.
 */
export const scene: SceneDefinition = {
    id: 'lantern-lake',
    name: 'Lantern Lake',
    seed: 511,
    terrain: {
        kind: 'river',
        land: [{ minX: -18, maxX: 18, minZ: -21, maxZ: 15, radius: 3 }],
        water: [{ minX: -20, maxX: 20, minZ: -24, maxZ: -18.5, radius: 2 }],
        islets: [],
        blend: 0.8,
        wallHeight: 2.4,
        waterLevel: -1.8,
        clearings: [
            // Shared starting glade and short paths to the two outside gate plates.
            {
                x: 512,
                y: 882,
                radius: [150, 100],
                innerRadius: [110, 70],
                path: { x: 512, y: 882, dx: -228, dy: -171 }
            },
            { x: 725, y: 711, radius: [100, 80], innerRadius: [70, 50], path: { x: 725, y: 711, dx: -213, dy: 171 } },
            { x: 284, y: 711, radius: [100, 80], innerRadius: [70, 50], path: { x: 284, y: 711, dx: 441, dy: 0 } },
            // West moon court; its trail passes straight through the gate.
            { x: 284, y: 455, radius: [110, 100], innerRadius: [75, 70], path: { x: 284, y: 455, dx: 0, dy: 256 } },
            // East court, the inside sun holder, and the shrine approach.
            { x: 740, y: 398, radius: [165, 125], innerRadius: [120, 90], path: { x: 740, y: 398, dx: -15, dy: 313 } },
            { x: 597, y: 512, radius: [65, 70], innerRadius: [45, 50], path: { x: 597, y: 512, dx: 57, dy: -114 } },
            { x: 740, y: 256, radius: [110, 90], innerRadius: [80, 60], path: { x: 740, y: 256, dx: 0, dy: 142 } },
            // Optional combat clearings, away from the carrying paths.
            { x: 114, y: 953, radius: [65, 60], innerRadius: [42, 40] },
            { x: 910, y: 953, radius: [65, 60], innerRadius: [42, 40] }
        ]
    },
    backdrop: {
        size: 62,
        gradient: ['#bfe3e8', '#c7e8ea', '#d2eee8'],
        shadowColor: '#7fa8ae',
        shadowOffset: [-1.8, 1.6]
    },
    spawn: { x: 0, z: 10 },
    walkBounds: { minX: -16.5, maxX: 16.5, minZ: -17.5, maxZ: 13.5 },
    blockBounds: { minX: -16, maxX: 16, minZ: -17, maxZ: 13 },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 28.46],
            target: [0, 0, 10.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.75, 0.89, 0.91]
        },
        follow: { x: 1, z: 1, anchorZ: 10, rate: 4 }
    },
    scenery: [
        { type: 'shrineDais', x: 8, z: -12 },
        { type: 'tree', x: -14.2, z: 4, scale: 0.9, rotation: 20 },
        { type: 'tree', x: -10.5, z: 13, scale: 0.95, rotation: -40 },
        { type: 'tree', x: 6, z: 13, scale: 1, rotation: 60 },
        { type: 'tree', x: 14.2, z: 5.5, scale: 0.9, rotation: 35 },
        { type: 'tree', x: -14.5, z: -10.7, scale: 0.85, rotation: 30 },
        { type: 'tree', x: -1.7, z: -12.5, scale: 0.9, rotation: -20 },
        { type: 'rock', x: -5, z: 13, scale: 1, rotation: 25 },
        { type: 'rock', x: 11.5, z: 13, scale: 1.2, rotation: -15 },
        { type: 'rock', x: -9, z: -19.5, scale: 0.7, y: -1.8 },
        { type: 'rock', x: 4, z: -19.5, scale: 0.6, y: -1.8 },
        { type: 'bushCluster', x: -14, z: 7, count: 4, spread: 0.7, scale: 0.4 },
        { type: 'bushCluster', x: 2.5, z: 13, count: 4, spread: 0.8, scale: 0.4 },
        { type: 'bushCluster', x: 14, z: 9.5, count: 3, spread: 0.7, scale: 0.4 },
        { type: 'bushCluster', x: -8, z: -10.8, count: 3, spread: 0.8, scale: 0.4 },
        { type: 'bush', x: -1, z: -6, scale: 0.65 },
        { type: 'pot', x: -11, z: -7, scale: 0.8 },
        { type: 'pot', x: 13, z: -13.5, scale: 0.75 },
        { type: 'signpost', x: -1.5, z: 11.5, rotation: 20 },
        ...courtEnclosures
    ],
    objects: [
        { type: 'block', id: 'sun-box', symbol: 'sun', x: -4, z: 8 },
        { type: 'block', id: 'moon-box', symbol: 'moon', x: -8, z: -5 },
        { type: 'plate', id: 'west-gate-plate', symbol: 'sun', x: -8, z: 4, mode: 'temporary' },
        { type: 'plate', id: 'east-moon-plate', symbol: 'moon', x: 7.5, z: 4, mode: 'temporary' },
        { type: 'plate', id: 'east-sun-plate', symbol: 'sun', x: 3, z: -3, mode: 'temporary' },
        { type: 'plate', id: 'moon-lantern', symbol: 'moon', x: 5, z: -7 },
        {
            type: 'plate',
            id: 'sun-lantern',
            symbol: 'sun',
            x: 11,
            z: -7,
            requiresPlate: 'moon-lantern',
            showDependency: true
        },
        {
            type: 'gate',
            id: 'west-gate',
            x: -8,
            z: 0,
            width: 5,
            openWhen: { type: 'plateActive', target: 'west-gate-plate' }
        },
        {
            type: 'gate',
            id: 'east-gate',
            x: 7.5,
            z: 0,
            width: 5,
            openWhen: {
                type: 'any',
                conditions: [
                    { type: 'plateActive', target: 'east-moon-plate' },
                    { type: 'plateActive', target: 'east-sun-plate' },
                    { type: 'plateActive', target: 'moon-lantern' }
                ]
            }
        },
        { type: 'portal', id: 'portal', x: 8, z: -12, y: 0.45, rotation: 0, locked: true },
        { type: 'slime', id: 'west-slime', x: -14, z: 12.5 },
        { type: 'slime', id: 'east-slime', x: 14, z: 12.5 }
    ]
};

export const level: LevelDefinition = {
    id: 'lantern-lake',
    scene: 'lantern-lake',
    hud: { ...DEFAULT_HUD, title: 'Lantern Lake · Sol och måne hjälps åt' },
    text: {
        ...DEFAULT_TEXT,
        matched: 'Klick! Plattan lyser.',
        won: { title: 'Alla lyktor lyser!', copy: 'Sol och måne hittade vägen tillsammans. Fint gjort!' },
        over: { title: 'Ett nytt försök?', copy: 'Stenarna väntar på dig. Du klarar det!' }
    },
    rules: [
        {
            id: 'light-west',
            when: { type: 'plateActive', target: 'west-gate-plate' },
            actions: [],
            message: 'Solen lyser. Västra grinden öppnas!'
        },
        {
            id: 'light-east-moon',
            when: { type: 'plateActive', target: 'east-moon-plate' },
            actions: [],
            message: 'Månen lyser. Östra grinden öppnas!'
        },
        {
            id: 'light-east-sun',
            when: { type: 'plateActive', target: 'east-sun-plate' },
            actions: [],
            message: 'Även solen kan hålla östra grinden öppen.'
        },
        {
            id: 'light-moon-lantern',
            when: { type: 'plateActive', target: 'moon-lantern' },
            actions: [],
            message: 'Månlyktan lyser! Grinden stannar öppen och solplattan vaknar.'
        },
        {
            id: 'open-portal',
            when: {
                type: 'all',
                conditions: [
                    { type: 'plateActive', target: 'moon-lantern' },
                    { type: 'plateActive', target: 'sun-lantern' }
                ]
            },
            actions: [{ type: 'openPortal', target: 'portal' }],
            message: 'Båda lyktorna lyser! Portalen öppnar sig. Fint gjort!'
        }
    ],
    completion: { type: 'portalReached', target: 'portal' }
};
