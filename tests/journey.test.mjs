import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
    resolve(specifier, context, next) {
        if (specifier === './adventure-area' && context.parentURL.endsWith('/src/scenes/journey.ts')) {
            return {
                url: 'data:text/javascript,export const createAdventureArea = (...args) => globalThis.buildJourneyArea(...args);',
                shortCircuit: true
            };
        }
        if (specifier === '../levels') return next('../levels/index.ts', context);
        return next(specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier) ? `${specifier}.ts` : specifier, context);
    }
});
const { createJourneyScene } = await import('../src/scenes/journey.ts');
const { adventureJourney, levelDefinitions, sceneDefinitions } = await import('../src/levels/index.ts');
const { ProgressStore } = await import('../src/app/progress.ts');

function fixture(t, completed = [], allowLockedLevels = false) {
    let saved = null;
    const storage = { getItem: () => saved, setItem: (_, value) => (saved = value) };
    const progress = new ProgressStore(adventureJourney.levels, () => storage);
    completed.forEach((id) => progress.complete(id));
    const areas = [];
    const events = [];
    globalThis.buildJourneyArea = (_, scene, level, hooks) => {
        const area = { id: level.id, hooks, scene };
        areas.push(area);
        events.push(`create:${level.id}`);
        return {
            update: () => area.update?.(),
            resize: () => events.push(`resize:${level.id}`),
            destroy: () => events.push(`destroy:${level.id}`)
        };
    };
    const journey = createJourneyScene({}, progress.checkpoint, adventureJourney, progress, allowLockedLevels);
    t.after(() => {
        journey.destroy();
        delete globalThis.buildJourneyArea;
    });
    return { progress, journey, areas, events, storage };
}

test('completion saves before transition and carries hearts; reload uses fresh health and a continue title', (t) => {
    const { progress, journey, areas, events, storage } = fixture(t);
    areas[0].update = () => {
        areas[0].hooks.onLevelCompleted();
        areas[0].hooks.onComplete(2);
        assert.equal(progress.checkpoint, 'sun-moon');
        assert.equal(areas.length, 1, 'no scene destruction inside the active update');
    };
    journey.update(1 / 60);
    assert.equal(areas[1].id, 'sun-moon');
    assert.equal(areas[1].hooks.initialHealth, 2);
    assert.equal(areas[1].hooks.title, undefined);
    assert.deepEqual(events.slice(1), ['destroy:meadow', 'create:sun-moon', 'resize:sun-moon']);
    const restored = new ProgressStore(adventureJourney.levels, () => storage);
    const reload = createJourneyScene({}, restored.checkpoint, adventureJourney, restored);
    assert.equal(areas[2].id, 'sun-moon');
    assert.equal(areas[2].hooks.initialHealth, 3);
    assert.equal(areas[2].hooks.title.start, 'Fortsätt äventyret');
    reload.destroy();
});

test('the five-area journey goes directly from Sun & Moon Grove to Solgrinden with carried hearts', (t) => {
    const expected = ['meadow', 'sun-moon', 'sun-gate', 'drifting-stones', 'lantern-lake'];
    assert.deepEqual(adventureJourney.levels, expected);
    assert.deepEqual(Object.keys(levelDefinitions), expected);
    assert.deepEqual(Object.keys(sceneDefinitions), expected);
    const { progress, journey, areas } = fixture(t, ['meadow']);
    assert.equal(areas[0].id, 'sun-moon');
    areas[0].update = () => {
        areas[0].hooks.onLevelCompleted();
        areas[0].hooks.onComplete(2);
    };
    journey.update(1 / 60);
    assert.equal(areas[1].id, 'sun-gate');
    assert.equal(areas[1].hooks.stage, 3);
    assert.equal(areas[1].hooks.initialHealth, 2);
    assert.equal(progress.checkpoint, 'sun-gate');
    assert.deepEqual(
        areas[1].hooks.levelMenu.choices().map((level) => level.id),
        expected
    );
});

test('menu switches are queued, reject locked IDs, and replays preserve the saved checkpoint', (t) => {
    const { progress, journey, areas } = fixture(t, ['meadow', 'sun-moon']);
    const menu = areas[0].hooks.levelMenu;
    assert.equal(areas[0].id, 'sun-gate');
    assert.deepEqual(
        menu.choices().map((level) => level.unlocked),
        [true, true, true, false, false]
    );
    menu.select('lantern-lake');
    journey.update(1 / 60);
    assert.equal(areas.length, 1);
    menu.select('meadow');
    assert.equal(areas.length, 1);
    journey.update(1 / 60);
    assert.equal(areas[1].id, 'meadow');
    assert.equal(areas[1].hooks.initialHealth, 3);
    assert.equal(areas[1].hooks.title, undefined);
    areas[1].hooks.onLevelCompleted();
    areas[1].hooks.onComplete(2);
    journey.update(1 / 60);
    assert.equal(areas[2].id, 'sun-moon');
    assert.equal(progress.checkpoint, 'sun-gate');
});

test('development selector allows all areas without changing saved unlocks', (t) => {
    const { progress, journey, areas, storage } = fixture(t, [], true);
    const menu = areas[0].hooks.levelMenu;
    assert.ok(menu.choices().every((level) => level.unlocked));
    menu.select('unknown');
    journey.update(1 / 60);
    assert.equal(areas.length, 1);
    menu.select('lantern-lake');
    assert.equal(areas.length, 1, 'scene changes are still queued');
    journey.update(1 / 60);
    assert.equal(areas[1].id, 'lantern-lake');
    assert.equal(areas[1].hooks.initialHealth, 3);
    assert.equal(areas[1].hooks.title, undefined);
    assert.equal(progress.checkpoint, 'meadow');
    assert.equal(progress.isUnlocked('lantern-lake'), false);
    assert.equal(storage.getItem(), null);
});

test('defeat retries the current level; final victory and starting over retain unlocks', (t) => {
    const { progress, journey, areas } = fixture(t, adventureJourney.levels.slice(0, -1));
    const final = areas[0];
    assert.equal(final.id, 'lantern-lake');
    assert.equal(final.hooks.onComplete, undefined, 'the final area still shows the victory card');
    final.hooks.onRestart('over');
    journey.update(1 / 60);
    assert.equal(areas[1].id, 'lantern-lake');
    areas[1].hooks.onLevelCompleted();
    assert.equal(areas[1].hooks.levelMenu.choices().at(-1).completed, true);
    areas[1].hooks.onRestart('won');
    journey.update(1 / 60);
    assert.equal(areas[2].id, 'meadow');
    assert.equal(progress.checkpoint, 'lantern-lake');
    assert.ok(adventureJourney.levels.every((id) => progress.isUnlocked(id) && progress.isCompleted(id)));
});

test('development journeys have no persistence or replay menu', (t) => {
    const { areas } = fixture(t);
    const inspected = createJourneyScene({}, 'sun-gate');
    assert.equal(areas[1].hooks.onLevelCompleted, undefined);
    assert.equal(areas[1].hooks.levelMenu, undefined);
    inspected.destroy();
});
