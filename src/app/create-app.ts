import {
    AppBase,
    AppOptions,
    CameraComponentSystem,
    ContainerHandler,
    FILLMODE_FILL_WINDOW,
    LightComponentSystem,
    ParticleSystemComponentSystem,
    RESOLUTION_FIXED,
    RenderComponentSystem,
    TextureHandler,
    createGraphicsDevice
} from 'playcanvas';

import type { AppContext } from './context';

/**
 * Backbuffer resolution relative to CSS pixels. High-DPI screens render at
 * their native ratio up to `maxPixelRatio`; standard screens are supersampled
 * at `minPixelRatio` and downsampled by the browser for smoother edges.
 */
export const RENDER = { minPixelRatio: 1.5, maxPixelRatio: 2 };

/** The backbuffer scale for the current screen, per `RENDER`. */
export function renderPixelRatio() {
    return Math.min(Math.max(devicePixelRatio, RENDER.minPixelRatio), RENDER.maxPixelRatio);
}

/** Creates the graphics device and a minimal PlayCanvas application filling the window. */
export async function createApp(canvas: HTMLCanvasElement): Promise<AppContext> {
    const device = await createGraphicsDevice(canvas, { antialias: false });
    // The backbuffer is sized explicitly by SceneHost, so the engine must not scale it again.
    device.maxPixelRatio = 1;
    const options = new AppOptions();
    options.graphicsDevice = device;
    options.componentSystems = [
        RenderComponentSystem,
        CameraComponentSystem,
        LightComponentSystem,
        ParticleSystemComponentSystem
    ];
    options.resourceHandlers = [TextureHandler, ContainerHandler];
    const app = new AppBase(canvas);
    app.init(options);
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_FIXED, innerWidth, innerHeight);
    const debug = import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === 'true';
    return { app, device, canvas, debug };
}
