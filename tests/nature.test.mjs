import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
    resolve(s, c, next) {
        return next(s.startsWith('.') && !/\.[a-z]+$/.test(s) ? `${s}.ts` : s, c);
    }
});
const { loadNatureModels } = await import('../src/rendering/nature-pack.ts');

function harness() {
    let asset;
    const events = [];
    const assets = new Set();
    const dispose = loadNatureModels(
        {
            assets: {
                add(a) {
                    assets.add(a);
                },
                remove(a) {
                    assets.delete(a);
                },
                load(a) {
                    asset = a;
                    a.loading = true;
                }
            }
        },
        () => events.push('ready'),
        () => events.push('error')
    );
    return {
        dispose,
        events,
        assets,
        finish() {
            asset.loading = false;
            asset.loaded = true;
            asset.resource = {
                instantiateRenderEntity() {
                    events.push('template');
                    return { destroy: () => events.push('template destroyed') };
                },
                destroy() {
                    events.push('container destroyed');
                }
            };
            asset.fire('load', asset);
        },
        fail() {
            asset.loading = false;
            asset.fire('error', 'missing GLB');
        }
    };
}

test('nature loading cancelled by a scene switch releases the late container without creating a template', () => {
    const h = harness();
    h.dispose();
    h.finish();
    assert.deepEqual(h.events, ['container destroyed']);
    assert.equal(h.assets.size, 0);
});

test('nature teardown releases templates before the shared container and is repeatable', () => {
    const h = harness();
    h.finish();
    h.dispose();
    h.dispose();
    assert.deepEqual(h.events, ['template', 'ready', 'template destroyed', 'container destroyed']);
    assert.equal(h.assets.size, 0);
});

test('failed nature loading removes the asset and reports an error only to a live scene', () => {
    for (const cancelled of [false, true]) {
        const h = harness();
        if (cancelled) h.dispose();
        h.fail();
        assert.deepEqual(h.events, cancelled ? [] : ['error']);
        assert.equal(h.assets.size, 0);
    }
});
