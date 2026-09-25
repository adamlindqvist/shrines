import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { Entity } from 'playcanvas';

registerHooks({
    resolve(s, c, next) {
        return next(s.startsWith('.') && !/\.[a-z]+$/.test(s) ? `${s}.ts` : s, c);
    }
});
const { evaluateCondition, LevelRules } = await import('../src/gameplay/rules.ts');
const { BridgeController, PortalController, ZoneTracker } = await import('../src/gameplay/level-objects.ts');
const { Collision } = await import('../src/gameplay/collision.ts');
const { validateLevel } = await import('../src/levels/validate.ts');
const { levelDefinitions, sceneDefinitions } = await import('../src/levels/index.ts');
const { buildDefinition } = await import('../src/scenes/build-definition.ts');
const { DEFAULT_HUD, DEFAULT_LIGHTING, DEFAULT_TEXT } = await import('../src/levels/defaults.ts');
const empty = () => ({
    plateActive: new Set(),
    enemyDefeated: new Set(),
    portalReached: new Set(),
    zoneVisited: new Set()
});
const zone = { type: 'zoneVisited', target: 'exit' };
// A standalone box → plate → bridge → portal fixture, independent of the registered levels, to
// exercise validation and rules without coupling these tests to any one adventure area's layout.
const fixtureScene = {
    id: 'bridge-fixture',
    name: 'Bridge fixture',
    seed: 401,
    terrain: {
        kind: 'river',
        land: [{ minX: -12, maxX: 12, minZ: -11, maxZ: 11, radius: 2 }],
        water: [{ minX: -14, maxX: 14, minZ: -2, maxZ: 2, radius: 0.5 }],
        islets: [],
        blend: 0.8,
        wallHeight: 2.4,
        waterLevel: -1.8,
        clearings: []
    },
    backdrop: { size: 40 },
    spawn: { x: 0, z: 8 },
    walkBounds: { minX: -10, maxX: 10, minZ: -9, maxZ: 9 },
    blockBounds: { minX: -9, maxX: 9, minZ: -8, maxZ: 8 },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 19.2],
            target: [0, 0, 0.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.78, 0.89, 0.81]
        }
    },
    scenery: [
        { type: 'tree', x: -9, z: 7, scale: 1.2 },
        { type: 'tree', x: 9, z: -8, scale: 1.2 },
        { type: 'rock', x: -9, z: -8, scale: 1.5 },
        { type: 'bushCluster', x: 8, z: 7, count: 4, scale: 0.5 }
    ],
    objects: [
        { type: 'block', id: 'box', symbol: 'sun', x: 0, z: 6 },
        { type: 'plate', id: 'plate', symbol: 'sun', x: 0, z: 3.8 },
        { type: 'bridge', id: 'bridge', x: 4, z: 0, length: 7, state: 'closed' },
        { type: 'portal', id: 'portal', x: 4, z: -7, rotation: 0, locked: false }
    ]
};
const fixtureLevel = {
    id: 'bridge-fixture',
    scene: 'bridge-fixture',
    hud: DEFAULT_HUD,
    text: { ...DEFAULT_TEXT, matched: 'Klick! Solen lyser.' },
    rules: [
        {
            id: 'raise-bridge',
            when: { type: 'plateActive', target: 'plate' },
            actions: [{ type: 'openBridge', target: 'bridge' }],
            message: 'Bron vaknar! Nu kan du gå över.'
        }
    ],
    completion: { type: 'portalReached', target: 'portal' }
};
const base = () => structuredClone({ level: fixtureLevel, scene: fixtureScene });

test('all registered levels are plain JSON data and validate', () => {
    for (const level of Object.values(levelDefinitions)) {
        const scene = sceneDefinitions[level.scene];
        assert.deepEqual(JSON.parse(JSON.stringify(scene)), scene);
        assert.deepEqual(JSON.parse(JSON.stringify(level)), level);
        assert.doesNotThrow(() => validateLevel(level, scene));
    }
});

test('nested all/any supports plates, enemies, portals and visited zones', () => {
    const state = empty();
    const condition = {
        type: 'all',
        conditions: [
            zone,
            {
                type: 'any',
                conditions: [
                    { type: 'plateActive', target: 'a' },
                    { type: 'enemyDefeated', target: 'b' }
                ]
            },
            { type: 'portalReached', target: 'c' }
        ]
    };
    state.zoneVisited.add('exit');
    state.portalReached.add('c');
    assert.equal(evaluateCondition(condition, state), false);
    state.enemyDefeated.add('b');
    assert.equal(evaluateCondition(condition, state), true);
    state.enemyDefeated.clear();
    state.plateActive.add('a');
    assert.equal(evaluateCondition(condition, state), true);
    state.portalReached.clear();
    assert.equal(evaluateCondition(condition, state), false);
});

test('rules fire once, in definition order, with multiple actions and reset', () => {
    const actions = [
        { type: 'openBridge', target: 'bridge' },
        { type: 'openPortal', target: 'c1' },
        { type: 'openPortal', target: 'c2' }
    ];
    const definition = {
        ...base().level,
        completion: zone,
        rules: [
            { id: 'a', when: zone, actions },
            { id: 'b', when: zone, actions: [] }
        ]
    };
    const rules = new LevelRules(definition);
    const state = empty();
    assert.deepEqual(rules.update(state), []);
    state.zoneVisited.add('exit');
    assert.deepEqual(
        rules.update(state).map((r) => r.id),
        ['a', 'b']
    );
    assert.equal(rules.complete, true);
    assert.deepEqual(rules.update(state), []);
    rules.reset();
    assert.equal(rules.complete, false);
    assert.equal(rules.update(state)[0].actions.length, 3);
});

test('same scene can use a different completion definition without boxes', () => {
    const { scene, level } = base();
    scene.objects = [
        { type: 'zone', id: 'exit', minX: -1, maxX: 1, minZ: -1, maxZ: 1, minY: -0.1, maxY: 0.1 },
        { type: 'slime', id: 'enemy', x: 5, z: 5 }
    ];
    level.rules = [];
    level.completion = zone;
    validateLevel(level, scene);
    const alternative = { ...level, id: 'battle', completion: { type: 'enemyDefeated', target: 'enemy' } };
    validateLevel(alternative, scene);
    const state = empty();
    state.zoneVisited.add('exit');
    const a = new LevelRules(level);
    const b = new LevelRules(alternative);
    a.update(state);
    b.update(state);
    assert.equal(a.complete, true);
    assert.equal(b.complete, false);
});

for (const [label, change, pattern] of [
    ['duplicate objects', ({ scene }) => scene.objects.push({ ...scene.objects[0] }), /id.*unique/],
    ['duplicate rules', ({ level }) => level.rules.push({ ...level.rules[0] }), /rules\[1\].id/],
    ['missing condition target', ({ level }) => (level.completion.target = 'missing'), /completion.*missing/],
    ['wrong action target', ({ level }) => (level.rules[0].actions[0].target = 'box'), /actions.*bridge/],
    ['empty all', ({ level }) => (level.completion = { type: 'all', conditions: [] }), /completion.*empty/],
    ['empty any', ({ level }) => (level.completion = { type: 'any', conditions: [] }), /completion.*empty/],
    ['invalid bounds', ({ scene }) => (scene.walkBounds.maxX = scene.walkBounds.minX), /walkBounds/],
    ['invalid bridge', ({ scene }) => (scene.objects.find((o) => o.type === 'bridge').length = -1), /length/],
    ['nonfinite value', ({ scene }) => (scene.spawn.x = NaN), /spawn.x/],
    ['executable data', ({ scene }) => (scene.callback = () => undefined), /JSON data/]
])
    test(`validation reports level and field for ${label}`, () => {
        const data = base();
        change(data);
        assert.throws(
            () => validateLevel(data.level, data.scene),
            (error) => /Level bridge-fixture:/.test(error.message) && pattern.test(error.message)
        );
    });

test('bridge blocks throughout raising, opens once, and resets visual and collision', () => {
    const definition = { type: 'bridge', id: 'bridge', x: 0, z: 0, length: 7, state: 'closed' };
    const blocker = { x: 0, z: 0, r: 1 };
    const visual = new Entity();
    const bridge = new BridgeController(definition, { visual, blockers: [blocker] });
    const collision = new Collision([blocker], { minX: -5, maxX: 5, minZ: -5, maxZ: 5 });
    assert.equal(collision.overlaps(0, 0, 0.4), true);
    assert.equal(visual.getLocalPosition().y, -2.4);
    bridge.open();
    bridge.update(0.4);
    assert.equal(bridge.state, 'opening');
    assert.equal(collision.overlaps(0, 0, 0.4), true);
    assert.ok(Math.abs(visual.getLocalPosition().y + 1.2) < 1e-6);
    bridge.open();
    bridge.update(0.4);
    assert.equal(bridge.state, 'open');
    assert.equal(collision.overlaps(0, 0, 0.4), false);
    assert.equal(visual.getLocalPosition().y, 0);
    assert.deepEqual(collision.resolve(0.1, 0), { x: 0.1, z: 0 });
    bridge.reset();
    assert.equal(bridge.state, 'closed');
    assert.equal(blocker.enabled, true);
});

test('portals open and reach independently, retain visits, and reset to authored locks', () => {
    const collision = new Collision([], { minX: -10, maxX: 10, minZ: -10, maxZ: 10 });
    const handles = () =>
        Object.fromEntries(['entity', 'sigil', 'runesDim', 'runesLit', 'gate', 'swirl'].map((k) => [k, new Entity()]));
    const portals = [true, false].map(
        (locked, i) => new PortalController({ type: 'portal', id: `c${i}`, x: i * 5, z: 0, locked }, handles())
    );
    portals[0].update(0.1, { x: 0, z: 0 }, collision);
    assert.equal(portals[0].reached, false);
    portals[0].open();
    portals[0].open();
    portals[0].update(1, { x: 0, z: 0 }, collision);
    portals[1].update(0.1, { x: 0, z: 0 }, collision);
    assert.equal(portals[0].reached, true);
    assert.equal(portals[1].reached, false);
    portals[0].update(0.1, { x: 5, z: 0 }, collision);
    portals[1].update(0.1, { x: 5, z: 0 }, collision);
    assert.ok(portals.every((c) => c.reached));
    portals.forEach((c) => c.reset());
    assert.deepEqual(
        portals.map((c) => c.unlocked),
        [false, true]
    );
    assert.ok(portals.every((c) => !c.reached));
});

test('zones require X/Z and height and remain visited until reset', () => {
    const tracker = new ZoneTracker([
        { type: 'zone', id: 'exit', minX: -1, maxX: 1, minZ: -1, maxZ: 1, minY: 1, maxY: 2 }
    ]);
    tracker.update({ x: 0, z: 0, y: 0 });
    assert.equal(tracker.visited.size, 0);
    tracker.update({ x: 2, z: 0, y: 1 });
    assert.equal(tracker.visited.size, 0);
    tracker.update({ x: 0, z: 0, y: 1 });
    assert.equal(tracker.visited.has('exit'), true);
    tracker.update({ x: 5, z: 5, y: 0 });
    assert.equal(tracker.visited.has('exit'), true);
    tracker.reset();
    assert.equal(tracker.visited.size, 0);
});

test('data interpreter preserves scenery, player and object construction order', () => {
    const { scene } = base();
    const calls = [];
    const builder = new Proxy(
        {},
        {
            get: (_, name) => (object) => {
                calls.push([name, object]);
                return {};
            }
        }
    );
    buildDefinition(builder, scene);
    assert.deepEqual(
        calls.map(([name]) => name),
        [
            'addTree',
            'addTree',
            'addRock',
            'addBushCluster',
            'addAdventurer',
            'addPushBlock',
            'addSunSwitch',
            'addBridge',
            'addPortal'
        ]
    );
    assert.equal(calls[6][1].rotation, 0);
    assert.equal(calls[7][1].dynamic, true);
});

test('invalid level fails before touching the application or allocating resources', async () => {
    const { createAdventureArea } = await import('../src/scenes/adventure-area.ts');
    const { scene, level } = base();
    level.completion.target = 'missing';
    assert.throws(() => createAdventureArea({}, scene, level), /Level bridge-fixture: completion/);
});

test('dynamic bridge footprint blocks every part of the passage for all actor radii', async () => {
    const { createBridgeBlockers } = await import('../src/gameplay/level-objects.ts');
    const { BRIDGE } = await import('../src/objects/shrine.ts');
    const blockers = createBridgeBlockers(4, -2, 7);
    const collision = new Collision(blockers, { minX: -20, maxX: 20, minZ: -20, maxZ: 20 });
    const controller = new BridgeController(
        { type: 'bridge', id: 'bridge', x: 4, z: -2, length: 7, state: 'closed' },
        { visual: new Entity(), blockers }
    );
    for (const radius of [0, 0.33, 0.4, 0.76]) {
        for (let x = 4 - BRIDGE.width / 2; x <= 4 + BRIDGE.width / 2; x += 0.1)
            for (let z = -5.5; z <= 1.5; z += 0.1) assert.equal(collision.overlaps(x, z, radius), true);
    }
    controller.open();
    controller.update(0.79);
    assert.equal(collision.overlaps(4, -2, 0.76), true);
    controller.update(0.01);
    assert.equal(collision.overlaps(4, -2, 0.76), false);
    controller.reset();
    assert.equal(collision.overlaps(4, -2, 0.76), true);
});
