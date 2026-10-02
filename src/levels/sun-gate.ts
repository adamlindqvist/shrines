import { DEFAULT_HUD, DEFAULT_TEXT, DEFAULT_LIGHTING } from './defaults';
import type { LevelDefinition, SceneDefinition, SceneObject } from './types';

/** Joined rocks form a crescent chamber; the angled gate is its only entrance. */
const enclosure: SceneObject[] = [];
const rim = [
    [-7.1, 0.2],
    [-10.4, 0.3],
    [-13.5, -2],
    [-15, -6],
    [-14, -11],
    [-10, -14],
    [-5, -14],
    [-1, -11],
    [1, -7],
    [-0.9, -4.2]
];
// Deliberate overlaps seal the wall for the smallest actor, including the joints at the posts.
for (let segment = 1; segment < rim.length; segment++) {
    const [x, z] = rim[segment - 1];
    const [endX, endZ] = rim[segment];
    const steps = Math.ceil(Math.hypot(endX - x, endZ - z) / 1.6);
    for (let i = 0; i < steps; i++) {
        enclosure.push({ type: 'rock', x: x + ((endX - x) * i) / steps, z: z + ((endZ - z) * i) / steps, scale: 1.8 });
    }
}
enclosure.push({ type: 'rock', x: -0.9, z: -4.2, scale: 1.8 });
// A short inner ridge gives the moon route a broad bend rather than a straight corridor.
for (const x of [-13.5, -11.9, -10.3, -8.7]) enclosure.push({ type: 'rock', x, z: -6, scale: 1.8 });

/** Retrieve the moon using the temporary sun plate, then reuse the sun on its permanent plate. */
export const scene: SceneDefinition = {
    id: 'sun-gate',
    name: 'Solgrinden',
    seed: 263,
    terrain: {
        halfWidth: 20,
        halfDepth: 18,
        cornerRadius: 3,
        wallHeight: 1.78,
        clearings: [
            { x: 282, y: 796, radius: [155, 150], innerRadius: [110, 110], path: { x: 307, y: 760, dx: 0, dy: -205 } },
            { x: 307, y: 640, radius: [125, 100], innerRadius: [85, 70], path: { x: 307, y: 640, dx: 103, dy: -185 } },
            { x: 256, y: 228, radius: [135, 125], innerRadius: [95, 85], path: { x: 330, y: 285, dx: 80, dy: 170 } },
            { x: 563, y: 540, radius: [150, 110], innerRadius: [110, 75], path: { x: 410, y: 455, dx: 307, dy: -140 } },
            {
                x: 768,
                y: 256,
                radius: [190, 150],
                innerRadius: [150, 110],
                path: { x: 768, y: 350, dx: -145, dy: 180 }
            },
            { x: 794, y: 583, radius: [105, 95], innerRadius: [75, 65], path: { x: 794, y: 583, dx: -230, dy: 55 } },
            { x: 870, y: 796, radius: [120, 120], innerRadius: [85, 85], path: { x: 870, y: 796, dx: -165, dy: -120 } }
        ]
    },
    backdrop: { size: 60 },
    spawn: { x: -8, z: 12 },
    walkBounds: { minX: -18.5, maxX: 18.5, minZ: -16.5, maxZ: 16.5 },
    blockBounds: { minX: -17.5, maxX: 17.5, minZ: -15.5, maxZ: 15.5 },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 31.2],
            target: [0, 0, 12.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.75, 0.89, 0.9]
        },
        follow: { x: 1, z: 1, anchorZ: 12, rate: 4 }
    },
    scenery: [
        ...enclosure,
        { type: 'shrineDais', x: 9.5, z: -12.5 },
        { type: 'signpost', x: -3, z: 7.7, rotation: -35 },
        { type: 'signpost', x: -5, z: 10, rotation: 20 },
        { type: 'tree', x: -17.5, z: -10, scale: 1.2, rotation: -25 },
        { type: 'tree', x: -7, z: -16.3, scale: 1.1, rotation: 30 },
        { type: 'tree', x: 15, z: -13.8, scale: 1.4, rotation: 30 },
        { type: 'tree', x: -16, z: 13, scale: 1.4, rotation: -110 },
        { type: 'tree', x: 3.5, z: 10.5, scale: 1.2, rotation: 70 },
        { type: 'tree', x: 16.5, z: 14.5, scale: 1.4, rotation: 110 },
        { type: 'tree', x: 18, z: 3, scale: 1.2, rotation: 20 },
        { type: 'bushCluster', x: -17, z: 10.5, count: 4, spread: 1, scale: 0.45 },
        { type: 'bushCluster', x: -8, z: -16.5, count: 4, spread: 0.8, scale: 0.4 },
        { type: 'bushCluster', x: 15.5, z: -15.5, count: 4, spread: 1, scale: 0.45 },
        { type: 'bushCluster', x: 4.5, z: 12.2, count: 4, spread: 1, scale: 0.45 },
        { type: 'bushCluster', x: 17.8, z: 13, count: 4, spread: 1, scale: 0.45 },
        { type: 'rock', x: 4, z: 14, scale: 2.5, rotation: 20 },
        { type: 'rock', x: 17, z: -7, scale: 2.2, rotation: -20 },
        { type: 'log', x: 12.5, z: 13.5, rotation: 15 },
        { type: 'pot', x: 16.8, z: 10.5 }
    ],
    objects: [
        { type: 'block', id: 'sun-box', symbol: 'sun', x: 11, z: 2.5 },
        { type: 'block', id: 'moon-box', symbol: 'moon', x: -10, z: -10 },
        { type: 'plate', id: 'gate-plate', symbol: 'sun', x: -8, z: 4.5, mode: 'temporary' },
        { type: 'plate', id: 'portal-plate', symbol: 'moon', x: 7, z: -7 },
        {
            type: 'plate',
            id: 'sun-portal-plate',
            symbol: 'sun',
            x: 12,
            z: -7,
            requiresPlate: 'portal-plate',
            showDependency: true
        },
        {
            type: 'gate',
            id: 'sun-gate',
            x: -4,
            z: -2,
            width: 5,
            rotation: 35,
            openWhen: { type: 'plateActive', target: 'gate-plate' }
        },
        { type: 'portal', id: 'portal', x: 9.5, z: -12.5, y: 0.45, rotation: 0, locked: true },
        { type: 'slime', id: 'glade-slime-1', x: 13, z: 10 },
        { type: 'slime', id: 'glade-slime-2', x: 16, z: 6.5 }
    ]
};

export const level: LevelDefinition = {
    id: 'sun-gate',
    scene: 'sun-gate',
    hud: DEFAULT_HUD,
    text: {
        ...DEFAULT_TEXT,
        won: { title: 'Vägen är öppen!', copy: 'Sol och måne hjälpte dig vidare. Fint gjort!' },
        over: { title: 'Ett nytt försök?', copy: 'Stenarna väntar på dig. Du klarar det!' }
    },
    rules: [
        {
            id: 'open-portal',
            when: {
                type: 'all',
                conditions: [
                    { type: 'plateActive', target: 'portal-plate' },
                    { type: 'plateActive', target: 'sun-portal-plate' }
                ]
            },
            actions: [{ type: 'openPortal', target: 'portal' }]
        }
    ],
    completion: { type: 'portalReached', target: 'portal' }
};
