import type { ScaledPlacement, SceneBuilder } from './builder';

/**
 * A small grove: two trees, a boulder with a pebble and a skirt of bushes.
 * Offsets are authored around (0, 0) and turned by `rotation` degrees.
 */
export function addWoodlandGrove(scene: SceneBuilder, { x, z, scale = 1, rotation = 0 }: ScaledPlacement) {
    const a = (rotation * Math.PI) / 180,
        c = Math.cos(a),
        s = Math.sin(a);
    const at = (dx: number, dz: number) => ({ x: x + (dx * c + dz * s) * scale, z: z + (-dx * s + dz * c) * scale });

    scene.addTree({ ...at(0, 0), scale: 1.3 * scale, rotation: rotation + 15 });
    scene.addTree({ ...at(2.1, 1.3), scale: 1.0 * scale, rotation: rotation - 40 });
    scene.addRock({ ...at(-1.8, 1.0), scale: 1.2 * scale, rotation });
    scene.addRock({ ...at(-1.0, 1.9), scale: 0.5 * scale });
    scene.addBushCluster({ ...at(0.9, 2.0), count: 4, spread: 0.9, scale: 0.4 * scale, rotation });
}
