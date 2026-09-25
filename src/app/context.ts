import type { AppBase, GraphicsDevice } from 'playcanvas';

/** Application services shared by every scene. Scenes use them but never destroy them. */
export type AppContext = {
    app: AppBase;
    device: GraphicsDevice;
    canvas: HTMLCanvasElement;
    /** Development aids, enabled in development builds with `?debug=true`. */
    debug: boolean;
};

/** Hooks a running scene exposes to the application. */
export type SceneInstance = {
    /** Called every frame with the unclamped frame time in seconds. */
    update(dt: number): void;
    /** Called after the canvas has been resized to the window. */
    resize(): void;
    /** Removes everything the scene created, leaving the application reusable. */
    destroy(): void;
};

export type SceneFactory = (context: AppContext) => SceneInstance;
