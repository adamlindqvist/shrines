import type { AppContext, SceneInstance } from '../app/context';
import { adventureJourney, levelDefinitions, sceneDefinitions } from '../levels';
import type { JourneyDefinition } from '../levels/types';
import { validateLevel } from '../levels/validate';

import { createAdventureArea } from './adventure-area';

/** Scene changes happen after update returns, never inside a running game's callback. */
export function createJourneyScene(
    context: AppContext,
    startAt = 'meadow',
    journey: JourneyDefinition = adventureJourney
): SceneInstance {
    if (new Set(journey.levels).size !== journey.levels.length) throw new Error('Journey level IDs must be unique');
    if (!journey.levels.includes(startAt) || !journey.levels.includes(journey.restart))
        throw new Error('Journey start/restart must be registered in its levels');
    for (const id of journey.levels) {
        const level = levelDefinitions[id];
        const scene = level && sceneDefinitions[level.scene];
        if (!level || !scene) throw new Error(`Unknown level or scene: ${id}`);
        validateLevel(level, scene);
    }
    let pending: { id: string; health: number } | null = null;
    const maxHealth = levelDefinitions[journey.restart].hud.maxHealth;
    const create = (id: string, health: number) => {
        const index = journey.levels.indexOf(id);
        const level = levelDefinitions[id];
        return createAdventureArea(context, sceneDefinitions[level.scene], level, {
            initialHealth: health,
            stage: index + 1,
            onComplete:
                index < journey.levels.length - 1
                    ? (remaining) => {
                          pending = { id: journey.levels[index + 1], health: remaining };
                      }
                    : undefined,
            onRestart: () => {
                pending = { id: journey.restart, health: maxHealth };
            }
        });
    };
    let active = create(startAt, maxHealth);
    return {
        update(dt) {
            active.update(dt);
            if (!pending) return;
            const next = pending;
            pending = null;
            active.destroy();
            active = create(next.id, next.health);
            active.resize();
        },
        resize: () => active.resize(),
        destroy() {
            pending = null;
            active.destroy();
        }
    };
}
