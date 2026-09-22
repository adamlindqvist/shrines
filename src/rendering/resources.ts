import { Color, StandardMaterial } from 'playcanvas';

type Disposable = {
    destroy(): void;
};

/**
 * GPU resources a scene creates for itself. Meshes are released with their
 * entities; materials and textures are released here on teardown.
 */
export class SceneResources {
    private owned: Disposable[] = [];

    track<T extends Disposable>(resource: T): T {
        this.owned.push(resource);
        return resource;
    }

    /** Simple lit material from a hex colour; `gloss` is 0–100. */
    material(name: string, hex: string, gloss = 18, spec = 0.05) {
        const m = new StandardMaterial();
        m.name = name;
        m.diffuse = new Color().fromString(hex);
        m.gloss = gloss / 100;
        m.specular = new Color(spec, spec, spec);
        m.update();
        return this.track(m);
    }

    destroy() {
        for (const r of this.owned.splice(0).reverse()) r.destroy();
    }
}
