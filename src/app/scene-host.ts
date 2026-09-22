import type { AppContext, SceneFactory, SceneInstance } from './context';

/** Runs one scene at a time, forwarding frame updates and window resizes to it. */
export class SceneHost {
    private scene: SceneInstance | null = null;

    private readonly context: AppContext;

    constructor(context: AppContext) {
        this.context = context;
        context.app.on('update', this.onUpdate);
        window.addEventListener('resize', this.onResize);
        context.app.on('destroy', this.dispose);
    }

    /** Tears down the current scene, if any, and starts a new one from `factory`. */
    load(factory: SceneFactory) {
        this.unload();
        this.scene = factory(this.context);
        this.onResize();
    }

    unload() {
        this.scene?.destroy();
        this.scene = null;
    }

    private onUpdate = (dt: number) => this.scene?.update(dt);

    private onResize = () => {
        this.context.app.resizeCanvas();
        this.scene?.resize();
    };

    private dispose = () => {
        this.unload();
        window.removeEventListener('resize', this.onResize);
        this.context.app.off('update', this.onUpdate);
    };
}
