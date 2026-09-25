import type { Bounds } from '../gameplay/collision';
import { BRIDGE } from '../objects/shrine';

import type { Condition, LevelDefinition, SceneDefinition, SceneObject } from './types';

/** Validate references before allocating any GPU resources or installing listeners. */
export function validateLevel(level: LevelDefinition, scene: SceneDefinition) {
    const fail = (path: string, reason: string): never => {
        throw new Error(`Level ${level.id}: ${path}: ${reason}`);
    };
    const finite = (value: number, path: string) => {
        if (!Number.isFinite(value)) fail(path, 'must be finite');
    };
    const positive = (value: number, path: string) => {
        finite(value, path);
        if (value <= 0) fail(path, 'must be positive');
    };
    const bounds = (value: Bounds, path: string) => {
        for (const key of ['minX', 'maxX', 'minZ', 'maxZ'] as const) finite(value[key], `${path}.${key}`);
        if (value.minX >= value.maxX || value.minZ >= value.maxZ) fail(path, 'requires min < max');
    };
    // All authoring data must remain JSON-compatible, including camera/terrain data.
    const data = (value: unknown, path: string) => {
        if (typeof value === 'number') finite(value, path);
        else if (Array.isArray(value)) value.forEach((v, i) => data(v, `${path}[${i}]`));
        else if (value && typeof value === 'object') {
            if (Object.getPrototypeOf(value) !== Object.prototype) fail(path, 'requires plain data');
            for (const [key, v] of Object.entries(value)) data(v, `${path}.${key}`);
        } else if (value !== null && !['string', 'boolean'].includes(typeof value)) fail(path, 'requires JSON data');
    };
    data(scene, 'scene');
    data(level, 'level');
    if (level.scene !== scene.id) fail('scene', `unknown scene ${level.scene}`);
    bounds(scene.walkBounds, 'walkBounds');
    bounds(scene.blockBounds, 'blockBounds');
    finite(scene.spawn.x, 'spawn.x');
    finite(scene.spawn.z, 'spawn.z');
    if (
        scene.spawn.x < scene.walkBounds.minX ||
        scene.spawn.x > scene.walkBounds.maxX ||
        scene.spawn.z < scene.walkBounds.minZ ||
        scene.spawn.z > scene.walkBounds.maxZ
    )
        fail('spawn', 'outside walk bounds');
    positive(level.hud.maxHealth, 'hud.maxHealth');
    positive(scene.camera.camera.orthoHeight, 'camera.orthoHeight');
    positive(scene.camera.camera.minVisibleHalfWidth, 'camera.minVisibleHalfWidth');
    if (scene.camera.camera.orthoHeight < 10 || scene.camera.camera.minVisibleHalfWidth < 12)
        fail('camera', 'adventure framing requires half-height >= 10 and half-width >= 12');
    const terrain = scene.terrain;
    positive(terrain.wallHeight, 'terrain.wallHeight');
    if ('kind' in terrain) {
        positive(terrain.blend, 'terrain.blend');
        if (!terrain.land.length) fail('terrain.land', 'must not be empty');
        for (const [i, shape] of [...terrain.land, ...terrain.water, ...terrain.islets].entries()) {
            if ('r' in shape) positive(shape.r, `terrain.shape[${i}].r`);
            else {
                bounds(shape, `terrain.shape[${i}]`);
                positive(shape.radius, `terrain.shape[${i}].radius`);
            }
        }
    } else {
        positive(terrain.halfWidth, 'terrain.halfWidth');
        positive(terrain.halfDepth, 'terrain.halfDepth');
        positive(terrain.cornerRadius, 'terrain.cornerRadius');
    }
    const objects = new Map<string, SceneObject>();
    for (const [i, object] of [...scene.scenery, ...scene.objects].entries()) {
        const path = `objects[${i}]`;
        if ('id' in object) {
            if (!object.id || objects.has(object.id)) fail(`${path}.id`, 'must be nonempty and unique');
            objects.set(object.id, object);
        }
        if ('x' in object) {
            finite(object.x, `${path}.x`);
            finite(object.z, `${path}.z`);
        }
        if ('scale' in object && object.scale !== undefined) positive(object.scale, `${path}.scale`);
        if (object.type === 'bridge') {
            positive(object.length, `${path}.length`);
            if (object.length <= BRIDGE.pillarInset * 2) fail(`${path}.length`, 'too short for bridge pillars');
        }
        if (object.type === 'portal' && object.reach !== undefined) positive(object.reach, `${path}.reach`);
        if (object.type === 'bushCluster') {
            if (object.count !== undefined && (!Number.isInteger(object.count) || object.count < 0))
                fail(path, 'invalid count');
            if (object.spread !== undefined) positive(object.spread, `${path}.spread`);
        }
        if (object.type === 'zone') {
            bounds(object, path);
            finite(object.minY, `${path}.minY`);
            finite(object.maxY, `${path}.maxY`);
            if (object.minY > object.maxY) fail(path, 'requires minY <= maxY');
        }
    }
    const reference = (id: string, type: SceneObject['type'], path: string) => {
        if (objects.get(id)?.type !== type) fail(path, `${id} must reference a ${type}`);
    };
    const condition = (c: Condition, path: string) => {
        switch (c.type) {
            case 'all':
            case 'any':
                if (!c.conditions.length) fail(path, 'conditions must not be empty');
                c.conditions.forEach((child, i) => condition(child, `${path}.conditions[${i}]`));
                break;
            case 'plateActive':
                reference(c.target, 'plate', path);
                break;
            case 'enemyDefeated':
                reference(c.target, 'slime', path);
                break;
            case 'portalReached':
                reference(c.target, 'portal', path);
                break;
            case 'zoneVisited':
                reference(c.target, 'zone', path);
                break;
            default:
                fail(path, 'unknown condition');
        }
    };
    const ids = new Set<string>();
    for (const [i, rule] of level.rules.entries()) {
        const path = `rules[${i}]`;
        if (!rule.id || ids.has(rule.id)) fail(`${path}.id`, 'must be nonempty and unique');
        ids.add(rule.id);
        condition(rule.when, `${path}.when`);
        for (const [j, action] of rule.actions.entries()) {
            if (action.type !== 'openBridge' && action.type !== 'openPortal') fail(path, 'unknown action');
            reference(action.target, action.type === 'openBridge' ? 'bridge' : 'portal', `${path}.actions[${j}]`);
        }
    }
    condition(level.completion, 'completion');
}
