import type { Entity } from 'playcanvas';

import { box, cylinder, node, sphere } from '../rendering/primitives';

import type { PropContext } from './context';

/** Named parts the player behaviour animates. */
export type AdventurerHandles = {
    entity: Entity;
    visual: Entity;
    leftBoot: Entity;
    rightBoot: Entity;
    swordPivot: Entity;
};

export const BOOT_X = 0.16,
    BOOT_Y = 0.13,
    BOOT_Z = 0.025;

/** Hooded little adventurer with sword and shield, facing +Z from the origin of `root`. */
export function createAdventurer({ palette: c }: PropContext, root: Entity): AdventurerHandles {
    const visual = node(root, 'adventurer visual');
    visual.setLocalScale(1.35, 1.35, 1.35);
    const leftBoot = sphere(visual, 'left boot', c.boot, -BOOT_X, BOOT_Y, BOOT_Z, 0.27, 0.26, 0.4),
        rightBoot = sphere(visual, 'right boot', c.boot, BOOT_X, BOOT_Y, BOOT_Z, 0.27, 0.26, 0.4);
    sphere(visual, 'tunic', c.teal, 0, 0.52, 0, 0.68, 0.7, 0.48);
    box(visual, 'belt', c.brown, 0, 0.42, 0.01, 0.66, 0.12, 0.49);
    box(visual, 'buckle', c.gold, 0, 0.43, 0.265, 0.16, 0.14, 0.055);
    sphere(visual, 'oversize hood', c.teal, 0, 1.2, -0.03, 1.1, 1.1, 0.96);
    sphere(visual, 'warm face', c.skin, 0, 1.16, 0.375, 0.78, 0.75, 0.27);
    sphere(visual, 'hair sweep', c.brown, -0.1, 1.49, 0.44, 0.56, 0.2, 0.11);
    for (const x of [-0.19, 0.19]) {
        sphere(visual, 'bright eye', c.black, x, 1.19, 0.518, 0.077, 0.14, 0.04);
        sphere(visual, 'eye glint', c.cream, x - 0.012, 1.22, 0.54, 0.025, 0.035, 0.014);
    }
    sphere(visual, 'tiny nose', c.skin, 0, 1.08, 0.535, 0.1, 0.09, 0.06);
    sphere(visual, 'hood knot', c.teal, -0.45, 1.1, -0.25, 0.37, 0.48, 0.4);
    sphere(visual, 'left hand', c.skin, -0.43, 0.57, 0.13, 0.22, 0.22, 0.22);
    sphere(visual, 'right hand', c.skin, 0.43, 0.57, 0.13, 0.22, 0.22, 0.22);
    const swordPivot = node(visual, 'sword hand', -0.44, 0.56, 0.16);
    const sword = box(swordPivot, 'little silver blade', c.silver, 0, -0.3, 0.09, 0.13, 0.67, 0.055);
    sword.setLocalEulerAngles(-15, 0, -14);
    box(swordPivot, 'gold sword guard', c.gold, 0, -0.02, 0.07, 0.3, 0.065, 0.1);
    const shield = cylinder(visual, 'small round shield', c.gold, 0.47, 0.62, 0.2, 0.41, 0.065, 0.41);
    shield.setLocalEulerAngles(90, 0, 0);
    const shieldInset = cylinder(visual, 'shield inset', c.barkLight, 0.47, 0.62, 0.24, 0.29, 0.02, 0.29);
    shieldInset.setLocalEulerAngles(90, 0, 0);
    return { entity: root, visual, leftBoot, rightBoot, swordPivot };
}
