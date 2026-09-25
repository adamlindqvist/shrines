import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { AppBase, AppOptions, Entity, NullGraphicsDevice, RenderComponentSystem, Vec3 } from 'playcanvas';

registerHooks({
    resolve(specifier, context, nextResolve) {
        return nextResolve(
            specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier) ? `${specifier}.ts` : specifier,
            context
        );
    }
});
const { createAdventurer } = await import('../src/objects/adventurer.ts');
const { createPalette } = await import('../src/rendering/palette.ts');
const { SceneResources } = await import('../src/rendering/resources.ts');
const playerModule = await import('../src/gameplay/player.ts');
const { PlayerController } = playerModule;
const { Sword, SWORD } = await import('../src/gameplay/combat.ts');

function fixture(t) {
    const canvas = { id: 'hero-test', width: 64, height: 64 };
    const device = new NullGraphicsDevice(canvas);
    const app = new AppBase(canvas);
    const options = new AppOptions();
    options.graphicsDevice = device;
    options.componentSystems = [RenderComponentSystem];
    app.init(options);
    const resources = new SceneResources();
    const root = new Entity();
    app.root.addChild(root);
    const handles = createAdventurer({ device, palette: createPalette(resources) }, root);
    const player = new PlayerController(handles);
    player.reset(0, 0);
    t.after(() => {
        root.destroy();
        resources.destroy();
        app.destroy();
    });
    const pose = (overrides = {}) =>
        player.animate({
            dt: 1 / 60,
            time: 0,
            dx: 0,
            dz: 0,
            carrying: false,
            swing: 0,
            attackHeading: 0,
            invincible: 0,
            ...overrides
        });
    return { root, handles, player, pose };
}

const near = (a, b, tolerance = 1e-5) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('blocked input settles feet; movement distance controls gait independently of frame rate', (t) => {
    const { player, handles, pose } = fixture(t);
    const run = (fps) => {
        player.reset(0, 0);
        for (let i = 0; i < fps; i++) pose({ dt: 1 / fps, dz: 7.5 / fps });
        return handles.leftBoot.getLocalPosition().clone();
    };
    const a = run(30),
        b = run(120);
    near(a.x, b.x);
    near(a.y, b.y);
    near(a.z, b.z);
    for (let i = 0; i < 120; i++) {
        player.stride(1 / 60, { x: 0, z: 1 });
        pose(); // Collision resolved no movement, despite held input.
    }
    const bootRest = handles.rest.find((r) => r.entity === handles.leftBoot);
    near(handles.leftBoot.getLocalPosition().distance(bootRest.position), 0);
});

test('carrying uses sideways and backward footsteps without changing root facing', (t) => {
    const { root, handles, player, pose } = fixture(t);
    player.face(Math.PI / 2);
    pose({ carrying: true, dz: 0.125 });
    near(root.getEulerAngles().y, 90);
    near(handles.leftBoot.getLocalPosition().z, 0.025);
    assert.ok(Math.abs(handles.leftBoot.getLocalPosition().x + 0.16) > 0.0001);
    player.reset(0, 0);
    pose({ carrying: true, dz: -0.125 });
    assert.ok(handles.leftBoot.getLocalPosition().z < 0.025);
});

test('reset restores every animated pivot; interaction cancels only the upper-body pose', (t) => {
    const { player, handles, pose } = fixture(t);
    pose({ dx: 0.1, swing: 0.19, attackHeading: 1.2, invincible: 1 });
    player.cancelAttackPose();
    for (const part of [handles.torso, handles.swordPivot, handles.shieldPivot]) {
        const rest = handles.rest.find((r) => r.entity === part);
        near(Math.abs(part.getLocalRotation().dot(rest.rotation)), 1);
    }
    player.reset(2, 3);
    near(player.position.x, 2);
    near(player.position.z, 3);
    for (const rest of handles.rest) {
        near(rest.entity.getLocalPosition().distance(rest.position), 0);
        near(Math.abs(rest.entity.getLocalRotation().dot(rest.rotation)), 1);
    }
    assert.equal(handles.visual.enabled, true);
});

test('active sword orientation stays on the captured heading when locomotion turns', (t) => {
    const { player, root, pose } = fixture(t);
    const blade = root.findByName('tapered silver blade');
    const axis = () =>
        blade
            .getWorldTransform()
            .transformVector(new Vec3(0, 1, 0))
            .normalize();
    pose({ swing: 0.19, attackHeading: 0 });
    const before = axis();
    player.face(Math.PI * 0.75);
    pose({ swing: 0.19, attackHeading: 0 });
    near(axis().distance(before), 0);
});

test('actual sword mesh stays above ground through walking and all attack phases', (t) => {
    const { root, pose, player } = fixture(t);
    const blade = root.findByName('tapered silver blade');
    let min = Infinity;
    for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        player.face(heading);
        for (let i = 0; i <= 180; i++) {
            pose({ dx: 0.08, dz: 0.09, swing: i < 60 ? 0 : (SWORD.swingTime * (180 - i)) / 120, attackHeading: 0 });
            min = Math.min(min, blade.render.meshInstances[0].aabb.getMin().y);
        }
    }
    assert.ok(min > 0.3, `blade clearance ${min}`);
});

test('hit window excludes anticipation/recovery and hits only once per enemy', () => {
    const sword = new Sword();
    const enemy = { x: 0, z: 1, hp: 3 };
    const hit = () => sword.applyHits(0, 0, [enemy], () => undefined);
    sword.start(0);
    hit();
    assert.equal(enemy.hp, 3);
    sword.tick(0.051);
    hit();
    assert.equal(enemy.hp, 2);
    hit();
    assert.equal(enemy.hp, 2);
    sword.tick(0.12);
    const another = { x: 0, z: 1, hp: 3 };
    sword.applyHits(0, 0, [another], () => undefined);
    assert.equal(another.hp, 3);
});

test('slash transition fires once, follows gameplay time, and clears on cancellation', () => {
    const sword = new Sword();
    sword.start(1.2);
    assert.equal(sword.attackHeading, 1.2);
    sword.tick(0.04);
    assert.equal(sword.consumeActiveStart(), false);
    sword.tick(0);
    assert.equal(sword.consumeActiveStart(), false);
    sword.tick(0.02);
    assert.equal(sword.consumeActiveStart(), true);
    assert.equal(sword.consumeActiveStart(), false);
    sword.tick(0.02);
    assert.equal(sword.consumeActiveStart(), false);
    sword.start(0);
    sword.tick(0.06);
    sword.reset();
    assert.equal(sword.consumeActiveStart(), false);
    assert.equal(sword.ready, true);
});

test('running bounce is vertical, bounded, reduced while carrying, and settles at rest', (t) => {
    const { player, handles, pose } = fixture(t);
    const heights = [];
    for (let i = 0; i < 120; i++) {
        pose({ dz: 0.125 });
        const p = handles.visual.getLocalPosition();
        heights.push(p.y);
        near(p.x, 0);
        near(p.z, 0);
        near(handles.visual.getLocalEulerAngles().z, 0);
        assert.ok(p.y >= 0 && p.y <= 0.035);
    }
    assert.ok(Math.max(...heights) > 0.034);
    player.reset(0, 0);
    for (let i = 0; i < 120; i++) {
        pose({ dz: 0.125, carrying: true });
        near(handles.visual.getLocalPosition().y, heights[i] * 0.6);
    }
    for (let i = 0; i < 120; i++) pose();
    near(handles.visual.getLocalPosition().y, 0);
});

test('a scaled walk speed (debug mode) scales each stride', (t) => {
    const { PLAYER } = playerModule;
    const { player } = fixture(t);
    const fast = new PlayerController(player.handles, undefined, PLAYER.walkSpeed * PLAYER.debugSpeedScale);
    fast.reset(0, 0);
    const normal = player.stride(1 / 60, { x: 1, z: 0 });
    const scaled = fast.stride(1 / 60, { x: 1, z: 0 });
    assert.equal(scaled.speed, normal.speed * PLAYER.debugSpeedScale);
    assert.ok(Math.abs(scaled.x - normal.x * PLAYER.debugSpeedScale) < 1e-9);
});
