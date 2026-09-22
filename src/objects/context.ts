import type { GraphicsDevice } from 'playcanvas';

import type { Palette } from '../rendering/palette';

/** What object factories need to build visuals: the device for meshes and the shared materials. */
export type PropContext = {
    device: GraphicsDevice;
    palette: Palette;
};
