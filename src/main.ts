import {
    AppBase,
    AppOptions,
    CameraComponentSystem,
    CameraFrame,
    TONEMAP_LINEAR,
    Color,
    Entity,
    FILLMODE_FILL_WINDOW,
    LightComponentSystem,
    RESOLUTION_AUTO,
    RenderComponentSystem,
    TextureHandler,
    createGraphicsDevice,
    StandardMaterial,
    Texture,
    Mesh,
    MeshInstance,
    Vec3,
    PROJECTION_ORTHOGRAPHIC,
    SHADOW_PCF5,
    SSAOTYPE_LIGHTING,
    FILTER_LINEAR_MIPMAP_LINEAR,
    FILTER_LINEAR,
    ADDRESS_CLAMP_TO_EDGE
} from 'playcanvas';
import './style.css';

const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;
const device = await createGraphicsDevice(canvas, { antialias: false });
device.maxPixelRatio = Math.min(devicePixelRatio, 1.5);
const options = new AppOptions();
options.graphicsDevice = device;
options.componentSystems = [RenderComponentSystem, CameraComponentSystem, LightComponentSystem];
options.resourceHandlers = [TextureHandler];
const app = new AppBase(canvas);
app.init(options);
app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
app.setCanvasResolution(RESOLUTION_AUTO);
// Flat, bright ambient so shadows stay as soft washes rather than dark holes.
app.scene.ambientLight = new Color(0.74, 0.78, 0.7);
const world = new Entity('Mossy Meadow');
app.root.addChild(world);

let seed = 73;
const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
};

// ---------------------------------------------------------------- materials
function mat(name: string, hex: string, gloss = 18, spec = 0.05) {
    const m = new StandardMaterial();
    m.name = name;
    m.diffuse = new Color().fromString(hex);
    m.gloss = gloss / 100;
    m.specular = new Color(spec, spec, spec);
    m.update();
    return m;
}
const grass = mat('sunlit meadow', '#a3c040'),
    earth = mat('honey clay bank', '#b07c40'),
    bark = mat('warm bark', '#9c6530'),
    barkLight = mat('cut timber', '#d6ab6c'),
    leaf = mat('clover leaves', '#5ca936'),
    leafLight = mat('sunlit leaves', '#86c740'),
    leafDark = mat('deep foliage', '#3a8130'),
    stone = mat('warm grey stone', '#c4bcb0', 12),
    teal = mat('turquoise enamel', '#45d3c4', 46, 0.13),
    tealDark = mat('turquoise inset', '#24a89e', 40, 0.1),
    gold = mat('sunshine gold', '#f7bd2c', 60, 0.2),
    cream = mat('warm ivory', '#f6e2b2'),
    sandstone = mat('sun plinth', '#dcb172', 22),
    brown = mat('chest wood', '#b5762c', 28),
    terra = mat('terracotta', '#dd8450', 34, 0.09),
    black = mat('warm ink', '#33241f'),
    pink = mat('strawberry slime', '#ff8b90', 52, 0.16),
    skin = mat('peach face', '#f6c084'),
    boot = mat('chocolate boots', '#6b472a'),
    silver = mat('sword silver', '#d5e3e6', 62, 0.25),
    backdropMat = mat('mint backdrop', '#c6e4cc');

// ------------------------------------------------------------ geometry kit
type Geo = { p: number[]; n: number[]; u: number[]; i: number[] };
const geo = (): Geo => ({ p: [], n: [], u: [], i: [] });

function build(g: Geo, m: StandardMaterial, name: string, parent: Entity, cast = true, receive = true) {
    const mesh = new Mesh(device);
    mesh.setPositions(g.p);
    mesh.setNormals(g.n);
    if (g.u.length) mesh.setUvs(0, g.u);
    mesh.setIndices(g.i);
    mesh.update();
    const e = new Entity(name);
    parent.addChild(e);
    e.addComponent('render', {
        meshInstances: [new MeshInstance(mesh, m)],
        castShadows: cast,
        receiveShadows: receive
    });
    return e;
}

function gSphere(g: Geo, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, seg = 16, rings = 10) {
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
function gLathe(g: Geo, prof: number[][], cx: number, cy: number, cz: number, seg = 18, jitter = 0, ph = 0) {
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

const ICO_T = (1 + Math.sqrt(5)) / 2;
const ICO_V = [
    [-1, ICO_T, 0],
    [1, ICO_T, 0],
    [-1, -ICO_T, 0],
    [1, -ICO_T, 0],
    [0, -1, ICO_T],
    [0, 1, ICO_T],
    [0, -1, -ICO_T],
    [0, 1, -ICO_T],
    [ICO_T, 0, -1],
    [ICO_T, 0, 1],
    [-ICO_T, 0, -1],
    [-ICO_T, 0, 1]
];
const ICO_F = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1]
];

/** Chunky flat-faceted boulder built from a jittered icosphere. */
function gRock(g: Geo, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, sd: number, detail = 1) {
    const verts = ICO_V.map((v) => new Vec3(v[0], v[1], v[2]).normalize());
    let faces = ICO_F.map((f) => f.slice());
    for (let d = 0; d < detail; d++) {
        const nf: number[][] = [];
        const cache = new Map<string, number>();
        const mid = (a: number, b: number) => {
            const k = a < b ? `${a}_${b}` : `${b}_${a}`;
            let idx = cache.get(k);
            if (idx === undefined) {
                verts.push(new Vec3().add2(verts[a], verts[b]).normalize());
                idx = verts.length - 1;
                cache.set(k, idx);
            }
            return idx;
        };
        for (const f of faces) {
            const [a, b, c] = f,
                ab = mid(a, b),
                bc = mid(b, c),
                ca = mid(c, a);
            nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
        }
        faces = nf;
    }
    const disp = verts.map((v) => {
        const k =
            1 +
            0.105 * Math.sin(v.x * 2.4 + sd) +
            0.09 * Math.cos(v.y * 1.9 + sd * 1.7) +
            0.08 * Math.sin(v.z * 2.8 + sd * 2.6);
        return new Vec3(v.x * rx * k, Math.max(v.y * ry * k, -ry * 0.82), v.z * rz * k);
    });
    let n = g.p.length / 3;
    const e1 = new Vec3(),
        e2 = new Vec3(),
        nr = new Vec3();
    for (const f of faces) {
        const pa = disp[f[0]],
            pb = disp[f[1]],
            pc = disp[f[2]];
        nr.cross(e1.sub2(pb, pa), e2.sub2(pc, pa));
        if (nr.length() < 1e-6) continue;
        nr.normalize();
        for (const p of [pa, pb, pc]) {
            g.p.push(cx + p.x, cy + p.y, cz + p.z);
            g.n.push(nr.x, nr.y, nr.z);
            g.u.push(0, 0);
        }
        g.i.push(n, n + 1, n + 2);
        n += 3;
    }
}

/** Extrudes a star-shaped 2D polygon (listed around the origin) along Y. */
function gPrism(g: Geo, poly: number[][], cx: number, y0: number, y1: number, cz: number) {
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

function gRoundedBox(
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

// Legacy-style helpers for the small props that read fine as primitives.
function root(name: string, x = 0, y = 0, z = 0, parent = world) {
    const e = new Entity(name);
    parent.addChild(e);
    e.setLocalPosition(x, y, z);
    return e;
}
function shape(
    name: string,
    type: string,
    material: StandardMaterial,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent = world
) {
    const e = root(name, x, y, z, parent);
    e.addComponent('render', { type, castShadows: true, receiveShadows: true });
    e.setLocalScale(sx, sy, sz);
    e.render!.meshInstances[0].material = material;
    return e;
}
const sphere = (
    n: string,
    m: StandardMaterial,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy = sx,
    sz = sx,
    p = world
) => shape(n, 'sphere', m, x, y, z, sx, sy, sz, p);
const box = (
    n: string,
    m: StandardMaterial,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    p = world
) => shape(n, 'box', m, x, y, z, sx, sy, sz, p);
const cylinder = (
    n: string,
    m: StandardMaterial,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    p = world
) => shape(n, 'cylinder', m, x, y, z, sx, sy, sz, p);
function rounded(
    name: string,
    m: StandardMaterial,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    r: number,
    parent = world
) {
    const g = geo();
    gRoundedBox(g, 0, 0, 0, w, h, d, r, 7);
    const e = build(g, m, name, parent);
    e.setLocalPosition(x, y, z);
    return e;
}

function makeTexture(paint: HTMLCanvasElement, mips = true) {
    const t = new Texture(device, {
        width: paint.width,
        height: paint.height,
        mipmaps: mips,
        minFilter: mips ? FILTER_LINEAR_MIPMAP_LINEAR : FILTER_LINEAR,
        magFilter: FILTER_LINEAR,
        addressU: ADDRESS_CLAMP_TO_EDGE,
        addressV: ADDRESS_CLAMP_TO_EDGE,
        anisotropy: 8
    });
    t.setSource(paint);
    return t;
}
function makeCanvas(size: number) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return { c, x: c.getContext('2d')! };
}

// ------------------------------------------------------------------ island
const WX = 12.4,
    DZ = 9.4,
    CR = 3.0,
    WALL = 1.78;
const outline: number[][] = [];
for (let c = 0; c < 4; c++) {
    const cx = (c === 0 || c === 3 ? 1 : -1) * (WX - CR),
        cz = (c < 2 ? 1 : -1) * (DZ - CR);
    for (let j = 0; j < 16; j++) {
        const a = ((c * 90 + j * 5.625) * Math.PI) / 180;
        outline.push([cx + Math.cos(a) * CR, cz + Math.sin(a) * CR]);
    }
}
const RIM = outline.length;

// Painted meadow: soft mottled greens with a sandy clearing under the puzzle.
{
    const { c, x: ctx } = makeCanvas(1024);
    ctx.fillStyle = '#bfd84f';
    ctx.fillRect(0, 0, 1024, 1024);
    const blob = (cx: number, cy: number, rx: number, ry: number, col: string, alpha: number) => {
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1);
        grd.addColorStop(0, col);
        grd.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(rx, ry);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };
    for (let i = 0; i < 60; i++)
        blob(
            rand() * 1024,
            rand() * 1024,
            80 + rand() * 200,
            60 + rand() * 170,
            rand() > 0.45 ? 'rgba(196,224,100,1)' : 'rgba(146,188,64,1)',
            0.2 + rand() * 0.18
        );
    for (let i = 0; i < 12; i++)
        blob(rand() * 1024, rand() * 1024, 130 + rand() * 200, 110 + rand() * 160, 'rgba(146,190,64,1)', 0.1);
    // Broad sunward gradient: brighter toward the upper right.
    blob(880, 120, 900, 820, 'rgba(208,232,112,1)', 0.3);
    blob(120, 950, 700, 620, 'rgba(150,192,66,1)', 0.1);
    for (let i = 0; i < 30000; i++) {
        const x = rand() * 1024,
            y = rand() * 1024;
        ctx.globalAlpha = 0.03 + rand() * 0.06;
        ctx.fillStyle = rand() > 0.5 ? '#dcec92' : '#83ad40';
        ctx.beginPath();
        ctx.ellipse(x, y, 2 + rand() * 8, 1 + rand() * 4, rand() * 6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Sandy clearing, world centre roughly (6.6, -6.6).
    for (let i = 0; i < 2400; i++) {
        const a = rand() * Math.PI * 2,
            r = Math.sqrt(rand());
        const x = 786 + Math.cos(a) * r * 168,
            y = 152 + Math.sin(a) * r * 190;
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = rand() > 0.35 ? '#f2cd85' : '#e8c176';
        ctx.beginPath();
        ctx.ellipse(x, y, 20 + rand() * 34, 16 + rand() * 28, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 1600; i++) {
        const a = rand() * Math.PI * 2,
            r = Math.pow(rand(), 1.7);
        const x = 786 + Math.cos(a) * r * 142,
            y = 152 + Math.sin(a) * r * 162;
        ctx.globalAlpha = 0.17;
        ctx.fillStyle = rand() > 0.4 ? '#f9d98f' : '#f0ce81';
        ctx.beginPath();
        ctx.ellipse(x, y, 18 + rand() * 30, 15 + rand() * 24, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 380; i++) {
        const t = rand(),
            width = 10 + t * 18;
        const x = 792 - t * 37 + (rand() - 0.5) * width * 2;
        const y = 250 + t * 218;
        ctx.globalAlpha = 0.13;
        ctx.fillStyle = rand() > 0.4 ? '#f2d18a' : '#e7c27c';
        ctx.beginPath();
        ctx.ellipse(x, y, 14 + rand() * 13, 12 + rand() * 16, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    grass.diffuseMap = makeTexture(c);
    grass.diffuse = Color.WHITE;
    grass.update();
}

// Layered clay bank texture for the island wall.
{
    const { c, x: ctx } = makeCanvas(512);
    const grd = ctx.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, '#6c4720');
    grd.addColorStop(0.08, '#8a5b2a');
    grd.addColorStop(0.2, '#ac7940');
    grd.addColorStop(0.55, '#b98747');
    grd.addColorStop(0.82, '#a06c33');
    grd.addColorStop(1, '#7d5424');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
        const x = rand() * 512,
            w = 4 + rand() * 26;
        ctx.globalAlpha = 0.05 + rand() * 0.09;
        ctx.fillStyle = rand() > 0.5 ? '#d19a58' : '#7d5424';
        ctx.fillRect(x, rand() * 120, w, 200 + rand() * 300);
    }
    ctx.globalAlpha = 1;
    earth.diffuseMap = makeTexture(c);
    earth.diffuse = Color.WHITE;
    earth.update();
}

// Flat meadow top.
{
    const g = geo();
    g.p.push(0, 0, 0);
    g.n.push(0, 1, 0);
    g.u.push(0.5, 0.5);
    for (const [x, z] of outline) {
        g.p.push(x, 0, z);
        g.n.push(0, 1, 0);
        g.u.push((x + WX) / (WX * 2), (z + DZ) / (DZ * 2));
    }
    for (let i = 0; i < RIM; i++) g.i.push(0, 1 + ((i + 1) % RIM), i + 1);
    // soft lip curling over the clay bank
    const lip = 1 + RIM;
    for (const [x, z] of outline) {
        const nx = x / WX,
            nz = z / DZ,
            len = Math.hypot(nx, nz) || 1;
        g.p.push(x + (nx / len) * 0.16, -0.16, z + (nz / len) * 0.16);
        g.n.push((nx / len) * 0.6, 0.8, (nz / len) * 0.6);
        g.u.push((x + WX) / (WX * 2), (z + DZ) / (DZ * 2));
    }
    for (let i = 0; i < RIM; i++) {
        const a = 1 + i,
            b = 1 + ((i + 1) % RIM),
            c = lip + i,
            d = lip + ((i + 1) % RIM);
        g.i.push(a, c, b, b, c, d);
    }
    build(g, grass, 'Continuous walkable meadow', world, false, true);
}

// Clay bank: extruded outline with a soft bevel top and bottom.
{
    const prof = [
        [-0.62, -WALL],
        [-0.3, -WALL * 0.92],
        [-0.09, -WALL * 0.78],
        [0.01, -WALL * 0.5],
        [0.04, -WALL * 0.22],
        [0.015, -0.06],
        [-0.02, 0.02]
    ];
    const g = geo(),
        rows = prof.length;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i <= RIM; i++) {
            const [x, z] = outline[i % RIM];
            const nx = x / WX,
                nz = z / DZ,
                len = Math.hypot(nx, nz) || 1;
            const ox = nx / len,
                oz = nz / len;
            const wob = Math.sin(i * 0.9) * 0.05 + Math.sin(i * 2.3 + 1.1) * 0.035;
            const off = prof[j][0] + (j > 0 && j < rows - 1 ? wob : wob * 0.3);
            g.p.push(x + ox * off, prof[j][1], z + oz * off);
            const jp = Math.max(0, j - 1),
                jn = Math.min(rows - 1, j + 1);
            const dr = prof[jn][0] - prof[jp][0],
                dy = prof[jn][1] - prof[jp][1];
            const n = new Vec3(ox * dy, -dr, oz * dy).normalize();
            g.n.push(n.x, n.y, n.z);
            g.u.push((i / RIM) * 7, 1 - j / (rows - 1));
        }
    }
    for (let j = 0; j < rows - 1; j++)
        for (let i = 0; i < RIM; i++) {
            const a = j * (RIM + 1) + i;
            g.i.push(a, a + RIM + 1, a + 1, a + 1, a + RIM + 1, a + RIM + 2);
        }
    // bottom cap
    const capBase = g.p.length / 3;
    g.p.push(0, -WALL - 0.02, 0);
    g.n.push(0, -1, 0);
    g.u.push(0.5, 0);
    for (let i = 0; i < RIM; i++) {
        const [x, z] = outline[i];
        const nx = x / WX,
            nz = z / DZ,
            len = Math.hypot(nx, nz) || 1;
        g.p.push(x + (nx / len) * -0.62, -WALL, z + (nz / len) * -0.62);
        g.n.push(0, -1, 0);
        g.u.push(0.5, 0);
    }
    for (let i = 0; i < RIM; i++) g.i.push(capBase, capBase + 1 + i, capBase + 1 + ((i + 1) % RIM));
    build(g, earth, 'Honey clay bank', world, true, true);
}

// A continuous, low scalloped turf edge, sampled by distance around the island.
{
    const turf = geo();
    const turfMaterial = mat('meadow edge', '#a6c745');
    for (let k = 0; k < RIM; k++) {
        const a = outline[k],
            b = outline[(k + 1) % RIM];
        const count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.19));
        for (let j = 0; j < count; j++) {
            const f = j / count,
                x = a[0] + (b[0] - a[0]) * f,
                z = a[1] + (b[1] - a[1]) * f;
            const r = 0.15 + rand() * 0.055;
            gSphere(turf, x, -0.075 - rand() * 0.035, z, r, 0.12, r, 8, 5);
        }
    }
    build(turf, turfMaterial, 'soft scalloped turf edge', world, false, true);
}

// ------------------------------------------------------------------ props
const obstacles: { x: number; z: number; r: number }[] = [];
const bushLight = geo(),
    bushMid = geo(),
    bushDark = geo();
function bush(x: number, z: number, s = 0.7) {
    const r = rand();
    gSphere(r > 0.62 ? bushLight : r > 0.28 ? bushMid : bushDark, x, s * 0.42, z, s * 0.8, s * 0.74, s * 0.8, 14, 9);
}
function bushCluster(x: number, z: number, n = 5, spread = 1.5, s = 0.55) {
    for (let i = 0; i < n; i++)
        bush(x + (rand() - 0.5) * spread * 2, z + (rand() - 0.5) * spread * 1.4, s + rand() * 0.3);
}

const canopies: Entity[] = [];
// x, y, z, radius, tone (0 sunlit / 1 mid / 2 shaded)
const LOBES: number[][] = [
    [0, 3.02, 0, 0.62, 0],
    [-0.4, 2.86, 0.15, 0.53, 0],
    [0.38, 2.84, -0.17, 0.54, 0],
    [0.09, 2.76, 0.42, 0.5, 0],
    [-0.12, 2.78, -0.42, 0.49, 0],
    [-0.6, 2.36, -0.23, 0.56, 1],
    [0.6, 2.32, 0.23, 0.58, 1],
    [0.21, 2.24, 0.6, 0.53, 1],
    [-0.26, 2.28, -0.6, 0.52, 1],
    [-0.5, 2.1, 0.4, 0.48, 1],
    [0.5, 2.06, -0.4, 0.49, 1],
    [-0.3, 1.9, 0.15, 0.45, 2],
    [0.29, 1.86, -0.12, 0.44, 2],
    [0, 1.86, 0.38, 0.41, 2],
    [-0.03, 1.9, -0.38, 0.41, 2]
];
function tree(x: number, z: number, s = 1, spin = 0) {
    const t = root('rounded woodland tree', x, 0, z);
    t.setLocalEulerAngles(0, spin, 0);
    // Flared, slightly knotty trunk.
    const trunk = geo();
    gLathe(
        trunk,
        [
            [0.55, 0],
            [0.4, 0.22],
            [0.32, 0.6],
            [0.29, 1.05],
            [0.3, 1.4],
            [0.33, 1.68],
            [0.29, 1.8]
        ].map((p) => [p[0] * s, p[1] * s]),
        0,
        0,
        0,
        16,
        0.055,
        1.7
    );
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI * 0.5 + 0.45;
        gSphere(trunk, Math.cos(a) * 0.4 * s, 0.1 * s, Math.sin(a) * 0.4 * s, 0.25 * s, 0.32 * s, 0.25 * s, 10, 7);
    }
    build(trunk, bark, 'trunk', t);

    const crown = root('gently swaying canopy', 0, 0, 0, t);
    const tones = [geo(), geo(), geo()];
    for (const [lx, ly, lz, r, tone] of LOBES)
        gSphere(
            tones[tone],
            lx * s * 1.18,
            (1.05 + ly * 0.12) * s,
            lz * s * 1.18,
            r * s * 1.22,
            r * 1.16 * s,
            r * s * 1.22,
            18,
            12
        );
    // Dark core seen through the gaps between lobes.
    gSphere(tones[2], 0, 2.6 * s, 0, 0.98 * s, 0.9 * s, 0.98 * s, 14, 9);
    build(tones[0], leafLight, 'sunlit crown', crown);
    build(tones[1], leaf, 'cushion foliage', crown);
    build(tones[2], leafDark, 'shaded underside', crown);
    canopies.push(crown);
    for (let i = 0; i < 8; i++) {
        const a = i * 2.4 + spin;
        bush(
            x + Math.sin(a) * (0.75 + rand() * 0.5) * s,
            z + Math.cos(a) * (0.7 + rand() * 0.45) * s,
            (0.34 + rand() * 0.3) * s
        );
    }
    obstacles.push({ x, z, r: 0.58 * s });
}

const rockGeo = geo();
/** `w` is the boulder's width in world units. */
function rock(x: number, z: number, w: number, detail = 1) {
    const tall = w > 1 ? 0.58 : 0.42;
    gRock(rockGeo, x, w * (w > 1 ? 0.3 : 0.18), z, w * 0.5, w * tall, w * 0.44, 3 + rand() * 9, detail);
    obstacles.push({ x, z, r: w * 0.36 });
}

tree(-8.0, -6.3, 1.5, 20);
tree(10.8, 0.2, 1.44, -40);
tree(-10.5, 5.4, 1.52, 70);

rock(-9.8, -4.5, 2.5);
rock(-10.9, -3.3, 1.2);
rock(9.5, 7.1, 3.6);
rock(8.0, 7.6, 1.95);
rock(-5.3, -7.7, 1.45);
rock(4.9, -8.8, 1.8);
rock(11.1, -5.0, 1.8);
for (const [x, z, w] of [
    [-9.1, -1.4, 0.72],
    [-5.1, 6.1, 0.84],
    [3.3, 7.4, 0.74],
    [-10.9, 0.6, 0.6],
    [8.0, 0.9, 0.64],
    [-3.6, -6.3, 0.5],
    [6.6, 5.0, 0.46],
    [1.2, -8.6, 0.44]
])
    rock(x, z, w);

bushCluster(-7.1, -6.9, 6, 1.5, 0.48);
bushCluster(-9.5, -3.6, 5, 1.3, 0.44);
bushCluster(4.3, -9.0, 6, 1.6, 0.5);
bushCluster(6.0, -8.9, 4, 1.2, 0.46);
bushCluster(11.0, -4.6, 6, 1.3, 0.46);
bushCluster(9.1, 5.9, 7, 1.8, 0.5);
bushCluster(-10.6, 4.0, 5, 1.2, 0.44);
bushCluster(11.3, 1.9, 5, 1.2, 0.44);
bushCluster(-4.4, 6.8, 3, 0.8, 0.34);
bushCluster(-6.1, 6.3, 4, 1.0, 0.36);

build(bushLight, leafLight, 'sunlit bushes', world);
build(bushMid, leaf, 'round bushes', world);
build(bushDark, leafDark, 'shaded bushes', world);
build(rockGeo, stone, 'faceted boulders', world);

// Terracotta pots.
for (const [x, z, s] of [
    [-8.3, 4.9, 1],
    [-7.0, 5.8, 0.9]
]) {
    const p = root('clay pot', x, 0, z);
    const g = geo();
    gLathe(
        g,
        [
            [0.24, 0],
            [0.42, 0.13],
            [0.55, 0.36],
            [0.51, 0.6],
            [0.36, 0.76],
            [0.32, 0.82],
            [0.39, 0.89],
            [0.37, 0.93]
        ].map((v) => [v[0] * s, v[1] * s]),
        0,
        0,
        0,
        18
    );
    build(g, terra, 'pot body', p);
    cylinder('pot hollow', black, 0, 0.915 * s, 0, 0.56 * s, 0.012, 0.56 * s, p);
    obstacles.push({ x, z, r: 0.38 });
}

// Fallen log with ringed cut ends.
{
    const l = root('fallen log', -9.5, 0.43, 6.6);
    l.setLocalEulerAngles(0, -32, 0);
    const g = geo();
    gLathe(
        g,
        [
            [0.0, -1.3],
            [0.41, -1.3],
            [0.44, -1.1],
            [0.43, -0.3],
            [0.45, 0.5],
            [0.44, 1.12],
            [0.41, 1.3],
            [0, 1.3]
        ],
        0,
        0,
        0,
        18,
        0.035,
        0.7
    );
    const body = build(g, bark, 'log body', l);
    body.setLocalEulerAngles(0, 0, 90);
    for (let i = 0; i < 4; i++) {
        const ring = cylinder(
            'timber ring',
            i % 2 ? barkLight : bark,
            1.31 + i * 0.004,
            0,
            0,
            0.39 - i * 0.098,
            0.008,
            0.39 - i * 0.098,
            l
        );
        ring.setLocalEulerAngles(0, 0, 90);
    }
    obstacles.push({ x: -9.5, z: 6.6, r: 0.8 });
}

// -------------------------------------------------------------- adventurer
const player = root('little adventurer', -1.7, 0, 4.0);
const visual = root('adventurer visual', 0, 0, 0, player);
visual.setLocalScale(1.35, 1.35, 1.35);
const leftBoot = sphere('left boot', boot, -0.16, 0.13, 0.025, 0.27, 0.26, 0.4, visual),
    rightBoot = sphere('right boot', boot, 0.16, 0.13, 0.025, 0.27, 0.26, 0.4, visual);
sphere('tunic', teal, 0, 0.52, 0, 0.68, 0.7, 0.48, visual);
box('belt', brown, 0, 0.42, 0.01, 0.66, 0.12, 0.49, visual);
box('buckle', gold, 0, 0.43, 0.265, 0.16, 0.14, 0.055, visual);
sphere('oversize hood', teal, 0, 1.2, -0.03, 1.1, 1.1, 0.96, visual);
sphere('warm face', skin, 0, 1.16, 0.375, 0.78, 0.75, 0.27, visual);
sphere('hair sweep', brown, -0.1, 1.49, 0.44, 0.56, 0.2, 0.11, visual);
for (const x of [-0.19, 0.19]) {
    sphere('bright eye', black, x, 1.19, 0.518, 0.077, 0.14, 0.04, visual);
    sphere('eye glint', cream, x - 0.012, 1.22, 0.54, 0.025, 0.035, 0.014, visual);
}
sphere('tiny nose', skin, 0, 1.08, 0.535, 0.1, 0.09, 0.06, visual);
sphere('hood knot', teal, -0.45, 1.1, -0.25, 0.37, 0.48, 0.4, visual);
sphere('left hand', skin, -0.43, 0.57, 0.13, 0.22, 0.22, 0.22, visual);
sphere('right hand', skin, 0.43, 0.57, 0.13, 0.22, 0.22, 0.22, visual);
const swordPivot = root('sword hand', -0.44, 0.56, 0.16, visual);
const sword = box('little silver blade', silver, 0, -0.3, 0.09, 0.13, 0.67, 0.055, swordPivot);
sword.setLocalEulerAngles(-15, 0, -14);
box('gold sword guard', gold, 0, -0.02, 0.07, 0.3, 0.065, 0.1, swordPivot);
const shield = cylinder('small round shield', gold, 0.47, 0.62, 0.2, 0.41, 0.065, 0.41, visual);
shield.setLocalEulerAngles(90, 0, 0);
const shieldInset = cylinder('shield inset', barkLight, 0.47, 0.62, 0.24, 0.29, 0.02, 0.29, visual);
shieldInset.setLocalEulerAngles(90, 0, 0);

// ---------------------------------------------------------------- the puzzle
const BLOCK_X = 4.7,
    BLOCK_Z = -4.7;
const block = root('pushable turquoise block', BLOCK_X, 0, BLOCK_Z);
const blockSpin = root('block facing', 0, 0, 0, block);
blockSpin.setLocalEulerAngles(0, 38, 0);
rounded('rounded teal block', teal, 0, 0.66, 0, 1.46, 1.32, 1.46, 0.2, blockSpin);
for (const [ax, az] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
]) {
    rounded(
        'inset face',
        tealDark,
        ax * 0.724,
        0.66,
        az * 0.724,
        ax ? 0.04 : 1.0,
        0.9,
        az ? 0.04 : 1.0,
        0.1,
        blockSpin
    );
}

rounded('top inset border', tealDark, 0, 1.326, 0, 1.06, 0.022, 1.06, 0.09, blockSpin);
rounded('top enamel panel', teal, 0, 1.341, 0, 0.96, 0.018, 0.96, 0.08, blockSpin);

const switchX = 7.1,
    switchZ = -5.2;
const pad = root('sun switch', switchX, 0, switchZ);
pad.setLocalEulerAngles(0, 38, 0);
rounded('sandstone plinth', sandstone, 0, 0.11, 0, 2.1, 0.22, 2.1, 0.12, pad);
rounded('plinth groove', barkLight, 0, 0.226, 0, 1.8, 0.02, 1.8, 0.09, pad);
rounded('plinth inner', sandstone, 0, 0.236, 0, 1.66, 0.02, 1.66, 0.08, pad);
rounded('groove line', barkLight, 0, 0.246, 0, 1.48, 0.02, 1.48, 0.07, pad);
rounded('ivory inset', cream, 0, 0.256, 0, 1.36, 0.02, 1.36, 0.06, pad);
const sunDisk = (() => {
    const poly: number[][] = [];
    for (let i = 0; i < 8; i++) {
        const c = (i * Math.PI) / 4,
            w = 0.28;
        poly.push([Math.cos(c - w) * 0.44, Math.sin(c - w) * 0.44]);
        poly.push([Math.cos(c) * 0.82, Math.sin(c) * 0.82]);
        poly.push([Math.cos(c + w) * 0.44, Math.sin(c + w) * 0.44]);
        for (let k = 1; k < 4; k++) {
            const a = c + w + ((Math.PI / 4 - 2 * w) * k) / 4;
            poly.push([Math.cos(a) * 0.44, Math.sin(a) * 0.44]);
        }
    }
    const g = geo();
    gPrism(g, poly, 0, 0, 0.1, 0);
    gSphere(g, 0, 0.02, 0, 0.46, 0.17, 0.46, 18, 8);
    const e = build(g, gold, 'sun disc', pad);
    e.setLocalPosition(0, 0.266, 0);
    e.setLocalEulerAngles(0, -38, 0);
    return e;
})();

// Treasure chest.
const chest = root('sunshine treasure chest', 9.15, 0, -5.4);
chest.setLocalEulerAngles(0, 26, 0);
rounded('wood chest', brown, 0, 0.44, 0, 1.52, 0.82, 1.0, 0.1, chest);
for (const x of [-0.44, 0, 0.44]) box('plank groove', black, x, 0.46, 0.508, 0.035, 0.64, 0.012, chest);
const lid = root('treasure lid', 0, 0.83, -0.5, chest);
{
    const g = geo();
    gLathe(
        g,
        [
            [0, -0.76],
            [0.46, -0.76],
            [0.48, -0.68],
            [0.49, 0.68],
            [0.46, 0.76],
            [0, 0.76]
        ],
        0,
        0,
        0,
        18
    );
    const shell = build(g, brown, 'barrel lid', lid);
    shell.setLocalPosition(0, 0.03, 0.5);
    shell.setLocalEulerAngles(0, 0, 90);
    shell.setLocalScale(1.58, 1, 1);
}
for (const x of [-0.62, 0.62]) {
    box('gold chest band', gold, x, 0.45, 0, 0.14, 0.88, 1.05, chest);
    const g = geo();
    gLathe(
        g,
        [
            [0, -0.07],
            [0.51, -0.07],
            [0.52, 0.07],
            [0, 0.07]
        ],
        0,
        0,
        0,
        18
    );
    const band = build(g, gold, 'gold lid band', lid);
    band.setLocalPosition(x, 0.03, 0.5);
    band.setLocalEulerAngles(0, 0, 90);
    band.setLocalScale(1.58, 1, 1);
}
box('gold chest rim', gold, 0, 0.82, 0, 1.56, 0.1, 1.04, chest);
box('lock plate', gold, 0, 0.63, 0.515, 0.34, 0.36, 0.07, chest);
sphere('keyhole', black, 0, 0.675, 0.555, 0.075, 0.09, 0.03, chest);
box('keyhole stem', black, 0, 0.615, 0.555, 0.04, 0.09, 0.03, chest);
obstacles.push({ x: 9.15, z: -5.4, r: 0.78 });

// ------------------------------------------------------------------ slimes
interface Enemy {
    entity: Entity;
    body: Entity;
    x: number;
    z: number;
    homeX: number;
    homeZ: number;
    hp: number;
    cool: number;
    hurt: number;
    vx: number;
    vz: number;
    mode: string;
}
const enemies: Enemy[] = [];
for (const [x, z] of [
    [-4.2, -2.6],
    [5.7, 1.9]
]) {
    const e = root('strawberry slime', x, 0, z);
    const body = root('slime squash', 0, 0, 0, e);
    const g = geo();
    gSphere(g, 0, 0.38, 0, 0.6, 0.53, 0.55, 22, 14);
    build(g, pink, 'pink jelly', body);
    for (const ex of [-0.15, 0.15]) sphere('slime eye', black, ex, 0.43, 0.535, 0.075, 0.16, 0.06, body);
    sphere('slime glint', cream, -0.2, 0.76, 0.28, 0.085, 0.075, 0.05, body);
    enemies.push({ entity: e, body, x, z, homeX: x, homeZ: z, hp: 3, cool: 0, hurt: 0, vx: 0, vz: 0, mode: 'wander' });
}

// ---------------------------------------------------------------- backdrop
// Unlit mint plane carrying a painted soft drop shadow of the island.
{
    const S = 34,
        PX = 1024;
    const { c, x: ctx } = makeCanvas(PX);
    const grd = ctx.createLinearGradient(0, 0, 0, PX);
    grd.addColorStop(0, '#c7e2c9');
    grd.addColorStop(0.55, '#c9e6cf');
    grd.addColorStop(1, '#cdedd4');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, PX, PX);
    const toPx = (x: number, z: number) => [((x + S) / (S * 2)) * PX, ((z + S) / (S * 2)) * PX];
    ctx.save();
    ctx.filter = 'blur(26px)';
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#6e9c7c';
    ctx.beginPath();
    outline.forEach(([x, z], i) => {
        const [px, py] = toPx(x * 1.02 - 1.5, z * 1.02 + 1.35);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    backdropMat.diffuse = Color.BLACK;
    backdropMat.emissive = Color.WHITE;
    backdropMat.emissiveMap = makeTexture(c);
    backdropMat.useLighting = false;
    backdropMat.update();
    const g = geo();
    g.p.push(-S, 0, -S, S, 0, -S, S, 0, S, -S, 0, S);
    g.n.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    g.u.push(0, 0, 1, 0, 1, 1, 0, 1);
    g.i.push(0, 2, 1, 0, 3, 2);
    const bd = build(g, backdropMat, 'mint backdrop', world, false, false);
    bd.setLocalPosition(0, -WALL - 0.05, 0);
}

// ------------------------------------------------------------ camera + light
const camera = root('meadow camera', 0, 22, 19.2, app.root);
camera.addComponent('camera', {
    projection: PROJECTION_ORTHOGRAPHIC,
    orthoHeight: 8.0,
    nearClip: 0.1,
    farClip: 160,
    clearColor: new Color(0.78, 0.89, 0.81),
    toneMapping: TONEMAP_LINEAR
});
camera.lookAt(0, 0, 0.74);
const CAM_BASE = camera.getLocalRotation().clone();

const light = root('warm afternoon sun', -10, 15, -10, app.root);
light.addComponent('light', {
    type: 'directional',
    color: new Color(1, 0.975, 0.91),
    intensity: 0.82,
    castShadows: true,
    shadowDistance: 30,
    shadowResolution: 2048,
    shadowBias: 0.008,
    normalOffsetBias: 0.04,
    shadowType: SHADOW_PCF5,
    shadowIntensity: 1
});
light.lookAt(0, 0, 0);
const fill = root('sky bounce', 14, 9, -16, app.root);
fill.addComponent('light', {
    type: 'directional',
    color: new Color(0.74, 0.9, 0.8),
    intensity: 0.1,
    castShadows: false
});
fill.lookAt(0, 0, 0);

const frame = new CameraFrame(app, camera.camera!);
frame.rendering.toneMapping = TONEMAP_LINEAR;
frame.rendering.samples = 2;
frame.rendering.sharpness = 0.2;
frame.bloom.intensity = 0.012;
frame.ssao.type = SSAOTYPE_LIGHTING;
frame.ssao.intensity = 0.5;
frame.ssao.radius = 2.5;
frame.ssao.power = 4;
frame.ssao.samples = 8;
frame.ssao.blurEnabled = true;
frame.ssao.scale = 0.5;
frame.update();

const resize = () => {
    app.resizeCanvas();
    camera.camera!.orthoHeight = Math.max(8.0, 12.0 / (innerWidth / innerHeight));
};
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------- the HUD
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `<section class="health"><div class="eyebrow">MOSSY MEADOW</div><div id="hearts">❤️ ❤️ ❤️</div></section><section class="quest"><span class="sun">☀️</span><div><strong id="quest-title">A little push</strong><p id="quest-copy">Move the block onto the sun switch</p></div></section><div class="controls"><span><kbd>WASD</kbd> Move</span><b>·</b><span><kbd>SPACE</kbd> Attack</span><b>·</b><span><kbd>SHIFT</kbd> Dash</span></div><div id="toast"></div><div id="overlay" hidden><div class="end-card"><span class="end-icon">☀️</span><h1 id="end-title"></h1><p id="end-copy"></p><button id="restart">Play again <span>↗</span></button></div></div><output id="diagnostics" aria-hidden="true"></output>`;
document.body.appendChild(hud);
const hearts = document.getElementById('hearts')!,
    questTitle = document.getElementById('quest-title')!,
    questCopy = document.getElementById('quest-copy')!,
    overlay = document.getElementById('overlay')!,
    toast = document.getElementById('toast')!;

type State = 'playing' | 'paused' | 'won' | 'over';
let state: State = 'playing',
    health = 3,
    time = 0,
    invincible = 0,
    swing = 0,
    attackCooldown = 0,
    dash = 0,
    dashCooldown = 0,
    unlocked = false,
    heading = 0,
    moveX = 0,
    moveZ = 0,
    toastTimer = 0,
    kills = 0,
    fps = 60,
    frameTime = 0,
    frameCount = 0;
const keys = new Set<string>();
const effects: {
    entity: Entity;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    max: number;
    scale: Vec3;
    gravity: boolean;
}[] = [];

function burst(x: number, z: number, color: StandardMaterial, count = 9) {
    for (let i = 0; i < count; i++) {
        const e = box('spark', color, x, 0.4 + rand() * 0.3, z, 0.09, 0.09, 0.09);
        effects.push({
            entity: e,
            vx: (rand() - 0.5) * 3,
            vy: 1.5 + rand() * 2,
            vz: (rand() - 0.5) * 3,
            life: 0.45 + rand() * 0.3,
            max: 0.75,
            scale: e.getLocalScale().clone(),
            gravity: true
        });
    }
}
function announce(text: string) {
    console.info('[Meadow]', text, (window as unknown as { meadow: unknown }).meadow);
    toast.textContent = text;
    toast.classList.add('visible');
    toastTimer = 2.6;
}
function showEnd(next: State) {
    state = next;
    console.info('[Meadow] state', next, (window as unknown as { meadow: unknown }).meadow);
    overlay.hidden = false;
    document.getElementById('end-title')!.textContent =
        next === 'won' ? 'A pocketful of sunshine' : 'A little breather';
    document.getElementById('end-copy')!.textContent =
        next === 'won'
            ? 'You found the meadow’s treasure. The world feels a little warmer.'
            : 'Even brave little adventurers need another try.';
}
function pause() {
    if (state === 'playing') {
        state = 'paused';
        keys.clear();
        toast.textContent = 'Paused · press a movement key or click to continue';
        toast.classList.add('visible');
    }
}
function unpause() {
    if (state === 'paused') {
        state = 'playing';
        toast.classList.remove('visible');
    }
}
function reset() {
    health = 3;
    time = 0;
    invincible = 0;
    swing = 0;
    attackCooldown = 0;
    dash = 0;
    dashCooldown = 0;
    unlocked = false;
    kills = 0;
    chestOpen = 0;
    heading = 0;
    moveX = 0;
    moveZ = 0;
    player.setPosition(-1.7, 0, 4.0);
    player.setEulerAngles(0, 0, 0);
    visual.enabled = true;
    visual.setLocalPosition(0, 0, 0);
    swordPivot.setLocalEulerAngles(0, 0, 0);
    camera.setPosition(0, 22, 19.2);
    camera.setLocalRotation(CAM_BASE);
    block.setPosition(BLOCK_X, 0, BLOCK_Z);
    lid.setLocalEulerAngles(0, 0, 0);
    for (const e of enemies) {
        reactions.get(e)!.death = 0;
        reactions.get(e)!.windup = 0;
        e.body.setLocalScale(1, 1, 1);
        e.entity.setLocalScale(1, 1, 1);
        e.x = e.homeX;
        e.z = e.homeZ;
        e.hp = 3;
        e.cool = 0;
        e.hurt = 0;
        e.vx = e.vz = 0;
        e.entity.enabled = true;
        e.entity.setPosition(e.x, 0, e.z);
    }
    for (const e of effects) e.entity.destroy();
    effects.length = 0;
    keys.clear();
    state = 'playing';
    overlay.hidden = true;
    questTitle.textContent = 'A little push';
    questCopy.textContent = 'Move the block onto the sun switch';
    hearts.textContent = '❤️ ❤️ ❤️';
    sunDisk.render!.meshInstances[0].material = gold;
    toast.classList.remove('visible');
}
document.getElementById('restart')!.onclick = () => reset();

const reactions = new Map(enemies.map((e) => [e, { windup: 0, death: 0 }]));
const hitThisSwing = new Set<Enemy>();
let swingHeading = 0,
    chestOpen = 0;
function attack() {
    if (state !== 'playing' || attackCooldown > 0) return;
    swing = 0.28;
    attackCooldown = 0.42;
    swingHeading = heading;
    hitThisSwing.clear();
    const p = player.getPosition();
    spawnArc(p.x, p.z);
}
function applySwordHits() {
    if (swing < 0.07 || swing > 0.21) return;
    const p = player.getPosition();
    const fx = Math.sin(swingHeading),
        fz = Math.cos(swingHeading);
    for (const e of enemies) {
        const dx = e.x - p.x,
            dz = e.z - p.z,
            dist = Math.hypot(dx, dz);
        if (e.hp <= 0 || hitThisSwing.has(e) || dist > 1.85) continue;
        if (dist > 0.6 && (dx * fx + dz * fz) / dist < Math.cos(1.15)) continue;
        hitThisSwing.add(e);
        e.hp--;
        e.hurt = 0.32;
        e.cool = 0.65;
        const reaction = reactions.get(e)!;
        reaction.windup = 0;
        e.vx = (dx / (dist || 1)) * 6;
        e.vz = (dz / (dist || 1)) * 6;
        burst(e.x, e.z, cream);
        if (e.hp === 0) {
            kills++;
            reaction.death = 0.45;
            burst(e.x, e.z, pink, 12);
            announce('A berry brave little hero.');
        }
    }
}
function spawnArc(x: number, z: number) {
    for (let i = 0; i < 14; i++) {
        const a = heading - 1.15 + (i / 13) * 2.3;
        const e = sphere(
            'golden sword arc',
            cream,
            x + Math.sin(a) * 1.45,
            0.52,
            z + Math.cos(a) * 1.45,
            0.14,
            0.07,
            0.14
        );
        effects.push({
            entity: e,
            vx: Math.sin(a) * 0.4,
            vy: 0,
            vz: Math.cos(a) * 0.4,
            life: 0.23,
            max: 0.23,
            scale: e.getLocalScale().clone(),
            gravity: false
        });
    }
}
const keydown = (e: KeyboardEvent) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code !== 'Escape') unpause();
    if (e.code === 'Space') attack();
    if (e.code === 'Escape') {
        if (state === 'playing') pause();
        else unpause();
    } else unpause();
    if (e.code === 'KeyR' && state !== 'playing') reset();
};
const keyup = (e: KeyboardEvent) => keys.delete(e.code);
const blur = () => {
    keys.clear();
    pause();
};
window.addEventListener('keydown', keydown);
window.addEventListener('keyup', keyup);
window.addEventListener('blur', blur);
const pointerAttack = () => {
    unpause();
    attack();
};
canvas.addEventListener('pointerdown', pointerAttack);

function resolve(x: number, z: number, r = 0.33) {
    x = Math.max(-WX + 1.4, Math.min(WX - 1.4, x));
    z = Math.max(-DZ + 1.1, Math.min(DZ - 1.1, z));
    for (const o of obstacles) {
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

Object.defineProperty(window, 'meadow', {
    configurable: true,
    get: () =>
        Object.freeze({
            state,
            health,
            elapsed: +time.toFixed(2),
            fps: Math.round(fps),
            player: { x: player.getPosition().x, z: player.getPosition().z },
            block: { x: block.getPosition().x, z: block.getPosition().z },
            switch: { x: switchX, z: switchZ },
            unlocked,
            kills,
            enemies: enemies.map((e) => ({ x: e.x, z: e.z, hp: e.hp, mode: e.mode })),
            attackCooldown,
            dashCooldown,
            effects: effects.length,
            drawCalls: app.stats.drawCalls.total,
            backbuffer: { width: canvas.width, height: canvas.height },
            sun: { fx: +light.forward.x.toFixed(3), fy: +light.forward.y.toFixed(3), fz: +light.forward.z.toFixed(3) }
        })
});

function updateEffects(dt: number) {
    for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.life -= dt;
        if (e.life <= 0) {
            e.entity.destroy();
            effects.splice(i, 1);
            continue;
        }
        if (e.gravity) e.vy -= dt * 5;
        e.entity.translate(e.vx * dt, e.vy * dt, e.vz * dt);
        const s = Math.min(1, (e.life / e.max) * 2);
        e.entity.setLocalScale(e.scale.x * s, e.scale.y * s, e.scale.z * s);
    }
}

app.on('update', (rawDt: number) => {
    frameTime += rawDt;
    frameCount++;
    if (frameTime > 0.6) {
        fps = frameCount / frameTime;
        frameTime = 0;
        frameCount = 0;
        document.getElementById('diagnostics')!.textContent = JSON.stringify(
            (window as unknown as { meadow: unknown }).meadow
        );
    }
    const dt = Math.min(rawDt, 0.035);
    if (state !== 'paused') updateEffects(dt);
    if (state !== 'playing') return;
    time += dt;
    invincible = Math.max(0, invincible - dt);
    attackCooldown = Math.max(0, attackCooldown - dt);
    dashCooldown = Math.max(0, dashCooldown - dt);
    dash = Math.max(0, dash - dt);
    swing = Math.max(0, swing - dt);
    toastTimer -= dt;
    if (toastTimer < 0) toast.classList.remove('visible');

    const inputX =
            Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
        inputZ = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
    const length = Math.hypot(inputX, inputZ);
    const desiredX = length ? inputX / length : 0,
        desiredZ = length ? inputZ / length : 0;
    const smooth = 1 - Math.exp(-14 * dt);
    moveX += (desiredX - moveX) * smooth;
    moveZ += (desiredZ - moveZ) * smooth;
    if (length) {
        heading = Math.atan2(desiredX, desiredZ);
        player.setEulerAngles(0, (heading * 180) / Math.PI, 0);
    }
    if (keys.has('ShiftLeft') && dashCooldown === 0 && length) {
        dash = 0.18;
        dashCooldown = 0.9;
        burst(player.getPosition().x, player.getPosition().z, cream, 5);
    }
    const speed = dash > 0 ? 9 : 3.2;
    const pos = player.getPosition();
    let nx = pos.x + moveX * speed * dt,
        nz = pos.z + moveZ * speed * dt;
    const bp = block.getPosition();
    const dx = nx - bp.x,
        dz = nz - bp.z;
    if (Math.abs(dx) < 1.1 && Math.abs(dz) < 1.1) {
        if (!unlocked && length && dx * moveX + dz * moveZ < 0) {
            let bx = bp.x + moveX * speed * dt * 0.85,
                bz = bp.z + moveZ * speed * dt * 0.85;
            bx = Math.max(-10, Math.min(10.5, bx));
            bz = Math.max(-8, Math.min(8, bz));
            const collision = obstacles.some((o) => Math.hypot(bx - o.x, bz - o.z) < o.r + 0.76);
            if (!collision) block.setPosition(bx, 0, bz);
        }
        const nb = block.getPosition();
        if (Math.abs(nx - nb.x) > Math.abs(nz - nb.z)) nx = nb.x + Math.sign(nx - nb.x) * 1.1;
        else nz = nb.z + Math.sign(nz - nb.z) * 1.1;
    }
    const solved = resolve(nx, nz);
    player.setPosition(solved.x, 0, solved.z);

    const moving = Math.hypot(moveX, moveZ);
    visual.setLocalPosition(0, Math.sin(time * 13) * 0.045 * moving, 0);
    leftBoot.setLocalPosition(-0.16, 0.13 + Math.max(0, Math.sin(time * 13)) * 0.1 * moving, 0.025);
    rightBoot.setLocalPosition(0.16, 0.13 + Math.max(0, -Math.sin(time * 13)) * 0.1 * moving, 0.025);
    swordPivot.setLocalEulerAngles(
        swing > 0 ? -75 : 0,
        swing > 0 ? (1 - swing / 0.28) * 160 - 80 : 0,
        swing > 0 ? -40 : 0
    );
    visual.enabled = !(invincible > 0 && Math.floor(time * 18) % 2 === 0);

    applySwordHits();
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const reaction = reactions.get(e)!;
        if (e.hp <= 0) {
            reaction.death = Math.max(0, reaction.death - dt);
            const t = reaction.death / 0.45;
            e.entity.setLocalScale(Math.max(0.01, t), Math.max(0.01, t * (1.7 - t)), Math.max(0.01, t));
            e.entity.setPosition(e.x, Math.sin((1 - t) * Math.PI) * 0.65, e.z);
            if (t === 0) e.entity.enabled = false;
            continue;
        }
        e.cool = Math.max(0, e.cool - dt);
        e.hurt = Math.max(0, e.hurt - dt);
        const p = player.getPosition(),
            ex = p.x - e.x,
            ez = p.z - e.z,
            d = Math.hypot(ex, ez);
        e.mode = reaction.windup > 0 ? 'attack' : d < 4.0 ? 'chase' : 'wander';
        let vx = 0,
            vz = 0;
        if (e.hurt === 0 && reaction.windup === 0) {
            if (d < 4 && d > 0.8) {
                vx = (ex / d) * 1.2;
                vz = (ez / d) * 1.2;
            } else if (d >= 4) {
                vx = Math.cos(time * 0.55 + i * 3) * 0.25;
                vz = Math.sin(time * 0.55 + i * 3) * 0.25;
            }
        }
        const safe = resolve(e.x + (vx + e.vx) * dt, e.z + (vz + e.vz) * dt, 0.4);
        e.x = safe.x;
        e.z = safe.z;
        e.vx *= Math.exp(-9 * dt);
        e.vz *= Math.exp(-9 * dt);
        e.entity.setPosition(e.x, Math.max(0, Math.sin(time * 5 + i)) * 0.09, e.z);
        if (d < 4) e.entity.setEulerAngles(0, (Math.atan2(ex, ez) * 180) / Math.PI, 0);
        const squash =
            e.hurt > 0
                ? 0.7
                : reaction.windup > 0
                  ? 0.68 + Math.sin(time * 28) * 0.04
                  : 1 + Math.sin(time * 5 + i) * 0.06;
        e.body.setLocalScale(1 / squash, squash, 1 / squash);
        if (d < 1.15 && e.cool === 0 && e.hurt === 0 && reaction.windup === 0) reaction.windup = 0.45;
        const striking = reaction.windup > 0 && reaction.windup <= dt;
        reaction.windup = Math.max(0, reaction.windup - dt);
        if (striking) e.cool = 1.25;
        if (striking && d < 1.25 && invincible === 0 && dash === 0) {
            health--;
            e.cool = 1.5;
            invincible = 1.2;
            hearts.textContent = Array.from({ length: 3 }, (_, n) => (n < health ? '❤️' : '🤍')).join(' ');
            burst(p.x, p.z, gold, 7);
            const shove = resolve(p.x + (ex / (d || 1)) * 0.5, p.z + (ez / (d || 1)) * 0.5);
            player.setPosition(shove.x, 0, shove.z);
            if (health <= 0) showEnd('over');
        }
    }

    if (!unlocked && Math.hypot(block.getPosition().x - switchX, block.getPosition().z - switchZ) < 0.55) {
        unlocked = true;
        block.setPosition(switchX, 0, switchZ);
        sunDisk.render!.meshInstances[0].material = teal;
        questTitle.textContent = 'A little treasure';
        questCopy.textContent = 'Your sunshine is waiting. Walk to the chest!';
        announce('Click! The treasure is unlocked.');
        burst(switchX, switchZ, gold, 20);
    }
    if (unlocked) {
        chestOpen = Math.min(100, chestOpen + dt * 150);
        lid.setLocalEulerAngles(-chestOpen, 0, 0);
        if (Math.hypot(player.getPosition().x - 9.15, player.getPosition().z + 5.4) < 1.7) {
            burst(9.15, -5.4, gold, 28);
            showEnd('won');
        }
    }

    canopies.forEach((f, i) =>
        f.setLocalEulerAngles(Math.sin(time * 0.8 + i) * 1.1, 0, Math.cos(time * 0.7 + i) * 1.2)
    );
    const p = player.getPosition(),
        targetX = p.x * 0.07,
        targetZ = (p.z - 4.0) * 0.06;
    const cp = camera.getPosition();
    camera.setPosition(cp.x + (targetX - cp.x) * dt * 2.5, 22, cp.z + (19.2 + targetZ - cp.z) * dt * 2.5);
});

app.on('destroy', () => {
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', blur);
    canvas.removeEventListener('pointerdown', pointerAttack);
    frame.destroy();
    hud.remove();
});
app.start();
