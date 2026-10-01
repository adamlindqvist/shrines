import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { Entity } from 'playcanvas';

registerHooks({
    resolve(s, c, next) {
        return next(s.startsWith('.') && !/\.[a-z]+$/.test(s) ? `${s}.ts` : s, c);
    }
});
const { scene, level } = await import('../src/levels/lantern-lake.ts');
const { Collision } = await import('../src/gameplay/collision.ts');
const { GateController, createGateBlockers, GATE_MOTION } = await import('../src/gameplay/gates.ts');
const { LevelRules, evaluateCondition } = await import('../src/gameplay/rules.ts');
const { PLAYER } = await import('../src/gameplay/player.ts');
const { BlockPuzzle, PUZZLE } = await import('../src/gameplay/puzzle.ts');
const { GATE } = await import('../src/objects/gate.ts');
const { POT_RADIUS, LOG_RADIUS, SIGNPOST_RADIUS } = await import('../src/objects/props.ts');
const { NATURE_COLLISION } = await import('../src/rendering/nature-tuning.ts');
const { validateLevel } = await import('../src/levels/validate.ts');
const { adventureJourney } = await import('../src/levels/index.ts');

const object = (id) => scene.objects.find((o) => o.id === id);
const emptySnapshot = () => ({
    plateActive: new Set(),
    enemyDefeated: new Set(),
    portalReached: new Set(),
    zoneVisited: new Set()
});

function fixture() {
    const gates = scene.objects
        .filter((o) => o.type === 'gate')
        .map((def) => {
            const blockers = createGateBlockers(def);
            return { def, blockers, gate: new GateController(def, { panel: new Entity(), blockers }) };
        });
    const scenery = scene.scenery.flatMap((o) => {
        const r =
            o.type === 'rock'
                ? NATURE_COLLISION.rockRadius * o.scale
                : o.type === 'tree'
                  ? NATURE_COLLISION.treeRadius * (o.scale ?? 1)
                  : o.type === 'pot'
                    ? POT_RADIUS
                    : o.type === 'log'
                      ? LOG_RADIUS * (o.scale ?? 1)
                      : o.type === 'signpost'
                        ? SIGNPOST_RADIUS
                        : 0;
        return r ? [{ x: o.x, z: o.z, r }] : [];
    });
    const posts = gates.flatMap(({ def }) =>
        [-1, 1].map((side) => ({
            x: def.x + (side * (def.width + GATE.postSize)) / 2,
            z: def.z,
            r: GATE.postSize / 2
        }))
    );
    // Treat shore and shrine terrain as flat here: even this more permissive world must be sealed.
    const collision = new Collision([...scenery, ...posts, ...gates.flatMap((g) => g.blockers)], scene.walkBounds);
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
    const materials = { idle: {}, lit: {}, baseIdle: {}, disabled: {} };
    const puzzle = new BlockPuzzle(config, blocks, plates, collision, materials);
    const rules = new LevelRules(level);
    puzzle.reset();
    const snapshot = () => ({
        ...emptySnapshot(),
        plateActive: new Set(config.plates.filter((_, i) => puzzle.plateStates()[i]).map((p) => p.id))
    });
    return { gates, collision, config, blocks, plates, materials, puzzle, rules, snapshot };
}

/** Cardinal flood fill on a quarter-unit grid, independent of the intended route. */
function reachable(collision, target, radius = PLAYER.radius) {
    const queue = [[scene.spawn.x, scene.spawn.z]];
    const seen = new Set();
    const step = 0.25;
    for (let i = 0; i < queue.length; i++) {
        const [x, z] = queue[i];
        if (Math.hypot(x - target.x, z - target.z) < step) return true;
        for (const [dx, dz] of [
            [step, 0],
            [-step, 0],
            [0, step],
            [0, -step]
        ]) {
            const nx = x + dx,
                nz = z + dz;
            const key = `${nx},${nz}`;
            const b = scene.walkBounds;
            if (
                seen.has(key) ||
                nx < b.minX ||
                nx > b.maxX ||
                nz < b.minZ ||
                nz > b.maxZ ||
                collision.overlaps(nx, nz, radius)
            )
                continue;
            seen.add(key);
            queue.push([nx, nz]);
        }
    }
    return false;
}

test('Lantern Lake keeps its journey position with two reusable stones and no platform or bridge transport', () => {
    validateLevel(level, scene);
    assert.equal(adventureJourney.levels[4], scene.id);
    assert.equal(scene.objects.filter((o) => o.type === 'block').length, 2);
    assert.equal(scene.objects.filter((o) => o.type === 'plate' && o.mode === 'temporary').length, 3);
    assert.equal(
        [...scene.objects, ...scene.scenery].some((o) => ['platform', 'bridge', 'pier'].includes(o.type)),
        false
    );
});

test('both courts seal closed gates and admit player and block footprints only through open gates', () => {
    const { gates, collision } = fixture();
    const targets = [object('moon-box'), object('moon-lantern')];
    for (const radius of [PLAYER.radius, PUZZLE.blockRadius]) {
        targets.forEach((target) => assert.equal(reachable(collision, target, radius), false));
    }
    gates[0].gate.update(GATE_MOTION.duration, true, []);
    assert.equal(reachable(collision, targets[0]), true);
    assert.equal(reachable(collision, targets[1]), false);
    gates[1].gate.update(GATE_MOTION.duration, true, []);
    for (const radius of [PLAYER.radius, PUZZLE.blockRadius]) {
        targets.forEach((target) => assert.equal(reachable(collision, target, radius), true));
    }
    for (const { gate } of gates) gate.reset();
    targets.forEach((target) => assert.equal(reachable(collision, target), false));
});

test('continuous carrying can complete the gate handoff with both stones and reset all progress', () => {
    const { gates, collision, config, blocks, puzzle, rules, snapshot } = fixture();
    const actions = [];
    let player = { ...scene.spawn };
    const tick = () => {
        puzzle.update(player);
        const state = snapshot();
        actions.push(...rules.update(state).flatMap((r) => r.actions));
        const bodies = [...puzzle.blockingBodies(), { ...player, r: PLAYER.radius }];
        for (const { def, gate } of gates) gate.update(0.035, evaluateCondition(def.openWhen, state), bodies);
    };
    const settle = () => {
        for (let i = 0; i < 20; i++) tick();
    };
    const carry = (id, waypoints) => {
        const index = config.blocks.findIndex((b) => b.id === id);
        const block = blocks[index].entity;
        const start = block.getPosition();
        // Set up a valid pickup stance; the browser test verifies the unladen walking between legs.
        player = { x: start.x, z: start.z + 1.3 };
        assert.equal(collision.overlaps(player.x, player.z, PLAYER.radius), false);
        assert.equal(puzzle.interact(player), true);
        tick();
        for (const [x, z] of waypoints) {
            for (let step = 0; puzzle.grabbed; step++) {
                const p = block.getPosition();
                const distance = Math.hypot(x - p.x, z - p.z);
                if (distance < 1e-6) break;
                assert.ok(step < 1000, `${id} must reach (${x}, ${z}), stopped at (${p.x}, ${p.z})`);
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
        assert.equal(puzzle.grabbed, false, `${id} snaps and releases`);
        settle();
    };
    carry('sun-box', [[-8, 4]]);
    assert.equal(gates[0].gate.state, 'open');
    carry('moon-box', [
        [-8, 1.5],
        [-4, 1.5],
        [-4, 4],
        [7.5, 4]
    ]);
    assert.equal(gates[1].gate.state, 'open');
    carry('sun-box', [
        [-8, 7],
        [10, 7],
        [10, 1.5],
        [7.5, 1.5],
        [7.5, -3],
        [3, -3]
    ]);
    assert.equal(gates[0].gate.state, 'closed');
    assert.equal(snapshot().plateActive.has('east-sun-plate'), true);
    carry('moon-box', [
        [7.5, -7],
        [5, -7]
    ]);
    assert.equal(snapshot().plateActive.has('east-moon-plate'), false);
    assert.equal(gates[1].gate.state, 'open');
    assert.deepEqual(actions, [], 'neither temporary plates nor the moon alone opens the portal');
    carry('sun-box', [
        [11, -3],
        [11, -7]
    ]);
    assert.equal(snapshot().plateActive.has('east-sun-plate'), false);
    assert.equal(gates[1].gate.state, 'open', 'permanent moon now keeps the passage open');
    assert.ok(puzzle.diagnostics().every((b) => b.locked));
    assert.deepEqual(actions, [{ type: 'openPortal', target: 'portal' }]);
    const complete = snapshot();
    complete.portalReached.add('portal');
    rules.update(complete);
    assert.equal(rules.complete, true);
    puzzle.reset();
    rules.reset();
    gates.forEach(({ gate }) => gate.reset());
    assert.ok(puzzle.plateStates().every((active) => !active));
    assert.ok(puzzle.diagnostics().every((b) => !b.locked && !b.grabbed));
    puzzle
        .diagnostics()
        .forEach((b, i) => assert.deepEqual({ x: b.x, z: b.z }, { x: config.blocks[i].x, z: config.blocks[i].z }));
    assert.ok(gates.every(({ gate }) => gate.state === 'closed' && gate.progress === 0));
    assert.equal(rules.complete, false);
    assert.deepEqual(rules.diagnostics().activatedRules, []);
});

test('a premature sun match stays movable until the permanent moon is secured, including after reset', () => {
    const { puzzle, blocks, plates, materials, config } = fixture();
    const sun = object('sun-lantern');
    const moon = object('moon-lantern');
    const sunIndex = config.plates.findIndex((p) => p.id === sun.id);
    blocks[0].entity.setPosition(sun.x, 0, sun.z);
    const player = { x: sun.x, z: sun.z + 1.3 };
    assert.equal(plates[sunIndex].base.render.meshInstances[0].material, materials.disabled);
    assert.equal(puzzle.interact(player), true);
    assert.equal(puzzle.update(player).clicked.length, 0);
    assert.equal(puzzle.grabbed, true);
    assert.equal(puzzle.diagnostics()[0].locked, false);
    blocks[1].entity.setPosition(moon.x, 0, moon.z);
    puzzle.update(player);
    puzzle.update(player);
    assert.equal(puzzle.grabbed, false);
    assert.ok(puzzle.diagnostics().every((b) => b.locked));
    assert.equal(sun.requiresPlate, moon.id);
    assert.equal(sun.showDependency, true);
    puzzle.reset();
    assert.equal(plates[sunIndex].base.render.meshInstances[0].material, materials.disabled);
});

test('removing outside moon pressure requires an inside sun handoff before a permanent moon match', () => {
    const east = object('east-gate');
    const state = emptySnapshot();
    const open = () => evaluateCondition(east.openWhen, state);
    state.plateActive.add('east-moon-plate');
    assert.equal(open(), true);
    state.plateActive.delete('east-moon-plate');
    assert.equal(open(), false);
    state.plateActive.add('east-sun-plate');
    assert.equal(open(), true);
    state.plateActive.add('moon-lantern');
    state.plateActive.delete('east-sun-plate');
    assert.equal(open(), true);
});
