import type { SceneFactory } from '../app/context';

import { createMeadowScene } from './meadow';
import { createWoodlandScene } from './woodland';

/** Every scene the application can start. Pick one in `main.ts`. */
export const scenes = {
    meadow: createMeadowScene,
    woodland: createWoodlandScene
} satisfies Record<string, SceneFactory>;

export type SceneName = keyof typeof scenes;
