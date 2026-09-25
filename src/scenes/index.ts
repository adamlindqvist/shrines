import type { SceneFactory } from '../app/context';
import { adventureJourney, levelDefinitions } from '../levels';

import { createJourneyScene } from './journey';

/** Registered levels are automatically available to the development scene picker. */
export const scenes: Record<string, SceneFactory> = Object.fromEntries(
    Object.keys(levelDefinitions).map((id) => [
        id,
        (context) =>
            createJourneyScene(
                context,
                id,
                adventureJourney.levels.includes(id) ? adventureJourney : { levels: [id], restart: id }
            )
    ])
);
export type SceneName = keyof typeof scenes;
