import { level as driftingStonesLevel, scene as driftingStonesScene } from './drifting-stones';
import { level as lanternLakeLevel, scene as lanternLakeScene } from './lantern-lake';
import { level as meadowLevel, scene as meadowScene } from './meadow';
import { level as sunGateLevel, scene as sunGateScene } from './sun-gate';
import { level as sunMoonLevel, scene as sunMoonScene } from './sun-moon';
import { level as twinBridgesLevel, scene as twinBridgesScene } from './twin-bridges';
import type { JourneyDefinition, LevelDefinition, SceneDefinition } from './types';

export const sceneDefinitions: Record<string, SceneDefinition> = {
    meadow: meadowScene,
    'sun-moon': sunMoonScene,
    'twin-bridges': twinBridgesScene,
    'sun-gate': sunGateScene,
    'drifting-stones': driftingStonesScene,
    'lantern-lake': lanternLakeScene
};
export const levelDefinitions: Record<string, LevelDefinition> = {
    meadow: meadowLevel,
    'sun-moon': sunMoonLevel,
    'twin-bridges': twinBridgesLevel,
    'sun-gate': sunGateLevel,
    'drifting-stones': driftingStonesLevel,
    'lantern-lake': lanternLakeLevel
};
export const adventureJourney: JourneyDefinition = {
    levels: ['meadow', 'sun-moon', 'twin-bridges', 'sun-gate', 'drifting-stones', 'lantern-lake'],
    restart: 'meadow',
    title: {
        eyebrow: 'Ett äventyr',
        title: 'Shrines',
        copy: 'Knuffa lådorna rätt så öppnas vägen vidare.',
        start: 'Börja äventyret',
        hint: 'WASD eller pilar för att gå · Mellanslag för att lyfta eller svinga · Håll Shift eller högerklick för sköld',
        touchHint: 'Styrspaken för att gå · ⚔️ för att lyfta eller svinga · Håll 🛡️ för sköld'
    }
};
