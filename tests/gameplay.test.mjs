import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { Entity } from 'playcanvas';

// Node strips TypeScript; resolve the extensionless imports used by Vite too.
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
            return nextResolve(`${specifier}.ts`, context);
        }
        return nextResolve(specifier, context);
    }
});
const { BlockPuzzle, PUZZLE } = await import('../src/gameplay/puzzle.ts');
const { Collision } = await import('../src/gameplay/collision.ts');

function fixture() {
    const config = {
        blocks: [
            { symbol: 'sun', x: -3, z: 3 },
            { symbol: 'moon', x: 3, z: 3 }
        ],
        plates: [
            { symbol: 'moon', x: 3, z: -3 },
            { symbol: 'sun', x: -3, z: -3 }
        ],
        chest: { x: 0, z: -6 },
        blockBounds: { minX: -8, maxX: 8, minZ: -8, maxZ: 8 }
    };
    const blocks = config.blocks.map(() => ({
        entity: new Entity(),
        visual: new Entity(),
        available: new Entity(),
        selected: new Entity()
    }));
    const materialHandle = () => ({ render: { meshInstances: [{ material: null }] } });
    const plates = config.plates.map(() => ({ sunDisk: materialHandle(), base: materialHandle() }));
    const chest = { lid: new Entity() };
    const materials = { idle: {}, lit: {}, baseIdle: {} };
    const collision = new Collision([], { minX: -9, maxX: 9, minZ: -9, maxZ: 9 });
    const puzzle = new BlockPuzzle(config, blocks, plates, chest, collision, materials);
    puzzle.reset();
    return { puzzle, config, blocks, plates, chest, materials, collision };
}

for (const order of [
    [0, 1],
    [1, 0]
]) {
    test(`both symbols are required, in order ${order}`, () => {
        const { puzzle, blocks, config, plates, materials } = fixture();
        for (const [step, i] of order.entries()) {
            const target = config.plates.find((p) => p.symbol === config.blocks[i].symbol);
            blocks[i].entity.setPosition(target.x + 0.2, 0, target.z);
            const event = puzzle.update(0.035, { x: 0, z: 0 });
            assert.equal(event.clicked.length, 1);
            assert.equal(puzzle.matched, step + 1);
            assert.equal(puzzle.unlocked, step === 1);
            assert.equal(puzzle.interact({ x: target.x, z: target.z + 1.2 }), false);
            assert.equal(puzzle.update(0.035, { x: 0, z: 0 }).clicked.length, 0);
        }
        assert.equal(puzzle.update(0.035, config.chest).reached, true);
        assert.ok(plates.every((p) => p.base.render.meshInstances[0].material === materials.lit));
    });
}

test('matching symbols share plates one block at a time', () => {
    const { puzzle, blocks, config, plates, materials } = fixture();
    for (const b of config.blocks) b.symbol = 'sun';
    for (const p of config.plates) p.symbol = 'sun';
    puzzle.reset();
    puzzle.blocks.forEach((b) => (b.symbol = 'sun'));
    // The first block takes the second plate; the other block cannot reuse it.
    blocks[0].entity.setPosition(-3.2, 0, -3);
    assert.equal(puzzle.update(0.035, { x: 0, z: 0 }).clicked.length, 1);
    assert.deepEqual(puzzle.plateStates(), [false, true]);
    blocks[1].entity.setPosition(3.2, 0, -3);
    assert.equal(puzzle.update(0.035, { x: 0, z: 0 }).clicked.length, 1);
    assert.deepEqual(puzzle.plateStates(), [true, true]);
    assert.equal(puzzle.unlocked, true);
    assert.equal(plates[0].sunDisk.render.meshInstances[0].material, materials.lit);
    puzzle.reset();
    assert.deepEqual(puzzle.plateStates(), [false, false]);
});

test('wrong symbols never activate, and remain movable', () => {
    const { puzzle, blocks, config } = fixture();
    blocks[0].entity.setPosition(3, 0, -3);
    blocks[1].entity.setPosition(-3, 0, -3);
    assert.deepEqual(puzzle.update(0.035, config.chest), { clicked: [], reached: false });
    assert.equal(puzzle.matched, 0);
    assert.equal(puzzle.interact({ x: 3, z: -1.7 }), true);
    assert.equal(puzzle.diagnostics()[0].grabbed, true);
});

test('nearest block wins, ties are stable, and release does not grab another', () => {
    const { puzzle, blocks } = fixture();
    blocks[0].entity.setPosition(-1.5, 0, 0);
    blocks[1].entity.setPosition(1.5, 0, 0);
    puzzle.interact({ x: 0, z: 0 });
    assert.equal(puzzle.diagnostics()[0].grabbed, true);
    puzzle.interact({ x: 0.1, z: 0 });
    assert.equal(puzzle.grabbed, false);
    puzzle.interact({ x: 0.1, z: 0 });
    assert.equal(puzzle.diagnostics()[1].grabbed, true);
});

test('held block, player and damage shoves respect other blocks', () => {
    const { puzzle, blocks } = fixture();
    blocks[0].entity.setPosition(0, 0, 0);
    blocks[1].entity.setPosition(2, 0, 0);
    let player = { x: 0, z: 1.3 };
    puzzle.interact(player);
    for (let i = 0; i < 80; i++) player = puzzle.constrain({ x: player.x + 0.1, z: player.z }, player);
    assert.ok(blocks[0].entity.getPosition().x <= 2 - 2 * PUZZLE.blockRadius);
    puzzle.release();
    const from = { x: 2, z: 1.2 };
    assert.deepEqual(puzzle.resolvePlayer({ x: 2, z: 0.8 }, from), from);
});

test('walls constrain the held pair and snap cannot overlap another block', () => {
    const { puzzle, blocks, collision } = fixture();
    collision.obstacles.push({ x: -3, z: 0, r: 1 });
    let player = { x: -3, z: 4.3 };
    puzzle.interact(player);
    for (let i = 0; i < 100; i++) player = puzzle.constrain({ x: player.x, z: player.z - 0.1 }, player);
    assert.ok(blocks[0].entity.getPosition().z >= 1 + PUZZLE.blockRadius);
    blocks[0].entity.setPosition(-3, 0, -3);
    blocks[1].entity.setPosition(-2, 0, -3);
    assert.equal(puzzle.update(0.035, { x: 0, z: 0 }).clicked.length, 0);
});

test('reset clears lifted, held, matched and chest state', () => {
    const { puzzle, blocks, config, chest, plates, materials } = fixture();
    puzzle.interact({ x: -3, z: 4.3 });
    puzzle.updateLift(0.2);
    assert.ok(blocks[0].visual.getLocalPosition().y > 0);
    blocks[1].entity.setPosition(3, 0, -3);
    puzzle.update(0.2, { x: 0, z: 0 });
    puzzle.reset();
    assert.equal(puzzle.grabbed, false);
    assert.equal(puzzle.matched, 0);
    assert.equal(puzzle.unlocked, false);
    assert.equal(chest.lid.getLocalEulerAngles().x, 0);
    blocks.forEach((b, i) => {
        assert.equal(b.visual.getLocalPosition().y, 0);
        assert.equal(b.entity.getPosition().x, config.blocks[i].x);
        assert.equal(b.entity.getPosition().z, config.blocks[i].z);
        assert.equal(b.selected.enabled, false);
    });
    assert.ok(plates.every((p) => p.base.render.meshInstances[0].material === materials.baseIdle));
});

const { AdventureGame } = await import('../src/gameplay/adventure.ts');
const { Effects } = await import('../src/gameplay/effects.ts');
const { meadowArea } = await import('../src/scenes/meadow.ts');

/** Controller integration fixture: real input/movement/combat, stubbed DOM and particle rendering. */
function gameFixture(t, overrides = {}) {
    const noop = () => undefined;
    const oldWindow = globalThis.window;
    const oldDocument = globalThis.document;
    globalThis.window = new EventTarget();
    const created = [];
    const element = () =>
        Object.assign(new EventTarget(), {
            textContent: '',
            hidden: false,
            style: {},
            classList: { add: noop, remove: noop },
            remove: noop,
            appendChild: noop,
            insertBefore: noop,
            setAttribute: noop,
            setPointerCapture: noop,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
        });
    globalThis.document = {
        createElement: () => {
            const el = Object.assign(element(), { querySelector: () => element() });
            created.push(el);
            return el;
        },
        body: { appendChild: noop }
    };
    for (const name of ['burst', 'sand', 'arc']) t.mock.method(Effects.prototype, name, noop);
    t.mock.method(console, 'info', noop);
    const { config, blocks, plates, chest } = fixture();
    const player = Object.fromEntries(
        ['entity', 'visual', 'leftBoot', 'rightBoot', 'swordPivot'].map((k) => [k, new Entity()])
    );
    const slime = { entity: new Entity(), body: new Entity() };
    slime.entity.setPosition(8, 0, 8);
    const canvas = Object.assign(new EventTarget(), { width: 800, height: 600 });
    const game = new AdventureGame({
        context: { canvas, app: { stats: { drawCalls: { total: 0 } } } },
        root: new Entity(),
        rand: () => 0.5,
        palette: {},
        layout: { obstacles: [], animate: noop },
        rig: { camera: new Entity(), sun: new Entity(), follow: noop, reset: noop },
        cast: { player, blocks, plates, chest, slimes: [slime] },
        config: {
            ...meadowArea.game,
            spawn: { x: -3, z: 4.3 },
            puzzle: config,
            walkBounds: { minX: -9, maxX: 9, minZ: -9, maxZ: 9 }
        },
        ...overrides
    });
    const key = (type, code) =>
        globalThis.window.dispatchEvent(Object.assign(new Event(type), { code, repeat: false }));
    const tap = (code) => {
        key('keydown', code);
        key('keyup', code);
    };
    const tick = (frames = 1) => {
        for (let i = 0; i < frames; i++) game.update(1 / 60);
    };
    t.after(() => {
        game.destroy();
        globalThis.window = oldWindow;
        globalThis.document = oldDocument;
    });
    const touch = (className, type, clientX = 50, clientY = 50) =>
        created
            .find((el) => el.className === className)
            .dispatchEvent(Object.assign(new Event(type), { pointerId: 1, clientX, clientY }));
    return { game, key, tap, tick, touch, blocks, player, canvas };
}

test('held input moves the pair; pause and blur freeze it, release settles it', (t) => {
    const { game, key, tap, tick, blocks } = gameFixture(t, { initialHealth: 2 });
    assert.equal(game.health, 2);
    tap('Space');
    assert.equal(game.diagnostics().grabbed, true);
    key('keydown', 'KeyW');
    tick(30);
    key('keyup', 'KeyW');
    assert.ok(blocks[0].entity.getPosition().z < 2);
    tap('Escape');
    const before = game.diagnostics();
    const lift = blocks[0].visual.getLocalPosition().y;
    tick(90);
    assert.equal(game.diagnostics().elapsed, before.elapsed);
    assert.equal(blocks[0].visual.getLocalPosition().y, lift);
    assert.equal(game.diagnostics().grabbed, true);
    tap('Escape');
    tap('Space');
    tick(60);
    assert.equal(blocks[0].visual.getLocalPosition().y, 0);
    key('keydown', 'KeyD');
    globalThis.window.dispatchEvent(new Event('blur'));
    const pausedX = game.diagnostics().player.x;
    tick(60);
    assert.equal(game.state, 'paused');
    assert.equal(game.diagnostics().player.x, pausedX);
    tap('Escape');
    tick(60);
    assert.equal(game.diagnostics().player.x, pausedX);
});

test('touch stick steers, releases on pause, and the attack button grabs', (t) => {
    const { game, tick, touch } = gameFixture(t);
    const start = game.diagnostics().player;
    // Stick centre is (50, 50) with a 27.5px reach; push down and right (the block sits above spawn).
    touch('touch-stick', 'pointerdown', 70, 70);
    tick(30);
    const moved = game.diagnostics().player;
    assert.ok(moved.x > start.x + 0.5);
    assert.ok(moved.z > start.z + 0.5);
    touch('touch-stick', 'pointerup');
    tick(30);
    const stopped = game.diagnostics().player;
    tick(30);
    const after = game.diagnostics().player;
    assert.ok(Math.hypot(after.x - stopped.x, after.z - stopped.z) < 0.01);

    touch('touch-stick', 'pointerdown', 50, 20);
    globalThis.window.dispatchEvent(new Event('blur'));
    assert.equal(game.state, 'paused');
    touch('touch-stick', 'pointermove', 50, 0);
    touch('touch-attack', 'pointerdown');
    assert.equal(game.state, 'playing');
    const resumed = game.diagnostics().player;
    tick(30);
    const idle = game.diagnostics().player;
    assert.ok(Math.hypot(idle.x - resumed.x, idle.z - resumed.z) < 0.01);

    game.reset();
    touch('touch-attack', 'pointerdown');
    assert.equal(game.diagnostics().grabbed, true);
    touch('touch-attack', 'pointerdown');
    assert.equal(game.diagnostics().grabbed, false);
});

test('completion reports surviving hearts once, without a victory state', (t) => {
    const completed = [];
    const { game, blocks, player, tick } = gameFixture(t, {
        initialHealth: 2,
        onComplete: (health) => completed.push(health)
    });
    blocks[0].entity.setPosition(-3, 0, -3);
    blocks[1].entity.setPosition(3, 0, -3);
    player.entity.setPosition(0, 0, -6);
    tick(60);
    assert.deepEqual(completed, [2]);
    assert.equal(game.state, 'complete');
});

test('final shrine wins and restart delegates to the journey', (t) => {
    let restarts = 0;
    const { game, blocks, player, tick, tap } = gameFixture(t, {
        onRestart: () => {
            restarts++;
        }
    });
    blocks[0].entity.setPosition(-3, 0, -3);
    blocks[1].entity.setPosition(3, 0, -3);
    player.entity.setPosition(0, 0, -6);
    tick();
    assert.equal(game.state, 'won');
    tap('KeyR');
    assert.equal(restarts, 1);
});

test('a lethal strike wins over reaching the chest in the same frame', (t) => {
    let completed = false;
    const { game, blocks, player, tick } = gameFixture(t, {
        initialHealth: 1,
        onComplete: () => {
            completed = true;
        }
    });
    blocks[0].entity.setPosition(-3, 0, -3);
    blocks[1].entity.setPosition(3, 0, -3);
    player.entity.setPosition(0, 0, -6);
    // Arrange a pending strike exactly as the player reaches the reward.
    const enemy = game.slimes.slimes[0];
    enemy.x = 0;
    enemy.z = -5.5;
    enemy.windup = 0.01;
    tick();
    assert.equal(game.state, 'over');
    assert.equal(game.health, 0);
    assert.equal(completed, false);
    assert.equal(game.diagnostics().unlocked, false);
});
