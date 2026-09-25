import type { AppContext, SceneInstance } from '../app/context';
import { loadNatureModels } from '../rendering/nature-pack';
import type { NatureModels } from '../rendering/nature-pack';

/** Owns loading and releases the shared models after the constructed scene. */
export function createNatureScene(context: AppContext, build: (models: NatureModels) => SceneInstance): SceneInstance {
    let active: SceneInstance | undefined;
    const status = document.createElement('div');
    status.className = 'nature-loading';
    status.setAttribute('role', 'status');
    status.textContent = 'Preparing your adventure…';
    document.body.append(status);
    const dispose = loadNatureModels(
        context.app,
        (models) => {
            try {
                active = build(models);
                active.resize();
                status.remove();
            } catch (error) {
                status.textContent = 'The area could not load. Reload to try again.';
                console.error(error);
            }
        },
        (error) => {
            status.textContent = 'The nature models could not load. Reload to try again.';
            console.error(error);
        }
    );
    return {
        update: (dt) => active?.update(dt),
        resize: () => active?.resize(),
        destroy() {
            active?.destroy();
            status.remove();
            dispose();
        }
    };
}
