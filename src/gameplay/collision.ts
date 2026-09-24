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

/** A horizontal walkable surface. Overlaps use the highest surface; uncovered ground is Y=0. */
export type WalkSurface = Bounds & { height: number };

export const GROUND = { maxStep: 0.16, sampleStep: 0.05 };

/** Circle-vs-circle collision against the scene's static obstacles, inside a walkable rectangle. */
export class Collision {
    readonly obstacles: readonly Obstacle[];
    readonly bounds: Bounds;
    readonly surfaces: readonly WalkSurface[];

    constructor(obstacles: readonly Obstacle[], bounds: Bounds, surfaces: readonly WalkSurface[] = []) {
        this.obstacles = obstacles;
        this.bounds = bounds;
        this.surfaces = surfaces;
    }

    heightAt(x: number, z: number) {
        let height = 0;
        for (const surface of this.surfaces) {
            if (x >= surface.minX && x <= surface.maxX && z >= surface.minZ && z <= surface.maxZ)
                height = Math.max(height, surface.height);
        }
        return height;
    }

    /** Small stairs are traversable both ways; cliffs cannot be climbed or dropped from. */
    canTravel(from: { x: number; z: number }, to: { x: number; z: number }) {
        const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / GROUND.sampleStep));
        let height = this.heightAt(from.x, from.z);
        for (let i = 1; i <= steps; i++) {
            const next = this.heightAt(from.x + ((to.x - from.x) * i) / steps, from.z + ((to.z - from.z) * i) / steps);
            if (Math.abs(next - height) > GROUND.maxStep + 1e-6) return false;
            height = next;
        }
        return true;
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
