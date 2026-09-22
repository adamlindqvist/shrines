import {
    AppBase,
    AppOptions,
    CameraComponentSystem,
    FILLMODE_FILL_WINDOW,
    LightComponentSystem,
    RESOLUTION_AUTO,
    RenderComponentSystem,
    TextureHandler,
    createGraphicsDevice
} from 'playcanvas';

import type { AppContext } from './context';

/** Creates the graphics device and a minimal PlayCanvas application filling the window. */
export async function createApp(canvas: HTMLCanvasElement): Promise<AppContext> {
    const device = await createGraphicsDevice(canvas, { antialias: false });
    device.maxPixelRatio = Math.min(devicePixelRatio, 1.5);
    const options = new AppOptions();
    options.graphicsDevice = device;
    options.componentSystems = [RenderComponentSystem, CameraComponentSystem, LightComponentSystem];
    options.resourceHandlers = [TextureHandler];
    const app = new AppBase(canvas);
    app.init(options);
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);
    return { app, device, canvas };
}
