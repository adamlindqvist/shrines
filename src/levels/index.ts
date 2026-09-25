import { level as driftingStonesLevel, scene as driftingStonesScene } from './drifting-stones';
import { level as lanternLakeLevel, scene as lanternLakeScene } from './lantern-lake';
import { level as meadowLevel, scene as meadowScene } from './meadow';
import { level as sunMoonLevel, scene as sunMoonScene } from './sun-moon';
import { level as twinBridgesLevel, scene as twinBridgesScene } from './twin-bridges';
import { level as twoSunsLevel, scene as twoSunsScene } from './two-suns';
import type { JourneyDefinition, LevelDefinition, SceneDefinition } from './types';

export const sceneDefinitions: Record<string, SceneDefinition> = {
    meadow: meadowScene,
    'sun-moon': sunMoonScene,
    'two-suns': twoSunsScene,
    'twin-bridges': twinBridgesScene,
    'drifting-stones': driftingStonesScene,
    'lantern-lake': lanternLakeScene
};
export const levelDefinitions: Record<string, LevelDefinition> = {
    meadow: meadowLevel,
    'sun-moon': sunMoonLevel,
    'two-suns': twoSunsLevel,
    'twin-bridges': twinBridgesLevel,
    'drifting-stones': driftingStonesLevel,
    'lantern-lake': lanternLakeLevel
};
export const adventureJourney: JourneyDefinition = {
    levels: ['meadow', 'sun-moon', 'two-suns', 'twin-bridges', 'drifting-stones', 'lantern-lake'],
    restart: 'meadow',
    title: {
        eyebrow: 'Ett äventyr',
        title: 'Shrines',
        copy: 'Knuffa lådorna rätt så öppnas vägen vidare.',
        start: 'Börja äventyret',
        hint: 'WASD eller pilar för att gå · Mellanslag för att lyfta eller svinga',
        touchHint: 'Styrspaken för att gå · ⚔️ för att lyfta eller svinga'
    }
};
