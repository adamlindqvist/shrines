import type { AppContext, SceneInstance } from '../app/context';

import { createAdventureArea } from './adventure-area';
import { meadowArea } from './meadow';
import { sunMoonArea } from './sun-moon';
import { twoSunsArea } from './two-suns';

/** Scene changes happen after update returns, never inside a running game's callback. */
export function createJourneyScene(context: AppContext, startAt = 0): SceneInstance {
    const areas = [meadowArea, sunMoonArea, twoSunsArea];
    let pending: { area: number; health: number } | null = null;
    const create = (index: number, health: number) =>
        createAdventureArea(context, areas[index], {
            initialHealth: health,
            onComplete:
                index < areas.length - 1
                    ? (remaining) => {
                          pending = { area: index + 1, health: remaining };
                      }
                    : undefined,
            onRestart: () => {
                pending = { area: 0, health: meadowArea.game.hud.maxHealth };
            }
        });
    let active = create(startAt, meadowArea.game.hud.maxHealth);
    return {
        update(dt) {
            active.update(dt);
            if (!pending) return;
            const next = pending;
            pending = null;
            active.destroy();
            active = create(next.area, next.health);
            active.resize();
        },
        resize: () => active.resize(),
        destroy() {
            pending = null;
            active.destroy();
        }
    };
}
