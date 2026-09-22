import type { SceneResources } from './resources';

/** The shared storybook material set used by props and characters. */
export function createPalette(resources: SceneResources) {
    const mat = resources.material.bind(resources);
    return {
        bark: mat('warm bark', '#9c6530'),
        barkLight: mat('cut timber', '#d6ab6c'),
        leaf: mat('clover leaves', '#5ca936'),
        leafLight: mat('sunlit leaves', '#86c740'),
        leafDark: mat('deep foliage', '#3a8130'),
        stone: mat('warm grey stone', '#c4bcb0', 12),
        teal: mat('turquoise enamel', '#45d3c4', 46, 0.13),
        tealDark: mat('turquoise inset', '#24a89e', 40, 0.1),
        gold: mat('sunshine gold', '#f7bd2c', 60, 0.2),
        cream: mat('warm ivory', '#f6e2b2'),
        sandstone: mat('sun plinth', '#dcb172', 22),
        brown: mat('chest wood', '#b5762c', 28),
        terra: mat('terracotta', '#dd8450', 34, 0.09),
        black: mat('warm ink', '#33241f'),
        pink: mat('strawberry slime', '#ff8b90', 52, 0.16),
        skin: mat('peach face', '#f6c084'),
        boot: mat('chocolate boots', '#6b472a'),
        silver: mat('sword silver', '#d5e3e6', 62, 0.25)
    };
}

export type Palette = ReturnType<typeof createPalette>;
