import { level as meadowLevel, scene as meadowScene } from './meadow';
import { level as sunMoonLevel, scene as sunMoonScene } from './sun-moon';
import { level as twinBridgesLevel, scene as twinBridgesScene } from './twin-bridges';
import { level as twoSunsLevel, scene as twoSunsScene } from './two-suns';
import type { JourneyDefinition, LevelDefinition, SceneDefinition } from './types';

export const sceneDefinitions: Record<string, SceneDefinition> = {
    meadow: meadowScene,
    'sun-moon': sunMoonScene,
    'two-suns': twoSunsScene,
    'twin-bridges': twinBridgesScene
};
export const levelDefinitions: Record<string, LevelDefinition> = {
    meadow: meadowLevel,
    'sun-moon': sunMoonLevel,
    'two-suns': twoSunsLevel,
    'twin-bridges': twinBridgesLevel
};
export const adventureJourney: JourneyDefinition = {
    levels: ['meadow', 'sun-moon', 'two-suns', 'twin-bridges'],
    restart: 'meadow'
};
