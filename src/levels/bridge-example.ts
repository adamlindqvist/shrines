import { DEFAULT_HUD, DEFAULT_LIGHTING, DEFAULT_TEXT } from './defaults';
import type { LevelDefinition, SceneDefinition } from './types';

export const scene: SceneDefinition = {
    id: 'bridge-example',
    name: 'Solbron',
    seed: 401,
    terrain: {
        kind: 'river',
        land: [{ minX: -12, maxX: 12, minZ: -11, maxZ: 11, radius: 2 }],
        water: [{ minX: -14, maxX: 14, minZ: -2, maxZ: 2, radius: 0.5 }],
        islets: [],
        blend: 0.8,
        wallHeight: 2.4,
        waterLevel: -1.8,
        clearings: []
    },
    backdrop: { size: 40 },
    spawn: { x: 0, z: 8 },
    walkBounds: { minX: -10, maxX: 10, minZ: -9, maxZ: 9 },
    blockBounds: { minX: -9, maxX: 9, minZ: -8, maxZ: 8 },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 19.2],
            target: [0, 0, 0.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.78, 0.89, 0.81]
        }
    },
    scenery: [
        { type: 'tree', x: -9, z: 7, scale: 1.2 },
        { type: 'tree', x: 9, z: -8, scale: 1.2 },
        { type: 'rock', x: -9, z: -8, scale: 1.5 },
        { type: 'bushCluster', x: 8, z: 7, count: 4, scale: 0.5 }
    ],
    objects: [
        { type: 'block', id: 'box', symbol: 'sun', x: 0, z: 6 },
        { type: 'plate', id: 'plate', symbol: 'sun', x: 0, z: 3.8 },
        { type: 'bridge', id: 'bridge', x: 4, z: 0, length: 7, state: 'closed' },
        { type: 'chest', id: 'treasure', x: 4, z: -7, rotation: 0, locked: false }
    ]
};
export const level: LevelDefinition = {
    id: 'bridge-example',
    scene: 'bridge-example',
    hud: DEFAULT_HUD,
    text: {
        ...DEFAULT_TEXT,
        matched: 'Klick! Solen lyser.',
        won: { title: 'En bro av solsken', copy: 'Du öppnade vägen och hittade skatten!' }
    },
    rules: [
        {
            id: 'raise-bridge',
            when: { type: 'plateActive', target: 'plate' },
            actions: [{ type: 'openBridge', target: 'bridge' }],
            message: 'Bron vaknar! Nu kan du gå över.'
        }
    ],
    completion: { type: 'chestReached', target: 'treasure' }
};
