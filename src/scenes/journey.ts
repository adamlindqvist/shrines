import type { AppContext, SceneInstance } from '../app/context';
import type { ProgressStore } from '../app/progress';
import { adventureJourney, levelDefinitions, sceneDefinitions } from '../levels';
import type { JourneyDefinition, TitleCard } from '../levels/types';
import { validateLevel } from '../levels/validate';

import { createAdventureArea } from './adventure-area';

/** Scene changes happen after update returns, never inside a running game's callback. */
export function createJourneyScene(
    context: AppContext,
    startAt = 'meadow',
    journey: JourneyDefinition = adventureJourney,
    progress?: ProgressStore,
    allowLockedLevels = false
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
    const create = (id: string, health: number, title?: TitleCard) => {
        const index = journey.levels.indexOf(id);
        const level = levelDefinitions[id];
        return createAdventureArea(context, sceneDefinitions[level.scene], level, {
            initialHealth: health,
            stage: index + 1,
            title,
            onLevelCompleted: progress ? () => progress.complete(id) : undefined,
            levelMenu: progress
                ? {
                      choices: () =>
                          journey.levels.map((levelId) => ({
                              id: levelId,
                              name: sceneDefinitions[levelDefinitions[levelId].scene].name,
                              unlocked: allowLockedLevels || progress.isUnlocked(levelId),
                              completed: progress.isCompleted(levelId),
                              current: levelId === id,
                              checkpoint: levelId === progress.checkpoint
                          })),
                      select: (levelId) => {
                          if (
                              !journey.levels.includes(levelId) ||
                              (!allowLockedLevels && !progress.isUnlocked(levelId)) ||
                              pending
                          )
                              return;
                          pending = { id: levelId, health: levelDefinitions[levelId].hud.maxHealth };
                      }
                  }
                : undefined,
            onComplete:
                index < journey.levels.length - 1
                    ? (remaining) => {
                          pending = { id: journey.levels[index + 1], health: remaining };
                      }
                    : undefined,
            // Defeat retries the current area with full hearts; after victory the journey starts over.
            onRestart: (after) => {
                pending =
                    after === 'over' ? { id, health: level.hud.maxHealth } : { id: journey.restart, health: maxHealth };
            }
        });
    };
    // Only the opening area shows the title splash; area changes and restarts go straight to play.
    const title = journey.title && {
        ...journey.title,
        ...(progress && (progress.checkpoint !== journey.levels[0] || progress.isCompleted(startAt))
            ? {
                  start: 'Fortsätt äventyret',
                  copy: `Fortsätt i ${sceneDefinitions[levelDefinitions[startAt].scene].name}. Dina områden väntar på dig.`
              }
            : {})
    };
    let active = create(startAt, levelDefinitions[startAt].hud.maxHealth, title);
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
