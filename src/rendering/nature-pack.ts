import { Asset, Entity } from 'playcanvas';
import type { AppBase, ContainerResource } from 'playcanvas';

import { NATURE_TUNING } from './nature-tuning';

const natureUrl = new URL('../assets/low_poly_nature_free.glb', import.meta.url).href;

const TREES = ['Tree', 'Tree.009', 'Tree.018'] as const;
const ROCKS = ['Stone', 'Stone.005', 'Stone.010'] as const;

/** Scene-owned templates share the container's meshes and material until every instance is destroyed. */
export class NatureModels {
    private readonly template: Entity;
    private treeIndex = 0;
    private rockIndex = 0;

    constructor(resource: ContainerResource) {
        this.template = resource.instantiateRenderEntity();
    }

    add(parent: Entity, kind: 'tree' | 'rock', size: number) {
        const name = kind === 'tree' ? TREES[this.treeIndex++ % TREES.length] : ROCKS[this.rockIndex++ % ROCKS.length];
        const tuning = NATURE_TUNING[name];
        const source = this.template.findByName(`${name}_Mat_tree_0`) as Entity | null;
        if (!source?.render) throw new Error(`Nature pack is missing ${name}`);
        const root = new Entity(`imported ${name}`);
        parent.addChild(root);
        root.setLocalEulerAngles(0, tuning.yaw, 0);
        const calibration = new Entity('calibrated visual');
        root.addChild(calibration);
        const scale = tuning.scale * size;
        calibration.setLocalScale(scale, scale, scale);
        calibration.setLocalPosition(-tuning.center[0] * scale, tuning.groundOffset * scale, -tuning.center[2] * scale);
        // Bake the source ancestry into the clone, retaining the pack's authored coordinate conversion.
        const visual = source.clone();
        visual.setLocalPosition(source.getPosition());
        visual.setLocalRotation(source.getRotation());
        visual.setLocalScale(source.getWorldTransform().getScale());
        calibration.addChild(visual);
        return root;
    }

    destroy() {
        this.template.destroy();
    }
}

/** Loading can outlive a scene switch; late assets are unloaded without constructing a scene. */
export function loadNatureModels(app: AppBase, ready: (models: NatureModels) => void, failed: (error: string) => void) {
    const asset = new Asset('Low Poly Nature Free', 'container', { url: natureUrl });
    let disposed = false;
    let models: NatureModels | undefined;
    const release = () => {
        models?.destroy();
        models = undefined;
        asset.unload();
        app.assets.remove(asset);
    };
    asset.once('load', () => {
        if (disposed) {
            release();
            return;
        }
        models = new NatureModels(asset.resource as ContainerResource);
        ready(models);
    });
    asset.once('error', (error: string) => {
        release();
        if (!disposed) failed(error);
    });
    app.assets.add(asset);
    app.assets.load(asset);
    return () => {
        disposed = true;
        if (!asset.loading) release();
    };
}
