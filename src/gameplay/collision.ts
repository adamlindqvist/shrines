/** A solid circle on the X/Z ground plane. */
export type Obstacle = {
    x: number;
    z: number;
    r: number;
};

export type Bounds = {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
};

/** Circle-vs-circle collision against the scene's static obstacles, inside a walkable rectangle. */
export class Collision {
    readonly obstacles: readonly Obstacle[];
    readonly bounds: Bounds;

    constructor(obstacles: readonly Obstacle[], bounds: Bounds) {
        this.obstacles = obstacles;
        this.bounds = bounds;
    }

    /** Pushes a circle of radius `r` at (x, z) out of every obstacle, in registration order. */
    resolve(x: number, z: number, r = 0.33) {
        const b = this.bounds;
        x = Math.max(b.minX, Math.min(b.maxX, x));
        z = Math.max(b.minZ, Math.min(b.maxZ, z));
        for (const o of this.obstacles) {
            const dx = x - o.x,
                dz = z - o.z,
                d = Math.hypot(dx, dz),
                min = o.r + r;
            if (d < min && d > 0.001) {
                x = o.x + (dx / d) * min;
                z = o.z + (dz / d) * min;
            }
        }
        return { x, z };
    }

    /** True when a circle of radius `r` at (x, z) touches any obstacle. */
    overlaps(x: number, z: number, r: number) {
        return this.obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + r);
    }
}
