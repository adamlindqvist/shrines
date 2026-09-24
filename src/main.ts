import './style.css';
import { createApp } from './app/create-app';
import { SceneHost } from './app/scene-host';
import { scenes } from './scenes';
import type { SceneName } from './scenes';

/** The scene to start. Change this to `'woodland'` to see the composition example. */
const SCENE: SceneName = 'meadow';

const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;
const context = await createApp(canvas);
const host = new SceneHost(context);
const requestedScene = import.meta.env.DEV ? new URLSearchParams(location.search).get('scene') : null;
const initialScene = requestedScene && Object.hasOwn(scenes, requestedScene) ? (requestedScene as SceneName) : SCENE;
host.load(scenes[initialScene]);
context.app.start();

if (import.meta.env.DEV) {
    // Console hook for checking teardown: `shrines.load('woodland')`, `shrines.load('meadow')`.
    Object.assign(window, {
        shrines: {
            load: (name: SceneName) => {
                if (!Object.hasOwn(scenes, name)) throw new Error(`Unknown scene: ${name}`);
                host.load(scenes[name]);
            },
            unload: () => host.unload()
        }
    });
}
