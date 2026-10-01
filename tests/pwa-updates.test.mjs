import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
    resolve(specifier, context, next) {
        if (specifier === 'virtual:pwa-register') {
            return {
                url: 'data:text/javascript,export const registerSW = (options) => globalThis.registerPwaTest(options);',
                shortCircuit: true
            };
        }
        return next(specifier, context);
    }
});
const { registerGameUpdates } = await import('../src/app/pwa-updates.ts');

function setup(t, initiallyControlled = true) {
    const notice = new EventTarget();
    const reload = {};
    const later = {};
    notice.setAttribute = () => undefined;
    notice.querySelector = (selector) => (selector === '.update-reload' ? reload : later);
    const document = Object.assign(new EventTarget(), {
        hidden: false,
        createElement: () => notice,
        body: { appendChild: () => undefined }
    });
    const serviceWorker = Object.assign(new EventTarget(), { controller: initiallyControlled ? {} : null });
    let reloads = 0;
    let activations = 0;
    let options;
    let periodicCheck;
    const window = Object.assign(new EventTarget(), {
        location: { reload: () => reloads++ },
        setInterval: (check) => (periodicCheck = check)
    });
    const globals = {
        document,
        window,
        navigator: { serviceWorker, onLine: true },
        registerPwaTest: (callbacks) => {
            options = callbacks;
            return async () => activations++;
        }
    };
    for (const [key, value] of Object.entries(globals)) {
        const original = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { configurable: true, value });
        t.after(() => {
            if (original) Object.defineProperty(globalThis, key, original);
            else delete globalThis[key];
        });
    }
    registerGameUpdates();
    return {
        notice,
        reload,
        later,
        options,
        document,
        controllerChanged() {
            serviceWorker.controller = {};
            serviceWorker.dispatchEvent(new Event('controllerchange'));
        },
        reloads: () => reloads,
        activations: () => activations,
        check: () => periodicCheck()
    };
}

test('update activation waits for consent, and reload waits for the new controller', async (t) => {
    const app = setup(t);
    app.options.onNeedRefresh();
    assert.equal(app.notice.hidden, false);
    app.later.onclick();
    assert.equal(app.notice.hidden, true);
    assert.equal(app.activations(), 0);
    assert.equal(app.reloads(), 0);
    app.options.onNeedRefresh();
    await app.reload.onclick();
    assert.equal(app.activations(), 1);
    assert.equal(app.reloads(), 0);
    app.controllerChanged();
    app.options.onNeedReload();
    assert.equal(app.reloads(), 1);
});

test('another window activating an update preserves this adventure until its reload button is pressed', async (t) => {
    const app = setup(t);
    app.options.onNeedRefresh();
    app.later.onclick();
    app.controllerChanged();
    assert.equal(app.reloads(), 0);
    assert.equal(app.notice.hidden, false);
    await app.reload.onclick();
    assert.equal(app.reloads(), 1);
    assert.equal(app.activations(), 0);
});

test('first-ever installation stays quiet, and subsequent updates work without an intermediate reload', async (t) => {
    const app = setup(t, false);
    app.controllerChanged();
    assert.equal(app.notice.hidden, true);
    assert.equal(app.reloads(), 0);
    app.options.onNeedRefresh();
    await app.reload.onclick();
    app.controllerChanged();
    assert.equal(app.reloads(), 1);
});

test('offline or failed update checks keep the cached game running', async (t) => {
    const app = setup(t);
    let checks = 0;
    app.document.hidden = true;
    app.options.onRegisteredSW('/sw.js', {
        update: async () => {
            checks++;
            throw new Error('Server unavailable');
        }
    });
    await app.check();
    assert.equal(checks, 0);
    app.document.hidden = false;
    navigator.onLine = false;
    await app.check();
    assert.equal(checks, 0);
    navigator.onLine = true;
    await app.check();
    assert.equal(checks, 1);
    assert.equal(app.notice.hidden, true);
    assert.equal(app.reloads(), 0);
});
