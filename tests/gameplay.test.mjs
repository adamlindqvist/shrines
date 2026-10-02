import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { Entity } from 'playcanvas';

import { stubSmokeRenderer } from './smoke-renderer.mjs';

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
const { PLAYER } = await import('../src/gameplay/player.ts');

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
        portal: { x: 0, z: -6 },
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
    // Detached entities always report `enabled === false`; mount the portal under a live root.
    const stage = new Entity();
    stage._enabledInHierarchy = true;
    const portal = Object.fromEntries(
        ['entity', 'sigil', 'runesDim', 'runesLit', 'gate', 'glow', 'swirl'].map((k) => {
            const e = new Entity();
            stage.addChild(e);
            return [k, e];
        })
    );
    const materials = { idle: {}, lit: {}, baseIdle: {} };
    const collision = new Collision([], { minX: -9, maxX: 9, minZ: -9, maxZ: 9 });
    const puzzle = new BlockPuzzle(config, blocks, plates, collision, materials);
    puzzle.reset();
    return { puzzle, config, blocks, plates, portal, materials, collision };
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
            const event = puzzle.update({ x: 0, z: 0 });
            assert.equal(event.clicked.length, 1);
            assert.equal(puzzle.matched, step + 1);
            assert.equal(puzzle.plateStates().every(Boolean), step === 1);
            assert.equal(puzzle.interact({ x: target.x, z: target.z + 1.2 }), false);
            assert.equal(puzzle.update({ x: 0, z: 0 }).clicked.length, 0);
        }
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
    assert.equal(puzzle.update({ x: 0, z: 0 }).clicked.length, 1);
    assert.deepEqual(puzzle.plateStates(), [false, true]);
    blocks[1].entity.setPosition(3.2, 0, -3);
    assert.equal(puzzle.update({ x: 0, z: 0 }).clicked.length, 1);
    assert.deepEqual(puzzle.plateStates(), [true, true]);
    assert.equal(puzzle.plateStates().every(Boolean), true);
    assert.equal(plates[0].sunDisk.render.meshInstances[0].material, materials.lit);
    puzzle.reset();
    assert.deepEqual(puzzle.plateStates(), [false, false]);
});

test('wrong symbols never activate, and remain movable', () => {
    const { puzzle, blocks, config } = fixture();
    blocks[0].entity.setPosition(3, 0, -3);
    blocks[1].entity.setPosition(-3, 0, -3);
    assert.deepEqual(puzzle.update(config.portal), { clicked: [] });
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
    for (let i = 0; i < 80; i++) player = translate(puzzle, { x: player.x + 0.1, z: player.z }, player);
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
    for (let i = 0; i < 100; i++) player = translate(puzzle, { x: player.x, z: player.z - 0.1 }, player);
    assert.ok(blocks[0].entity.getPosition().z >= 1 + PUZZLE.blockRadius);
    blocks[0].entity.setPosition(-3, 0, -3);
    blocks[1].entity.setPosition(-2, 0, -3);
    assert.equal(puzzle.update({ x: 0, z: 0 }).clicked.length, 0);
});

function translate(puzzle, stride, player) {
    return puzzle.constrain(stride, player);
}

function assertGrabDistance(puzzle, player, distance) {
    const block = puzzle.heldPosition;
    assert.ok(block, 'grip remains active');
    assert.ok(Math.abs(Math.hypot(player.x - block.x, player.z - block.z) - distance) < 0.00001);
}

function assertOffset(puzzle, player, offset) {
    const block = puzzle.heldPosition;
    assert.ok(Math.abs(block.x - player.x - offset.x) < 1e-6);
    assert.ok(Math.abs(block.z - player.z - offset.z) < 1e-6);
}

test('radial input pushes and pulls at the held speed without changing distance', () => {
    const { puzzle, blocks } = fixture();
    let player = { x: -3, z: 4.3 };
    puzzle.interact(player);
    player = translate(puzzle, { x: player.x, z: player.z - 1 }, player);
    assert.ok(Math.abs(blocks[0].entity.getPosition().z - (3 - PUZZLE.moveRatio)) < 0.00001);
    assertGrabDistance(puzzle, player, 1.3);
    player = translate(puzzle, { x: player.x, z: player.z + 1 }, player);
    assert.ok(Math.abs(blocks[0].entity.getPosition().z - 3) < 0.00001);
    assertGrabDistance(puzzle, player, 1.3);
});

for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4, (-Math.PI * 3) / 4]) {
    test(`held pair translates rigidly in direction ${angle}, including strafing`, () => {
        const { puzzle, blocks } = fixture();
        // The block sits to the player's right (+X); every direction keeps that offset.
        blocks[0].entity.setPosition(1.3, 0, 0);
        blocks[1].entity.setPosition(7, 0, 7);
        let player = { x: 0, z: 0 };
        puzzle.interact(player);
        for (let i = 0; i < 30; i++) {
            player = translate(
                puzzle,
                { x: player.x + Math.sin(angle) * 0.04, z: player.z + Math.cos(angle) * 0.04 },
                player
            );
            assertOffset(puzzle, player, { x: 1.3, z: 0 });
        }
        const travelled = 30 * 0.04 * PUZZLE.moveRatio;
        assert.ok(Math.abs(player.x - Math.sin(angle) * travelled) < 1e-6);
        assert.ok(Math.abs(player.z - Math.cos(angle) * travelled) < 1e-6);
    });
}

test('a stationary grab leaves the block where it is', () => {
    const { puzzle, blocks } = fixture();
    blocks[0].entity.setPosition(1.3, 0, 0);
    const player = { x: 0, z: 0 };
    puzzle.interact(player);
    for (let i = 0; i < 10; i++) assert.deepEqual(translate(puzzle, player, player), player);
    assertOffset(puzzle, player, { x: 1.3, z: 0 });
});

test('a blocked push stops the pair without orbiting, and pulling away still works', () => {
    const { puzzle, blocks, collision } = fixture();
    const block = blocks[0].entity;
    block.setPosition(0, 0, 0);
    collision.obstacles.push({ x: 0, z: -1.76, r: 1 });
    let player = { x: 0, z: 1.3 };
    puzzle.interact(player);
    // A long direct push must not tunnel through the rock.
    player = translate(puzzle, { x: 0, z: -6 }, player);
    assert.ok(Math.abs(player.z - 1.3) < 0.00001);
    assert.ok(Math.abs(block.getPosition().z) < 0.00001);
    // Sideways pressure strafes the pair along the rock instead of circling the block.
    for (let i = 0; i < 20; i++) {
        player = translate(puzzle, { x: player.x + 0.04, z: player.z - 0.02 }, player);
        assertOffset(puzzle, player, { x: 0, z: -1.3 });
        assert.equal(collision.overlaps(block.getPosition().x, block.getPosition().z, PUZZLE.blockRadius), false);
    }
    assert.ok(player.x > 0.5);
    const before = block.getPosition().z;
    player = translate(puzzle, { x: player.x, z: player.z + 0.3 }, player);
    assert.ok(block.getPosition().z - before > 0.2);
    assertOffset(puzzle, player, { x: 0, z: -1.3 });
});

test('a diagonal push into a wall slides along it', () => {
    const { puzzle, blocks, config } = fixture();
    blocks[0].entity.setPosition(0, 0, 0);
    config.blockBounds.minZ = 0;
    let player = { x: 0, z: 1.3 };
    puzzle.interact(player);
    for (let i = 0; i < 20; i++) player = translate(puzzle, { x: player.x + 0.05, z: player.z - 0.05 }, player);
    assert.ok(Math.abs(blocks[0].entity.getPosition().z) < 1e-6);
    assert.ok(blocks[0].entity.getPosition().x > 0.8);
    assertOffset(puzzle, player, { x: 0, z: -1.3 });
});

test('a pinned block stops the pair in every direction', () => {
    const { puzzle, blocks, config } = fixture();
    blocks[0].entity.setPosition(0, 0, 0);
    Object.assign(config.blockBounds, { minX: 0, maxX: 0, minZ: 0, maxZ: 0 });
    const start = { x: 0, z: 1.3 };
    puzzle.interact(start);
    for (const [x, z] of [
        [0.1, 0],
        [-0.1, 0],
        [0, 0.1],
        [0, -0.1]
    ]) {
        assert.deepEqual(translate(puzzle, { x: start.x + x, z: start.z + z }, start), start);
    }
    assert.equal(blocks[0].entity.getPosition().length(), 0);
});

test('a player-only collision stops the pair', () => {
    const { puzzle, blocks, collision } = fixture();
    blocks[0].entity.setPosition(0, 0, 0);
    collision.obstacles.push({ x: 0.8, z: 1.3, r: 0.2 });
    let player = { x: 0, z: 1.3 };
    puzzle.interact(player);
    player = translate(puzzle, { x: 1, z: 1.3 }, player);
    const block = blocks[0].entity.getPosition();
    assert.ok(player.x > 0.26 && player.x <= 0.27);
    assert.ok(Math.abs(player.x - block.x) < 0.00001);
    assert.ok(Math.abs(player.z - block.z - 1.3) < 0.00001);
});

test('release at a square corner allows escape, regrab captures new distance, reset clears it', () => {
    const { puzzle, blocks } = fixture();
    blocks[0].entity.setPosition(0, 0, 0);
    let player = { x: 0, z: 1.3 };
    puzzle.interact(player);
    player = translate(puzzle, { x: 1, z: 1.3 }, player);
    puzzle.release();
    // A valid released position in the circular clearance but inside the square margin.
    player = { x: 0.95, z: 0.95 };
    blocks[0].entity.setPosition(0, 0, 0);
    assert.deepEqual(puzzle.resolvePlayer({ x: 0.9, z: 0.9 }, player), player);
    const escaped = puzzle.resolvePlayer({ x: 1, z: 1 }, player);
    assert.deepEqual(escaped, { x: 1, z: 1 });
    puzzle.interact(escaped);
    player = translate(puzzle, { x: 1.03, z: 0.97 }, escaped);
    assertGrabDistance(puzzle, player, Math.SQRT2);
    puzzle.reset();
    assert.equal(puzzle.grabbed, false);
    player = { x: -3, z: 4.5 };
    puzzle.interact(player);
    player = translate(puzzle, { x: -2.97, z: 4.5 }, player);
    assertGrabDistance(puzzle, player, 1.5);
});

test('reset clears lifted, held and matched state', () => {
    const { puzzle, blocks, config, plates, materials } = fixture();
    puzzle.interact({ x: -3, z: 4.3 });
    puzzle.updateLift(0.2);
    assert.ok(blocks[0].visual.getLocalPosition().y > 0);
    blocks[1].entity.setPosition(3, 0, -3);
    puzzle.update({ x: 0, z: 0 });
    puzzle.reset();
    assert.equal(puzzle.grabbed, false);
    assert.equal(puzzle.matched, 0);
    assert.equal(puzzle.plateStates().every(Boolean), false);
    blocks.forEach((b, i) => {
        assert.equal(b.visual.getLocalPosition().y, 0);
        assert.equal(b.entity.getPosition().x, config.blocks[i].x);
        assert.equal(b.entity.getPosition().z, config.blocks[i].z);
        assert.equal(b.selected.enabled, false);
    });
    assert.ok(plates.every((p) => p.base.render.meshInstances[0].material === materials.baseIdle));
});

const { AdventureGame } = await import('../src/gameplay/adventure.ts');
const { PlateConnectorController } = await import('../src/gameplay/plate-connectors.ts');
const { MovementTrail } = await import('../src/gameplay/movement-trail.ts');
const { Effects } = await import('../src/gameplay/effects.ts');
const { scene: meadowScene, level: meadowLevel } = await import('../src/levels/meadow.ts');
const { PortalController, PORTAL } = await import('../src/gameplay/level-objects.ts');

/** Controller integration fixture: real input/movement/combat, stubbed DOM and particle rendering. */
function gameFixture(t, overrides = {}) {
    const noop = () => undefined;
    const oldWindow = globalThis.window;
    const oldDocument = globalThis.document;
    globalThis.window = new EventTarget();
    const created = [];
    const element = () => {
        const queries = new Map();
        return Object.assign(new EventTarget(), {
            textContent: '',
            hidden: false,
            style: {},
            classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
            querySelector: (selector) => {
                if (!queries.has(selector)) queries.set(selector, element());
                return queries.get(selector);
            },
            remove: noop,
            appendChild: noop,
            append: noop,
            replaceChildren: noop,
            focus: noop,
            open: false,
            showModal() {
                this.open = true;
            },
            close() {
                this.open = false;
            },
            insertBefore: noop,
            setAttribute: noop,
            setPointerCapture: noop,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
        });
    };
    globalThis.document = {
        createElement: () => {
            const el = element();
            created.push(el);
            return el;
        },
        body: { appendChild: noop }
    };
    for (const name of ['burst', 'sand', 'arc', 'splash', 'block']) t.mock.method(Effects.prototype, name, noop);
    stubSmokeRenderer(t, MovementTrail);
    t.mock.method(console, 'info', noop);
    const { config, blocks, plates, portal } = fixture();
    const player = Object.fromEntries(
        ['entity', 'visual', 'torso', 'leftBoot', 'rightBoot', 'swordPivot', 'shieldPivot', 'shield', 'guard'].map(
            (k) => [k, new Entity()]
        )
    );
    player.rest = Object.values(player)
        .filter((entity) => entity !== player.entity)
        .map((entity) => ({
            entity,
            position: entity.getLocalPosition().clone(),
            rotation: entity.getLocalRotation().clone()
        }));
    const slime = { entity: new Entity(), body: new Entity() };
    slime.entity.setPosition(8, 0, 8);
    const canvas = Object.assign(new EventTarget(), { width: 800, height: 600, focus: noop });
    const game = new AdventureGame({
        context: { canvas, app: { stats: { drawCalls: { total: 0 } } } },
        root: new Entity(),
        rand: () => 0.5,
        palette: {},
        layout: { obstacles: [], animate: noop },
        rig: { camera: new Entity(), sun: new Entity(), follow: noop, reset: noop },
        cast: { player, blocks, plates, plateConnectors: [], portals: [portal], slimes: [slime], bridges: [] },
        scene: {
            ...meadowScene,
            scenery: [],
            objects: [
                ...config.blocks.map((b, i) => ({ ...b, type: 'block', id: `block-${i + 1}` })),
                ...config.plates.map((b, i) => ({ ...b, type: 'plate', id: `plate-${i + 1}` })),
                { ...config.portal, type: 'portal', id: 'portal', locked: true },
                { type: 'slime', id: 'enemy', x: 8, z: 8 }
            ],
            spawn: { x: -3, z: 4.3 },
            blockBounds: config.blockBounds,
            walkBounds: { minX: -9, maxX: 9, minZ: -9, maxZ: 9 }
        },
        level: {
            ...meadowLevel,
            rules: [
                {
                    id: 'unlock',
                    when: {
                        type: 'all',
                        conditions: [1, 2].map((i) => ({ type: 'plateActive', target: `plate-${i}` }))
                    },
                    actions: [{ type: 'openPortal', target: 'portal' }]
                }
            ]
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
    return { game, key, tap, tick, touch, blocks, player, canvas, slime, hud: created.find((el) => el.id === 'hud') };
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
    assert.ok(before.movementSmoke > 0);
    const lift = blocks[0].visual.getLocalPosition().y;
    tick(90);
    assert.equal(game.diagnostics().elapsed, before.elapsed);
    assert.equal(game.diagnostics().movementSmoke, before.movementSmoke);
    assert.equal(blocks[0].visual.getLocalPosition().y, lift);
    assert.equal(game.diagnostics().grabbed, true);
    tap('Escape');
    tap('Space');
    tick(60);
    assert.equal(blocks[0].visual.getLocalPosition().y, 0);
    assert.equal(game.diagnostics().movementSmoke, 0);
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

test('title splash holds the area frozen until a key starts play', (t) => {
    const title = { eyebrow: '', title: 'Shrines', copy: '', start: 'Start', hint: '', touchHint: '' };
    const { game, tap, key, tick, canvas } = gameFixture(t, { title });
    assert.equal(game.state, 'title');
    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { button: 0 }));
    tap('Escape');
    tap('Tab');
    tap('ShiftLeft');
    tick(30);
    assert.equal(game.state, 'title');
    assert.equal(game.diagnostics().elapsed, 0);
    tap('Space');
    assert.equal(game.state, 'playing');
    assert.equal(game.diagnostics().grabbed, false);
    const start = game.diagnostics().player;
    key('keydown', 'KeyD');
    tick(30);
    assert.ok(game.diagnostics().player.x > start.x + 0.5);
    game.reset();
    assert.equal(game.state, 'playing');
});

test('level menu freezes movement, action poses and effects, ignores gameplay keys, and clears held input', (t) => {
    const selected = [];
    const levels = [
        { id: 'meadow', name: 'Meadow', unlocked: true, completed: false, current: true, checkpoint: true }
    ];
    const { game, key, tap, tick, canvas, hud } = gameFixture(t, {
        levelMenu: { choices: () => levels, select: (id) => selected.push(id) }
    });
    let effectsUpdated = 0;
    t.mock.method(Effects.prototype, 'update', () => effectsUpdated++);
    key('keydown', 'KeyD');
    tick(5);
    hud.querySelector('#levels-button').onclick();
    const frozen = game.diagnostics();
    const effectCount = effectsUpdated;
    assert.equal(game.state, 'levels');
    assert.equal(hud.querySelector('#level-menu').open, true);
    tap('Space');
    tap('KeyR');
    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { button: 0 }));
    tick(60);
    assert.equal(game.state, 'levels');
    assert.deepEqual(game.diagnostics().player, frozen.player);
    assert.equal(game.diagnostics().elapsed, frozen.elapsed);
    assert.equal(effectsUpdated, effectCount);
    assert.equal(game.diagnostics().grabbed, false);
    assert.deepEqual(selected, []);
    tap('Escape');
    assert.equal(game.state, 'playing');
    assert.equal(hud.querySelector('#level-menu').open, false);
    tick(60);
    const settled = game.diagnostics().player;
    tick(60);
    assert.ok(Math.abs(game.diagnostics().player.x - settled.x) < 0.001, 'held movement was cleared');
});

test('closing the level menu restores title, pause and end states; reset closes it', (t) => {
    const title = { eyebrow: '', title: 'Shrines', copy: '', start: 'Start', hint: '', touchHint: '' };
    const { game, hud, tap } = gameFixture(t, {
        title,
        levelMenu: { choices: () => [], select: () => undefined }
    });
    assert.equal(hud.querySelector('#levels-button').hidden, true, 'title only exposes its own selector button');
    const button = hud.querySelector('#title-levels');
    button.closest = () => button;
    button.click = () => button.onclick();
    const enter = (repeat = false) => {
        const event = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Enter', repeat });
        Object.defineProperty(event, 'target', { value: button });
        hud.dispatchEvent(event);
        assert.equal(event.defaultPrevented, true);
    };
    enter(true);
    assert.equal(game.state, 'title');
    enter();
    assert.equal(game.state, 'levels');
    const dialog = hud.querySelector('#level-menu');
    const cancel = new Event('cancel', { cancelable: true });
    dialog.oncancel(cancel);
    assert.equal(cancel.defaultPrevented, true);
    assert.equal(game.state, 'title');
    tap('Space');
    assert.equal(hud.querySelector('#levels-button').hidden, false);
    game.pause();
    game.openLevels();
    dialog.querySelector('#close-levels').onclick();
    assert.equal(game.state, 'paused');
    for (const endState of ['won', 'over']) {
        game.state = endState;
        hud.querySelector('#end-levels').onclick();
        game.closeLevels();
        assert.equal(game.state, endState);
    }
    game.openLevels();
    game.reset();
    assert.equal(game.state, 'playing');
    assert.equal(dialog.open, false);
    game.closeLevels();
    assert.equal(game.state, 'playing');
});

test('canvas touch does not interact or resume; mouse clicks and the touch button still interact', (t) => {
    const { game, canvas, touch } = gameFixture(t);
    const pressCanvas = (pointerType) => {
        const event = Object.assign(new Event('pointerdown', { cancelable: true }), { pointerType, button: 0 });
        canvas.dispatchEvent(event);
        assert.equal(event.defaultPrevented, true);
    };
    pressCanvas('touch');
    assert.equal(game.diagnostics().grabbed, false);
    touch('touch-attack', 'pointerdown');
    assert.equal(game.diagnostics().grabbed, true);
    pressCanvas('touch');
    assert.equal(game.diagnostics().grabbed, true);
    pressCanvas('mouse');
    assert.equal(game.diagnostics().grabbed, false);
    globalThis.window.dispatchEvent(new Event('blur'));
    pressCanvas('touch');
    assert.equal(game.state, 'paused');
    touch('touch-attack', 'pointerdown');
    assert.equal(game.state, 'playing');
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
    tick(Math.ceil(PORTAL.rise * 60) + 2);
    assert.deepEqual(completed, [2]);
    assert.equal(game.state, 'complete');
});

test('final shrine wins and restart delegates to the journey', (t) => {
    const restarts = [];
    let completed = 0;
    const { game, blocks, player, tick, tap } = gameFixture(t, {
        onLevelCompleted: () => completed++,
        onRestart: (after) => {
            restarts.push(after);
        }
    });
    blocks[0].entity.setPosition(-3, 0, -3);
    blocks[1].entity.setPosition(3, 0, -3);
    player.entity.setPosition(0, 0, -6);
    tick(Math.ceil(PORTAL.rise * 60) + 2);
    assert.equal(game.state, 'won');
    assert.equal(completed, 1);
    tick(60);
    assert.equal(completed, 1);
    tap('KeyR');
    assert.deepEqual(restarts, ['won']);
});

test('restarting after defeat asks the journey to retry the current area', (t) => {
    const restarts = [];
    const { game, player, key, tick, tap } = waterFixture(t, raft(), {
        initialHealth: 1,
        onRestart: (after) => restarts.push(after)
    });
    player.entity.setPosition(7, 0, 2.1);
    tick();
    key('keydown', 'KeyW');
    for (let i = 0; i < 30 && !game.diagnostics().splashing; i++) tick();
    key('keyup', 'KeyW');
    tick(Math.ceil(WATER.sinkTime * 60) + 1);
    assert.equal(game.state, 'over');
    tap('KeyR');
    assert.deepEqual(restarts, ['over']);
});

test('a lethal strike wins over reaching the portal in the same frame', (t) => {
    let completed = false;
    let saved = false;
    const { game, blocks, player, tick } = gameFixture(t, {
        initialHealth: 1,
        onLevelCompleted: () => {
            saved = true;
        },
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
    assert.equal(saved, false);
    assert.equal(game.health, 0);
    assert.equal(completed, false);
    assert.equal(game.diagnostics().unlocked, false);
});

test('stairs support ascent and descent but reject cliffs and crossing a raised obstacle', () => {
    const surfaces = [
        { minX: -2, maxX: 2, minZ: 0, maxZ: 0.3, height: 0.1 },
        { minX: -2, maxX: 2, minZ: 0.3, maxZ: 0.6, height: 0.2 },
        { minX: -2, maxX: 2, minZ: 0.6, maxZ: 0.9, height: 0.3 },
        { minX: -2, maxX: 2, minZ: 0.9, maxZ: 3, height: 0.45 }
    ];
    const collision = new Collision([], { minX: -9, maxX: 9, minZ: -9, maxZ: 9 }, surfaces);
    const bottom = { x: 0, z: -0.1 },
        top = { x: 0, z: 1.5 };
    assert.equal(collision.canTravel(bottom, top), true);
    assert.equal(collision.canTravel(top, bottom), true);
    assert.equal(collision.heightAt(0, 1.5), 0.45);
    assert.equal(collision.heightAt(4, 1.5), 0);
    assert.equal(collision.canTravel({ x: 3, z: 1.5 }, top), false);
    assert.equal(collision.canTravel(top, { x: 3, z: 1.5 }), false);
    assert.equal(collision.canTravel({ x: -3, z: 1.5 }, { x: 3, z: 1.5 }), false);
});

test('carried blocks follow stairs, settle at elevation and reset to their starting floor', () => {
    const { puzzle, blocks, collision } = fixture();
    collision.surfaces.push(
        { minX: -5, maxX: -1, minZ: 1, maxZ: 2, height: 0.1 },
        { minX: -5, maxX: -1, minZ: -2, maxZ: 1, height: 0.2 }
    );
    let player = { x: -3, z: 4.3 };
    assert.equal(puzzle.interact(player), true);
    for (let i = 0; i < 70; i++) player = translate(puzzle, { x: player.x, z: player.z - 0.05 }, player);
    assert.ok(Math.abs(blocks[0].entity.getPosition().y - 0.2) < 1e-6);
    puzzle.release();
    for (let i = 0; i < 60; i++) puzzle.updateLift(1 / 60);
    assert.ok(Math.abs(blocks[0].entity.getPosition().y - 0.2) < 1e-6);
    puzzle.reset();
    assert.equal(blocks[0].entity.getPosition().y, 0);
});

test('an elevated portal requires standing on its floor once fully risen', () => {
    const { portal, collision } = fixture();
    const controller = new PortalController(
        { type: 'portal', id: 'portal', x: 0, z: -6, y: 0.45, locked: true },
        portal
    );
    collision.surfaces.push({ minX: -2, maxX: 2, minZ: -8, maxZ: -5.5, height: 0.45 });
    assert.equal(portal.gate.enabled, false);
    assert.equal(portal.runesDim.enabled, true);
    controller.update(PORTAL.rise, { x: 0, z: -6 }, collision);
    assert.equal(controller.progress, 0);
    controller.open();
    controller.update(0.035, { x: 0, z: -6 }, collision);
    assert.equal(portal.gate.enabled, true);
    assert.equal(portal.runesLit.enabled, true);
    assert.equal(controller.reached, false);
    for (let i = 0; i < 40; i++) controller.update(0.035, { x: 0, z: -5 }, collision);
    assert.equal(controller.progress, 1);
    assert.ok(Math.abs(portal.gate.getLocalScale().x - 1) < 1e-9);
    assert.ok(Math.abs(portal.gate.getLocalPosition().y) < 1e-9);
    assert.equal(controller.reached, false);
    controller.update(0.035, { x: 0, z: -5.8 }, collision);
    assert.equal(controller.reached, true);
    controller.reset();
    assert.equal(controller.reached, false);
    assert.equal(controller.unlocked, false);
    assert.equal(controller.progress, 0);
    assert.equal(portal.gate.enabled, false);
    assert.equal(portal.runesDim.enabled, true);
    assert.equal(portal.runesLit.enabled, false);
    assert.equal(portal.swirl.getLocalEulerAngles().y, 0);
});

// The adventurer faces +Z at zero yaw, opposite the Engine forward vector.
const yawOf = (player) => Math.atan2(-player.entity.forward.x, -player.entity.forward.z);

test('grabbing faces the block, held movement strafes, and release restores turning', (t) => {
    const { tap, key, tick, blocks, player } = gameFixture(t);
    // Spawn is south of block 1 (+Z); start by facing east, away from it.
    key('keydown', 'KeyD');
    tick();
    key('keyup', 'KeyD');
    tick(30);
    assert.ok(Math.abs(yawOf(player) - Math.PI / 2) < 1e-3);
    tap('Space');
    const offset = () => {
        const p = player.entity.getPosition();
        const b = blocks[0].entity.getPosition();
        return { x: b.x - p.x, z: b.z - p.z };
    };
    const held = offset();
    const facing = Math.atan2(held.x, held.z);
    const yaw = () => yawOf(player);
    const yawDiff = () => Math.abs(Math.atan2(Math.sin(yaw() - facing), Math.cos(yaw() - facing)));
    assert.ok(yawDiff() < 1e-3);
    // Strafing left keeps facing and offset.
    const startX = player.entity.getPosition().x;
    key('keydown', 'KeyA');
    tick(20);
    key('keyup', 'KeyA');
    assert.ok(player.entity.getPosition().x < startX - 0.5);
    assert.ok(yawDiff() < 1e-3);
    assert.ok(Math.abs(offset().x - held.x) < 1e-6 && Math.abs(offset().z - held.z) < 1e-6);
    tap('Space');
    key('keydown', 'KeyD');
    tick();
    key('keyup', 'KeyD');
    assert.ok(Math.abs(yawOf(player) - Math.PI / 2) < 1e-3);
});

test('rules wait for the next snapshot, pause freezes bridge progress, reset clears everything', (t) => {
    const { game, blocks, player, tick, tap } = gameFixture(t, {
        level: {
            ...meadowLevel,
            rules: [
                {
                    id: 'unlock',
                    when: { type: 'plateActive', target: 'plate-1' },
                    actions: [{ type: 'openPortal', target: 'portal' }]
                },
                {
                    id: 'raise',
                    when: { type: 'portalReached', target: 'portal' },
                    actions: [{ type: 'openBridge', target: 'bridge' }]
                }
            ],
            completion: { type: 'enemyDefeated', target: 'enemy' }
        }
    });
    const { BridgeController } = levelObjects;
    const visual = new Entity();
    const blocker = { x: 0, z: 0, r: 1 };
    game.bridges.push(
        new BridgeController(
            { type: 'bridge', id: 'bridge', x: 0, z: 0, length: 5, state: 'closed' },
            { visual, blockers: [blocker], structure: [] }
        )
    );
    blocks[1].entity.setPosition(3, 0, -3); // moon matches plate-1
    player.entity.setPosition(0, 0, -6);
    tick();
    assert.deepEqual(game.diagnostics().activatedRules, ['unlock']);
    assert.equal(game.diagnostics().portals[0].reached, false);
    // The portal must finish rising before it counts as reached.
    const frames = Math.ceil(PORTAL.rise * 60);
    tick(frames - 1);
    assert.equal(game.diagnostics().portals[0].reached, false);
    assert.deepEqual(game.diagnostics().activatedRules, ['unlock']);
    tick(2);
    assert.equal(game.diagnostics().portals[0].reached, true);
    assert.deepEqual(game.diagnostics().activatedRules, ['unlock', 'raise']);
    assert.equal(game.diagnostics().bridges[0].state, 'opening');
    tick(10);
    tap('Escape');
    const height = visual.getLocalPosition().y;
    tick(100);
    assert.equal(visual.getLocalPosition().y, height);
    assert.equal(blocker.enabled, true);
    tap('Escape');
    tick(60);
    assert.equal(game.diagnostics().bridges[0].state, 'open');
    assert.equal(blocker.enabled, false);
    game.reset();
    assert.deepEqual(game.diagnostics().activatedRules, []);
    assert.equal(game.diagnostics().portals[0].unlocked, false);
    assert.equal(game.diagnostics().bridges[0].state, 'closed');
    assert.equal(blocker.enabled, true);
});

const levelObjects = await import('../src/gameplay/level-objects.ts');

test('enemy completion and zone completion work independently of boxes and reset', (t) => {
    const { game, tick, player } = gameFixture(t, {
        level: {
            ...meadowLevel,
            rules: [],
            completion: {
                type: 'all',
                conditions: [
                    { type: 'enemyDefeated', target: 'enemy' },
                    { type: 'zoneVisited', target: 'exit' }
                ]
            }
        }
    });
    game.zones = new levelObjects.ZoneTracker([
        { type: 'zone', id: 'exit', minX: -1, maxX: 1, minZ: -1, maxZ: 1, minY: -0.1, maxY: 0.1 }
    ]);
    player.entity.setPosition(0, 0, 0);
    tick();
    assert.equal(game.state, 'playing');
    assert.deepEqual(game.diagnostics().visitedZones, ['exit']);
    game.slimes.slimes[0].hp = 0;
    tick();
    assert.equal(game.state, 'won');
    game.reset();
    assert.equal(game.state, 'playing');
    assert.deepEqual(game.diagnostics().visitedZones, []);
    assert.equal(game.diagnostics().complete, false);
});

test('pause freezes the attack pose and clock; resume completes it and restart restores pivots', (t) => {
    const { game, player, tap, tick } = gameFixture(t);
    // Move away from interactable blocks before attacking.
    player.entity.setPosition(0, 0, 0);
    tap('Space');
    tick(5);
    const rotation = player.swordPivot.getLocalRotation().clone();
    const cooldown = game.diagnostics().attackCooldown;
    tap('Escape');
    tick(20);
    assert.equal(game.diagnostics().attackCooldown, cooldown);
    assert.ok(Math.abs(player.swordPivot.getLocalRotation().dot(rotation)) > 0.99999);
    tap('Escape');
    tick(30);
    assert.equal(game.diagnostics().attackCooldown, 0);
    game.reset();
    for (const rest of player.rest) {
        assert.ok(rest.entity.getLocalPosition().distance(rest.position) < 1e-5);
        assert.ok(Math.abs(rest.entity.getLocalRotation().dot(rest.rotation)) > 0.99999);
    }
});

const { PlatformController, PLATFORM } = await import('../src/gameplay/platforms.ts');
const { WATER } = await import('../src/gameplay/adventure.ts');
const { SlimePack } = await import('../src/gameplay/slimes.ts');

/** A river strip |z| < 2 across the fixture meadow; the bank starts at z = 2. */
const river = (x, z) => Math.abs(z) < 2;
const raft = (overrides = {}) => ({
    type: 'platform',
    id: 'raft',
    x: -3,
    z: 0,
    width: 3.6,
    depth: 4,
    travel: { x: 6, z: 0 },
    duration: 1,
    dwell: 3,
    phase: 0,
    state: 'active',
    ...overrides
});
const platformHandles = () => ({
    entity: new Entity(),
    visual: new Entity(),
    surface: { minX: 0, maxX: 0, minZ: 0, maxZ: 0, height: 0 }
});

/** Game fixture with the river strip and one floating stone added to the meadow fixture. */
function waterFixture(t, definition = raft(), overrides = {}) {
    const handles = platformHandles();
    const base = gameFixture(t, {
        layout: { obstacles: [], surfaces: [handles.surface], water: river, animate: () => undefined },
        ...overrides
    });
    base.game.platforms.push(new PlatformController(definition, handles));
    return { ...base, handles, platform: base.game.platforms[0] };
}

test('disabled surfaces are ignored and open water is only where no enabled surface covers it', () => {
    const surface = { minX: -1, maxX: 1, minZ: -1, maxZ: 1, height: 0.1, enabled: false };
    const collision = new Collision([], { minX: -9, maxX: 9, minZ: -9, maxZ: 9 }, [surface], river);
    assert.equal(collision.heightAt(0, 0), 0);
    assert.equal(collision.isWater(0, 0), true);
    assert.equal(collision.isWater(0, 3), false);
    surface.enabled = true;
    assert.equal(collision.heightAt(0, 0), 0.1);
    assert.equal(collision.isWater(0, 0), false);
    assert.equal(collision.isWater(1.5, 0), true);
    // Water keeps meadow height, so stepping off an edge is allowed and then splashes.
    surface.height = 0;
    assert.equal(collision.canTravel({ x: 0, z: 0 }, { x: 1.5, z: 0 }), true);
});

test('platforms rise before carrying, dwell at both ends, glide smoothly and reset with their phase', () => {
    const definition = raft({ state: 'dormant', dwell: 0.5, phase: 0.25 });
    const handles = platformHandles();
    const platform = new PlatformController(definition, handles);
    assert.equal(handles.surface.enabled, false);
    assert.equal(handles.visual.getLocalPosition().y, -PLATFORM.depth);
    assert.equal(platform.contains(-3, 0), false);
    assert.deepEqual(platform.update(1), { dx: 0, dz: 0 });
    platform.activate();
    platform.update(PLATFORM.riseTime / 2);
    assert.equal(platform.state, 'rising');
    assert.equal(handles.surface.enabled, false);
    platform.update(PLATFORM.riseTime / 2);
    assert.equal(platform.state, 'active');
    assert.equal(handles.surface.enabled, true);
    assert.equal(handles.visual.getLocalPosition().y, 0);
    assert.equal(platform.contains(-3, 0), true);
    // Phase 0.25 of a 0.5 s dwell: still resting at the start end.
    assert.deepEqual(platform.update(0.2), { dx: 0, dz: 0 });
    const half = platform.update(0.05 + 0.5);
    assert.ok(Math.abs(platform.position.x - 0) < 1e-9, 'halfway along a smoothstep glide');
    assert.ok(half.dx > 0);
    platform.update(0.5);
    assert.ok(Math.abs(platform.position.x - 3) < 1e-9);
    assert.deepEqual(platform.update(0.4), { dx: 0, dz: 0 });
    platform.update(0.1 + 1);
    assert.ok(Math.abs(platform.position.x + 3) < 1e-9, 'glides back to the start end');
    assert.equal(handles.entity.getPosition().x, platform.position.x);
    platform.reset();
    assert.equal(platform.state, 'dormant');
    assert.equal(handles.surface.enabled, false);
    assert.equal(handles.visual.getLocalPosition().y, -PLATFORM.depth);
});

test('riders are carried; pause freezes the stone; open water splashes, costs a heart and respawns', (t) => {
    const { game, player, platform, key, tap, tick } = waterFixture(t, raft({ dwell: 0.2 }));
    player.entity.setPosition(-3, 0, 1);
    tick(Math.round(0.7 * 60));
    const moved = platform.position.x + 3;
    assert.ok(moved > 1 && moved < 6);
    assert.ok(Math.abs(player.entity.getPosition().x - (-3 + moved)) < 1e-6);
    assert.equal(game.diagnostics().splashes, 0);
    tap('Escape');
    tick(30);
    assert.equal(platform.position.x + 3, moved);
    tap('Escape');

    // Walk from the bank into the river, well clear of the stone.
    player.entity.setPosition(7, 0, 3);
    tick();
    const health = game.health;
    key('keydown', 'KeyW');
    for (let i = 0; i < 60 && !game.diagnostics().splashing; i++) tick();
    key('keyup', 'KeyW');
    assert.equal(game.diagnostics().splashing, true);
    assert.equal(game.health, health - 1);
    assert.equal(game.diagnostics().splashes, 1);
    tick(10);
    assert.ok(player.entity.getPosition().y < 0, 'falls toward the water');
    tap('Space');
    assert.equal(game.diagnostics().grabbed, false, 'no actions while under');
    tick(Math.ceil(WATER.sinkTime * 60));
    const p = player.entity.getPosition();
    assert.equal(game.diagnostics().splashing, false);
    assert.equal(game.state, 'playing');
    assert.equal(p.y, 0);
    assert.ok(Math.abs(p.x - 7) < 1e-6 && p.z >= 2 && p.z < 2.4, 'respawns on the last dry footing');
});

test('a splash on the last heart plays the fall, then ends the run; restart mid-splash is clean', (t) => {
    const { game, player, key, tick } = waterFixture(t, raft(), { initialHealth: 1 });
    player.entity.setPosition(7, 0, 2.1);
    tick();
    key('keydown', 'KeyW');
    for (let i = 0; i < 30 && !game.diagnostics().splashing; i++) tick();
    key('keyup', 'KeyW');
    assert.equal(game.health, 0);
    assert.equal(game.state, 'playing');
    tick(Math.ceil(WATER.sinkTime * 60) + 1);
    assert.equal(game.state, 'over');

    game.reset();
    player.entity.setPosition(7, 0, 2.1);
    tick();
    key('keydown', 'KeyW');
    for (let i = 0; i < 30 && !game.diagnostics().splashing; i++) tick();
    key('keyup', 'KeyW');
    tick(5);
    game.reset();
    const p = player.entity.getPosition();
    assert.equal(game.diagnostics().splashing, false);
    const atSpawn = (q) => Math.abs(q.x + 3) < 1e-6 && q.y === 0 && Math.abs(q.z - 4.3) < 1e-6;
    assert.ok(atSpawn(p));
    tick(Math.ceil(WATER.sinkTime * 60) + 1);
    assert.ok(atSpawn(player.entity.getPosition()), 'no stale respawn after restart');
    assert.equal(game.state, 'playing');
});

test('a held box rides with the player; a box carried straight into open water resurfaces clear of the player', (t) => {
    const { game, blocks, player, platform, key, tap, tick } = waterFixture(t);
    tap('Space');
    assert.equal(game.diagnostics().grabbed, true);
    key('keydown', 'KeyW');
    for (let i = 0; i < 120 && player.entity.getPosition().z > 1.2; i++) tick();
    key('keyup', 'KeyW');
    tick(10);
    const box = () => blocks[0].entity.getPosition();
    assert.equal(game.diagnostics().splashes, 0);
    assert.ok(box().z < 0 && platform.contains(box().x, box().z));
    const offset = { x: box().x - player.entity.getPosition().x, z: box().z - player.entity.getPosition().z };
    const startX = platform.position.x;
    tick(Math.round(3.3 * 60));
    assert.ok(platform.position.x > startX + 1);
    assert.ok(Math.abs(box().x - player.entity.getPosition().x - offset.x) < 1e-6);
    assert.ok(Math.abs(box().z - player.entity.getPosition().z - offset.z) < 1e-6);
    assert.equal(game.diagnostics().grabbed, true);

    // Released on the stone, the box keeps riding it.
    tap('Space');
    const rest = box().x - platform.position.x;
    tick(20);
    assert.ok(Math.abs(box().x - platform.position.x - rest) < 1e-6);

    // Pushed straight in, no recent footing is clear of the player, so the box returns to its start.
    game.reset();
    player.entity.setPosition(3, 0, 4.3);
    tap('Space');
    key('keydown', 'KeyW');
    for (let i = 0; i < 60 && game.diagnostics().grabbed; i++) tick();
    key('keyup', 'KeyW');
    assert.equal(game.diagnostics().grabbed, false);
    tick(Math.ceil(PUZZLE.sinkTime * 60) + 1);
    const home = blocks[1].entity.getPosition();
    assert.ok(Math.abs(home.x - 3) < 1e-6 && Math.abs(home.z - 3) < 1e-6);
    assert.equal(game.diagnostics().splashes, 0, 'the player stays on the bank');
});

test('a sunk box drops under, then resurfaces on its newest clear dry spot, off platforms, flickering', () => {
    const { config, blocks, plates, materials } = fixture();
    const collision = new Collision([], { minX: -9, maxX: 9, minZ: -9, maxZ: 9 }, [], river);
    const puzzle = new BlockPuzzle(config, blocks, plates, collision, materials);
    const box = blocks[1].entity;
    const player = { x: -6, z: 7 };
    const raftArea = (x, z) => x > 6.5 && z > 2;
    const dt = 1 / 60;
    /** Steps the water until the box resurfaces, returning the splash and resurfacing points. */
    const sink = (at = player, unsafe = raftArea) => {
        const result = { splashed: [], surfaced: [], depths: [] };
        for (let i = 0; i < Math.ceil(PUZZLE.sinkTime * 60) + 2 && !result.surfaced.length; i++) {
            const { splashed, surfaced } = puzzle.updateWater(dt, at, -0.1, unsafe);
            result.splashed.push(...splashed);
            result.surfaced.push(...surfaced);
            result.depths.push(blocks[1].visual.getLocalPosition().y);
        }
        return result;
    };
    // Carried east along the bank and onto a raft, then into the river.
    for (let x = 3; x <= 7.5; x += 0.1) {
        box.setPosition(x, 0, 3);
        puzzle.updateWater(dt, player, -0.1, raftArea);
    }
    box.setPosition(7.5, 0, 1);
    puzzle.updateWater(dt, player, -0.1, raftArea);
    assert.equal(puzzle.diagnostics()[1].sinking, true);
    assert.equal(puzzle.interact({ x: 7.5, z: 2.2 }), false, 'a sinking box cannot be grabbed');
    const sunk = sink();
    assert.deepEqual(sunk.splashed, [{ x: 7.5, z: 1 }]);
    assert.ok(sunk.depths.at(-2) < -2, 'drops well below the surface before resurfacing');
    const [to] = sunk.surfaced;
    assert.ok(to.x > 6 && to.x <= 6.5 && to.z === 3, 'newest dry spot that was not on the raft');
    assert.equal(box.getPosition().x, to.x);
    assert.equal(blocks[1].visual.getLocalPosition().y, 0);
    assert.equal(puzzle.diagnostics()[1].sinking, false);

    const shown = [];
    for (let i = 0; i < Math.ceil(PUZZLE.respawnFlicker * 60) + 2; i++) {
        puzzle.updateLift(dt);
        shown.push(blocks[1].visual._enabled);
    }
    assert.ok(shown.includes(false) && shown.includes(true), 'flickers while resurfacing');
    assert.equal(shown.at(-1), true, 'visible once the flicker ends');

    // Spots under the player or beside another box are skipped.
    box.setPosition(6, 0, 1);
    const [blocked] = sink({ x: to.x, z: 3 }).surfaced;
    assert.ok(blocked.x < to.x - PUZZLE.blockHalf);
    blocks[0].entity.setPosition(blocked.x, 0, 4.5);
    box.setPosition(3, 0, 0);
    const [beside] = sink().surfaced;
    assert.ok(Math.abs(blocked.x - beside.x) >= PUZZLE.blockRadius * 2 - 1e-6);

    // Reset mid-sink forgets the trail and restores the rest pose.
    box.setPosition(3, 0, 0);
    puzzle.updateWater(dt, player);
    puzzle.updateWater(dt * 10, player);
    puzzle.reset();
    assert.equal(blocks[1].visual._enabled, true);
    assert.equal(blocks[1].visual.getLocalPosition().y, 0);
    assert.equal(puzzle.diagnostics()[1].sinking, false);
    box.setPosition(3, 0, 0);
    assert.deepEqual(sink({ x: -6, z: 7 }, () => false).surfaced, [{ x: 3, z: 3 }]);
});

test('shoves refuse open water and slimes never hop or get knocked into it', () => {
    const { config, blocks, plates, materials } = fixture();
    const collision = new Collision([], { minX: -9, maxX: 9, minZ: -9, maxZ: 9 }, [], river);
    const puzzle = new BlockPuzzle(config, blocks, plates, collision, materials);
    assert.deepEqual(puzzle.resolvePlayer({ x: 6, z: 1.8 }, { x: 6, z: 2.3 }, true), { x: 6, z: 2.3 });
    assert.equal(puzzle.resolvePlayer({ x: 6, z: 1.8 }, { x: 6, z: 2.3 }).z, 1.8);
    const slime = { entity: new Entity(), body: new Entity() };
    slime.entity.setPosition(6, 0, 2.3);
    const pack = new SlimePack([slime], collision);
    const target = { entity: new Entity(), canBeHit: () => false, hit: () => undefined };
    target.entity.setPosition(6, 0, -5);
    pack.slimes[0].vz = -12;
    for (let i = 0; i < 30; i++) pack.update(1 / 60, i / 60, target);
    assert.ok(pack.slimes[0].z >= 2);
});

function readyShieldFight(t) {
    const f = gameFixture(t);
    f.game.player.moveTo(0, 0);
    f.game.player.face(0);
    const enemy = f.game.slimes.slimes[0];
    enemy.x = 0;
    enemy.z = 1;
    enemy.windup = 0.01;
    enemy.cool = 0;
    return { ...f, enemy };
}

test('held shield blocks the frontal strike, preserves hearts and uses slime recovery; rear strikes hurt', (t) => {
    const { game, key, tick, enemy } = readyShieldFight(t);
    key('keydown', 'ShiftLeft');
    tick();
    assert.equal(game.health, 3);
    assert.equal(game.diagnostics().blockedAttacks, 1);
    assert.equal(enemy.cool, 1.5);
    assert.ok(game.player.position.z < 0);
    enemy.x = 0;
    enemy.z = -1;
    enemy.windup = 0.01;
    tick();
    assert.equal(game.health, 2);
    assert.equal(game.diagnostics().blockedAttacks, 1);
});

test('guard locks facing and halves movement, prevents attacks and grabbing, then releases', (t) => {
    const { game, key, tap, tick } = gameFixture(t);
    key('keydown', 'ShiftLeft');
    tap('Space');
    assert.equal(game.diagnostics().grabbed, false);
    assert.equal(game.diagnostics().attackCooldown, 0);
    key('keydown', 'KeyD');
    tick(20);
    assert.equal(game.player.heading, 0);
    assert.ok(game.player.position.x > -3);
    const guarded = game.player.stride(1 / 60, { x: 1, z: 0 }, false, 0.5);
    assert.equal(guarded.speed, PLAYER.walkSpeed * 0.5);
    key('keyup', 'ShiftLeft');
    tick();
    assert.equal(game.player.heading, Math.PI / 2);
    assert.equal(game.diagnostics().guarding, false);
});

test('sword completes before guard rises; carrying prevents guard and release still works', (t) => {
    const { game, key, tap, tick } = gameFixture(t);
    tap('Space');
    key('keydown', 'ShiftLeft');
    tick();
    assert.equal(game.diagnostics().guarding, false);
    tap('Space'); // Release the box even with shield input held.
    tick();
    assert.equal(game.diagnostics().grabbed, false);
    assert.equal(game.diagnostics().guarding, true);
    key('keyup', 'ShiftLeft');
    game.player.moveTo(0, 0);
    tap('Space');
    key('keydown', 'ShiftLeft');
    tick();
    assert.ok(game.sword.swing > 0);
    assert.equal(game.diagnostics().guarding, false);
    tick(20);
    assert.equal(game.diagnostics().guarding, true);
});

test('right click guards without attacking and window release, cancellation, blur and reset clear it', (t) => {
    const { game, canvas, tick, tap } = gameFixture(t);
    const pointer = (target, type, extra = {}) =>
        target.dispatchEvent(
            Object.assign(new Event(type, { cancelable: true }), {
                pointerType: 'mouse',
                pointerId: 7,
                button: 2,
                ...extra
            })
        );
    pointer(canvas, 'pointerdown');
    tick();
    assert.equal(game.diagnostics().guarding, true);
    assert.equal(game.diagnostics().grabbed, false);
    assert.equal(game.diagnostics().attackCooldown, 0);
    pointer(globalThis.window, 'pointerup');
    tick();
    assert.equal(game.diagnostics().guarding, false);
    pointer(canvas, 'pointerdown');
    pointer(canvas, 'mousedown');
    pointer(canvas, 'lostpointercapture');
    tick();
    assert.equal(game.diagnostics().guarding, false);
    pointer(canvas, 'pointerdown');
    globalThis.window.dispatchEvent(new Event('blur'));
    tap('Escape');
    tick();
    assert.equal(game.diagnostics().guarding, false);
    pointer(canvas, 'pointerdown');
    game.reset();
    tick();
    assert.equal(game.diagnostics().guarding, false);
    assert.equal(game.diagnostics().blockedAttacks, 0);
    assert.equal(canvas.dispatchEvent(new Event('contextmenu', { cancelable: true })), false);
});

test('touch shield holds independently of the stick, releases on cancellation and pause', (t) => {
    const { game, touch, tick, tap } = gameFixture(t);
    touch('touch-shield', 'pointerdown');
    touch('touch-stick', 'pointerdown', 90, 50);
    tick(10);
    assert.equal(game.diagnostics().guarding, true);
    assert.equal(game.player.heading, 0);
    touch('touch-attack', 'pointerdown');
    assert.equal(game.diagnostics().attackCooldown, 0);
    touch('touch-shield', 'pointercancel');
    tick();
    assert.equal(game.diagnostics().guarding, false);
    touch('touch-shield', 'pointerdown');
    tap('Escape');
    tap('Escape');
    tick();
    assert.equal(game.diagnostics().guarding, false);
});

test('mouse button chords raise and release guard even while left mouse remains held', (t) => {
    const { game, canvas, tick } = gameFixture(t);
    const mouse = (target, type, button) => target.dispatchEvent(Object.assign(new Event(type), { button }));
    mouse(canvas, 'mousedown', 0);
    mouse(canvas, 'mousedown', 2);
    tick();
    assert.equal(game.diagnostics().guarding, true);
    mouse(globalThis.window, 'mouseup', 2);
    tick();
    assert.equal(game.diagnostics().guarding, false);
    assert.equal(game.diagnostics().attackCooldown, 0);
});

test('temporary plates snap carried matching blocks, auto-release, stay active without repeated clicks and allow reuse', () => {
    const { puzzle, config, blocks, materials, plates } = fixture();
    config.plates[1].mode = 'temporary';
    const plate = config.plates[1];
    const player = { x: plate.x, z: plate.z + 1.3 };
    // A carried sun snaps and auto-releases, like a permanent match, without locking.
    blocks[0].entity.setPosition(plate.x, 0, plate.z);
    assert.equal(puzzle.interact(player), true);
    assert.equal(puzzle.update(player).clicked.length, 1);
    assert.equal(puzzle.grabbed, false);
    assert.equal(puzzle.diagnostics()[0].locked, false);
    assert.equal(puzzle.matched, 1);
    assert.equal(puzzle.update(player).clicked.length, 0);
    assert.equal(plates[1].base.render.meshInstances[0].material, materials.lit);
    const height = blocks[0].entity.getPosition().y + blocks[0].visual.getLocalPosition().y;
    puzzle.interact(player);
    assert.equal(puzzle.plateStates()[1], false, 'pickup removes pressure immediately');
    assert.equal(plates[1].base.render.meshInstances[0].material, materials.baseIdle);
    assert.equal(blocks[0].entity.getPosition().y + blocks[0].visual.getLocalPosition().y, height);
    puzzle.updateLift(1 / 60);
    assert.ok(Math.abs(blocks[0].visual.getLocalPosition().y - height) < 0.02, 'pickup preserves a continuous height');
    for (let frame = 0; frame < 30; frame++) assert.equal(puzzle.update(player).clicked.length, 0);
    assert.equal(puzzle.grabbed, true, 'picking up does not immediately snap back');
    assert.equal(puzzle.matched, 0);
    puzzle.release();
    assert.equal(puzzle.update(player).clicked.length, 1, 'the same block activates again');
    puzzle.interact(player);
    config.plates[0].symbol = 'sun';
    blocks[0].entity.setPosition(3, 0, -3);
    assert.equal(puzzle.update({ x: 3, z: -1.7 }).clicked.length, 1);
    assert.equal(puzzle.diagnostics()[0].locked, true, 'reuse on a permanent plate still locks');
    assert.deepEqual(puzzle.plateStates(), [true, false]);
    puzzle.reset();
    assert.equal(puzzle.matched, 0);
    assert.equal(blocks[0].visual.getLocalPosition().y, 0);
});

test('temporary pressure clears on displacement, water, sinking and returning a block to its start', () => {
    for (const cause of ['moved', 'water', 'sinking', 'returned']) {
        const { puzzle, config, blocks, plates, materials } = fixture();
        config.plates[1].mode = 'temporary';
        blocks[0].entity.setPosition(-3, 0, -3);
        puzzle.update({ x: 0, z: 0 });
        if (cause === 'moved') blocks[0].entity.setPosition(-3, 0, 0);
        if (cause === 'water') puzzle.collision.water = () => true;
        if (cause === 'sinking') puzzle.blocks[0].sink = 0.5;
        if (cause === 'returned') puzzle.returnToStart(0);
        assert.equal(puzzle.plateStates()[1], false, cause);
        puzzle.update({ x: 0, z: 0 });
        assert.equal(puzzle.matched, 0);
        assert.equal(plates[1].base.render.meshInstances[0].material, materials.baseIdle);
    }
});

test('wrong symbols and the player do not press a temporary plate', () => {
    const { puzzle, config, blocks } = fixture();
    config.plates[1].mode = 'temporary';
    assert.equal(puzzle.update({ x: -3, z: -3 }).clicked.length, 0);
    blocks[1].entity.setPosition(-3, 0, -3);
    assert.equal(puzzle.update({ x: 0, z: 0 }).clicked.length, 0);
    assert.deepEqual(puzzle.plateStates(), [false, false]);
});

const { GateController, createGateBlockers } = await import('../src/gameplay/gates.ts');

test('adventure gates follow current pressure, pause and reset while portal rules remain one-shot', (t) => {
    const { game, blocks, player, tick, tap } = gameFixture(t, {
        level: {
            ...meadowLevel,
            rules: [
                {
                    id: 'unlock',
                    when: { type: 'plateActive', target: 'plate-1' },
                    actions: [{ type: 'openPortal', target: 'portal' }]
                }
            ]
        }
    });
    game.puzzle.config.plates[1].mode = 'temporary';
    const definition = {
        type: 'gate',
        id: 'gate',
        x: 5,
        z: 0,
        width: 4,
        openWhen: { type: 'plateActive', target: 'plate-2' }
    };
    const blockers = createGateBlockers(definition);
    const panel = new Entity();
    game.collision.obstacles.push(...blockers);
    game.gates.push(new GateController(definition, { panel, blockers }));
    blocks[0].entity.setPosition(-3, 0, -3);
    tick(10);
    assert.equal(game.diagnostics().gates[0].state, 'opening');
    const y = panel.getLocalPosition().y;
    tap('Escape');
    tick(60);
    assert.equal(panel.getLocalPosition().y, y);
    assert.equal(game.diagnostics().gates[0].desiredOpen, true);
    tap('Escape');
    tick(30);
    assert.equal(game.diagnostics().gates[0].state, 'open');
    player.entity.setPosition(-3, 0, -1.7);
    tap('Space');
    tick();
    assert.equal(game.diagnostics().plates[1].active, false);
    assert.equal(game.diagnostics().gates[0].state, 'closing');
    tick(40);
    assert.equal(game.diagnostics().gates[0].state, 'closed');
    tap('Space');
    tick(40);
    assert.equal(game.diagnostics().gates[0].state, 'open');
    blocks[1].entity.setPosition(3, 0, -3);
    tick();
    assert.equal(game.diagnostics().portals[0].unlocked, true);
    tick(80);
    assert.deepEqual(game.diagnostics().activatedRules, ['unlock']);
    game.reset();
    assert.equal(game.diagnostics().gates[0].state, 'closed');
    assert.equal(game.diagnostics().gates[0].desiredOpen, false);
    assert.equal(game.diagnostics().portals[0].unlocked, false);
    assert.equal(Math.abs(panel.getLocalPosition().y), 0);
    assert.ok(blockers.every((b) => b.enabled));
});

test('a picked-up temporary block can leave and snap again when carried back, with no extra height jump', () => {
    const { puzzle, config, blocks } = fixture();
    config.plates[1].mode = 'temporary';
    const player = { x: -3, z: -1.7 };
    blocks[0].entity.setPosition(-3, 0, -3);
    puzzle.update(player);
    puzzle.interact(player);
    puzzle.update(player);
    assert.equal(puzzle.grabbed, true);
    // Carry beyond the pickup plate's radius, then return while still holding it.
    puzzle.constrain({ x: -3, z: 0 }, player);
    const away = blocks[0].entity.getPosition().z;
    assert.ok(away > -3 + PUZZLE.snapRadius);
    assert.equal(puzzle.update({ x: -3, z: away + 1.3 }).clicked.length, 0);
    assert.equal(puzzle.grabbed, true);
    puzzle.constrain({ x: -3, z: -1.7 }, { x: -3, z: away + 1.3 });
    assert.equal(puzzle.update(player).clicked.length, 1);
    assert.equal(puzzle.grabbed, false);
    assert.equal(puzzle.diagnostics()[0].locked, false);
    assert.ok(
        Math.abs(blocks[0].entity.getPosition().y + blocks[0].visual.getLocalPosition().y - PUZZLE.plateHeight) < 0.025
    );
    puzzle.interact(player);
    puzzle.reset();
    blocks[0].entity.setPosition(-3, 0, -3);
    assert.equal(puzzle.update(player).clicked.length, 1, 'reset clears pickup suppression');
});

test('a prerequisite plate prevents locking an essential block too early and readies on the permanent match', () => {
    const { puzzle, config, blocks, plates, materials } = fixture();
    materials.disabled = {};
    config.plates[0].id = 'moon-plate';
    config.plates[1].requiresPlate = 'moon-plate';
    puzzle.reset();
    assert.equal(plates[1].sunDisk.render.meshInstances[0].material, materials.disabled);
    blocks[0].entity.setPosition(-3, 0, -3);
    const player = { x: -3, z: -1.7 };
    puzzle.interact(player);
    assert.equal(puzzle.update(player).clicked.length, 0);
    assert.equal(puzzle.grabbed, true, 'sun remains movable before moon is secured');
    blocks[1].entity.setPosition(3, 0, -3);
    assert.equal(puzzle.update(player).clicked.length, 1);
    assert.equal(plates[1].sunDisk.render.meshInstances[0].material, materials.idle);
    assert.equal(puzzle.update(player).clicked.length, 1);
    assert.equal(puzzle.grabbed, false);
    assert.ok(puzzle.diagnostics().every((b) => b.locked));
    puzzle.reset();
    assert.deepEqual(puzzle.plateStates(), [false, false]);
    assert.equal(plates[1].sunDisk.render.meshInstances[0].material, materials.disabled);
});

test('plate connector follows the gameplay snapshot and freezes on pause, blur and end states', (t) => {
    const { game, blocks, tick, tap } = gameFixture(t);
    const idle = {},
        lit = {};
    const chevrons = Array.from({ length: 3 }, () => ({ render: { meshInstances: [{ material: null }] } }));
    game.plateConnectors.push(new PlateConnectorController('plate-1', { chevrons }, { idle, lit }));
    const states = () => chevrons.map((mark) => mark.render.meshInstances[0].material === lit);
    blocks[1].entity.setPosition(3, 0, -3);
    // Raw frame spikes must not finish a feedback sequence in one frame.
    game.update(5);
    assert.equal(game.diagnostics().plates[0].active, true);
    assert.deepEqual(states(), [false, false, false]);
    tick(8);
    assert.deepEqual(states(), [true, false, false]);
    tap('Escape');
    tick(60);
    assert.deepEqual(states(), [true, false, false]);
    tap('Escape');
    tick(9);
    assert.deepEqual(states(), [true, true, false]);
    globalThis.window.dispatchEvent(new Event('blur'));
    tick(60);
    assert.deepEqual(states(), [true, true, false]);
    tap('Escape');
    game.state = 'over';
    tick(60);
    assert.deepEqual(states(), [true, true, false]);
    game.reset();
    assert.deepEqual(states(), [false, false, false]);
    blocks[1].entity.setPosition(3, 0, -3);
    tick(30);
    assert.deepEqual(states(), [true, true, true]);
    game.reset();
    assert.deepEqual(states(), [false, false, false]);
});

test('a box held beside a plate snaps even while the player stands on the plate', () => {
    const { puzzle, blocks } = fixture();
    // Sun plate at (-3, -3): the box rests next to it and the player stands on the plate.
    blocks[0].entity.setPosition(-3 + PUZZLE.blockHalf + 0.1, 0, -3);
    const player = { x: -3, z: -3 };
    assert.equal(puzzle.update(player).clicked.length, 1);
    assert.equal(puzzle.diagnostics()[0].locked, true);
    assert.equal(blocks[0].entity.getPosition().x, -3);
});

test('the wider snap applies only while the player stands on the plate', () => {
    const { puzzle, blocks } = fixture();
    blocks[0].entity.setPosition(-3 + 1.2, 0, -3);
    assert.equal(puzzle.update({ x: -3 - 5, z: -3 }).clicked.length, 0);
    assert.equal(puzzle.update({ x: -3, z: -3 }).clicked.length, 1);
});

test('a player inside a snapped box is eased out of its footprint and never pushed while carrying', () => {
    const { puzzle, blocks } = fixture();
    blocks[0].entity.setPosition(-3 + PUZZLE.blockHalf + 0.1, 0, -3);
    let player = { x: -3, z: -3 };
    assert.equal(puzzle.update(player).clicked.length, 1);
    for (let i = 0; i < 30; i++) {
        const next = puzzle.pushPlayerOut(player, 0.035);
        if (!next) break;
        player = next;
    }
    const box = blocks[0].entity.getPosition();
    assert.ok(Math.abs(player.x - box.x) >= PUZZLE.blockHalf || Math.abs(player.z - box.z) >= PUZZLE.blockHalf);
    assert.equal(puzzle.pushPlayerOut(player, 0.035), null);
    // Holding another box suspends the push.
    puzzle.interact({ x: 3, z: 3 + 1.3 });
    assert.equal(puzzle.pushPlayerOut({ x: box.x, z: box.z }, 0.035), null);
});
