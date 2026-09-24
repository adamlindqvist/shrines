import { Color } from 'playcanvas';
import type { Entity, StandardMaterial } from 'playcanvas';

import type { Bounds, Obstacle } from '../gameplay/collision';
import { appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';
import { canvasTexture, paintCanvas } from '../rendering/textures';

import { paintClayBank, paintMeadow } from './terrain';
import type { Island, SandyClearing, TerrainContext } from './terrain';

/** Axis-aligned rectangle with rounded corners, in world units on X/Z. */
export type RoundRect = { minX: number; maxX: number; minZ: number; maxZ: number; radius: number };
export type Circle = { x: number; z: number; r: number };

/**
 * An island whose meadow is cut by a sunken river. Shapes are blended
 * signed-distance regions; the top, banks and water follow their contours.
 */
export type RiverIslandOptions = {
    kind: 'river';
    /** Rectangles merged into the island outline. */
    land: RoundRect[];
    /** Rectangles and circles carved out of the land as water. */
    water: (RoundRect | Circle)[];
    /** Little islands raised back out of the water. */
    islets: Circle[];
    /** Radius of the rounded blend where shapes meet, in world units. */
    blend: number;
    /** Depth of the clay bank below the walkable top at y = 0. */
    wallHeight: number;
    /** Height of the water surface; it sits below the meadow top. */
    waterLevel: number;
    clearings: SandyClearing[];
    /** Shore stretches without collision, such as under a bridge deck. */
    openings: Bounds[];
};

export type RiverIsland = Island & {
    /** Circles along every shore, keeping walkers on land. */
    obstacles: Obstacle[];
    /** Maps a world point to texels of the painted meadow. */
    texel(x: number, z: number): [number, number];
    /** Ambient water shimmer at scene time `time` seconds. */
    animate(time: number): void;
};

/** Grid spacing for the contour meshes. */
const CELL = 0.2;
/** Shore collision circle radius, and how far it reaches back onto land. */
const SHORE = { radius: 0.5, overlap: 0.12, spacing: 0.34 };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Smooth union of two signed distances (negative inside). */
function smin(a: number, b: number, k: number) {
    const h = clamp01(0.5 + (0.5 * (b - a)) / k);
    return b + (a - b) * h - k * h * (1 - h);
}

function shapeDistance(s: RoundRect | Circle, x: number, z: number) {
    if ('r' in s) return Math.hypot(x - s.x, z - s.z) - s.r;
    const cx = (s.minX + s.maxX) / 2,
        cz = (s.minZ + s.maxZ) / 2;
    const r = Math.min(s.radius, (s.maxX - s.minX) / 2, (s.maxZ - s.minZ) / 2);
    const qx = Math.abs(x - cx) - ((s.maxX - s.minX) / 2 - r),
        qz = Math.abs(z - cz) - ((s.maxZ - s.minZ) / 2 - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
}

function unionDistance(shapes: (RoundRect | Circle)[], k: number, x: number, z: number) {
    let d = Infinity;
    for (const s of shapes) {
        const e = shapeDistance(s, x, z);
        d = d === Infinity ? e : smin(d, e, k);
    }
    return d;
}

/** Slow, position-seeded wobble so neighbouring wall strips agree exactly. */
const wobble = (x: number, z: number) =>
    Math.sin(x * 2.9 + z * 1.3) * 0.045 + Math.sin(x * 1.1 - z * 3.4 + 1.7) * 0.04 + Math.sin((x + z) * 5.3) * 0.018;

type Segment = [number, number, number, number];

/**
 * Samples `field` (positive inside) on the grid, fills the inside at height
 * `y` and returns the boundary segments. Crossings on shared edges are
 * computed identically from both cells, so strips meet without cracks.
 */
function contour(
    grid: { x0: number; z0: number; nx: number; nz: number },
    field: Float32Array,
    fill: { g: Geo; y: number; uv: (x: number, z: number) => [number, number] } | null
) {
    const { x0, z0, nx, nz } = grid;
    const stride = nx + 1;
    const cornerIds = new Map<number, number>(),
        edgeIds = new Map<number, number>();
    const segments: Segment[] = [];
    const push = (x: number, z: number) => {
        const g = fill!.g;
        const [u, v] = fill!.uv(x, z);
        g.p.push(x, fill!.y, z);
        g.n.push(0, 1, 0);
        g.u.push(u, v);
        return g.p.length / 3 - 1;
    };
    const at = (k: number): [number, number] => [x0 + (k % stride) * CELL, z0 + Math.floor(k / stride) * CELL];
    const crossing = (a: number, b: number): [number, number] => {
        const lo = Math.min(a, b),
            hi = Math.max(a, b);
        const t = field[lo] / (field[lo] - field[hi]);
        const [ax, az] = at(lo),
            [bx, bz] = at(hi);
        return [ax + (bx - ax) * t, az + (bz - az) * t];
    };
    for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
            const k = j * stride + i;
            const corners = [k, k + 1, k + 1 + stride, k + stride];
            const poly: number[] = [];
            const cross: [number, number][] = [];
            for (let c = 0; c < 4; c++) {
                const a = corners[c],
                    b = corners[(c + 1) % 4];
                const inA = field[a] > 0,
                    inB = field[b] > 0;
                if (inA && fill) {
                    let id = cornerIds.get(a);
                    if (id === undefined) cornerIds.set(a, (id = push(...at(a))));
                    poly.push(id);
                }
                if (inA !== inB) {
                    const p = crossing(a, b);
                    cross.push(p);
                    if (fill) {
                        const key = Math.min(a, b) * 2 + (Math.abs(a - b) === 1 ? 0 : 1);
                        let id = edgeIds.get(key);
                        if (id === undefined) edgeIds.set(key, (id = push(...p)));
                        poly.push(id);
                    }
                }
            }
            if (fill) for (let t = 1; t < poly.length - 1; t++) fill.g.i.push(poly[0], poly[t + 1], poly[t]);
            for (let s = 0; s + 1 < cross.length; s += 2)
                segments.push([cross[s][0], cross[s][1], cross[s + 1][0], cross[s + 1][1]]);
        }
    return segments;
}

/** Joins unordered contour segments into closed rings of [x, z] points. */
function chain(segments: Segment[]) {
    const key = (x: number, z: number) => `${x.toFixed(4)},${z.toFixed(4)}`;
    const ends = new Map<string, number[]>();
    segments.forEach(([ax, az, bx, bz], i) => {
        for (const k of [key(ax, az), key(bx, bz)]) {
            const list = ends.get(k);
            if (list) list.push(i);
            else ends.set(k, [i]);
        }
    });
    const used = new Uint8Array(segments.length);
    const rings: number[][][] = [];
    for (let s = 0; s < segments.length; s++) {
        if (used[s]) continue;
        used[s] = 1;
        const ring = [[segments[s][0], segments[s][1]]];
        let [x, z] = [segments[s][2], segments[s][3]];
        for (;;) {
            ring.push([x, z]);
            const next = ends.get(key(x, z))?.find((i) => !used[i]);
            if (next === undefined) break;
            used[next] = 1;
            const [ax, az, bx, bz] = segments[next];
            [x, z] = key(ax, az) === key(x, z) ? [bx, bz] : [ax, az];
        }
        rings.push(ring);
    }
    return rings;
}

/** Floating meadow island split by a sunken river, with clay banks, a painted water surface and shore collision. */
export function createRiverIsland(ctx: TerrainContext, root: Entity, options: RiverIslandOptions): RiverIsland {
    const { device, resources, rand } = ctx;
    const { blend, wallHeight: WALL, waterLevel: WATER } = options;
    const minX = Math.min(...options.land.map((r) => r.minX)),
        maxX = Math.max(...options.land.map((r) => r.maxX)),
        minZ = Math.min(...options.land.map((r) => r.minZ)),
        maxZ = Math.max(...options.land.map((r) => r.maxZ));
    const texU = (x: number) => (x - minX) / (maxX - minX),
        texV = (z: number) => (z - minZ) / (maxZ - minZ);

    // Signed distances, negative inside.
    const outerAt = (x: number, z: number) => unionDistance(options.land, blend, x, z);
    const landAt = (x: number, z: number) => {
        const outer = outerAt(x, z);
        let d = Math.max(outer, -unionDistance(options.water, blend, x, z));
        for (const islet of options.islets) d = Math.min(d, Math.max(shapeDistance(islet, x, z), outer));
        return d;
    };
    const normalAt = (x: number, z: number): [number, number] => {
        const e = 0.05;
        const gx = landAt(x + e, z) - landAt(x - e, z),
            gz = landAt(x, z + e) - landAt(x, z - e);
        const l = Math.hypot(gx, gz) || 1;
        return [gx / l, gz / l];
    };

    const grid = {
        x0: minX - 0.6,
        z0: minZ - 0.6,
        nx: Math.ceil((maxX - minX + 1.2) / CELL),
        nz: Math.ceil((maxZ - minZ + 1.2) / CELL)
    };
    const count = (grid.nx + 1) * (grid.nz + 1);
    const landField = new Float32Array(count),
        outerField = new Float32Array(count),
        waterField = new Float32Array(count);
    for (let k = 0; k < count; k++) {
        const x = grid.x0 + (k % (grid.nx + 1)) * CELL,
            z = grid.z0 + Math.floor(k / (grid.nx + 1)) * CELL;
        const land = -landAt(x, z),
            outer = -outerAt(x, z);
        // Nudge exact zeros so every contour crossing is well defined.
        landField[k] = land === 0 ? 1e-4 : land;
        outerField[k] = outer === 0 ? 1e-4 : outer;
        waterField[k] = Math.min(outerField[k], -landField[k]);
    }

    const grass = resources.material('river meadow', '#a3c040');
    const earth = resources.material('river clay bank', '#b07c40');
    paintMeadow(ctx, grass, options.clearings);
    paintClayBank(ctx, earth);

    // Walkable meadow top.
    const top = createGeo();
    const shore = contour(grid, landField, { g: top, y: 0, uv: (x, z) => [texU(x), texV(z)] });
    meshEntity(device, root, 'river meadow top', top, grass, true, true);

    // Clay banks: tall outer walls, and river banks that drop below the water.
    const riverProfile = [
        [-0.03, 0.01],
        [0.03, -0.1],
        [0.05, -0.34],
        [0.0, -0.72],
        [0.04, WATER * 0.75],
        [0.0, WATER - 0.3]
    ];
    const outerProfile = [
        [-0.03, 0.01],
        [0.015, -0.06],
        [0.04, -WALL * 0.22],
        [0.01, -WALL * 0.5],
        [-0.09, -WALL * 0.78],
        [-0.3, -WALL * 0.92],
        [-0.62, -WALL]
    ];
    const walls = createGeo();
    const appendWall = (g: Geo, s: Segment, prof: number[][], textured: boolean) => {
        const [ax, az, bx, bz] = s;
        const na = normalAt(ax, az),
            nb = normalAt(bx, bz);
        // Keep the strip's winding facing outward.
        const mx = (na[0] + nb[0]) / 2,
            mz = (na[1] + nb[1]) / 2;
        const flip = (bx - ax) * mz - (bz - az) * mx > 0;
        const ends = flip
            ? [
                  [bx, bz, nb],
                  [ax, az, na]
              ]
            : [
                  [ax, az, na],
                  [bx, bz, nb]
              ];
        const base = g.p.length / 3,
            rows = prof.length;
        for (const [x, z, n] of ends as [number, number, [number, number]][]) {
            const w = wobble(x, z);
            const along = Math.abs(n[0]) > Math.abs(n[1]) ? z : x;
            for (let j = 0; j < rows; j++) {
                const off = prof[j][0] + (j > 1 && j < rows - 1 ? w : w * 0.25);
                g.p.push(x + n[0] * off, prof[j][1], z + n[1] * off);
                const jp = Math.max(0, j - 1),
                    jn = Math.min(rows - 1, j + 1);
                const dr = prof[jn][0] - prof[jp][0],
                    dy = prof[jn][1] - prof[jp][1];
                const l = Math.hypot(dr, dy) || 1;
                const h = -dy / l;
                g.n.push(n[0] * h, dr / l, n[1] * h);
                g.u.push(textured ? along * 0.14 : 0.5, textured ? clamp01(-prof[j][1] / WALL) : 0.5);
            }
        }
        for (let j = 0; j < rows - 1; j++) {
            const a = base + j,
                b = base + rows + j;
            g.i.push(a, b, a + 1, b, b + 1, a + 1);
        }
    };
    for (const s of shore) {
        const [ax, az, bx, bz] = s;
        const mx = (ax + bx) / 2,
            mz = (az + bz) / 2;
        const [nx, nz] = normalAt(mx, mz);
        const outside = outerAt(mx + nx * 0.3, mz + nz * 0.3) > 0;
        appendWall(walls, s, outside ? outerProfile : riverProfile, true);
    }
    meshEntity(device, root, 'river clay banks', walls, earth, true, true);

    // Water: a painted surface and a sheer face where the river meets the island edge.
    const waterMaterial = resources.material('river water', '#ffffff', 72, 0.28);
    paintWater(ctx, waterMaterial, { minX, maxX, minZ, maxZ }, landAt);
    const surface = createGeo();
    contour(grid, waterField, { g: surface, y: WATER, uv: (x, z) => [texU(x), texV(z)] });
    const water = meshEntity(device, root, 'river water surface', surface, waterMaterial, false, true);
    const edge = contour(grid, outerField, null);
    const falls = createGeo();
    const faceMaterial = resources.material('river edge water', '#3fb6e6', 60, 0.2);
    for (const s of edge) {
        const mx = (s[0] + s[2]) / 2,
            mz = (s[1] + s[3]) / 2;
        // Only where the river itself reaches the island edge.
        if (landAt(mx, mz) < 0.05) continue;
        appendWall(
            falls,
            s,
            [
                [0, WATER],
                [0, WATER - (WALL + WATER) * 0.5],
                [0, -WALL]
            ],
            false
        );
    }
    // The shared normal points away from land, which at the island edge is outward too.
    if (falls.i.length) meshEntity(device, root, 'river edge water', falls, faceMaterial, false, false);

    // Soft scalloped turf lip along every shore.
    {
        const turf = createGeo();
        for (const [ax, az, bx, bz] of shore) {
            const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.19));
            for (let j = 0; j < n; j++) {
                const f = (j + 0.5) / n;
                const r = 0.15 + rand() * 0.055;
                appendSphere(turf, ax + (bx - ax) * f, -0.075 - rand() * 0.035, az + (bz - az) * f, r, 0.12, r, 8, 5);
            }
        }
        meshEntity(
            device,
            root,
            'river turf edge',
            turf,
            resources.material('river meadow edge', '#a6c745'),
            false,
            true
        );
    }

    // Shore collision: circles sitting just past each bank, thinned on a hash grid.
    const obstacles: Obstacle[] = [];
    const taken = new Set<string>();
    const cellKey = (x: number, z: number) => `${Math.floor(x / SHORE.spacing)},${Math.floor(z / SHORE.spacing)}`;
    for (const [ax, az, bx, bz] of shore) {
        const mx = (ax + bx) / 2,
            mz = (az + bz) / 2;
        if (options.openings.some((o) => mx >= o.minX && mx <= o.maxX && mz >= o.minZ && mz <= o.maxZ)) continue;
        const [nx, nz] = normalAt(mx, mz);
        const x = mx + nx * (SHORE.radius - SHORE.overlap),
            z = mz + nz * (SHORE.radius - SHORE.overlap);
        const k = cellKey(x, z);
        if (taken.has(k)) continue;
        taken.add(k);
        obstacles.push({ x, z, r: SHORE.radius });
    }

    const rings = chain(edge);
    const outline = rings.reduce((a, b) => (b.length > a.length ? b : a), [] as number[][]);
    return {
        outline,
        halfWidth: (maxX - minX) / 2,
        halfDepth: (maxZ - minZ) / 2,
        wallHeight: WALL,
        obstacles,
        texel: (x, z) => [texU(x) * 1024, texV(z) * 1024],
        animate(time) {
            // A barely-there swell; the painted rims stay put against the banks.
            water.setLocalPosition(0, Math.sin(time * 0.9) * 0.012, 0);
        }
    };
}

/** Bright river blues with pale shallows and a white rim where water meets the banks. */
function paintWater(
    { device, resources }: TerrainContext,
    material: StandardMaterial,
    box: { minX: number; maxX: number; minZ: number; maxZ: number },
    landAt: (x: number, z: number) => number
) {
    const size = 512;
    const { c, x: ctx } = paintCanvas(size);
    const img = ctx.createImageData(size, size);
    const deep = [52, 176, 228],
        mid = [74, 196, 240],
        shallow = [140, 224, 246],
        rim = [246, 252, 250];
    const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
    for (let py = 0; py < size; py++)
        for (let px = 0; px < size; px++) {
            const x = box.minX + ((px + 0.5) / size) * (box.maxX - box.minX),
                z = box.minZ + ((py + 0.5) / size) * (box.maxZ - box.minZ);
            const d = Math.max(0, landAt(x, z));
            let col = mix(mid, deep, clamp01((d - 0.6) / 1.8));
            col = mix(col, shallow, clamp01(1 - (d - 0.22) / 0.55) * 0.75);
            // Gentle ripple bands following the shore.
            const ripple = Math.sin(d * 7.5 - Math.sin(x * 0.35 + z * 0.2) * 1.4) * 0.5 + 0.5;
            col = mix(col, shallow, ripple * 0.12 * clamp01(1 - (d - 0.4) / 1.6));
            col = mix(col, rim, clamp01(1 - (d - 0.1) / 0.13));
            const o = (py * size + px) * 4;
            img.data[o] = col[0];
            img.data[o + 1] = col[1];
            img.data[o + 2] = col[2];
            img.data[o + 3] = 255;
        }
    ctx.putImageData(img, 0, 0);
    const texture = resources.track(canvasTexture(device, c));
    material.diffuseMap = texture;
    material.diffuse = Color.WHITE;
    material.emissiveMap = texture;
    material.emissive = Color.WHITE;
    material.emissiveIntensity = 0.22;
    material.update();
}
