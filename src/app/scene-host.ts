import type { AppContext, SceneFactory, SceneInstance } from './context';
import { renderPixelRatio } from './create-app';

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
        const { app, device } = this.context;
        app.resizeCanvas();
        const ratio = renderPixelRatio();
        const width = Math.max(1, Math.floor(innerWidth * ratio)),
            height = Math.max(1, Math.floor(innerHeight * ratio));
        if (width !== device.width || height !== device.height) device.setResolution(width, height);
        this.scene?.resize();
    };

    private dispose = () => {
        this.unload();
        window.removeEventListener('resize', this.onResize);
        this.context.app.off('update', this.onUpdate);
    };
}
