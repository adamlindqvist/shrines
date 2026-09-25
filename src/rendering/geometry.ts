import { Entity, Mesh, MeshInstance, Vec3 } from 'playcanvas';
import type { GraphicsDevice, Material } from 'playcanvas';

/** Growable vertex soup: positions, normals, uvs and triangle indices. */
export type Geo = { p: number[]; n: number[]; u: number[]; i: number[] };

export const createGeo = (): Geo => ({ p: [], n: [], u: [], i: [] });

/** Uploads `g` as a mesh and attaches it to a new child entity of `parent`. */
export function meshEntity(
    device: GraphicsDevice,
    parent: Entity,
    name: string,
    g: Geo,
    material: Material,
    cast = true,
    receive = true
) {
    const mesh = new Mesh(device);
    mesh.setPositions(g.p);
    mesh.setNormals(g.n);
    if (g.u.length) mesh.setUvs(0, g.u);
    mesh.setIndices(g.i);
    mesh.update();
    const e = new Entity(name);
    parent.addChild(e);
    e.addComponent('render', {
        meshInstances: [new MeshInstance(mesh, material)],
        castShadows: cast,
        receiveShadows: receive
    });
    return e;
}

export function appendSphere(
    g: Geo,
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    seg = 16,
    rings = 10
) {
    const base = g.p.length / 3;
    for (let j = 0; j <= rings; j++) {
        const phi = (j / rings) * Math.PI,
            sp = Math.sin(phi),
            cp = Math.cos(phi);
        for (let i = 0; i <= seg; i++) {
            const th = (i / seg) * Math.PI * 2,
                ct = Math.cos(th),
                st = Math.sin(th);
            const nx = sp * ct,
                ny = cp,
                nz = sp * st;
            g.p.push(cx + nx * rx, cy + ny * ry, cz + nz * rz);
            const n = new Vec3(nx / rx, ny / ry, nz / rz).normalize();
            g.n.push(n.x, n.y, n.z);
            g.u.push(i / seg, j / rings);
        }
    }
    for (let j = 0; j < rings; j++)
        for (let i = 0; i < seg; i++) {
            const a = base + j * (seg + 1) + i;
            g.i.push(a, a + 1, a + seg + 1, a + 1, a + seg + 2, a + seg + 1);
        }
}

/** Surface of revolution from a bottom-to-top [radius, y] profile. */
export function appendLathe(
    g: Geo,
    prof: number[][],
    cx: number,
    cy: number,
    cz: number,
    seg = 18,
    jitter = 0,
    ph = 0
) {
    const base = g.p.length / 3,
        rows = prof.length;
    for (let j = 0; j < rows; j++) {
        const jp = Math.max(0, j - 1),
            jn = Math.min(rows - 1, j + 1);
        const dr = prof[jn][0] - prof[jp][0],
            dy = prof[jn][1] - prof[jp][1];
        for (let i = 0; i <= seg; i++) {
            const th = (i / seg) * Math.PI * 2,
                ct = Math.cos(th),
                st = Math.sin(th);
            const w = jitter ? 1 + jitter * (Math.sin(i * 2.3 + ph) * 0.6 + Math.sin(i * 5.1 + ph * 1.7) * 0.4) : 1;
            g.p.push(cx + ct * prof[j][0] * w, cy + prof[j][1], cz + st * prof[j][0] * w);
            const n = new Vec3(ct * dy, -dr, st * dy).normalize();
            g.n.push(n.x, n.y, n.z);
            g.u.push(i / seg, j / (rows - 1));
        }
    }
    for (let j = 0; j < rows - 1; j++)
        for (let i = 0; i < seg; i++) {
            const a = base + j * (seg + 1) + i;
            g.i.push(a, a + seg + 1, a + 1, a + 1, a + seg + 1, a + seg + 2);
        }
}

/** Extrudes a star-shaped 2D polygon (listed around the origin) along Y. */
export function appendPrism(g: Geo, poly: number[][], cx: number, y0: number, y1: number, cz: number) {
    const n = poly.length;
    for (const sign of [1, -1]) {
        const y = sign > 0 ? y1 : y0,
            base = g.p.length / 3;
        g.p.push(cx, y, cz);
        g.n.push(0, sign, 0);
        g.u.push(0.5, 0.5);
        for (const [x, z] of poly) {
            g.p.push(cx + x, y, cz + z);
            g.n.push(0, sign, 0);
            g.u.push(0, 0);
        }
        for (let i = 0; i < n; i++) {
            const a = base + 1 + i,
                b = base + 1 + ((i + 1) % n);
            if (sign > 0) g.i.push(base, b, a);
            else g.i.push(base, a, b);
        }
    }
    const base = g.p.length / 3;
    for (let i = 0; i < n; i++) {
        const [x0, z0] = poly[i],
            [x1, z1] = poly[(i + 1) % n];
        const dx = x1 - x0,
            dz = z1 - z0,
            l = Math.hypot(dx, dz) || 1;
        const nx = dz / l,
            nz = -dx / l,
            o = base + i * 4;
        g.p.push(cx + x0, y0, cz + z0, cx + x0, y1, cz + z0, cx + x1, y0, cz + z1, cx + x1, y1, cz + z1);
        for (let k = 0; k < 4; k++) {
            g.n.push(nx, 0, nz);
            g.u.push(k & 2 ? 1 : 0, k & 1 ? 1 : 0);
        }
        g.i.push(o, o + 1, o + 3, o, o + 3, o + 2);
    }
}

export function appendRoundedBox(
    g: Geo,
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    r: number,
    steps = 6
) {
    const half = [w / 2, h / 2, d / 2];
    r = Math.min(r, half[0], half[1], half[2]);
    for (let axis = 0; axis < 3; axis++)
        for (const sign of [-1, 1]) {
            const base = g.p.length / 3,
                a = (axis + 1) % 3,
                b = (axis + 2) % 3;
            for (let j = 0; j <= steps; j++)
                for (let i = 0; i <= steps; i++) {
                    const p = [0, 0, 0];
                    p[axis] = half[axis] * sign;
                    p[a] = ((i / steps) * 2 - 1) * half[a];
                    p[b] = ((j / steps) * 2 - 1) * half[b];
                    const q = p.map((v, k) =>
                        Math.max(-Math.max(0, half[k] - r), Math.min(Math.max(0, half[k] - r), v))
                    );
                    const nn = new Vec3(p[0] - q[0], p[1] - q[1], p[2] - q[2]).normalize();
                    g.p.push(cx + q[0] + nn.x * r, cy + q[1] + nn.y * r, cz + q[2] + nn.z * r);
                    g.n.push(nn.x, nn.y, nn.z);
                    g.u.push(i / steps, j / steps);
                }
            for (let j = 0; j < steps; j++)
                for (let i = 0; i < steps; i++) {
                    const v = base + j * (steps + 1) + i;
                    if (sign > 0) g.i.push(v, v + 1, v + steps + 1, v + 1, v + steps + 2, v + steps + 1);
                    else g.i.push(v, v + steps + 1, v + 1, v + 1, v + steps + 1, v + steps + 2);
                }
        }
}
