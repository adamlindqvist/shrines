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
const { PUZZLE } = await import('../src/gameplay/puzzle.ts');
const { GATE } = await import('../src/objects/gate.ts');
const { POT_RADIUS, LOG_RADIUS, SIGNPOST_RADIUS } = await import('../src/objects/props.ts');
const { NATURE_COLLISION } = await import('../src/rendering/nature-tuning.ts');

function groveFixture() {
    const def = scene.objects.find((o) => o.type === 'gate');
    const blockers = createGateBlockers(def);
    const obstacles = scene.scenery.flatMap((o) => {
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
    const posts = [-1, 1].map((side) => ({
        x: def.x + (side * (def.width + GATE.postSize)) / 2,
        z: def.z,
        r: GATE.postSize / 2
    }));
    const collision = new Collision([...obstacles, ...posts, ...blockers], scene.walkBounds);
    return { def, collision, gate: new GateController(def, { panel: new Entity(), blockers }) };
}

test('Lantern Lake grove cannot be bypassed and admits the player and carried sun when open', () => {
    const { def, collision, gate } = groveFixture();
    const sun = scene.objects.find((o) => o.id === 'grove-box');
    const plate = scene.objects.find((o) => o.id === 'grove-plate');
    // Ignore river cliffs here: even with all surrounding terrain walkable, the rim must seal.
    const reachable = () => {
        const queue = [[plate.x, plate.z]];
        const seen = new Set();
        const step = 0.25;
        for (let i = 0; i < queue.length; i++) {
            const [x, z] = queue[i];
            if (Math.hypot(x - sun.x, z - sun.z) < 0.5) return true;
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
                    collision.overlaps(nx, nz, PLAYER.radius)
                )
                    continue;
                seen.add(key);
                queue.push([nx, nz]);
            }
        }
        return false;
    };
    assert.equal(reachable(), false, 'the closed grove has no alternate entrance');
    gate.update(GATE_MOTION.duration, true, []);
    assert.equal(reachable(), true);
    // Carry the moon north from the shore with the player following behind it.
    for (let z = 0; z >= plate.z; z -= 0.05) {
        assert.equal(collision.overlaps(plate.x, z, PUZZLE.blockRadius), false, `moon approach at ${z}`);
        assert.equal(collision.overlaps(plate.x, z + 1.3, PLAYER.radius), false, `moon carrier at ${z}`);
    }
    // The moon stays west of the central carrying lane; it must not become a new obstacle there.
    const moon = new Collision([{ x: plate.x, z: plate.z, r: PUZZLE.blockRadius }], scene.walkBounds);
    for (let z = sun.z; z <= plate.z + 2; z += 0.05) {
        assert.equal(collision.overlaps(def.x, z, PLAYER.radius), false, `entry at ${z}`);
        assert.equal(collision.overlaps(def.x, z, PUZZLE.blockRadius), false, `sun exit at ${z}`);
        assert.equal(collision.overlaps(def.x, z + 1.3, PLAYER.radius), false, `carrier at ${z}`);
        assert.equal(moon.overlaps(def.x, z, PUZZLE.blockRadius), false, `sun passes moon at ${z}`);
        assert.equal(moon.overlaps(def.x, z + 1.3, PLAYER.radius), false, `carrier passes moon at ${z}`);
    }
    gate.reset();
    assert.equal(reachable(), false, 'restart restores the sealed grove');
});

test('Lantern Lake moon can release the grove after both lanterns without losing bridge or portal progress', () => {
    const { def } = groveFixture();
    const rules = new LevelRules(level);
    const state = {
        plateActive: new Set(),
        enemyDefeated: new Set(),
        portalReached: new Set(),
        zoneVisited: new Set()
    };
    const actions = () => rules.update(state).flatMap((r) => r.actions);
    state.plateActive.add('west-lantern');
    assert.deepEqual(actions(), [{ type: 'activatePlatform', target: 'bay-stone' }]);
    state.plateActive.add('grove-plate');
    assert.equal(evaluateCondition(def.openWhen, state), true);
    assert.deepEqual(actions(), [], 'temporary moon pressure cannot open the bridge or portal');
    state.plateActive.add('east-lantern');
    assert.deepEqual(actions(), [{ type: 'openBridge', target: 'lake-bridge' }]);
    state.plateActive.delete('grove-plate');
    assert.equal(evaluateCondition(def.openWhen, state), false);
    assert.deepEqual(actions(), []);
    state.plateActive.add('shrine-plate');
    assert.deepEqual(actions(), [{ type: 'openPortal', target: 'portal' }]);
    rules.reset();
    assert.deepEqual(rules.diagnostics().activatedRules, []);
});
