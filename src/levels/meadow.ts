import { DEFAULT_HUD, DEFAULT_TEXT, DEFAULT_LIGHTING } from './defaults';
import type { LevelDefinition, SceneDefinition } from './types';

export const scene: SceneDefinition = {
    id: 'meadow',
    name: 'Mossy Meadow',
    seed: 73,
    terrain: {
        halfWidth: 12.4,
        halfDepth: 9.4,
        cornerRadius: 3,
        wallHeight: 1.78,
        clearing: {
            x: 786,
            y: 152,
            radius: [168, 190],
            innerRadius: [142, 162],
            path: {
                x: 792,
                y: 250,
                dx: -37,
                dy: 218
            }
        }
    },
    backdrop: {
        size: 34
    },
    spawn: {
        x: -1.7,
        z: 4
    },
    walkBounds: {
        minX: -11,
        maxX: 11,
        minZ: -8.3,
        maxZ: 8.3
    },
    blockBounds: {
        minX: -10,
        maxX: 10.5,
        minZ: -8,
        maxZ: 8
    },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 19.2],
            target: [0, 0, 0.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.78, 0.89, 0.81]
        },
        follow: {
            x: 0.07,
            z: 0.06,
            anchorZ: 4,
            rate: 2.5
        }
    },
    scenery: [
        {
            type: 'tree',
            x: -8,
            z: -6.3,
            scale: 1.5,
            rotation: 20
        },
        {
            type: 'tree',
            x: 10.8,
            z: 0.2,
            scale: 1.44,
            rotation: -40
        },
        {
            type: 'tree',
            x: -10.5,
            z: 5.4,
            scale: 1.52,
            rotation: 70
        },
        {
            type: 'rock',
            x: -9.8,
            z: -4.5,
            scale: 2.5
        },
        {
            type: 'rock',
            x: -10.9,
            z: -3.3,
            scale: 1.2
        },
        {
            type: 'rock',
            x: 9.5,
            z: 7.1,
            scale: 3.6
        },
        {
            type: 'rock',
            x: 8,
            z: 7.6,
            scale: 1.95
        },
        {
            type: 'rock',
            x: -5.3,
            z: -7.7,
            scale: 1.45
        },
        {
            type: 'rock',
            x: 4.9,
            z: -8.8,
            scale: 1.8
        },
        {
            type: 'rock',
            x: 11.1,
            z: -5,
            scale: 1.8
        },
        {
            type: 'rock',
            x: -9.1,
            z: -1.4,
            scale: 0.72
        },
        {
            type: 'rock',
            x: -5.1,
            z: 6.1,
            scale: 0.84
        },
        {
            type: 'rock',
            x: 3.3,
            z: 7.4,
            scale: 0.74
        },
        {
            type: 'rock',
            x: -10.9,
            z: 0.6,
            scale: 0.6
        },
        {
            type: 'rock',
            x: 8,
            z: 0.9,
            scale: 0.64
        },
        {
            type: 'rock',
            x: -3.6,
            z: -6.3,
            scale: 0.5
        },
        {
            type: 'rock',
            x: 6.6,
            z: 5,
            scale: 0.46
        },
        {
            type: 'rock',
            x: 1.2,
            z: -8.6,
            scale: 0.44
        },
        {
            type: 'bushCluster',
            x: -7.1,
            z: -6.9,
            count: 6,
            spread: 1.5,
            scale: 0.48
        },
        {
            type: 'bushCluster',
            x: -9.5,
            z: -3.6,
            count: 5,
            spread: 1.3,
            scale: 0.44
        },
        {
            type: 'bushCluster',
            x: 4.3,
            z: -9,
            count: 6,
            spread: 1.6,
            scale: 0.5
        },
        {
            type: 'bushCluster',
            x: 6,
            z: -8.9,
            count: 4,
            spread: 1.2,
            scale: 0.46
        },
        {
            type: 'bushCluster',
            x: 11,
            z: -4.6,
            count: 6,
            spread: 1.3,
            scale: 0.46
        },
        {
            type: 'bushCluster',
            x: 9.1,
            z: 5.9,
            count: 7,
            spread: 1.8,
            scale: 0.5
        },
        {
            type: 'bushCluster',
            x: -10.6,
            z: 4,
            count: 5,
            spread: 1.2,
            scale: 0.44
        },
        {
            type: 'bushCluster',
            x: 11.3,
            z: 1.9,
            count: 5,
            spread: 1.2,
            scale: 0.44
        },
        {
            type: 'bushCluster',
            x: -4.4,
            z: 6.8,
            count: 3,
            spread: 0.8,
            scale: 0.34
        },
        {
            type: 'bushCluster',
            x: -6.1,
            z: 6.3,
            count: 4,
            spread: 1,
            scale: 0.36
        },
        {
            type: 'pot',
            x: -8.3,
            z: 4.9
        },
        {
            type: 'pot',
            x: -7,
            z: 5.8,
            scale: 0.9
        },
        {
            type: 'log',
            x: -9.5,
            z: 6.6,
            rotation: -32
        }
    ],
    objects: [
        {
            type: 'block',
            id: 'block-1',
            symbol: 'sun',
            x: 1.5,
            z: 6.5
        },
        {
            type: 'plate',
            id: 'plate-1',
            symbol: 'sun',
            x: 4,
            z: -5.2
        },
        {
            type: 'chest',
            id: 'chest',
            x: 9.15,
            z: -5.4,
            rotation: 0,
            locked: true
        },
        {
            type: 'slime',
            id: 'slime-1',
            x: -4.2,
            z: -2.6
        },
        {
            type: 'slime',
            id: 'slime-2',
            x: 5.7,
            z: 1.9
        }
    ]
};

export const level: LevelDefinition = {
    id: 'meadow',
    scene: 'meadow',
    hud: DEFAULT_HUD,
    text: {
        ...DEFAULT_TEXT,
        matched: 'Klick! En fin tr\u00e4ff! Hitta den andra symbolen!',
        won: {
            title: 'En ficka full av solsken',
            copy: 'Du hittade \u00e4ngens skatt. V\u00e4rlden k\u00e4nns lite varmare.'
        }
    },
    rules: [
        {
            id: 'unlock-treasure',
            when: {
                type: 'all',
                conditions: [
                    {
                        type: 'plateActive',
                        target: 'plate-1'
                    }
                ]
            },
            actions: [
                {
                    type: 'unlockChest',
                    target: 'chest'
                }
            ],
            message: 'Klick! Skatten är upplåst.'
        }
    ],
    completion: {
        type: 'chestReached',
        target: 'chest'
    }
};
