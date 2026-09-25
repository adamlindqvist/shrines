import type { SceneResources } from './resources';

/** The shared storybook material set used by props and characters. */
export function createPalette(resources: SceneResources) {
    const mat = resources.material.bind(resources);
    // Dedicated cue materials keep the block highlight bright without altering other props.
    const grabHint = mat('ivory grab glow', '#fff0b9', 80, 0.3);
    grabHint.emissive.copy(grabHint.diffuse);
    grabHint.emissiveIntensity = 2.4;
    grabHint.update();
    const grabSelected = mat('gold held glow', '#ffd45e', 85, 0.35);
    grabSelected.emissive.copy(grabSelected.diffuse);
    grabSelected.emissiveIntensity = 3.2;
    grabSelected.update();
    const portalGlow = mat('portal glow', '#63e3d4', 70, 0.2);
    portalGlow.emissive.copy(portalGlow.diffuse);
    portalGlow.emissiveIntensity = 1.4;
    portalGlow.update();
    const portalLight = mat('portal swirl', '#fff6dc', 70, 0.2);
    portalLight.emissive.copy(portalLight.diffuse);
    portalLight.emissiveIntensity = 1.8;
    portalLight.update();
    return {
        blockStone: [
            mat('turquoise stone', '#27bcb7', 25, 0.08),
            mat('turquoise stone light facets', '#2bc1bb', 25, 0.08),
            mat('turquoise stone shaded facets', '#25b7b2', 25, 0.08)
        ],
        blockRecess: mat('deep turquoise carving', '#087d79', 15),
        grabHint,
        grabSelected,
        portalGlow,
        portalLight,
        bark: mat('warm bark', '#9c6530'),
        barkLight: mat('cut timber', '#d6ab6c'),
        leaf: mat('clover leaves', '#5ca936'),
        leafLight: mat('sunlit leaves', '#86c740'),
        leafDark: mat('deep foliage', '#3a8130'),
        stone: mat('warm grey stone', '#c4bcb0', 12),
        paving: mat('pale paving', '#d3cdc2', 14),
        teal: mat('turquoise enamel', '#45d3c4', 46, 0.13),
        tealDark: mat('turquoise inset', '#24a89e', 40, 0.1),
        gold: mat('sunshine gold', '#f7bd2c', 60, 0.2),
        cream: mat('warm ivory', '#f6e2b2'),
        sandstone: mat('sun plinth', '#dcb172', 22),
        brown: mat('chest wood', '#b5762c', 28),
        terra: mat('terracotta', '#dd8450', 34, 0.09),
        black: mat('warm ink', '#33241f'),
        pink: mat('strawberry slime', '#ff8b90', 52, 0.16),
        cloth: mat('soft turquoise cloth', '#39bfb2', 8),
        clothLight: mat('hood piping', '#75d8c7', 8),
        clothDark: mat('hood lining', '#248e87', 8),
        cheek: mat('warm rosy cheeks', '#e9a18b', 8),
        skin: mat('peach face', '#f6c084'),
        boot: mat('chocolate boots', '#6b472a'),
        silver: mat('sword silver', '#d5e3e6', 62, 0.25),
        foam: mat('river foam', '#c9f1fb', 60, 0.2)
    };
}

export type Palette = ReturnType<typeof createPalette>;
