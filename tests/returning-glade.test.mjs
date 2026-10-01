import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { Entity } from 'playcanvas';

// Stub GPU/canvas work only; retain the authored terrain contour, builder collision and controllers.
const source = (path) => new URL(`../src/${path}.ts`, import.meta.url).href;
const moduleText = (text) => ({ url: `data:text/javascript,${encodeURIComponent(text)}`, shortCircuit: true });
registerHooks({
    resolve(s, c, next) {
        if (c.parentURL.endsWith('/scenes/river-island.ts')) {
            if (s === './terrain')
                return moduleText('export const paintMeadow = () => {}; export const paintClayBank = () => {};');
            if (s === '../rendering/textures')
                return moduleText(`
                export const paintCanvas = () => ({ c: {}, x: {
                    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}
                } });
                export const canvasTexture = () => ({});
            `);
        }
        if (
            ['/scenes/builder.ts', '/scenes/river-island.ts'].some((p) => c.parentURL.endsWith(p)) &&
            s === '../rendering/geometry'
        ) {
            return moduleText(
                `export * from '${source('rendering/geometry')}'; export const meshEntity = () => ({ setLocalPosition() {} });`
            );
        }
        if (c.parentURL.endsWith('/scenes/builder.ts')) {
            if (s === '../objects/shrine')
                return moduleText(
                    `export * from '${source('objects/shrine')}'; export const createShrineDais = () => {}; export const createStoneBridge = () => {};`
                );
            if (s === '../objects/gate')
                return moduleText(
                    `export * from '${source('objects/gate')}'; export const createGate = (_, root) => ({ panel: root });`
                );
            if (s === '../objects/props')
                return moduleText(
                    `export * from '${source('objects/props')}'; export const createPot = () => {}; export const createSignpost = () => {};`
                );
        }
        return next(s.startsWith('.') && !/\.[a-z]+$/.test(s) ? `${s}.ts` : s, c);
    }
});
const { scene, level } = await import('../src/levels/returning-glade.ts');
const { Collision } = await import('../src/gameplay/collision.ts');
const { GateController } = await import('../src/gameplay/gates.ts');
const { BridgeController, PortalController } = await import('../src/gameplay/level-objects.ts');
const { LevelRules, evaluateCondition } = await import('../src/gameplay/rules.ts');
const { PLAYER } = await import('../src/gameplay/player.ts');
const { BlockPuzzle, PUZZLE } = await import('../src/gameplay/puzzle.ts');
const { BRIDGE } = await import('../src/objects/shrine.ts');
const { SceneBuilder } = await import('../src/scenes/builder.ts');
const { createRiverIsland } = await import('../src/scenes/river-island.ts');
const { createRandom } = await import('../src/rendering/random.ts');
const { validateLevel } = await import('../src/levels/validate.ts');
const { adventureJourney } = await import('../src/levels/index.ts');
const object = (id) => scene.objects.find((o) => o.id === id);
const bridgeDef = object('return-bridge');
const river = createRiverIsland(
    {
        resources: { material: () => ({ update: () => undefined }), track: (v) => v },
        rand: createRandom(scene.seed)
    },
    new Entity(),
    {
        ...scene.terrain,
        openings: [
            {
                minX: bridgeDef.x - BRIDGE.width / 2,
                maxX: bridgeDef.x + BRIDGE.width / 2,
                minZ: -bridgeDef.length / 2,
                maxZ: bridgeDef.length / 2
            }
        ]
    }
);

function fixture() {
    const root = new Entity();
    const builder = new SceneBuilder({ palette: {} }, createRandom(scene.seed), root, { add: () => new Entity() });
    for (const o of river.obstacles) builder.addObstacle(o.x, o.z, o.r);
    const methods = {
        shrineDais: 'addShrineDais',
        tree: 'addTree',
        rock: 'addRock',
        bushCluster: 'addBushCluster',
        pot: 'addPot',
        signpost: 'addSignpost'
    };
    for (const o of scene.scenery) builder[methods[o.type]](o);
    const gates = scene.objects
        .filter((o) => o.type === 'gate')
        .map((def) => ({ def, gate: new GateController(def, builder.addGate(def)) }));
    const bridge = new BridgeController(bridgeDef, builder.addBridge({ ...bridgeDef, dynamic: true }));
    const layout = builder.finish();
    const collision = new Collision(layout.obstacles, scene.walkBounds, layout.surfaces);
    const config = {
        blocks: scene.objects.filter((o) => o.type === 'block'),
        plates: scene.objects.filter((o) => o.type === 'plate'),
        blockBounds: scene.blockBounds
    };
    const blocks = config.blocks.map(() => ({
        entity: new Entity(),
        visual: new Entity(),
        available: new Entity(),
        selected: new Entity()
    }));
    const materialHandle = () => ({ render: { meshInstances: [{ material: null }] } });
    const plates = config.plates.map(() => ({ sunDisk: materialHandle(), base: materialHandle() }));
    const puzzle = new BlockPuzzle(config, blocks, plates, collision, {
        idle: {},
        lit: {},
        baseIdle: {},
        disabled: {}
    });
    puzzle.reset();
    const rules = new LevelRules(level);
    const portal = new PortalController(
        object('portal'),
        Object.fromEntries(['gate', 'glow', 'swirl', 'sigil', 'runesDim', 'runesLit'].map((key) => [key, new Entity()]))
    );
    let player = { ...scene.spawn };
    const snapshot = () => ({
        plateActive: new Set(config.plates.filter((_, i) => puzzle.plateStates()[i]).map((p) => p.id)),
        enemyDefeated: new Set(),
        zoneVisited: new Set(),
        portalReached: new Set(portal.reached ? ['portal'] : [])
    });
    const tick = () => {
        puzzle.update(player);
        bridge.update(0.035);
        portal.update(0.035, player, collision);
        const state = snapshot();
        for (const result of rules.update(state))
            for (const action of result.actions) {
                if (action.type === 'openBridge') bridge.open();
                if (action.type === 'openPortal') portal.open();
            }
        for (const { def, gate } of gates)
            gate.update(0.035, evaluateCondition(def.openWhen, state), [
                ...puzzle.blockingBodies(),
                { ...player, r: PLAYER.radius }
            ]);
    };
    const settle = () => {
        for (let i = 0; i < 40; i++) tick();
    };
    // Search with the real shore, dynamic blockers, shrine steps and resting boxes.
    const walk = (target) => {
        const route = path(collision, player, target, PLAYER.radius, puzzle.blockingBodies());
        assert.ok(route, `walking route from ${JSON.stringify(player)} to ${JSON.stringify(target)}`);
        for (const point of route) {
            for (let step = 0; Math.hypot(player.x - point.x, player.z - point.z) > 1e-6; step++) {
                assert.ok(
                    step < 100,
                    `unladen walking stopped at ${JSON.stringify(player)} before ${JSON.stringify(point)}`
                );
                const fraction = Math.min(1, 0.05 / Math.hypot(player.x - point.x, player.z - point.z));
                player = puzzle.resolvePlayer(
                    { x: player.x + (point.x - player.x) * fraction, z: player.z + (point.z - player.z) * fraction },
                    player
                );
                tick();
            }
        }
    };
    const carry = (id, waypoints, offset = { x: 0, z: 1.3 }) => {
        const index = config.blocks.findIndex((b) => b.id === id);
        const block = blocks[index].entity;
        const start = block.getPosition();
        walk({ x: start.x + offset.x, z: start.z + offset.z });
        assert.equal(puzzle.interact(player), true);
        tick();
        for (const [x, z] of waypoints) {
            for (let step = 0; puzzle.grabbed; step++) {
                const p = block.getPosition();
                const distance = Math.hypot(x - p.x, z - p.z);
                if (distance < 1e-6) break;
                assert.ok(step < 1400, `${id} stopped at (${p.x}, ${p.z}) heading for (${x}, ${z})`);
                const fraction = Math.min(0.05, distance) / distance / PUZZLE.moveRatio;
                player = puzzle.constrain(
                    { x: player.x + (x - p.x) * fraction, z: player.z + (z - p.z) * fraction },
                    player
                );
                tick();
            }
        }
        const [x, z] = waypoints.at(-1);
        assert.ok(Math.hypot(block.getPosition().x - x, block.getPosition().z - z) < 1e-6);
        assert.equal(puzzle.grabbed, false);
        settle();
    };
    return { root, collision, gates, bridge, puzzle, blocks, rules, portal, snapshot, carry, walk, settle };
}

/** Grid edges are sampled continuously so a route cannot cut a thin blocker or a high step. */
function path(collision, from, target, radius, bodies = []) {
    const step = 0.5;
    const clear = (p) =>
        !collision.overlaps(p.x, p.z, radius) &&
        bodies.every((b) => Math.abs(p.x - b.x) >= PUZZLE.blockHalf || Math.abs(p.z - b.z) >= PUZZLE.blockHalf);
    const edge = (a, b) => {
        if (!collision.canTravel(a, b)) return false;
        const n = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.1));
        for (let i = 1; i <= n; i++)
            if (!clear({ x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n })) return false;
        return true;
    };
    const queue = [{ ...from, parent: -1 }];
    const seen = new Set(['0,0']);
    for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        if (Math.hypot(p.x - target.x, p.z - target.z) <= step && edge(p, target)) {
            const route = [target];
            for (let j = i; j >= 0; j = queue[j].parent) route.push({ x: queue[j].x, z: queue[j].z });
            return route.reverse();
        }
        for (const [dx, dz] of [
            [step, 0],
            [-step, 0],
            [0, step],
            [0, -step]
        ]) {
            const next = { x: p.x + dx, z: p.z + dz, parent: i };
            const key = `${Math.round((next.x - from.x) / step)},${Math.round((next.z - from.z) / step)}`;
            const b = collision.bounds;
            if (seen.has(key) || next.x < b.minX || next.x > b.maxX || next.z < b.minZ || next.z > b.maxZ) continue;
            seen.add(key);
            if (edge(p, next)) queue.push(next);
        }
    }
    return null;
}

test('the sixth area validates and closed crossings cannot be bypassed', () => {
    validateLevel(level, scene);
    assert.equal(adventureJourney.levels.at(-1), scene.id);
    const h = fixture();
    for (const radius of [PLAYER.radius, PUZZLE.blockRadius]) {
        assert.equal(path(h.collision, scene.spawn, object('moon-box'), radius), null);
        assert.equal(path(h.collision, scene.spawn, object('bridge-sun'), radius), null);
    }
    // The moon clearing admits pickup from every side without opening either gate.
    const moonPlate = object('crossing-moon');
    for (const [dx, dz] of [
        [1.3, 0],
        [-1.3, 0],
        [0, 1.3],
        [0, -1.3]
    ]) {
        assert.ok(path(h.collision, scene.spawn, { x: moonPlate.x + dx, z: moonPlate.z + dz }, PLAYER.radius));
    }
    h.gates[0].gate.update(1, true, []);
    assert.ok(path(h.collision, scene.spawn, object('moon-box'), PLAYER.radius));
    h.gates[1].gate.update(1, true, []);
    assert.ok(path(h.collision, scene.spawn, object('bridge-sun'), PUZZLE.blockRadius));
    h.root.destroy();
});

test('both stones travel the complete return route, light the shrine and reset', () => {
    const h = fixture();
    h.carry('sun-box', [
        [-6, 14],
        [-6, 9]
    ]);
    h.carry(
        'moon-box',
        [
            [-3, 13],
            [-2, 10],
            [-2, 7]
        ],
        { x: 1.3, z: 0 }
    );
    h.carry('sun-box', [
        [-4, 9],
        [-4, 6],
        [-7.8, 6],
        [-8.7, 3],
        [-8.7, -9],
        [14, -9],
        [14, -8]
    ]);
    assert.equal(h.bridge.state, 'open');
    assert.equal(h.gates[0].gate.state, 'closed');
    assert.equal(h.portal.unlocked, false);
    h.carry(
        'moon-box',
        [
            [9.6, 7],
            [9.6, -10],
            [-2, -10],
            [-2, -13]
        ],
        { x: 1.3, z: 0 }
    );
    assert.equal(h.gates[1].gate.state, 'closed');
    assert.equal(h.bridge.state, 'open');
    assert.equal(h.portal.unlocked, false);
    h.carry('sun-box', [
        [10, -11],
        [4, -11],
        [4, -13]
    ]);
    assert.ok(h.puzzle.diagnostics().every((b) => b.locked));
    assert.equal(h.portal.unlocked, true);
    assert.equal(h.rules.complete, false);
    h.walk({ x: 1, z: -17 });
    h.settle();
    assert.equal(h.rules.complete, true);
    h.puzzle.reset();
    h.rules.reset();
    h.portal.reset();
    h.bridge.reset();
    h.gates.forEach(({ gate }) => gate.reset());
    assert.ok(h.puzzle.plateStates().every((v) => !v));
    assert.ok(h.puzzle.diagnostics().every((b) => !b.locked && !b.grabbed));
    h.puzzle.diagnostics().forEach((b, i) => {
        const start = scene.objects.filter((o) => o.type === 'block')[i];
        assert.deepEqual({ x: b.x, z: b.z }, { x: start.x, z: start.z });
    });
    assert.equal(h.bridge.state, 'closed');
    assert.equal(h.portal.unlocked, false);
    assert.equal(h.rules.complete, false);
    assert.deepEqual(h.rules.diagnostics().activatedRules, []);
    assert.ok(h.gates.every(({ gate }) => gate.state === 'closed'));
    h.root.destroy();
});

test('early shrine sun stays movable; bridge requires both temporary plates and remains reusable', () => {
    const h = fixture();
    const sun = object('shrine-sun');
    h.blocks[0].entity.setPosition(sun.x, 0, sun.z);
    h.settle();
    assert.equal(h.puzzle.diagnostics()[0].locked, false);
    assert.equal(h.portal.unlocked, false);
    for (const [index, plateId] of [
        [0, 'bridge-sun'],
        [1, 'crossing-moon']
    ]) {
        const p = object(plateId);
        h.blocks[index].entity.setPosition(p.x, 0, p.z);
        h.settle();
        assert.equal(h.bridge.state, index === 0 ? 'closed' : 'open');
    }
    h.carry('sun-box', [
        [10, -8],
        [10, -7],
        [10, 10],
        [-6, 10],
        [-6, 9]
    ]);
    assert.equal(h.bridge.state, 'open');
    h.carry(
        'moon-box',
        [
            [9.6, 7],
            [9.6, -10],
            [-2, -10],
            [-2, -13]
        ],
        { x: 1.3, z: 0 }
    );
    h.carry('sun-box', [
        [-4, 9],
        [10, 9],
        [10, -11],
        [4, -11],
        [4, -13]
    ]);
    assert.equal(h.portal.unlocked, true);
    h.root.destroy();
});
