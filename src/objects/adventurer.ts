import type { Entity, Vec3, Quat } from 'playcanvas';

import { appendLathe, createGeo, meshEntity } from '../rendering/geometry';
import { box, cylinder, node, roundedBox, sphere } from '../rendering/primitives';

import type { PropContext } from './context';

/** Local rest transforms shared by animation and reset. */
export type RestTransform = { entity: Entity; position: Vec3; rotation: Quat };

/** Named parts the player behaviour animates. */
export type AdventurerHandles = {
    entity: Entity;
    visual: Entity;
    torso: Entity;
    leftBoot: Entity;
    rightBoot: Entity;
    swordPivot: Entity;
    shieldPivot: Entity;
    rest: RestTransform[];
};

export const BOOT_X = 0.16,
    BOOT_Y = 0.13,
    BOOT_Z = 0.025;

/** Hooded little adventurer with sword and shield, facing +Z from the origin of `root`. */
export function createAdventurer({ palette: c, device }: PropContext, root: Entity): AdventurerHandles {
    const visual = node(root, 'adventurer visual');
    visual.setLocalScale(1.35, 1.35, 1.35);
    const leftBoot = node(visual, 'left boot pivot', -BOOT_X, BOOT_Y, BOOT_Z);
    const rightBoot = node(visual, 'right boot pivot', BOOT_X, BOOT_Y, BOOT_Z);
    for (const boot of [leftBoot, rightBoot]) {
        sphere(boot, 'soft leather boot', c.boot, 0, 0, 0, 0.27, 0.23, 0.4);
        sphere(boot, 'boot sole', c.black, 0, -0.075, 0.01, 0.28, 0.11, 0.41);
        cylinder(boot, 'turned boot cuff', c.brown, 0, 0.13, -0.045, 0.255, 0.12, 0.26);
    }
    const torso = node(visual, 'adventurer torso');
    sphere(torso, 'tunic hem', c.clothDark, 0, 0.35, 0, 0.73, 0.28, 0.52);
    sphere(torso, 'soft tunic', c.cloth, 0, 0.55, 0, 0.66, 0.62, 0.48);
    roundedBox(device, torso, 'leather belt', c.boot, 0, 0.43, 0.01, 0.67, 0.105, 0.5, 0.045);
    roundedBox(device, torso, 'gold buckle', c.gold, 0, 0.43, 0.275, 0.15, 0.13, 0.045, 0.02);
    box(torso, 'buckle inset', c.boot, 0, 0.43, 0.301, 0.07, 0.055, 0.01);
    sphere(torso, 'cream collar', c.cream, 0, 0.83, 0.075, 0.57, 0.18, 0.5);
    sphere(torso, 'hood mantle', c.clothDark, 0, 0.88, -0.075, 0.79, 0.25, 0.61);
    sphere(torso, 'oversize hood', c.cloth, 0, 1.25, -0.05, 1.08, 1.02, 0.95);
    sphere(torso, 'raised hood rim', c.clothLight, 0, 1.19, 0.325, 0.9, 0.86, 0.37);
    sphere(torso, 'recessed hood lining', c.clothDark, 0, 1.185, 0.42, 0.81, 0.76, 0.24);
    sphere(torso, 'warm face', c.skin, 0, 1.155, 0.475, 0.71, 0.65, 0.24);
    const hair = sphere(torso, 'swept fringe', c.boot, -0.095, 1.435, 0.5, 0.54, 0.17, 0.16);
    hair.setLocalEulerAngles(0, 0, -9);
    sphere(torso, 'side lock', c.brown, 0.245, 1.35, 0.48, 0.12, 0.25, 0.12);
    for (const x of [-0.175, 0.175]) {
        sphere(torso, 'bright eye', c.black, x, 1.19, 0.592, 0.071, 0.115, 0.035);
        sphere(torso, 'eye glint', c.cream, x - 0.012, 1.214, 0.611, 0.024, 0.031, 0.012);
        sphere(torso, 'warm cheek', c.cheek, x * 1.25, 1.075, 0.574, 0.115, 0.057, 0.025);
    }
    sphere(torso, 'tiny nose', c.skin, 0, 1.085, 0.606, 0.1, 0.085, 0.07);
    // A shallow three-part curve stays soft and legible without a painted texture.
    for (const x of [-1, 0, 1]) {
        const smile = sphere(
            torso,
            'little smile',
            c.brown,
            x * 0.026,
            1.015 + Math.abs(x) * 0.01,
            0.582,
            0.036,
            0.018,
            0.014
        );
        smile.setLocalEulerAngles(0, 0, x * 25);
    }
    sphere(torso, 'hood fold', c.clothDark, -0.36, 1.09, -0.34, 0.4, 0.46, 0.4);
    sphere(torso, 'hood tip', c.cloth, -0.44, 1.04, -0.34, 0.28, 0.32, 0.32);
    const swordPivot = node(torso, 'sword arm', -0.39, 0.76, 0);
    const shieldPivot = node(torso, 'shield arm', 0.39, 0.76, 0);
    for (const arm of [swordPivot, shieldPivot]) {
        sphere(arm, 'rounded sleeve', c.cloth, 0, -0.045, 0.015, 0.25, 0.3, 0.27);
        sphere(arm, 'cream cuff', c.cream, 0, -0.17, 0.095, 0.235, 0.13, 0.22);
        sphere(arm, 'mitten hand', c.skin, 0, -0.22, 0.16, 0.21, 0.2, 0.22);
    }
    const sword = node(swordPivot, 'little sword', 0, -0.22, 0.16);
    cylinder(sword, 'leather sword grip', c.boot, 0, 0, 0, 0.09, 0.22, 0.09).setLocalEulerAngles(90, 0, 0);
    sphere(sword, 'gold pommel', c.gold, 0, 0, -0.13, 0.13, 0.12, 0.1);
    roundedBox(device, sword, 'gold sword guard', c.gold, 0, 0, 0.14, 0.34, 0.085, 0.09, 0.035);
    const blade = createGeo();
    appendLathe(
        blade,
        [
            [0.085, 0.18],
            [0.085, 0.27],
            [0.065, 0.79],
            [0, 0.94]
        ],
        0,
        0,
        0,
        4
    );
    const bladeEntity = meshEntity(device, sword, 'tapered silver blade', blade, c.silver);
    bladeEntity.setLocalEulerAngles(90, 0, 0);
    bladeEntity.setLocalScale(1, 1, 0.35);
    swordPivot.setLocalEulerAngles(-12, -18, 0);
    const shield = node(shieldPivot, 'round wooden shield', 0.025, -0.13, 0.24);
    cylinder(shield, 'gold shield rim', c.gold, 0, 0, 0, 0.46, 0.08, 0.46).setLocalEulerAngles(90, 0, 0);
    cylinder(shield, 'wooden shield inset', c.barkLight, 0, 0, 0.047, 0.36, 0.025, 0.36).setLocalEulerAngles(90, 0, 0);
    box(shield, 'wooden shield seam', c.brown, 0, 0, 0.062, 0.018, 0.33, 0.009);
    sphere(shield, 'gold shield boss', c.gold, 0, 0, 0.078, 0.13, 0.13, 0.07);
    const rest = [visual, torso, leftBoot, rightBoot, swordPivot, shieldPivot].map((entity) => ({
        entity,
        position: entity.getLocalPosition().clone(),
        rotation: entity.getLocalRotation().clone()
    }));
    return { entity: root, visual, torso, leftBoot, rightBoot, swordPivot, shieldPivot, rest };
}
