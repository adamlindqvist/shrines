import assert from 'node:assert/strict';
import test from 'node:test';

import { PROGRESS_KEY, ProgressStore } from '../src/app/progress.ts';

const levels = ['meadow', 'sun-moon', 'sun-gate', 'drifting-stones', 'lantern-lake', 'returning-glade'];

function storage(saved = null) {
    let value = saved;
    return {
        getItem: (key) => (key === PROGRESS_KEY ? value : null),
        setItem(key, next) {
            assert.equal(key, PROGRESS_KEY);
            value = next;
        }
    };
}

test('a fresh journey unlocks only Meadow; three completions resume the fourth area after reload', () => {
    const disk = storage();
    const progress = new ProgressStore(levels, () => disk);
    assert.equal(progress.checkpoint, 'meadow');
    assert.equal(progress.isUnlocked('meadow'), true);
    assert.equal(progress.isUnlocked('sun-moon'), false);
    for (const id of levels.slice(0, 3)) progress.complete(id);
    const restored = new ProgressStore(levels, () => disk);
    assert.equal(restored.checkpoint, 'drifting-stones');
    assert.ok(levels.slice(0, 3).every((id) => restored.isCompleted(id)));
    assert.equal(restored.isUnlocked('drifting-stones'), true);
    assert.equal(restored.isUnlocked('lantern-lake'), false);
});

test('replays, invalid IDs and locked completion cannot move the checkpoint backwards or skip ahead', () => {
    const disk = storage();
    const progress = new ProgressStore(levels, () => disk);
    progress.complete('lantern-lake');
    progress.complete('unknown');
    assert.equal(progress.checkpoint, 'meadow');
    progress.complete('meadow');
    progress.complete('sun-moon');
    progress.complete('meadow');
    const restored = new ProgressStore(levels, () => disk);
    assert.equal(restored.checkpoint, 'sun-gate');
    assert.equal(restored.isUnlocked('unknown'), false);
    assert.deepEqual(JSON.parse(disk.getItem(PROGRESS_KEY)).completedLevelIds, ['meadow', 'sun-moon']);
});

test('final victory persists its completion and keeps every level available', () => {
    const disk = storage();
    const progress = new ProgressStore(levels, () => disk);
    levels.forEach((id) => progress.complete(id));
    const restored = new ProgressStore(levels, () => disk);
    assert.equal(restored.checkpoint, 'returning-glade');
    assert.ok(levels.every((id) => restored.isUnlocked(id) && restored.isCompleted(id)));
});

test('missing, corrupt, unsupported and unknown checkpoints fall back to Meadow', () => {
    for (const saved of [
        null,
        'broken JSON',
        'null',
        '42',
        '[]',
        '{"version":2,"furthestLevelId":"sun-gate"}',
        '{"version":1,"furthestLevelId":"removed-level"}',
        '{"version":1,"furthestLevelId":42}'
    ]) {
        const progress = new ProgressStore(levels, () => storage(saved));
        assert.equal(progress.checkpoint, 'meadow');
        assert.equal(progress.isCompleted('meadow'), false);
    }
});

test('saved IDs are sanitized and stay stable when a new level is appended', () => {
    const disk = storage(
        JSON.stringify({
            version: 1,
            furthestLevelId: 'sun-gate',
            completedLevelIds: ['meadow', 'removed', 'meadow', 5, 'lantern-lake']
        })
    );
    const progress = new ProgressStore([...levels, 'new-level'], () => disk);
    assert.equal(progress.checkpoint, 'sun-gate');
    assert.equal(progress.isCompleted('meadow'), true);
    assert.equal(progress.isCompleted('lantern-lake'), false);
    assert.equal(progress.isUnlocked('new-level'), false);
    const malformed = new ProgressStore(levels, () =>
        storage('{"version":1,"furthestLevelId":"sun-moon","completedLevelIds":{}}')
    );
    assert.equal(malformed.checkpoint, 'sun-moon');
    assert.equal(malformed.isCompleted('meadow'), false);
});

test('denied storage access and writes retain playable session progress', () => {
    const denied = new ProgressStore(levels, () => {
        throw new Error('Storage denied');
    });
    denied.complete('meadow');
    assert.equal(denied.checkpoint, 'sun-moon');
    const full = new ProgressStore(levels, () => ({
        getItem: () => null,
        setItem: () => {
            throw new Error('Storage full');
        }
    }));
    full.complete('meadow');
    full.complete('sun-moon');
    assert.equal(full.checkpoint, 'sun-gate');
});

test('a retired Twin Bridges checkpoint resumes Solgrinden and preserves earlier completions', () => {
    const disk = storage(
        JSON.stringify({
            version: 1,
            furthestLevelId: 'twin-bridges',
            completedLevelIds: ['meadow', 'sun-moon']
        })
    );
    const progress = new ProgressStore(levels, () => disk);
    assert.equal(progress.checkpoint, 'sun-gate');
    assert.ok(['meadow', 'sun-moon'].every((id) => progress.isCompleted(id)));
    assert.equal(progress.isUnlocked('sun-gate'), true);
    assert.equal(progress.isUnlocked('drifting-stones'), false);
    assert.equal(progress.isUnlocked('twin-bridges'), false);
    progress.complete('sun-gate');
    assert.equal(JSON.parse(disk.getItem(PROGRESS_KEY)).furthestLevelId, 'drifting-stones');
});

test('later saved checkpoints ignore the retired level without losing remaining completions', () => {
    const disk = storage(
        JSON.stringify({
            version: 1,
            furthestLevelId: 'lantern-lake',
            completedLevelIds: ['meadow', 'sun-moon', 'twin-bridges', 'sun-gate', 'drifting-stones']
        })
    );
    const progress = new ProgressStore(levels, () => disk);
    assert.equal(progress.checkpoint, 'lantern-lake');
    assert.ok(levels.slice(0, 5).every((id) => progress.isUnlocked(id)));
    assert.equal(progress.isUnlocked('returning-glade'), false);
    assert.ok(levels.slice(0, 4).every((id) => progress.isCompleted(id)));
    assert.equal(progress.isCompleted('twin-bridges'), false);
});

test('a completed former finale unlocks the sixth area without marking it completed', () => {
    const disk = storage(
        JSON.stringify({ version: 1, furthestLevelId: 'lantern-lake', completedLevelIds: levels.slice(0, 5) })
    );
    const progress = new ProgressStore(levels, () => disk);
    assert.equal(progress.checkpoint, 'returning-glade');
    assert.ok(levels.every((id) => progress.isUnlocked(id)));
    assert.ok(levels.slice(0, 5).every((id) => progress.isCompleted(id)));
    assert.equal(progress.isCompleted('returning-glade'), false);
    progress.complete('meadow');
    assert.equal(new ProgressStore(levels, () => disk).checkpoint, 'returning-glade');
    assert.equal(JSON.parse(disk.getItem(PROGRESS_KEY)).version, 1);
});

test('unfinished or malformed former-finale completions never unlock the sixth area', () => {
    for (const completedLevelIds of [levels.slice(0, 4), null, {}, 'lantern-lake']) {
        const progress = new ProgressStore(levels, () =>
            storage(JSON.stringify({ version: 1, furthestLevelId: 'lantern-lake', completedLevelIds }))
        );
        assert.equal(progress.checkpoint, 'lantern-lake');
        assert.equal(progress.isUnlocked('returning-glade'), false);
    }
});
