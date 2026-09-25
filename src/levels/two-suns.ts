import { DEFAULT_HUD, DEFAULT_TEXT, DEFAULT_LIGHTING } from './defaults';
import type { LevelDefinition, SceneDefinition } from './types';

export const scene: SceneDefinition = {
    id: 'two-suns',
    name: 'Two Suns Shrine',
    seed: 211,
    terrain: {
        kind: 'river',
        land: [
            {
                minX: -20,
                maxX: -6.9,
                minZ: -14.9,
                maxZ: 12.5,
                radius: 2.6
            },
            {
                minX: -20,
                maxX: 15.5,
                minZ: -11.8,
                maxZ: 12.5,
                radius: 2.4
            },
            {
                minX: -4.9,
                maxX: 15.5,
                minZ: -16.5,
                maxZ: -2,
                radius: 2.4
            },
            {
                minX: 13,
                maxX: 16.6,
                minZ: -5.9,
                maxZ: 4,
                radius: 0.5
            },
            {
                minX: -20,
                maxX: 20,
                minZ: 2.8,
                maxZ: 12.5,
                radius: 2.8
            }
        ],
        water: [
            {
                minX: -1.5,
                maxX: 18,
                minZ: -5.3,
                maxZ: 0.5,
                radius: 1.5
            },
            {
                x: 17.4,
                z: 1.2,
                r: 1.9
            },
            {
                minX: -11.2,
                maxX: 0,
                minZ: -5.2,
                maxZ: 2.9,
                radius: 2.3
            },
            {
                minX: -7.2,
                maxX: -4.6,
                minZ: -16,
                maxZ: -3,
                radius: 1
            }
        ],
        islets: [
            {
                x: -4.6,
                z: -0.2,
                r: 2.1
            }
        ],
        blend: 1.1,
        wallHeight: 2.4,
        waterLevel: -1.8,
        clearings: [
            {
                x: 611.84,
                y: 660.3,
                radius: [62, 45],
                innerRadius: [40, 29],
                path: {
                    x: 611.84,
                    y: 660.3,
                    dx: 0,
                    dy: 310
                }
            },
            {
                x: 145.92,
                y: 459,
                radius: [46, 34],
                innerRadius: [30, 22],
                path: {
                    x: 145.92,
                    y: 459,
                    dx: 54,
                    dy: 345
                }
            },
            {
                x: 611.84,
                y: 198,
                radius: [230, 106],
                innerRadius: [165, 78],
                path: {
                    x: 611.84,
                    y: 293,
                    dx: 0,
                    dy: -88
                }
            },
            {
                x: 473.6,
                y: 148.3,
                radius: [70, 48],
                innerRadius: [46, 31]
            },
            {
                x: 750.08,
                y: 148.3,
                radius: [70, 48],
                innerRadius: [46, 31]
            }
        ]
    },
    backdrop: {
        size: 60,
        gradient: ['#b8e5d2', '#bee9d7', '#c6eedf'],
        shadowColor: '#72a88f',
        shadowOffset: [-1.8, 1.6]
    },
    spawn: {
        x: -0.8,
        z: 8.3
    },
    walkBounds: {
        minX: -19.4,
        maxX: 19.4,
        minZ: -16,
        maxZ: 12
    },
    blockBounds: {
        minX: -18.5,
        maxX: 18.5,
        minZ: -15.4,
        maxZ: 11.4
    },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 27.5],
            target: [0, 0, 9.040000000000001],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.73, 0.9, 0.83]
        },
        follow: {
            x: 1,
            z: 1,
            anchorZ: 8.3,
            rate: 4
        }
    },
    scenery: [
        {
            type: 'bridge',
            x: 3.9,
            z: -2.375,
            length: 6.75,
            id: 'bridge',
            state: 'open'
        },
        {
            type: 'shrineDais',
            x: 3.9,
            z: -13.6
        },
        {
            type: 'signpost',
            x: -17.7,
            z: -12,
            rotation: -12
        },
        {
            type: 'tree',
            x: -9,
            z: -13.4,
            scale: 1.11,
            rotation: 30
        },
        {
            type: 'rock',
            x: -11.3,
            z: -13.5,
            scale: 1.8,
            rotation: 20
        },
        {
            type: 'bushCluster',
            x: -10.4,
            z: -12.6,
            count: 4,
            spread: 0.9,
            scale: 0.42
        },
        {
            type: 'tree',
            x: -17.6,
            z: -13.7,
            scale: 0.67,
            rotation: -20
        },
        {
            type: 'tree',
            x: -3.4,
            z: -14.9,
            scale: 0.74,
            rotation: 60
        },
        {
            type: 'bushCluster',
            x: -2.3,
            z: -14.6,
            count: 3,
            spread: 0.7,
            scale: 0.4
        },
        {
            type: 'tree',
            x: 13.2,
            z: -13.7,
            scale: 1.11,
            rotation: -50
        },
        {
            type: 'bushCluster',
            x: 14.1,
            z: -12.8,
            count: 4,
            spread: 0.9,
            scale: 0.4
        },
        {
            type: 'tree',
            x: -18.6,
            z: -1.7,
            scale: 1.11,
            rotation: 10
        },
        {
            type: 'rock',
            x: -16.9,
            z: -1.9,
            scale: 1.8,
            rotation: 40
        },
        {
            type: 'tree',
            x: -18.9,
            z: 4,
            scale: 1.18,
            rotation: 80
        },
        {
            type: 'rock',
            x: -16.6,
            z: 4.4,
            scale: 2
        },
        {
            type: 'bushCluster',
            x: -17.4,
            z: 5.6,
            count: 5,
            spread: 1.1,
            scale: 0.44
        },
        {
            type: 'tree',
            x: -18.1,
            z: 9.2,
            scale: 1.18,
            rotation: -30
        },
        {
            type: 'rock',
            x: -16.2,
            z: 9.4,
            scale: 2.2,
            rotation: 15
        },
        {
            type: 'bushCluster',
            x: -16.4,
            z: 10.7,
            count: 5,
            spread: 1.2,
            scale: 0.44
        },
        {
            type: 'tree',
            x: -4.6,
            z: -0.5,
            scale: 1.04,
            rotation: 45
        },
        {
            type: 'rock',
            x: -6.1,
            z: -0.2,
            scale: 1.3,
            rotation: 30
        },
        {
            type: 'rock',
            x: -3,
            z: -0.3,
            scale: 1.2,
            rotation: -20
        },
        {
            type: 'tree',
            x: -7.3,
            z: 10,
            scale: 0.96,
            rotation: 70
        },
        {
            type: 'rock',
            x: -5.9,
            z: 9.6,
            scale: 1.1
        },
        {
            type: 'tree',
            x: 16.5,
            z: 6.9,
            scale: 1.41,
            rotation: 20
        },
        {
            type: 'rock',
            x: 17.3,
            z: 9.4,
            scale: 3,
            rotation: -10
        },
        {
            type: 'bushCluster',
            x: 15.2,
            z: 8.4,
            count: 6,
            spread: 1.3,
            scale: 0.5
        },
        {
            type: 'bushCluster',
            x: 18.2,
            z: 10.8,
            count: 4,
            spread: 1,
            scale: 0.45
        },
        {
            type: 'bushCluster',
            x: -5.7,
            z: 4.5,
            count: 3,
            spread: 0.6,
            scale: 0.55
        },
        {
            type: 'rock',
            x: -4.8,
            z: 4.9,
            scale: 0.9
        },
        {
            type: 'rock',
            x: -5.3,
            z: 5.5,
            scale: 0.6
        },
        {
            type: 'bushCluster',
            x: -11.2,
            z: -14.4,
            count: 3,
            spread: 0.6,
            scale: 0.5
        },
        {
            type: 'bush',
            x: 0.7,
            z: -7.5,
            scale: 1.05
        },
        {
            type: 'bush',
            x: 7.6,
            z: 1.6,
            scale: 1.1
        },
        {
            type: 'bush',
            x: 12.8,
            z: 2.9,
            scale: 1
        },
        {
            type: 'bush',
            x: 5.2,
            z: 11.1,
            scale: 0.9
        },
        {
            type: 'bush',
            x: -17.5,
            z: -11.2,
            scale: 0.6
        },
        {
            type: 'rock',
            x: 11.4,
            z: -10.2,
            scale: 1.3,
            rotation: 25
        },
        {
            type: 'rock',
            x: 13.6,
            z: 10.2,
            scale: 1.2
        },
        {
            type: 'rock',
            x: -18.9,
            z: 1.2,
            scale: 0.6
        },
        {
            type: 'rock',
            x: -17.7,
            z: -0.6,
            scale: 0.45
        },
        {
            type: 'rock',
            x: -18.2,
            z: 7.6,
            scale: 0.5
        },
        {
            type: 'rock',
            x: -12.6,
            z: 11.4,
            scale: 0.5
        },
        {
            type: 'rock',
            x: 8.6,
            z: 11.3,
            scale: 0.45
        },
        {
            type: 'rock',
            x: -1.6,
            z: 5.7,
            scale: 0.4
        },
        {
            type: 'rock',
            x: -8.3,
            z: -1.7,
            scale: 0.75,
            y: -1.8
        },
        {
            type: 'rock',
            x: -1.5,
            z: -2.45,
            scale: 0.6,
            y: -1.8
        },
        {
            type: 'rock',
            x: -0.9,
            z: -1.6,
            scale: 0.55,
            y: -1.8
        },
        {
            type: 'rock',
            x: 0.55,
            z: -2,
            scale: 0.7,
            y: -1.8
        },
        {
            type: 'rock',
            x: -5.5,
            z: -10.4,
            scale: 1,
            y: -1.8
        },
        {
            type: 'rock',
            x: -9.4,
            z: 1.5,
            scale: 0.5,
            y: -1.8
        }
    ],
    objects: [
        {
            type: 'block',
            id: 'block-1',
            symbol: 'sun',
            x: -14.9,
            z: -8.8
        },
        {
            type: 'block',
            id: 'block-2',
            symbol: 'sun',
            x: 9.4,
            z: 6.7
        },
        {
            type: 'plate',
            id: 'plate-1',
            symbol: 'sun',
            x: -1.5,
            z: -12.3
        },
        {
            type: 'plate',
            id: 'plate-2',
            symbol: 'sun',
            x: 9.3,
            z: -12.3
        },
        {
            type: 'portal',
            id: 'portal',
            x: 3.9,
            z: -13.6,
            y: 0.44999999999999996,
            rotation: 0,
            locked: true
        },
        {
            type: 'slime',
            id: 'slime-1',
            x: -12.2,
            z: -9.9
        },
        {
            type: 'slime',
            id: 'slime-2',
            x: -10.7,
            z: 7
        }
    ]
};

export const level: LevelDefinition = {
    id: 'two-suns',
    scene: 'two-suns',
    hud: DEFAULT_HUD,
    text: {
        ...DEFAULT_TEXT,
        matched: 'Klick! En sol lyser. H\u00e4mta den andra!',
        won: {
            title: 'Tre lysande helgedomar',
            copy: 'Alla helgedomar str\u00e5lar. Vilket modigt och fint litet \u00e4ventyr!'
        }
    },
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
