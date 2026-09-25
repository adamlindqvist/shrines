import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { stubSmokeRenderer } from './smoke-renderer.mjs';

registerHooks({
    resolve(specifier, context, nextResolve) {
        return nextResolve(
            specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier) ? `${specifier}.ts` : specifier,
            context
        );
    }
});
const { MovementTrail } = await import('../src/gameplay/movement-trail.ts');

function fixture(t) {
    stubSmokeRenderer(t, MovementTrail);
    const trail = new MovementTrail(null, null, (x) => (x > 1 ? 0.5 : 0));
    t.after(() => trail.destroy());
    return trail;
}

test('random spacing and scatter are frame-independent, grounded, and follow turns', (t) => {
    const trail = fixture(t);
    trail.sample(0, 0, 4, 0);
    const positions = trail.pool.filter((p) => p.remaining > 0).map((p) => ({ ...p.entity.position }));
    assert.ok(positions.length > 5);
    assert.ok(trail.pool.every((p) => p.entity.particlesystem.emitter.material.depthTest !== false));
    assert.ok(trail.pool.every((p) => p.entity.particlesystem.emitter.material.depthWrite === false));
    const gaps = positions.slice(1).map((p, i) => +(p.x - positions[i].x).toFixed(3));
    assert.ok(new Set(gaps).size > 3);
    assert.ok(new Set(positions.map((p) => +p.z.toFixed(3))).size > 3);
    assert.ok(positions.every((p) => Math.abs(p.z) <= 0.24));
    assert.ok(positions.every((p) => Math.abs(p.y - (p.x > 1 ? 0.84 : 0.34)) < 1e-6));
    trail.reset();
    for (let i = 0; i < 40; i++) trail.sample(i / 10, 0, 0.1, 0);
    const split = trail.pool.filter((p) => p.remaining > 0).map((p) => p.entity.position);
    assert.equal(split.length, positions.length);
    split.forEach((p, i) => {
        assert.ok(Math.abs(p.x - positions[i].x) < 1e-8);
        assert.ok(Math.abs(p.z - positions[i].z) < 1e-8);
    });
    trail.sample(20, 20, 0, 0); // A teleport/blocked input is not locomotion.
    assert.equal(trail.count, positions.length);
    trail.reset();
    trail.sample(4, 0, 0, 2);
    assert.ok(trail.pool.filter((p) => p.remaining > 0).every((p) => Math.abs(p.entity.position.x - 4) <= 0.24));
});

test('pool stays bounded, puffs expire, reuse slots, and reset clears distance', (t) => {
    const trail = fixture(t);
    trail.sample(0, 0, 30, 0);
    assert.equal(trail.count, 20);
    trail.update(0.35);
    assert.equal(trail.count, 20);
    trail.update(0.35);
    assert.equal(trail.count, 0);
    assert.ok(trail.pool.every((p) => !p.entity.enabled));
    trail.sample(30, 0, 0.7, 0);
    assert.ok(trail.count >= 1);
    assert.equal(trail.pool.length, 20);
    trail.reset();
    trail.sample(0, 0, 0.2, 0);
    assert.equal(trail.count, 0);
});
