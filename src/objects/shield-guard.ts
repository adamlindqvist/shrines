import type { Entity } from 'playcanvas';

import { createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';
import { node } from '../rendering/primitives';

import type { PropContext } from './context';

/** World-sized, forward-facing guard cue, kept outside the hero's decorative transforms. */
export function createShieldGuard({ device, palette }: PropContext, parent: Entity, cone: number) {
    const root = node(parent, 'shield protection');
    const veil = createGeo();
    const rim = createGeo();
    const radius = 1.0;
    const bottom = 0.18;
    const top = 1.65;
    const segments = 32;
    const strip = (geo: Geo, from: number, to: number, low: number, high: number) => {
        const base = geo.p.length / 3;
        for (const [angle, y] of [
            [from, low],
            [to, low],
            [from, high],
            [to, high]
        ]) {
            geo.p.push(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
            geo.n.push(Math.sin(angle), 0, Math.cos(angle));
        }
        geo.i.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    };
    for (let i = 0; i < segments; i++) {
        const from = -cone + (i / segments) * cone * 2;
        const to = -cone + ((i + 1) / segments) * cone * 2;
        strip(veil, from, to, bottom, top);
        strip(rim, from, to, top - 0.09, top);
        strip(rim, from, to, bottom, bottom + 0.09);
    }
    for (const angle of [-cone, cone]) strip(rim, angle - 0.03, angle + 0.03, bottom, top);
    meshEntity(device, root, 'curved shield veil', veil, palette.shieldVeil, false, false);
    meshEntity(device, root, 'shield protection outline', rim, palette.shieldRim, false, false);
    root.enabled = false;
    return root;
}
