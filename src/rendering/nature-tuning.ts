/** Authored clearance per tree scale and rock width; preserves existing puzzle routes. */
export const NATURE_COLLISION = { treeRadius: 0.58, rockRadius: 0.36 };

/** Exact static vertex bounds in the source pack; trees target 3.6 units high, rocks 1 unit wide. */
export const NATURE_TUNING = {
    Tree: {
        aabb: {
            min: [-9.7207, 0.2228, -11.2674],
            max: [-7.368, 6.5561, -8.9185]
        },
        dims: [2.3527, 6.3333, 2.3489],
        center: [-8.5443, 3.3895, -10.0929],
        groundOffset: -0.2228,
        boundsSource: 'vertices',
        intended: {
            dimension: 'height',
            size: 3.6
        },
        scale: 0.5684240443370754,
        yaw: 0
    },
    'Tree.009': {
        aabb: {
            min: [-6.7941, 0.2228, 0.3158],
            max: [-4.1059, 6.514, 3.1874]
        },
        dims: [2.6882, 6.2912, 2.8716],
        center: [-5.45, 3.3684, 1.7516],
        groundOffset: -0.2228,
        boundsSource: 'vertices',
        intended: {
            dimension: 'height',
            size: 3.6
        },
        scale: 0.5722278738555443,
        yaw: 0
    },
    'Tree.018': {
        aabb: {
            min: [-15.3642, 0.2228, 0.1668],
            max: [-12.6689, 6.6771, 3.0426]
        },
        dims: [2.6953, 6.4543, 2.8759],
        center: [-14.0165, 3.4499, 1.6047],
        groundOffset: -0.2228,
        boundsSource: 'vertices',
        intended: {
            dimension: 'height',
            size: 3.6
        },
        scale: 0.5577676897572161,
        yaw: 0
    },
    Stone: {
        aabb: {
            min: [22.6743, 0.1697, 24.3691],
            max: [23.3455, 0.8987, 24.8173]
        },
        dims: [0.6712, 0.729, 0.4482],
        center: [23.0099, 0.5342, 24.5932],
        groundOffset: -0.1697,
        boundsSource: 'vertices',
        intended: {
            dimension: 'width',
            size: 1
        },
        scale: 1.4898688915375446,
        yaw: 0
    },
    'Stone.005': {
        aabb: {
            min: [2.7921, 0.1605, 22.3908],
            max: [7.5741, 4.5845, 27.1772]
        },
        dims: [4.7819, 4.424, 4.7864],
        center: [5.1831, 2.3725, 24.784],
        groundOffset: -0.1605,
        boundsSource: 'vertices',
        intended: {
            dimension: 'width',
            size: 1
        },
        scale: 0.20892528831689786,
        yaw: 0
    },
    'Stone.010': {
        aabb: {
            min: [8.609, 0.2233, 18.593],
            max: [12.507, 3.5461, 22.4725]
        },
        dims: [3.898, 3.3228, 3.8794],
        center: [10.558, 1.8847, 20.5327],
        groundOffset: -0.2233,
        boundsSource: 'vertices',
        intended: {
            dimension: 'width',
            size: 1
        },
        scale: 0.2565418163160595,
        yaw: 0
    }
} as const;
