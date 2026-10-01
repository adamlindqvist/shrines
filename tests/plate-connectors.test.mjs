import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
    resolve(s, c, next) {
        return next(s.startsWith('.') && !/\.[a-z]+$/.test(s) ? `${s}.ts` : s, c);
    }
});
const { PlateConnectorController } = await import('../src/gameplay/plate-connectors.ts');
const { buildDefinition } = await import('../src/scenes/build-definition.ts');
const { validateLevel } = await import('../src/levels/validate.ts');
const { scene, level } = await import('../src/levels/sun-gate.ts');
const { sceneDefinitions } = await import('../src/levels/index.ts');

function fixture() {
    const idle = {},
        lit = {};
    const chevrons = Array.from({ length: 3 }, () => ({ render: { meshInstances: [{ material: null }] } }));
    const controller = new PlateConnectorController('moon', { chevrons }, { idle, lit });
    return { controller, states: () => chevrons.map((c) => c.render.meshInstances[0].material === lit) };
}

test('connector waits, lights source to target over 0.45 seconds, then stays lit', () => {
    const { controller, states } = fixture();
    assert.deepEqual(states(), [false, false, false]);
    controller.update(10, false);
    assert.deepEqual(states(), [false, false, false]);
    controller.update(0.15, true);
    assert.deepEqual(states(), [true, false, false]);
    controller.update(0.15, true);
    assert.deepEqual(states(), [true, true, false]);
    controller.update(0.15, true);
    assert.deepEqual(states(), [true, true, true]);
    controller.update(30, true);
    assert.deepEqual(states(), [true, true, true]);
});

for (const fps of [30, 60, 120]) {
    test(`connector reset restarts the sequence at ${fps} FPS`, () => {
        const { controller, states } = fixture();
        for (let i = 0; i < Math.ceil(fps * 0.2); i++) controller.update(1 / fps, true);
        assert.deepEqual(states(), [true, false, false]);
        // No simulation advance while paused.
        controller.update(0, true);
        assert.deepEqual(states(), [true, false, false]);
        controller.reset();
        assert.deepEqual(states(), [false, false, false]);
        controller.update(0.1, true);
        assert.deepEqual(states(), [false, false, false]);
        for (let i = 0; i < Math.ceil(fps * 0.45); i++) controller.update(1 / fps, true);
        assert.deepEqual(states(), [true, true, true]);
        controller.reset();
        assert.deepEqual(states(), [false, false, false]);
    });
}

test('dependency visualization requires a boolean flag and a valid permanent prerequisite', () => {
    const change = (edit) => {
        const copy = structuredClone(scene);
        edit(copy.objects.find((o) => o.id === 'sun-portal-plate'));
        return () => validateLevel(level, copy);
    };
    assert.doesNotThrow(() => validateLevel(level, scene));
    assert.throws(
        change((p) => delete p.requiresPlate),
        /showDependency.*requiresPlate/
    );
    assert.throws(
        change((p) => {
            p.showDependency = 'yes';
        }),
        /showDependency.*boolean/
    );
    assert.throws(
        change((p) => {
            p.requiresPlate = 'missing';
        }),
        /requiresPlate/
    );
    assert.throws(
        change((p) => {
            p.requiresPlate = 'gate-plate';
        }),
        /permanent plate/
    );
});

test('only opted-in plates create connectors, after all authored objects exist', () => {
    for (const definition of Object.values(sceneDefinitions)) {
        const calls = [];
        const builder = new Proxy(
            {},
            {
                get:
                    (_, name) =>
                    (...args) => {
                        calls.push({ name, args });
                        return {};
                    }
            }
        );
        const cast = buildDefinition(builder, definition);
        if (definition.id !== 'sun-gate') {
            assert.equal(cast.plateConnectors.length, 0);
            continue;
        }
        assert.equal(cast.plateConnectors.length, 1);
        assert.equal(cast.plateConnectors[0].sourceId, 'portal-plate');
        const last = calls.at(-1);
        assert.equal(last.name, 'addPlateConnector');
        assert.deepEqual(
            last.args.map((p) => p.id),
            ['portal-plate', 'sun-portal-plate']
        );
    }
});
