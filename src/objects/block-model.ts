import { Vec3 } from 'playcanvas';
import type { Entity } from 'playcanvas';

import { appendRoundedBox, createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';

import type { PropContext } from './context';
import type { PuzzleSymbol } from './puzzle';

type Point = [number, number];
type Vertex = [number, number, number];

/** Same grounded 1.46 × 1.32 × 1.46 footprint as the gameplay block. */
export function createBlockStone({ device, palette: c }: PropContext, root: Entity, symbol: PuzzleSymbol) {
    const stone = [createGeo(), createGeo(), createGeo()];
    const recess = createGeo();
    const gold = createGeo();
    // A continuous rounded core keeps the carved face panels watertight at
    // corners and supplies the soft silhouette visible between the cuts.
    appendRoundedBox(stone[0], 0, 0.66, 0, 1.46, 1.32, 1.46, 0.2, 7);
    appendRoundedBox(recess, 0, 0.66, 0, 1.39, 1.25, 1.39, 0.15, 5);
    // Clockwise edge cuts become short, deep channels across adjoining faces.
    const outline: Point[] = [
        [-0.61, -0.73],
        [-0.16, -0.73],
        [-0.16, -0.56],
        [-0.1, -0.56],
        [-0.1, -0.73],
        [0.61, -0.73],
        [0.73, -0.61],
        [0.73, -0.25],
        [0.55, -0.25],
        [0.55, -0.19],
        [0.73, -0.19],
        [0.73, 0.61],
        [0.61, 0.73],
        [-0.1, 0.73],
        [-0.1, 0.56],
        [-0.16, 0.56],
        [-0.16, 0.73],
        [-0.61, 0.73],
        [-0.73, 0.61],
        [-0.73, 0.08],
        [-0.56, 0.08],
        [-0.56, 0.02],
        [-0.73, 0.02],
        [-0.73, -0.61]
    ];
    for (let face = 0; face < 6; face++) {
        const map = (x: number, y: number, depth: number): Vertex => {
            const p: Vertex =
                face === 4
                    ? [x, depth, -y]
                    : face === 5
                      ? [x, -depth, y]
                      : face === 0
                        ? [x, y, depth]
                        : face === 1
                          ? [depth, y, -x]
                          : face === 2
                            ? [-x, y, -depth]
                            : [-depth, y, x];
            return [p[0], 0.66 + p[1] * (1.32 / 1.46), p[2]];
        };
        bevel(stone, outline, 0.63, 0.73, 0.038, map, face);
        // The reference's top is plain carved stone; marks occupy the vertical faces.
        if (face >= 4) continue;
        const emblem = (poly: Point[], inset: number) => {
            bevel(
                [recess],
                poly.map(([x, y]) => [x * 1.06, y * 1.06]),
                0.731,
                0.739,
                0.006,
                map,
                0
            );
            bevel([gold], poly, 0.741, 0.776, inset, map, 0);
        };
        if (symbol === 'sun') {
            emblem(
                Array.from({ length: 20 }, (_, i): Point => {
                    const a = (i * Math.PI) / 10;
                    return [Math.cos(a) * 0.265, Math.sin(a) * 0.265];
                }),
                0.038
            );
            for (let ray = 0; ray < 8; ray++) {
                const a = (ray * Math.PI) / 4;
                const reach = ray % 2 ? 0.47 : 0.56;
                const poly: Point[] = [
                    [0.31, -0.1],
                    [reach, 0],
                    [0.31, 0.1]
                ];
                emblem(
                    poly.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]),
                    0.026
                );
            }
        } else {
            // A continuous crescent in the same carved gold finish.
            const crescent: Point[] = [];
            for (let i = 0; i <= 20; i++) {
                const a = Math.PI / 3 + ((i / 20) * Math.PI * 4) / 3;
                crescent.push([Math.cos(a) * 0.49, Math.sin(a) * 0.49]);
            }
            for (let i = 1; i < 20; i++) {
                const t = i / 20;
                crescent.push([
                    (0.5 - 0.65 * Math.sin(t * Math.PI)) * 0.49,
                    -Math.cos(t * Math.PI) * Math.sqrt(3) * 0.245
                ]);
            }
            emblem(crescent, 0.018);
        }
    }
    stone.forEach((g, i) => meshEntity(device, root, 'faceted turquoise stone', g, c.blockStone[i]));
    meshEntity(device, root, 'carved shadow channels', recess, c.blockRecess);
    meshEntity(device, root, 'beveled gold inlay', gold, c.gold);
}

/** Inset a polygon using adjacent edge normals, including the reentrant cuts. */
function insetPolygon(poly: Point[], amount: number): Point[] {
    return poly.map((p, i) => {
        const prev = poly[(i + poly.length - 1) % poly.length];
        const next = poly[(i + 1) % poly.length];
        const normal = (a: Point, b: Point): Point => {
            const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
            return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
        };
        const a = normal(prev, p),
            b = normal(p, next);
        const divisor = Math.max(0.08, 1 + a[0] * b[0] + a[1] * b[1]);
        return [p[0] + (amount * (a[0] + b[0])) / divisor, p[1] + (amount * (a[1] + b[1])) / divisor];
    });
}

function triangle(g: Geo, a: Vertex, b: Vertex, c: Vertex) {
    const n = new Vec3()
        .cross(new Vec3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), new Vec3(c[0] - a[0], c[1] - a[1], c[2] - a[2]))
        .normalize();
    const start = g.p.length / 3;
    for (const p of [a, b, c]) {
        g.p.push(...p);
        g.n.push(n.x, n.y, n.z);
    }
    g.i.push(start, start + 1, start + 2);
}

function bevel(
    groups: Geo[],
    poly: Point[],
    back: number,
    front: number,
    width: number,
    map: (x: number, y: number, z: number) => Vertex,
    seed: number
) {
    const inner = insetPolygon(poly, width);
    for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        const a = map(...poly[i], back),
            b = map(...poly[j], back);
        const c = map(...inner[j], front),
            d = map(...inner[i], front);
        const faceGroup = groups[seed % groups.length];
        triangle(faceGroup, a, b, c);
        triangle(faceGroup, a, c, d);
    }
    const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const remaining = inner.map((_, i) => i);
    // Ear clipping keeps the recessed notches and crescent genuinely open.
    while (remaining.length > 2) {
        let clipped = false;
        for (let i = 0; i < remaining.length; i++) {
            const indices = [
                remaining[(i + remaining.length - 1) % remaining.length],
                remaining[i],
                remaining[(i + 1) % remaining.length]
            ];
            const [a, b, c] = indices.map((j) => inner[j]);
            if (cross(a, b, c) <= 1e-9) continue;
            if (
                remaining.some(
                    (j) =>
                        !indices.includes(j) &&
                        cross(a, b, inner[j]) >= -1e-9 &&
                        cross(b, c, inner[j]) >= -1e-9 &&
                        cross(c, a, inner[j]) >= -1e-9
                )
            )
                continue;
            const center: Point = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
            for (let side = 0; side < 3; side++) {
                const points = [a, b, c];
                triangle(
                    groups[(indices[1] + side + seed) % groups.length],
                    map(...points[side], front),
                    map(...points[(side + 1) % 3], front),
                    map(...center, front + 0.002)
                );
            }
            remaining.splice(i, 1);
            clipped = true;
            break;
        }
        if (!clipped) break;
    }
}
