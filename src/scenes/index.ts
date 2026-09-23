import type { SceneFactory } from '../app/context';

import { createJourneyScene } from './journey';
import { createWoodlandScene } from './woodland';

/** Every scene the application can start. Pick one in `main.ts`. */
export const scenes = {
    meadow: createJourneyScene,
    'sun-moon': (context) => createJourneyScene(context, 1),
    woodland: createWoodlandScene
} satisfies Record<string, SceneFactory>;

export type SceneName = keyof typeof scenes;
