import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { Entity } from 'playcanvas';

registerHooks({
    resolve(s, c, next) {
        return next(s.startsWith('.') && !/\.[a-z]+$/.test(s) ? `${s}.ts` : s, c);
    }
});
const { GateController, createGateBlockers, GATE_MOTION } = await import('../src/gameplay/gates.ts');
const { Collision } = await import('../src/gameplay/collision.ts');
const { PLAYER } = await import('../src/gameplay/player.ts');
const { PUZZLE } = await import('../src/gameplay/puzzle.ts');
const { SLIME } = await import('../src/gameplay/slimes.ts');
const { scene, level } = await import('../src/levels/sun-gate.ts');
const { GATE } = await import('../src/objects/gate.ts');
const { POT_RADIUS, LOG_RADIUS, SIGNPOST_RADIUS } = await import('../src/objects/props.ts');
const { NATURE_COLLISION } = await import('../src/rendering/nature-tuning.ts');
const { validateLevel } = await import('../src/levels/validate.ts');
const { adventureJourney } = await import('../src/levels/index.ts');

const definition = {
    type: 'gate',
    id: 'gate',
    x: 4,
    z: -2,
    width: 5,
    openWhen: { type: 'plateActive', target: 'plate' }
};
function fixture(rotation = 0) {
    const def = { ...definition, rotation };
    const blockers = createGateBlockers(def);
    const panel = new Entity();
    const gate = new GateController(def, { panel, blockers });
    const collision = new Collision(blockers, { minX: -20, maxX: 20, minZ: -20, maxZ: 20 });
    return { gate, blockers, panel, collision };
}

for (const fps of [30, 60, 120]) {
    test(`gate repeatedly opens and closes over gameplay time at ${fps} FPS`, () => {
        const { gate, blockers, panel } = fixture();
        for (let cycle = 0; cycle < 3; cycle++) {
            gate.update(GATE_MOTION.duration / 2, true, []);
            assert.equal(gate.state, 'opening');
            assert.ok(blockers.every((b) => b.enabled));
            for (let i = 0; i < (fps * GATE_MOTION.duration) / 2; i++) gate.update(1 / fps, true, []);
            assert.equal(gate.state, 'open');
            assert.equal(panel.getLocalPosition().y, -GATE_MOTION.depth);
            assert.ok(blockers.every((b) => !b.enabled));
            gate.update(1 / fps, false, []);
            assert.equal(gate.state, 'closing');
            assert.ok(blockers.every((b) => b.enabled));
            for (let i = 1; i < fps * GATE_MOTION.duration; i++) gate.update(1 / fps, false, []);
            assert.equal(gate.state, 'closed');
            assert.equal(Math.abs(panel.getLocalPosition().y), 0);
        }
    });
}

test('gate reverses continuously and reset restores both collision and pose mid-action', () => {
    const { gate, panel, blockers } = fixture();
    gate.update(0.4, true, []);
    gate.update(0.1, false, []);
    assert.equal(gate.state, 'closing');
    assert.ok(Math.abs(gate.progress - 0.5) < 1e-9);
    gate.update(0.1, true, []);
    assert.equal(gate.state, 'opening');
    assert.ok(Math.abs(gate.progress - 2 / 3) < 1e-9);
    assert.ok(blockers.every((b) => b.enabled));
    gate.reset();
    assert.equal(gate.progress, 0);
    assert.equal(gate.desiredOpen, false);
    assert.equal(Math.abs(panel.getLocalPosition().y), 0);
});

for (const r of [PLAYER.radius, PUZZLE.blockRadius, SLIME.radius]) {
    test(`gate waits for an occupied opening with body radius ${r}`, () => {
        const { gate, blockers } = fixture();
        gate.update(GATE_MOTION.duration, true, []);
        const body = { x: definition.x, z: definition.z + r, r };
        gate.update(3, false, [body]);
        assert.equal(gate.state, 'waiting');
        assert.equal(gate.progress, 1);
        assert.equal(gate.desiredOpen, false);
        assert.ok(blockers.every((b) => !b.enabled));
        gate.update(0.1, true, [body]);
        assert.equal(gate.state, 'open');
        body.z += 2;
        gate.update(0.1, false, [body]);
        assert.equal(gate.state, 'closing');
        assert.ok(blockers.every((b) => b.enabled));
    });
}

for (const rotation of [0, 37, 90, -90]) {
    test(`rotated gate covers its entire passage and blocks player, block and slime at ${rotation} degrees`, () => {
        const { gate, collision } = fixture(rotation);
        const a = (rotation * Math.PI) / 180;
        for (const radius of [PLAYER.radius, PUZZLE.blockRadius, SLIME.radius]) {
            for (let x = -definition.width / 2; x <= definition.width / 2; x += 0.05) {
                assert.equal(
                    collision.overlaps(definition.x + Math.cos(a) * x, definition.z - Math.sin(a) * x, radius),
                    true
                );
            }
        }
        gate.update(GATE_MOTION.duration - 0.01, true, []);
        assert.equal(collision.overlaps(definition.x, definition.z, PLAYER.radius), true);
        gate.update(0.01, true, []);
        assert.equal(collision.overlaps(definition.x, definition.z, PUZZLE.blockRadius), false);
        gate.reset();
        assert.equal(collision.overlaps(definition.x, definition.z, SLIME.radius), true);
    });
}

test('sun gate follows Twin Bridges and precedes Drifting Stones and validates reactive references', () => {
    const order = adventureJourney.levels;
    assert.equal(order[order.indexOf('sun-gate') - 1], 'twin-bridges');
    assert.equal(order[order.indexOf('sun-gate') + 1], 'drifting-stones');
    for (const [mutate, pattern] of [
        [
            (s) => {
                s.objects.find((o) => o.type === 'plate').mode = 'unknown';
            },
            /mode/
        ],
        [
            (s) => {
                s.objects.find((o) => o.type === 'gate').width = 3;
            },
            /width/
        ],
        [
            (s) => {
                s.objects.find((o) => o.type === 'gate').width = Infinity;
            },
            /width/
        ],
        [
            (s) => {
                s.objects.find((o) => o.type === 'gate').rotation = NaN;
            },
            /rotation/
        ],
        [
            (s) => {
                s.objects.find((o) => o.type === 'gate').openWhen.target = 'sun-box';
            },
            /openWhen.*plate/
        ],
        [
            (s) => {
                s.objects.find((o) => o.type === 'gate').openWhen = { type: 'all', conditions: [] };
            },
            /openWhen/
        ]
    ]) {
        const invalid = structuredClone(scene);
        mutate(invalid);
        assert.throws(() => validateLevel(level, invalid), pattern);
    }
});

test('the rock enclosure has no alternate entry and the open gate admits the carried pair', () => {
    const def = scene.objects.find((o) => o.type === 'gate');
    const blockers = createGateBlockers(def);
    const yaw = ((def.rotation ?? 0) * Math.PI) / 180;
    const posts = [-1, 1].map((side) => ({
        x: def.x + (Math.cos(yaw) * side * (def.width + GATE.postSize)) / 2,
        z: def.z - (Math.sin(yaw) * side * (def.width + GATE.postSize)) / 2,
        r: GATE.postSize / 2
    }));
    const rocks = scene.scenery
        .filter((o) => o.type === 'rock' || o.type === 'tree')
        .map((o) => ({
            x: o.x,
            z: o.z,
            r: o.scale * (o.type === 'rock' ? NATURE_COLLISION.rockRadius : NATURE_COLLISION.treeRadius)
        }));
    const props = scene.scenery
        .filter((o) => ['pot', 'log', 'signpost'].includes(o.type))
        .map((o) => ({
            x: o.x,
            z: o.z,
            r: o.type === 'pot' ? POT_RADIUS : o.type === 'log' ? LOG_RADIUS * (o.scale ?? 1) : SIGNPOST_RADIUS
        }));
    const collision = new Collision([...rocks, ...props, ...posts, ...blockers], scene.walkBounds);
    const moon = scene.objects.find((o) => o.id === 'moon-box');
    // Flood the actual collision footprints rather than assuming visually joined rocks are solid.
    const reachable = () => {
        const step = 0.25;
        const seen = new Set();
        const queue = [[scene.spawn.x, scene.spawn.z]];
        for (let i = 0; i < queue.length; i++) {
            const [x, z] = queue[i];
            if (Math.hypot(x - moon.x, z - moon.z) < 0.5) return true;
            for (const [dx, dz] of [
                [step, 0],
                [-step, 0],
                [0, step],
                [0, -step]
            ]) {
                const nx = x + dx,
                    nz = z + dz;
                const key = `${nx},${nz}`;
                if (
                    seen.has(key) ||
                    nx < scene.walkBounds.minX ||
                    nx > scene.walkBounds.maxX ||
                    nz < scene.walkBounds.minZ ||
                    nz > scene.walkBounds.maxZ ||
                    collision.overlaps(nx, nz, PLAYER.radius)
                )
                    continue;
                seen.add(key);
                queue.push([nx, nz]);
            }
        }
        return false;
    };
    assert.equal(reachable(), false, 'closed gate is the only entry');
    const gate = new GateController(def, { panel: new Entity(), blockers });
    gate.update(GATE_MOTION.duration, true, []);
    assert.equal(reachable(), true);
    // Sample the whole curved transport route with a fixed southern pickup offset.
    const moonPlate = scene.objects.find((o) => o.id === 'portal-plate');
    const sun = scene.objects.find((o) => o.id === 'sun-box');
    const temporary = scene.objects.find((o) => o.id === 'gate-plate');
    const sunPlate = scene.objects.find((o) => o.id === 'sun-portal-plate');
    const routes = [
        [sun, { x: 0, z: 3 }, temporary],
        [moon, { x: -5.5, z: -9 }, { x: -5.5, z: -5.5 }, def, { x: 0, z: 2 }, { x: 5, z: -3 }, moonPlate],
        [temporary, { x: 0, z: 3 }, { x: 5, z: -3 }, { x: 11, z: -3 }, sunPlate]
    ];
    for (const route of routes)
        for (let segment = 1; segment < route.length; segment++) {
            const from = route[segment - 1],
                to = route[segment];
            const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.05);
            for (let i = 0; i <= steps; i++) {
                const x = from.x + ((to.x - from.x) * i) / steps;
                const z = from.z + ((to.z - from.z) * i) / steps;
                assert.equal(collision.overlaps(x, z, PUZZLE.blockRadius), false, `box clearance at ${x},${z}`);
                assert.equal(collision.overlaps(x, z + 1.3, PLAYER.radius), false, `player clearance at ${x},${z}`);
                for (const slime of scene.objects.filter((o) => o.type === 'slime')) {
                    // Unprovoked wander spans < 1 unit per axis; combat stays away from the required route.
                    assert.ok(Math.hypot(x - slime.x, z + 1.3 - slime.z) > SLIME.sight + Math.SQRT2);
                }
            }
        }
});

test('sun-gate portal requires both permanent plates and never opens from temporary pressure', async () => {
    const { LevelRules } = await import('../src/gameplay/rules.ts');
    const rules = new LevelRules(level);
    const state = {
        plateActive: new Set(['gate-plate']),
        enemyDefeated: new Set(),
        portalReached: new Set(),
        zoneVisited: new Set()
    };
    const portalActions = (changes) => changes.flatMap((r) => r.actions).filter((a) => a.type === 'openPortal');
    assert.deepEqual(portalActions(rules.update(state)), []);
    state.plateActive.add('portal-plate');
    assert.deepEqual(portalActions(rules.update(state)), [], 'moon alone does not unlock the portal');
    state.plateActive.delete('gate-plate');
    state.plateActive.add('sun-portal-plate');
    assert.equal(
        portalActions(rules.update(state)).length,
        1,
        'two permanent matches suffice after the sun leaves the gate plate'
    );
    assert.equal(scene.objects.find((o) => o.id === 'sun-portal-plate').requiresPlate, 'portal-plate');
});

test('portal rules reject temporary conditions and plate prerequisites reject wrong references and cycles', () => {
    for (const group of [null, 'all', 'any']) {
        const invalid = structuredClone(level);
        const condition = { type: 'plateActive', target: 'gate-plate' };
        invalid.rules.find((r) => r.id === 'open-portal').when = group
            ? { type: group, conditions: [condition, { type: 'plateActive', target: 'portal-plate' }] }
            : condition;
        assert.throws(() => validateLevel(invalid, scene), /temporary plates cannot unlock portals/);
    }
    for (const [required, pattern] of [
        ['missing', /plate/],
        ['sun-box', /plate/],
        ['gate-plate', /permanent/],
        ['sun-portal-plate', /cycle/]
    ]) {
        const invalid = structuredClone(scene);
        invalid.objects.find((o) => o.id === 'sun-portal-plate').requiresPlate = required;
        assert.throws(() => validateLevel(level, invalid), pattern);
    }
    const cyclic = structuredClone(scene);
    cyclic.objects.find((o) => o.id === 'portal-plate').requiresPlate = 'sun-portal-plate';
    assert.throws(() => validateLevel(level, cyclic), /cycle/);
});
