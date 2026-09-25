import { DEFAULT_HUD, DEFAULT_TEXT, DEFAULT_LIGHTING } from './defaults';
import type { LevelDefinition, SceneDefinition } from './types';

export const scene: SceneDefinition = {
    id: 'sun-moon',
    name: 'Sun & Moon Grove',
    seed: 149,
    terrain: {
        halfWidth: 20,
        halfDepth: 15,
        cornerRadius: 3,
        wallHeight: 1.78,
        clearings: [
            {
                x: 512,
                y: 205,
                radius: [180, 105],
                innerRadius: [140, 75],
                path: {
                    x: 512,
                    y: 260,
                    dx: 0,
                    dy: 575
                }
            },
            {
                x: 307,
                y: 614,
                radius: [100, 90],
                innerRadius: [65, 55],
                path: {
                    x: 307,
                    y: 614,
                    dx: 205,
                    dy: 120
                }
            },
            {
                x: 717,
                y: 512,
                radius: [100, 90],
                innerRadius: [65, 55],
                path: {
                    x: 717,
                    y: 512,
                    dx: -205,
                    dy: 100
                }
            }
        ]
    },
    backdrop: {
        size: 60
    },
    spawn: {
        x: 0,
        z: 10
    },
    walkBounds: {
        minX: -18,
        maxX: 18,
        minZ: -13,
        maxZ: 13
    },
    blockBounds: {
        minX: -17,
        maxX: 17,
        minZ: -12,
        maxZ: 12
    },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 29.2],
            target: [0, 0, 10.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.78, 0.89, 0.81]
        },
        follow: {
            x: 1,
            z: 1,
            anchorZ: 10,
            rate: 4
        }
    },
    scenery: [
        {
            type: 'tree',
            x: -16,
            z: 9,
            scale: 1.6,
            rotation: -112
        },
        {
            type: 'bushCluster',
            x: -15,
            z: 8,
            count: 5,
            spread: 1.3,
            scale: 0.5
        },
        {
            type: 'tree',
            x: 16,
            z: 7,
            scale: 1.6,
            rotation: 112
        },
        {
            type: 'bushCluster',
            x: 17,
            z: 6,
            count: 5,
            spread: 1.3,
            scale: 0.5
        },
        {
            type: 'tree',
            x: -16,
            z: -9,
            scale: 1.7,
            rotation: -112
        },
        {
            type: 'bushCluster',
            x: -15,
            z: -10,
            count: 5,
            spread: 1.3,
            scale: 0.5
        },
        {
            type: 'tree',
            x: 16,
            z: -10,
            scale: 1.8,
            rotation: 112
        },
        {
            type: 'bushCluster',
            x: 17,
            z: -11,
            count: 5,
            spread: 1.3,
            scale: 0.5
        },
        {
            type: 'tree',
            x: -7,
            z: -13,
            scale: 1.3,
            rotation: -49
        },
        {
            type: 'bushCluster',
            x: -6,
            z: -14,
            count: 5,
            spread: 1.3,
            scale: 0.5
        },
        {
            type: 'tree',
            x: 9,
            z: 13,
            scale: 1.4,
            rotation: 63
        },
        {
            type: 'bushCluster',
            x: 10,
            z: 12,
            count: 5,
            spread: 1.3,
            scale: 0.5
        },
        {
            type: 'rock',
            x: -17,
            z: 2,
            scale: 3
        },
        {
            type: 'bushCluster',
            x: -17,
            z: 3.5,
            count: 4,
            spread: 1,
            scale: 0.42
        },
        {
            type: 'rock',
            x: 17,
            z: -1,
            scale: 3.5
        },
        {
            type: 'bushCluster',
            x: 17,
            z: 0.5,
            count: 4,
            spread: 1,
            scale: 0.42
        },
        {
            type: 'rock',
            x: -12,
            z: -12,
            scale: 2.4
        },
        {
            type: 'bushCluster',
            x: -12,
            z: -10.5,
            count: 4,
            spread: 1,
            scale: 0.42
        },
        {
            type: 'rock',
            x: 12,
            z: 11,
            scale: 2.8
        },
        {
            type: 'bushCluster',
            x: 12,
            z: 12.5,
            count: 4,
            spread: 1,
            scale: 0.42
        },
        {
            type: 'rock',
            x: -12,
            z: 11,
            scale: 1.5
        },
        {
            type: 'bushCluster',
            x: -12,
            z: 12.5,
            count: 4,
            spread: 1,
            scale: 0.42
        },
        {
            type: 'rock',
            x: 12,
            z: -12,
            scale: 1.8
        },
        {
            type: 'bushCluster',
            x: 12,
            z: -10.5,
            count: 4,
            spread: 1,
            scale: 0.42
        },
        {
            type: 'pot',
            x: -11,
            z: 5
        },
        {
            type: 'pot',
            x: 11,
            z: 2
        },
        {
            type: 'log',
            x: -15,
            z: 6,
            rotation: 25
        }
    ],
    objects: [
        {
            type: 'block',
            id: 'block-1',
            symbol: 'sun',
            x: -8,
            z: 3
        },
        {
            type: 'block',
            id: 'block-2',
            symbol: 'moon',
            x: 8,
            z: 0
        },
        {
            type: 'plate',
            id: 'plate-1',
            symbol: 'sun',
            x: -4,
            z: -8
        },
        {
            type: 'plate',
            id: 'plate-2',
            symbol: 'moon',
            x: 4,
            z: -8
        },
        {
            type: 'portal',
            id: 'portal',
            x: 0,
            z: -11,
            rotation: 0,
            locked: true
        },
        {
            type: 'slime',
            id: 'slime-1',
            x: -10,
            z: -1
        },
        {
            type: 'slime',
            id: 'slime-2',
            x: 10,
            z: -4
        },
        {
            type: 'slime',
            id: 'slime-3',
            x: -5,
            z: -4
        },
        {
            type: 'slime',
            id: 'slime-4',
            x: 5,
            z: 5.5
        }
    ]
};

export const level: LevelDefinition = {
    id: 'sun-moon',
    scene: 'sun-moon',
    hud: DEFAULT_HUD,
    text: DEFAULT_TEXT,
    rules: [
        {
            id: 'open-portal',
            when: {
                type: 'all',
                conditions: [
                    {
                        type: 'plateActive',
                        target: 'plate-1'
                    },
                    {
                        type: 'plateActive',
                        target: 'plate-2'
                    }
                ]
            },
            actions: [
                {
                    type: 'openPortal',
                    target: 'portal'
                }
            ],
            message: 'Klick! En portal öppnar sig.'
        }
    ],
    completion: {
        type: 'portalReached',
        target: 'portal'
    }
};
