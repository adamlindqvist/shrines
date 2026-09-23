import { Color, Vec3 } from 'playcanvas';
import type { Entity, GraphicsDevice, StandardMaterial } from 'playcanvas';

import { appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import type { Random } from '../rendering/random';
import type { SceneResources } from '../rendering/resources';
import { canvasTexture, paintCanvas } from '../rendering/textures';

export type TerrainContext = {
    device: GraphicsDevice;
    resources: SceneResources;
    rand: Random;
};

/** Size of the painted meadow texture; clearing coordinates are in these texels. */
export const MEADOW_TEXELS = 1024;

/**
 * A sandy patch painted into the meadow texture, in texels of the
 * 1024² texture (u right = +X, v down = +Z across the island).
 */
export type SandyClearing = {
    x: number;
    y: number;
    /** Radii of the loose outer scatter. */
    radius: [number, number];
    /** Radii of the denser, brighter centre. */
    innerRadius: [number, number];
    /** Optional footpath trailing away from the clearing. */
    path?: { x: number; y: number; dx: number; dy: number };
};

export type IslandOptions = {
    /** Half-extent along X, to the outer edge of the rounded corners. */
    halfWidth: number;
    /** Half-extent along Z. */
    halfDepth: number;
    cornerRadius: number;
    /** Depth of the clay bank below the walkable top at y = 0. */
    wallHeight: number;
    clearing?: SandyClearing;
    clearings?: SandyClearing[];
};

export type Island = {
    /** Rounded-rectangle rim as [x, z] points. */
    outline: number[][];
    halfWidth: number;
    halfDepth: number;
    wallHeight: number;
};

/** Floating meadow island: painted grass top, clay bank and a scalloped turf lip. */
export function createIsland(ctx: TerrainContext, root: Entity, options: IslandOptions): Island {
    const { halfWidth: WX, halfDepth: DZ, cornerRadius: CR, wallHeight: WALL } = options;
    const { device, resources, rand } = ctx;
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

    const grass = resources.material('sunlit meadow', '#a3c040');
    const earth = resources.material('honey clay bank', '#b07c40');
    paintMeadow(ctx, grass, options.clearing ? [options.clearing] : (options.clearings ?? []));
    paintClayBank(ctx, earth);

    // Flat meadow top.
    {
        const g = createGeo();
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
        meshEntity(device, root, 'Continuous walkable meadow', g, grass, false, true);
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
        const g = createGeo(),
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
        meshEntity(device, root, 'Honey clay bank', g, earth, true, true);
    }

    // A continuous, low scalloped turf edge, sampled by distance around the island.
    {
        const turf = createGeo();
        const turfMaterial = resources.material('meadow edge', '#a6c745');
        for (let k = 0; k < RIM; k++) {
            const a = outline[k],
                b = outline[(k + 1) % RIM];
            const count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.19));
            for (let j = 0; j < count; j++) {
                const f = j / count,
                    x = a[0] + (b[0] - a[0]) * f,
                    z = a[1] + (b[1] - a[1]) * f;
                const r = 0.15 + rand() * 0.055;
                appendSphere(turf, x, -0.075 - rand() * 0.035, z, r, 0.12, r, 8, 5);
            }
        }
        meshEntity(device, root, 'soft scalloped turf edge', turf, turfMaterial, false, true);
    }

    return { outline, halfWidth: WX, halfDepth: DZ, wallHeight: WALL };
}

/** Painted meadow: soft mottled greens, optionally with a sandy clearing. */
function paintMeadow({ device, resources, rand }: TerrainContext, grass: StandardMaterial, clearings: SandyClearing[]) {
    const size = MEADOW_TEXELS;
    const { c, x: ctx } = paintCanvas(size);
    ctx.fillStyle = '#bfd84f';
    ctx.fillRect(0, 0, size, size);
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
    for (const clearing of clearings) {
        const { x: sx, y: sy, radius, innerRadius, path } = clearing;
        for (let i = 0; i < 2400; i++) {
            const a = rand() * Math.PI * 2,
                r = Math.sqrt(rand());
            const x = sx + Math.cos(a) * r * radius[0],
                y = sy + Math.sin(a) * r * radius[1];
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = rand() > 0.35 ? '#f2cd85' : '#e8c176';
            ctx.beginPath();
            ctx.ellipse(x, y, 20 + rand() * 34, 16 + rand() * 28, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < 1600; i++) {
            const a = rand() * Math.PI * 2,
                r = Math.pow(rand(), 1.7);
            const x = sx + Math.cos(a) * r * innerRadius[0],
                y = sy + Math.sin(a) * r * innerRadius[1];
            ctx.globalAlpha = 0.17;
            ctx.fillStyle = rand() > 0.4 ? '#f9d98f' : '#f0ce81';
            ctx.beginPath();
            ctx.ellipse(x, y, 18 + rand() * 30, 15 + rand() * 24, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        if (path)
            for (let i = 0; i < 380; i++) {
                const t = rand(),
                    width = 10 + t * 18;
                const x = path.x + t * path.dx + (rand() - 0.5) * width * 2;
                const y = path.y + t * path.dy;
                ctx.globalAlpha = 0.13;
                ctx.fillStyle = rand() > 0.4 ? '#f2d18a' : '#e7c27c';
                ctx.beginPath();
                ctx.ellipse(x, y, 14 + rand() * 13, 12 + rand() * 16, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        ctx.globalAlpha = 1;
    }
    grass.diffuseMap = resources.track(canvasTexture(device, c));
    grass.diffuse = Color.WHITE;
    grass.update();
}

/** Layered clay bank texture for the island wall. */
function paintClayBank({ device, resources, rand }: TerrainContext, earth: StandardMaterial) {
    const { c, x: ctx } = paintCanvas(512);
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
    earth.diffuseMap = resources.track(canvasTexture(device, c));
    earth.diffuse = Color.WHITE;
    earth.update();
}

export type BackdropOptions = {
    /** Half-size of the square backdrop plane. */
    size?: number;
    /** Top, middle and bottom colours of the vertical gradient. */
    gradient?: [string, string, string];
    shadowColor?: string;
    /** World-space offset of the island's painted drop shadow. */
    shadowOffset?: [number, number];
};

/** Unlit plane below the island carrying a soft painted drop shadow of its outline. */
export function createBackdrop(
    { device, resources }: Omit<TerrainContext, 'rand'>,
    root: Entity,
    island: Island,
    {
        size: S = 34,
        gradient = ['#c7e2c9', '#c9e6cf', '#cdedd4'],
        shadowColor = '#6e9c7c',
        shadowOffset = [-1.5, 1.35]
    }: BackdropOptions = {}
) {
    const PX = 1024;
    const { c, x: ctx } = paintCanvas(PX);
    const grd = ctx.createLinearGradient(0, 0, 0, PX);
    grd.addColorStop(0, gradient[0]);
    grd.addColorStop(0.55, gradient[1]);
    grd.addColorStop(1, gradient[2]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, PX, PX);
    const toPx = (x: number, z: number) => [((x + S) / (S * 2)) * PX, ((z + S) / (S * 2)) * PX];
    ctx.save();
    ctx.filter = 'blur(26px)';
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    island.outline.forEach(([x, z], i) => {
        const [px, py] = toPx(x * 1.02 + shadowOffset[0], z * 1.02 + shadowOffset[1]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const material = resources.material('mint backdrop', '#c6e4cc');
    material.diffuse = Color.BLACK;
    material.emissive = Color.WHITE;
    material.emissiveMap = resources.track(canvasTexture(device, c));
    material.useLighting = false;
    material.update();
    const g = createGeo();
    g.p.push(-S, 0, -S, S, 0, -S, S, 0, S, -S, 0, S);
    g.n.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    g.u.push(0, 0, 1, 0, 1, 1, 0, 1);
    g.i.push(0, 2, 1, 0, 3, 2);
    const bd = meshEntity(device, root, 'mint backdrop', g, material, false, false);
    bd.setLocalPosition(0, -island.wallHeight - 0.05, 0);
    return bd;
}
